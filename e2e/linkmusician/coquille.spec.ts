import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P0-05b — Coquille de l'espace : navigation à cinq entrées, pages
 * « bientôt », accessibilité en clair et en sombre.
 */
test.describe('LinkMusician — coquille de l’espace', () => {
	test.setTimeout(5 * 60_000);

	// Bouton panier du boilerplate (boutique active en e2e seulement),
	// remontees-boilerplate.md n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	test('navigation, pages « bientôt » et accessibilité', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);

		await test.step('1. L’espace a sa navigation', async () => {
			await page.goto('/espace');
			await waitForAppReady(page);
			const nav = page.getByRole('navigation', { name: 'Espace' });
			await expect(nav.getByRole('link')).toHaveCount(5);
			await expect(nav.getByRole('link', { name: 'Mon parcours' })).toHaveAttribute(
				'aria-current',
				'page'
			);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		for (const [label, path, heading] of [
			['Découvrir', '/decouvrir', 'Découvrir'],
			['Annonces', '/annonces', 'Annonces'],
			['Messages', '/messages', 'Messages']
		] as const) {
			await test.step(`2. ${label} : page « bientôt »`, async () => {
				await page
					.getByRole('navigation', { name: 'Espace' })
					.getByRole('link', { name: label })
					.click();
				await expect(page).toHaveURL(new RegExp(`${path}$`));
				await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
				await expect(page.getByText('Ce qui arrive')).toBeVisible();
			});
		}
		await expectNoA11yViolations(page, A11Y_EXCLUDE);

		await test.step('3. Profil actif aussi sur les réglages', async () => {
			await page.goto('/reglages');
			await waitForAppReady(page);
			await expect(
				page.getByRole('navigation', { name: 'Espace' }).getByRole('link', { name: 'Profil' })
			).toHaveAttribute('aria-current', 'page');
		});

		await test.step('4. Thème sombre : contrastes', async () => {
			await page.emulateMedia({ colorScheme: 'dark' });
			await page.goto('/espace');
			await waitForAppReady(page);
			if (process.env.E2E_SHOTS)
				await page.screenshot({
					path: `${process.env.E2E_SHOTS}/espace-sombre.png`,
					fullPage: false
				});
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			await page.emulateMedia({ colorScheme: 'light' });
			await page.goto('/decouvrir');
			await waitForAppReady(page);
			if (process.env.E2E_SHOTS)
				await page.screenshot({
					path: `${process.env.E2E_SHOTS}/decouvrir-clair.png`,
					fullPage: false
				});
		});
	});
});
