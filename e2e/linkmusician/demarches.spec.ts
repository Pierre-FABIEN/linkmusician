import { test, expect } from '../support/fixtures';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';

/**
 * Guide des démarches (P3-15a) : un visiteur ouvre la page-menu, lit la
 * fiche « Protéger un morceau » (en bref, date de vérification, sources
 * officielles, avertissement), passe à une fiche voisine, et la fiche des
 * mineur·es se lit sur mobile.
 */
test.describe('LinkMusician — démarches', () => {
	test.setTimeout(2 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('un visiteur lit la fiche « Protéger un morceau »', async ({ browser }) => {
		const visitor = await browser.newContext();
		try {
			const page = await visitor.newPage();
			await page.goto('/demarches');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Les démarches');
			const create = page.getByRole('navigation', { name: 'Créer un morceau' });
			await expect(create.getByRole('link')).toHaveCount(2);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);

			await create.getByRole('link', { name: /Protéger un morceau/ }).click();
			await expect(page).toHaveURL(/\/demarches\/proteger-un-morceau$/);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Protéger un morceau');
			await expect(page.getByRole('complementary', { name: 'En bref' })).toBeVisible();
			await expect(page.getByText('Vérifiée le 10 novembre 2026')).toBeVisible();
			const sources = page.getByRole('heading', { name: 'Sources officielles' });
			await expect(sources).toBeVisible();
			await expect(
				page.getByRole('link', { name: /e-Soleau : protégez votre création/ })
			).toHaveAttribute('href', /^https:\/\/www\.inpi\.fr\//);
			await expect(page.getByText('pas un conseil personnalisé', { exact: false })).toBeVisible();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);

			await page
				.getByRole('navigation', { name: 'Démarches voisines' })
				.getByRole('link', { name: /Écrire un morceau à plusieurs/ })
				.click();
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(
				'Écrire un morceau à plusieurs'
			);

			await page.setViewportSize({ width: 390, height: 844 });
			await page.goto('/demarches/mineurs-sur-scene');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(
				'Jouer sur scène avant 18 ans'
			);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);

			const missing = await page.goto('/demarches/nexiste-pas');
			expect(missing?.status()).toBe(404);
		} finally {
			await visitor.close();
		}
	});
});
