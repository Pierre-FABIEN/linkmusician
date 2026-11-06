import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P3-03 — Recrutement : mon groupe publie « cherche une batteuse » ; Nina,
 * batteuse, postule ; j'accepte : la conversation s'ouvre et Nina entre
 * dans le groupe (le groupe est formé, des points pour nous deux).
 */
test.describe('LinkMusician — recrutement', () => {
	test.setTimeout(5 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	test('le groupe recrute une batteuse', async ({ page, account, browser }) => {
		const ninaAccount = makeAccount();
		const ninaContext = await browser.newContext();
		const ninaPage = await ninaContext.newPage();
		const bandName = `E2E Les Rats ${Math.random().toString(36).slice(2, 7)}`;
		const title = `Les Rats cherchent une batteuse ${Math.random().toString(36).slice(2, 5)}`;
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(ninaPage, ninaAccount);
			await skipOnboarding(ninaPage, ninaAccount.email);
			await setCity(ninaPage);
			const person = async (email: string) =>
				db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(email)).id },
					include: { actor: true }
				});
			const me = await person(account.email);
			const nina = await person(ninaAccount.email);
			const drums = await db.instrument.findUniqueOrThrow({ where: { slug: 'batterie' } });
			await db.personInstrument.create({
				data: { personId: nina.actorId, instrumentId: drums.id, declaredLevel: 3, isPrimary: true }
			});

			await test.step('1. Je monte le groupe et j’indique sa ville', async () => {
				await page.goto('/groupes/nouveau');
				await waitForAppReady(page);
				await page.getByLabel('Nom du groupe').fill(bandName);
				await page.getByRole('button', { name: 'Créer le groupe' }).click();
				await page.getByRole('link', { name: 'Modifier la fiche du groupe' }).click();
				await page.getByLabel('Ville du groupe').pressSequentially('toulou', { delay: 50 });
				await page.getByRole('option').first().getByRole('button').click();
				await page.getByRole('button', { name: 'Enregistrer la fiche' }).click();
				await expect(page.getByText('La fiche du groupe est enregistrée.')).toBeVisible();
			});

			await test.step('2. Le groupe publie son recrutement', async () => {
				await page.getByRole('link', { name: `← ${bandName}` }).click();
				await page.getByRole('link', { name: 'Publier une annonce de recrutement' }).click();
				await expect(page.getByLabel('Publier au nom de')).toHaveValue(/.+/);
				await expect(page.getByText(/Diffusée autour de Toulouse/)).toBeVisible();
				await page.getByLabel('Titre').fill(title);
				await page
					.getByLabel('Description')
					.fill('Rock garage, deux répètes par semaine, premier concert au printemps.');
				await page.getByLabel('Instrument recherché').selectOption('batterie');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByRole('button', { name: 'Publier' }).click();
				await expect(page.getByRole('heading', { name: title })).toBeVisible();
				await expect(page.getByText(`Le groupe ${bandName} recrute`)).toBeVisible();
			});

			await test.step('3. Nina trouve l’annonce et postule', async () => {
				await ninaPage.goto('/annonces');
				await waitForAppReady(ninaPage);
				await ninaPage.getByRole('link', { name: new RegExp(title) }).click();
				await ninaPage
					.getByLabel(`Ton message à ${bandName}`)
					.fill('Batteuse rock depuis 6 ans, dispo deux soirs par semaine.');
				await ninaPage.getByRole('button', { name: 'Envoyer ma candidature' }).click();
				await expect(ninaPage.getByText('Candidature envoyée !')).toBeVisible();
			});

			await test.step('4. J’accepte : Nina entre dans le groupe', async () => {
				await page.reload();
				const card = page.getByRole('list', { name: 'Candidatures reçues' }).getByRole('listitem');
				await expect(card).toContainText('Batteuse rock depuis 6 ans');
				await card.getByRole('button', { name: 'Accepter' }).click();
				await expect(page.getByText(/bienvenue dans le groupe/)).toBeVisible();
				await expect(card.getByRole('link', { name: 'Ouvrir la conversation' })).toBeVisible();

				const xp = async (actorId: string) =>
					(
						await db.xpTransaction.aggregate({
							where: { actorId, ruleId: 'membership.accepted' },
							_sum: { amount: true }
						})
					)._sum.amount ?? 0;
				// Le groupe est formé à l'arrivée de Nina : des points pour les deux.
				await expect.poll(() => xp(nina.actorId)).toBe(200);
				expect(await xp(me.actorId)).toBe(200);
			});

			await test.step('5. Nina voit son groupe ; l’effectif la montre à la batterie', async () => {
				await ninaPage.reload();
				await expect(
					ninaPage.getByText(`Bravo ! Tu fais maintenant partie de ${bandName}.`)
				).toBeVisible();
				await ninaPage.goto('/groupes');
				await expect(ninaPage.getByRole('link', { name: new RegExp(bandName) })).toBeVisible();

				const band = await db.actor.findFirstOrThrow({
					where: { kind: 'ORGANIZATION', displayName: bandName }
				});
				await page.goto(`/@${band.handle}`);
				await waitForAppReady(page);
				const members = page.getByRole('list', { name: 'Membres actuels' });
				await expect(members).toContainText(nina.actor.displayName);
				await expect(members).toContainText('batterie');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});
		} finally {
			await ninaContext.close();
			await db.actor.deleteMany({ where: { kind: 'ORGANIZATION', displayName: bandName } });
			await deleteUser(ninaAccount.email);
		}
	});
});
