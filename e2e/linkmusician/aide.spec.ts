import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * Centre d'aide : un visiteur lit l'accueil de l'aide, ouvre le mode jam,
 * suit le sommaire et passe à la page suivante ; une personne connectée y
 * arrive depuis le choix du mode et garde la navigation de son espace.
 */
test.describe('LinkMusician — centre d’aide', () => {
	test.setTimeout(2 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const shots = process.env.AIDE_SCREENSHOTS;

	test('un visiteur lit l’aide du mode jam', async ({ browser }) => {
		const visitor = await browser.newContext();
		try {
			const page = await visitor.newPage();
			await page.goto('/aide');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(
				'Bienvenue dans l’aide de LinkMusician'
			);
			await expect(page.getByRole('complementary', { name: 'En bref' })).toBeVisible();
			const cards = page.getByRole('list', { name: 'Toutes les pages de l’aide' });
			await expect(cards.getByRole('link')).toHaveCount(6);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			if (shots) await page.screenshot({ path: `${shots}/aide-accueil.png`, fullPage: true });

			await cards.getByRole('link', { name: /Le mode jam/ }).click();
			await expect(page).toHaveURL(/\/aide\/mode-jam$/);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Le mode jam');
			await page
				.getByRole('navigation', { name: 'Sur cette page' })
				.getByRole('link', { name: '3. Après la jam' })
				.click();
			await expect(page).toHaveURL(/#apres-la-jam$/);
			await expect(page.getByRole('heading', { name: '3. Après la jam' })).toBeInViewport();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			if (shots) await page.screenshot({ path: `${shots}/aide-jam.png`, fullPage: true });

			await page.getByRole('link', { name: /Page suivante/ }).click();
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Le mode carrière');

			await page.setViewportSize({ width: 390, height: 844 });
			await page.goto('/aide/mode-carriere');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Le mode carrière');
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			if (shots)
				await page.screenshot({ path: `${shots}/aide-carriere-mobile.png`, fullPage: true });

			const missing = await page.goto('/aide/nexiste-pas');
			expect(missing?.status()).toBe(404);
		} finally {
			await visitor.close();
		}
	});

	test('depuis le choix du mode, « Comment ça marche ? »', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		await page.goto('/jouer');
		await waitForAppReady(page);
		await page.getByRole('link', { name: 'Le mode carrière' }).click();
		await expect(page).toHaveURL(/\/aide\/mode-carriere$/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Le mode carrière');
		// Membre connecté : les raccourcis de la coquille restent visibles.
		await expect(page.locator('header').getByRole('link', { name: 'Découvrir' })).toBeVisible();
		await expectNoA11yViolations(page, A11Y_EXCLUDE);
	});
});
