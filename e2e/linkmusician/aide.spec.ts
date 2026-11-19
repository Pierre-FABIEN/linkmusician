import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * Centre d'aide : un visiteur lit l'accueil de l'aide, ouvre Rencontre,
 * suit le sommaire et passe à la page suivante ; une personne connectée y
 * arrive depuis le choix du mode et garde la navigation de son espace.
 */
test.describe('LinkMusician — centre d’aide', () => {
	test.setTimeout(2 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const shots = process.env.AIDE_SCREENSHOTS;

	test('un visiteur lit l’aide de Rencontre', async ({ browser }) => {
		const visitor = await browser.newContext();
		try {
			const page = await visitor.newPage();
			await page.goto('/aide');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Comment peut-on t’aider ?');
			await expect(page.getByRole('searchbox', { name: 'Rechercher dans l’aide' })).toBeVisible();
			const cards = page.getByRole('list', { name: 'Toutes les pages de l’aide' });
			await expect(cards.getByRole('link')).toHaveCount(6);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			if (shots) await page.screenshot({ path: `${shots}/aide-accueil.png`, fullPage: true });

			await cards.getByRole('link', { name: /^Rencontre\b/ }).click();
			await expect(page).toHaveURL(/\/aide\/mode-jam$/);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rencontre');
			await page
				.getByRole('navigation', { name: 'Sur cette page' })
				.getByRole('link', { name: '3. Après la jam' })
				.click();
			await expect(page).toHaveURL(/#apres-la-jam$/);
			await expect(page.getByRole('heading', { name: '3. Après la jam' })).toBeInViewport();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			if (shots) await page.screenshot({ path: `${shots}/aide-jam.png`, fullPage: true });

			await page.getByRole('link', { name: /Page suivante/ }).click();
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Collab');

			await page.setViewportSize({ width: 390, height: 844 });
			await page.goto('/aide/mode-carriere');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Collab');
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			if (shots)
				await page.screenshot({ path: `${shots}/aide-carriere-mobile.png`, fullPage: true });

			const missing = await page.goto('/aide/nexiste-pas');
			expect(missing?.status()).toBe(404);
		} finally {
			await visitor.close();
		}
	});

	test('rechercher un sujet et lire une réponse sur mobile', async ({ browser }) => {
		const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
		try {
			const page = await visitor.newPage();
			await page.goto('/aide');
			await waitForAppReady(page);
			const search = page.getByRole('searchbox', { name: 'Rechercher dans l’aide' });
			await search.fill('après la jam');
			await page
				.getByRole('link', { name: /Après la jam/ })
				.first()
				.click();
			await expect(page).toHaveURL(/\/aide\/mode-jam\/apres-la-jam$/);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Après la jam');
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			await page.getByRole('link', { name: /Voir le guide complet/ }).click();
			await expect(page).toHaveURL(/\/aide\/mode-jam$/);
			await page.goto('/aide');
			await search.fill('zzzintrouvablezzz');
			await expect(page.getByText('Aucun sujet trouvé')).toBeVisible();
			await page.getByRole('button', { name: 'Effacer la recherche et les filtres' }).click();
			await expect(search).toHaveValue('');
			const missing = await page.goto('/aide/mode-jam/inexistant');
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
		await page.getByRole('link', { name: 'Collab' }).click();
		await expect(page).toHaveURL(/\/aide\/mode-carriere$/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Collab');
		// Membre connecté : les raccourcis de la coquille restent visibles.
		await expect(page.locator('header').getByRole('link', { name: 'Découvrir' })).toBeVisible();
		await expectNoA11yViolations(page, A11Y_EXCLUDE);
	});
});
