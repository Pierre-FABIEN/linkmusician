import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { promoteToAdmin } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * Feuille de route de la startup (`docs/lancement/README.md`) : réservée à
 * l'administration, jamais publique.
 */
test.describe('LinkMusician — feuille de route de la startup', () => {
	test.setTimeout(3 * 60_000);

	test('réservée à l’administration', async ({ page, account }) => {
		await page.goto('/admin/lancement');
		expect(new URL(page.url()).pathname).not.toBe('/admin/lancement');

		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		await page.goto('/admin/lancement');
		expect(new URL(page.url()).pathname).not.toBe('/admin/lancement');

		await promoteToAdmin(account.email);
		await page.goto('/admin/lancement');
		await waitForAppReady(page);
		await expect(
			page.getByRole('heading', { name: 'LinkMusician, de l’idée à la startup', level: 1 })
		).toBeVisible();
		await expect(page.getByRole('complementary', { name: 'En bref' })).toBeVisible();
		await page
			.getByRole('navigation', { name: 'Sur cette page' })
			.getByRole('link', { name: 'Phase 3 — Lancer LinkMusician à Toulouse' })
			.click();
		await expect(
			page.getByRole('heading', { name: 'Phase 3 — Lancer LinkMusician à Toulouse' })
		).toBeInViewport();
		// Défauts du boilerplate signalés en amont (remontees-boilerplate.md) : n° 14 et 15.
		await expectNoA11yViolations(page, ['[data-sidebar="menu-button"]', '.cartButton']);
	});
});
