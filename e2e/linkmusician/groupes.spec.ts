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
		} finally {
			await malikContext.close();
			await db.actor.deleteMany({ where: { kind: 'ORGANIZATION', displayName: bandName } });
			await deleteUser(malikAccount.email);
		}
	});
});
