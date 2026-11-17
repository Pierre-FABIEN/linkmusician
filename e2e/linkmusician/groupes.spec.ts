import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P3-01 — Groupe et adhésions : je monte un groupe (aucun point), j'invite
 * Malik ; il accepte, le groupe est formé et nous gagnons des points tous
 * les deux ; il part, et reste dans l'historique avec ses dates.
 * P3-02 — Page publique du groupe : je remplis sa fiche, un visiteur voit
 * l'effectif actuel et passé, et le groupe figure sur mon profil.
 */
test.describe('LinkMusician — groupes', () => {
	test.setTimeout(4 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	test('je crée un groupe, j’invite Malik', async ({ page, account, browser }) => {
		const malikAccount = makeAccount();
		const malikContext = await browser.newContext();
		const malikPage = await malikContext.newPage();
		const bandName = `E2E Les Rats ${Math.random().toString(36).slice(2, 7)}`;
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(malikPage, malikAccount);
			await skipOnboarding(malikPage, malikAccount.email);
			const person = async (email: string) =>
				db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(email)).id },
					include: { actor: true }
				});
			const me = await person(account.email);
			const malik = await person(malikAccount.email);
			const xp = async (actorId: string) =>
				(
					await db.xpTransaction.aggregate({
						where: { actorId, ruleId: 'membership.accepted' },
						_sum: { amount: true }
					})
				)._sum.amount ?? 0;

			await test.step('1. Je monte un groupe : il est en formation, sans point', async () => {
				await page.goto('/groupes');
				await waitForAppReady(page);
				const announcementsLink = page.locator('header').getByRole('link', { name: 'Annonces' });
				await expect(announcementsLink).toBeVisible();
				await announcementsLink.click();
				await expect(page).toHaveURL(/\/annonces$/);
				await page.goBack();
				await waitForAppReady(page);
				await expect(page.getByText('Tu n’as pas encore de groupe.')).toBeVisible();
				await page.getByRole('link', { name: 'Monter un groupe' }).click();
				await page.getByLabel('Nom du groupe').fill(bandName);
				await page.getByLabel('Ce que tu y fais').fill('guitare');
				await page.getByRole('button', { name: 'Créer le groupe' }).click();
				await expect(page.getByRole('heading', { name: bandName })).toBeVisible();
				await expect(
					page.getByText('En formation : le groupe est formé dès qu’un premier membre le rejoint.')
				).toBeVisible();
				expect(await xp(me.actorId)).toBe(0);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('2. J’invite Malik par son identifiant', async () => {
				await page.getByLabel('Son identifiant').fill(`@${malik.actor.handle}`);
				await page.getByRole('button', { name: 'Inviter', exact: true }).click();
				await expect(
					page.getByText(`Invitation envoyée à ${malik.actor.displayName}.`)
				).toBeVisible();
				await expect(page.getByRole('list', { name: 'Invitations en attente' })).toContainText(
					malik.actor.displayName
				);
			});

			await test.step('3. Malik accepte : le groupe est formé, des points pour les deux', async () => {
				await malikPage.goto('/groupes');
				await waitForAppReady(malikPage);
				await expect(malikPage.getByRole('heading', { name: 'Invitations reçues' })).toBeVisible();
				await expectNoA11yViolations(malikPage, A11Y_EXCLUDE);
				await malikPage.getByRole('button', { name: `Rejoindre ${bandName}` }).click();
				await expect(malikPage.getByText('Bienvenue dans le groupe !')).toBeVisible();
				await expect(malikPage.getByRole('link', { name: new RegExp(bandName) })).toBeVisible();
				await expect.poll(() => xp(malik.actorId)).toBe(200);
				expect(await xp(me.actorId)).toBe(200);

				await page.reload();
				await expect(page.getByText(/^Formé le .* · 2 membres$/)).toBeVisible();
				const members = page.getByRole('list', { name: 'Membres actuels' });
				await expect(
					members.getByRole('link', { name: malik.actor.displayName, exact: true })
				).toBeVisible();
				await expect(members).toContainText('Responsable · guitare');
			});

			await test.step('3b. Rôles répétés et transmission aller-retour, chacun garde ses actes', async () => {
				const band = await db.actor.findFirstOrThrow({
					where: { displayName: bandName, kind: 'ORGANIZATION' }
				});
				const members = page.getByRole('list', { name: 'Membres actuels' });
				for (const action of [
					'Confier la co-gestion',
					'Retirer la co-gestion',
					'Confier la co-gestion',
					'Lui transmettre le groupe'
				]) {
					if (!(await members.getByRole('button', { name: action, exact: true }).isVisible())) {
						await members.getByRole('button', { name: 'Gérer', exact: true }).click();
					}
					await members.getByRole('button', { name: action, exact: true }).click();
					await expect(
						page.getByText(
							action === 'Lui transmettre le groupe'
								? 'Groupe transmis.'
								: action === 'Retirer la co-gestion'
									? 'Co-gestion retirée.'
									: 'Co-gestion confiée.',
							{ exact: true }
						)
					).toBeVisible();
				}
				await malikPage.goto(`/groupes/${band.handle}`);
				await waitForAppReady(malikPage);
				await malikPage
					.getByRole('list', { name: 'Membres actuels' })
					.getByRole('button', { name: 'Gérer', exact: true })
					.click();
				await malikPage
					.getByRole('button', { name: 'Lui transmettre le groupe', exact: true })
					.click();
				await expect(
					malikPage.getByRole('button', { name: 'Lui transmettre le groupe', exact: true })
				).toHaveCount(0);
				await page.goto('/structure/historique');
				await waitForAppReady(page);
				const own = page.getByRole('region', { name: bandName, exact: true });
				await expect(own.locator('li')).toHaveCount(2);
				await expect(
					own.getByText('Responsabilité du groupe reçue', { exact: true })
				).toBeVisible();
				await expect(own.getByText(malik.actor.displayName, { exact: true })).toBeVisible();
				await expect(own.getByText('Co-gestion du groupe accordée', { exact: true })).toHaveCount(
					0
				);
				await page.goto(`/groupes/${band.handle}`);
				await waitForAppReady(page);
				expect(await xp(me.actorId)).toBe(200);
				expect(await xp(malik.actorId)).toBe(200);
				// Le parcours de départ suivant repart de la liste personnelle.
				await malikPage.goto('/groupes');
				await waitForAppReady(malikPage);
			});

			await test.step('4. Malik part : il reste dans l’historique', async () => {
				await malikPage.getByRole('link', { name: new RegExp(bandName) }).click();
				await malikPage.getByRole('button', { name: 'Quitter le groupe' }).click();
				await malikPage.getByRole('button', { name: 'Quitter le groupe' }).click();
				await expect(malikPage).toHaveURL(/\/groupes$/);

				await page.reload();
				const past = page.getByRole('list', { name: 'Anciens membres' });
				await expect(
					past.getByRole('link', { name: malik.actor.displayName, exact: true })
				).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('4b. Malik retrouve ses actes privés après son départ', async () => {
				const band = await db.actor.findFirstOrThrow({
					where: { displayName: bandName, kind: 'ORGANIZATION' }
				});
				expect((await malikPage.request.get(`/structure/${band.id}`)).status()).toBe(404);
				await malikPage.setViewportSize({ width: 390, height: 844 });
				await malikPage.goto('/structure');
				await waitForAppReady(malikPage);
				await malikPage.getByRole('link', { name: /^Historique de mes participations/ }).focus();
				await malikPage.keyboard.press('Enter');
				await expect(malikPage).toHaveURL('/structure/historique');
				const history = malikPage.getByRole('region', { name: bandName, exact: true });
				await expect(history.locator('li')).toHaveCount(8);
				await expect(
					history.getByText('Co-gestion du groupe accordée', { exact: true })
				).toHaveCount(2);
				await expect(
					history.getByText('Responsabilité du groupe reçue', { exact: true })
				).toBeVisible();
				await expect(
					history.getByText(me.actor.displayName, { exact: true }).first()
				).toBeVisible();
				await expect(history.getByText('Invitation acceptée', { exact: true })).toBeVisible();
				await expect(history.getByText('Participation quittée', { exact: true })).toBeVisible();
				await expect(history.locator('time').last()).toHaveAttribute('datetime', /T.*Z$/);
				await expectNoA11yViolations(malikPage, A11Y_EXCLUDE);
				expect(
					await malikPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
				).toBe(true);
			});

			await test.step('5. Je remplis la fiche du groupe', async () => {
				await page.getByRole('link', { name: 'Modifier la fiche du groupe' }).click();
				await page.getByLabel('Présentation').fill('Rock garage, répètes le jeudi.');
				await page.getByRole('checkbox', { name: 'Rock', exact: true }).check();
				// ONB-12c1 (D64) : formation et répertoire, au clavier et à 390 px.
				await page.setViewportSize({ width: 390, height: 844 });
				await expect(page.getByRole('radio', { name: 'Non précisé' }).first()).toBeChecked();
				await page.getByRole('radio', { name: /^Duo/ }).focus();
				await page.keyboard.press('Space');
				await expect(page.getByRole('radio', { name: /^Duo/ })).toBeChecked();
				// Malik est parti : l'écart avec l'effectif est signalé, rien n'est corrigé.
				await expect(page.getByText(/compte 1 membre actif/)).toBeVisible();
				await page.getByRole('radio', { name: /^Reprises Vous jouez/ }).check();
				await page.getByRole('button', { name: 'Enregistrer la fiche' }).click();
				await expect(page.getByText('La fiche du groupe est enregistrée.')).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				expect(
					await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
				).toBe(true);
				await page.setViewportSize({ width: 1280, height: 800 });
			});

			await test.step('5b. Les POST forgés sont refusés côté serveur', async () => {
				const band = await db.actor.findFirstOrThrow({
					where: { kind: 'ORGANIZATION', displayName: bandName }
				});
				const path = `/groupes/${band.handle}/modifier?/save`;
				const form = { name: bandName, bio: '', formation: 'TRIO', repertoire: 'ORIGINALS' };
				// Malik a quitté le groupe : il ne gère plus rien.
				const outsider = await malikPage.request.post(path, {
					form,
					headers: { Origin: new URL(page.url()).origin }
				});
				expect(outsider.status()).toBe(403);
				// Un code hors liste est refusé, même pour la gestion.
				const unknown = await page.request.post(path, {
					form: { ...form, formation: 'QUARTET' },
					headers: { Origin: new URL(page.url()).origin }
				});
				expect(await unknown.text()).toContain('Choisis une formation');
				expect(await db.bandProfile.findUniqueOrThrow({ where: { orgId: band.id } })).toMatchObject(
					{ formation: 'DUO', repertoire: 'COVERS' }
				);
			});

			await test.step('6. Un visiteur voit la page publique, anciens membres compris', async () => {
				const band = await db.actor.findFirstOrThrow({
					where: { kind: 'ORGANIZATION', displayName: bandName }
				});
				const visitor = await browser.newContext();
				try {
					const visitorPage = await visitor.newPage();
					await visitorPage.goto(`/@${band.handle}`);
					await waitForAppReady(visitorPage);
					await expect(
						visitorPage.getByRole('heading', { name: bandName, level: 1 })
					).toBeVisible();
					await expect(visitorPage.getByText('Rock garage, répètes le jeudi.')).toBeVisible();
					// D64 : déclaré par le groupe, jamais présenté comme vérifié.
					await expect(visitorPage.getByRole('heading', { name: 'Sur scène' })).toBeVisible();
					await expect(visitorPage.getByText('Duo', { exact: true })).toBeVisible();
					await expect(visitorPage.getByText('Reprises', { exact: true })).toBeVisible();
					await expect(visitorPage.getByText('Déclaré par le groupe.')).toBeVisible();
					await expect(visitorPage.getByRole('list', { name: 'Membres actuels' })).toContainText(
						me.actor.displayName
					);
					const past = visitorPage.getByRole('list', { name: 'Anciens membres' });
					await expect(past).toContainText(malik.actor.displayName);
					// Arrivé et parti le même mois : la période tient en un mois.
					await expect(past).toContainText(/\p{L}+ \d{4}/u);
					await expect(
						visitorPage.getByRole('link', { name: `Connecte-toi pour rejoindre ${bandName}` })
					).toBeVisible();
					await expectNoA11yViolations(visitorPage, A11Y_EXCLUDE);
				} finally {
					await visitor.close();
				}

				// Mon profil public cite le groupe.
				await page.goto(`/@${me.actor.handle}`);
				await expect(
					page.getByRole('list', { name: `Groupes de ${me.actor.displayName}` })
				).toContainText(bandName);
			});
			await test.step('7. Une nouvelle demande déclinée garde son auteur et sa période', async () => {
				const band = await db.actor.findFirstOrThrow({
					where: { displayName: bandName, kind: 'ORGANIZATION' }
				});
				await malikPage.goto(`/groupes/${band.handle}`);
				await waitForAppReady(malikPage);
				await malikPage.getByRole('button', { name: 'Demander à rejoindre', exact: true }).click();
				await expect(malikPage.getByText('Ta demande est envoyée.')).toBeVisible();
				await page.goto(`/groupes/${band.handle}`);
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Refuser', exact: true }).click();
				await expect(page.getByText('Demande refusée.', { exact: true })).toBeVisible();
				await malikPage.goto('/structure/historique');
				await waitForAppReady(malikPage);
				const periods = malikPage.getByRole('region', { name: bandName, exact: true });
				await expect(periods).toHaveCount(2);
				const demand = periods.filter({ hasText: 'Demande pour rejoindre le groupe' });
				await expect(demand.locator('li')).toHaveCount(2);
				await expect(
					demand.getByText('Demande déclinée par la gestion', { exact: true })
				).toBeVisible();
				await expect(demand.getByText(me.actor.displayName, { exact: true })).toBeVisible();
				await expect(demand.getByText(malik.actor.displayName, { exact: true })).toBeVisible();
				await page.goto('/structure/historique');
				await waitForAppReady(page);
				await expect(
					page.getByRole('region', { name: bandName, exact: true }).locator('li')
				).toHaveCount(2);
			});
		} finally {
			await malikContext.close();
			await db.actor.deleteMany({ where: { kind: 'ORGANIZATION', displayName: bandName } });
			await deleteUser(malikAccount.email);
		}
	});
});
