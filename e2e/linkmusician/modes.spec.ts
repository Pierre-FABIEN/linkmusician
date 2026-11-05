import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P2-12 — Accueil à deux modes : choisir un mode mène à son espace, et le
 * dernier choix est retenu (« Reprendre ») à la visite suivante.
 */
test.describe('LinkMusician — modes de jeu', () => {
	test.setTimeout(5 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	test('choisir un mode, le retrouver', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const userId = (await requireUser(account.email)).id;

		await test.step('1. Le menu du jeu : deux modes', async () => {
			await page.goto('/jouer');
			await waitForAppReady(page);
			await expect(page.getByRole('button', { name: /Mode carrière/ })).toBeVisible();
			await expect(page.getByRole('button', { name: /Mode jam/ })).toBeVisible();
			await expect(page.getByText('Reprendre')).toHaveCount(0);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('2. Mode jam : le hub des jams', async () => {
			await page.getByRole('button', { name: /Mode jam/ }).click();
			await expect(page).toHaveURL(/\/jam$/);
			await expect(page.getByRole('heading', { level: 1, name: 'Envie de jouer ?' })).toBeVisible();
			await expect(page.getByRole('link', { name: 'Lancer une jam' })).toHaveAttribute(
				'href',
				'/annonces/nouvelle?type=JAM'
			);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('3. Retenu : « Reprendre » sur le mode jam', async () => {
			await page.goto('/jouer');
			await waitForAppReady(page);
			const first = page
				.getByRole('button')
				.filter({ hasText: /Mode (jam|carrière)/ })
				.first();
			await expect(first).toContainText('Mode jam');
			await expect(first).toContainText('Reprendre');
		});

		await test.step('4. Mode carrière : le tableau de bord', async () => {
			await page.getByRole('button', { name: /Mode carrière/ }).click();
			await expect(page).toHaveURL(/\/espace$/);
			expect((await db.person.findUniqueOrThrow({ where: { userId } })).preferredMode).toBe(
				'CAREER'
			);
		});
	});
});
