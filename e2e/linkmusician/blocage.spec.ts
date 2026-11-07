import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P2-05 — Blocage : effet dans les deux sens (profil introuvable,
 * conversation fermée), liste dans les réglages, déblocage.
 */
test.describe('LinkMusician — blocage', () => {
	test.setTimeout(6 * 60_000);

	test('bloquer puis débloquer', async ({ page, account, browser }) => {
		const malikAccount = makeAccount();
		const malikContext = await browser.newContext();
		const malikPage = await malikContext.newPage();
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
			const lea = await person(account.email);
			const malik = await person(malikAccount.email);

			await test.step('1. Malik écrit à Léa, qui lui répond', async () => {
				await malikPage.goto(`/messages/nouveau?a=${lea.actor.handle}`);
				await waitForAppReady(malikPage);
				await malikPage.getByLabel('Ton message').fill('Salut Léa !');
				await malikPage.getByRole('button', { name: 'Envoyer la demande' }).click();
				await expect(malikPage).toHaveURL(/\/messages\/c/);
				await page.goto('/messages');
				await waitForAppReady(page);
				await page.getByRole('link', { name: new RegExp(malik.actor.displayName) }).click();
				// D44 : répondre ouvre la conversation.
				await page.getByLabel('Ton message').fill('Salut Malik !');
				await page.getByRole('button', { name: 'Envoyer' }).click();
				await expect(
					page.getByRole('list', { name: 'Messages' }).getByText('Salut Malik !')
				).toBeVisible();
			});

			await test.step('2. Léa bloque Malik depuis son profil', async () => {
				await page.goto(`/@${malik.actor.handle}`);
				await waitForAppReady(page);
				await page.getByText(`Bloquer ${malik.actor.displayName}`).click();
				await page.getByRole('button', { name: 'Bloquer', exact: true }).click();
				await expect(page).toHaveURL(/\/reglages\?bloque=1/);
				await expect(
					page.getByRole('list', { name: 'Personnes bloquées' }).getByText(malik.actor.displayName)
				).toBeVisible();
				// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('3. Dans les deux sens : profils introuvables', async () => {
				expect((await page.goto(`/@${malik.actor.handle}`))?.status()).toBe(404);
				expect((await malikPage.goto(`/@${lea.actor.handle}`))?.status()).toBe(404);
				expect((await malikPage.goto(`/messages/nouveau?a=${lea.actor.handle}`))?.status()).toBe(
					404
				);
			});

			await test.step('4. La conversation est fermée pour les deux', async () => {
				await malikPage.goto('/messages');
				await waitForAppReady(malikPage);
				await malikPage.getByRole('link', { name: new RegExp(lea.actor.displayName) }).click();
				await expect(malikPage.getByText('Cette conversation est fermée.')).toBeVisible();
				await expect(malikPage.getByLabel('Ton message')).toHaveCount(0);
			});

			await test.step('5. Déblocage : le profil réapparaît', async () => {
				await page.goto('/reglages');
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Débloquer' }).click();
				await expect(page.getByText('Tu n’as bloqué personne.'.replace('’', "'"))).toBeVisible();
				expect((await malikPage.goto(`/@${lea.actor.handle}`))?.status()).toBe(200);
				expect(await db.block.count({ where: { blockerActorId: lea.actorId } })).toBe(0);
			});
		} finally {
			await malikContext.close();
			await deleteUser(malikAccount.email);
		}
	});
});
