import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * D51 — Organiser des jams : « Lancer une jam » n'apparaît dans le mode jam
 * qu'après avoir coché « Je suis prêt·e à organiser des jams » dans son
 * profil. Sans la case, la page de création renvoie vers le profil.
 */
test.describe('LinkMusician — organiser des jams', () => {
	test.setTimeout(2 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('je coche « prêt·e à organiser », « Lancer une jam » apparaît', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const menu = page.getByRole('navigation', { name: 'Mode jam' });

		await test.step('1. Sans la case : pas de « Lancer une jam »', async () => {
			await page.goto('/jam');
			await waitForAppReady(page);
			await expect(menu.getByRole('link', { name: /Jams à venir/ })).toBeVisible();
			await expect(menu.getByRole('link', { name: /Lancer une jam/ })).toHaveCount(0);
			await page.goto('/jams/nouvelle');
			await expect(page).toHaveURL(/\/profil\?organiser=1/);
			await expect(
				page.getByText('Pour lancer une jam, coche cette case puis enregistre ton profil.')
			).toBeVisible();
		});

		await test.step('2. Je coche et j’enregistre : le bouton apparaît', async () => {
			await page.getByLabel(/Je suis prêt·e à organiser des jams/).check();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText('Ton profil est enregistré.')).toBeVisible();
			const person = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			expect(person.organizesJams).toBe(true);
			await page.goto('/jam');
			await waitForAppReady(page);
			await menu.getByRole('link', { name: /Lancer une jam/ }).click();
			await expect(page).toHaveURL(/\/jams\/nouvelle$/);
		});
	});
});
