import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * D52 — Fil d'Ariane en badges : sur un écran de Rencontre, les badges
 * mènent à l'accueil du mode ; la page en cours est marquée, sans lien.
 * Absent sur l'accueil du mode.
 */
test.describe('LinkMusician — fil d’Ariane', () => {
	test.setTimeout(2 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('je remonte de « Jams à venir » à Rencontre', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const trail = page.getByRole('navigation', { name: 'Fil d’Ariane' });

		await page.goto('/jam/agenda');
		await waitForAppReady(page);
		await expect(trail.locator('[aria-current="page"]')).toHaveText('Jams à venir');
		await expectNoA11yViolations(page, A11Y_EXCLUDE);
		await trail.getByRole('link', { name: 'Rencontre' }).click();
		await expect(page).toHaveURL(/\/jam$/);
		await expect(trail).toHaveCount(0);

		await page.goto('/profil/ville');
		await waitForAppReady(page);
		await expect(trail.getByRole('link', { name: 'Mon profil' })).toHaveAttribute(
			'href',
			'/profil'
		);
	});
});
