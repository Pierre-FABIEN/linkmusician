import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P0-05b — Coquille de l'espace : actions de l'en-tête, pages
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

		await test.step('1. Les raccourcis sont dans l’en-tête', async () => {
			await page.goto('/espace');
			await waitForAppReady(page);
			const header = page.locator('header');
			await expect(header.getByRole('link', { name: 'Découvrir' })).toBeVisible();
			await expect(header.getByRole('link', { name: 'Messages' })).toBeVisible();
			await expect(header.getByRole('link', { name: 'Notifications' })).toBeVisible();
			await expect(page.getByRole('navigation', { name: 'Espace', exact: true })).toHaveCount(0);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		// Les pages « bientôt » sont devenues réelles (P2-01, P2-02, P2-04) : voir leurs specs.
		await expectNoA11yViolations(page, A11Y_EXCLUDE);

		await test.step('3. Le profil est dans le menu du compte', async () => {
			await page.goto('/reglages');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Ouvrir le menu du compte' }).click();
			await expect(page.getByRole('menuitem', { name: 'Mon profil' })).toHaveAttribute(
				'aria-current',
				'page'
			);
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

	test('accueil public : présentation et connexion', async ({ page }) => {
		// En e2e la boutique est active : `/` sert l'accueil du boilerplate, et
		// l'accueil LinkMusician reste joignable à `/accueil`.
		for (const colorScheme of ['light', 'dark'] as const) {
			await page.emulateMedia({ colorScheme });
			await page.goto('/accueil');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { level: 1, name: 'LinkMusician' })).toBeVisible();
			await expect(page.getByRole('heading', { name: 'Collab' })).toBeVisible();
			await expect(page.getByRole('heading', { name: 'Rencontre' })).toBeVisible();
			await expect(page.getByRole('link', { name: 'Créer un compte' }).first()).toHaveAttribute(
				'href',
				'/auth/signup'
			);
			await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible();
			if (process.env.E2E_SHOTS) {
				await page.screenshot({ path: `${process.env.E2E_SHOTS}/accueil-${colorScheme}.png` });
			}
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		}
	});
});
