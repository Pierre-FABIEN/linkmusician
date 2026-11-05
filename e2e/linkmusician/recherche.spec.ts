import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, skipOnboarding } from '../support/linkmusician';

/**
 * P2-01 — Recherche : depuis Toulouse, un batteur de Blagnac (~7 km) est
 * trouvé à « 5 à 10 km », un bassiste de Montauban (~46 km) seulement avec
 * un rayon plus large ; les filtres passent par l'URL ; une carte mène au
 * profil public.
 */
test.describe('LinkMusician — recherche', () => {
	test.setTimeout(5 * 60_000);

	test('trouver des musicien·nes autour de soi', async ({ page, account }) => {
		const drummer = await createMusician({
			name: 'Batteur',
			commune: { code: '31069', nom: 'Blagnac', dep: '31', lat: 43.6459, lng: 1.3785 },
			instrument: ['batterie', 4],
			genre: 'funk'
		});
		const bassist = await createMusician({
			name: 'Bassiste',
			commune: { code: '82121', nom: 'Montauban', dep: '82', lat: 44.0221, lng: 1.3529 },
			instrument: ['basse', 3],
			genre: 'jazz'
		});

		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const results = page.getByRole('list', { name: 'Résultats' });

		await test.step('1. Sans ville : invitation à l’indiquer', async () => {
			await page.goto('/decouvrir');
			await waitForAppReady(page);
			await expect(page.getByRole('link', { name: 'Indiquer ma ville' })).toBeVisible();
		});

		await test.step('2. Je m’installe à Toulouse', async () => {
			await page.goto('/profil/ville');
			await waitForAppReady(page);
			await page.getByLabel('Ta commune').pressSequentially('toulou', { delay: 50 });
			await page.getByRole('option').first().getByRole('button').click();
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText('Ta ville est enregistrée').first()).toBeVisible();
		});

		await test.step('3. Rayon de 10 km : le batteur, par tranche de distance', async () => {
			await page.goto('/decouvrir?rayon=10');
			await waitForAppReady(page);
			const card = results.getByRole('link', { name: new RegExp(drummer.displayName) });
			await expect(card).toBeVisible();
			await expect(card).toContainText('5 à 10 km · Blagnac');
			await expect(results.getByText(bassist.displayName)).toHaveCount(0);
			// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
			await expectNoA11yViolations(page, ['.cartButton']);
		});

		await test.step('4. Rayon de 50 km et filtre instrument par le formulaire', async () => {
			await page.getByLabel('Distance').selectOption('50');
			await page.getByLabel('Instrument').selectOption({ label: 'Basse électrique' });
			await page.getByRole('button', { name: 'Chercher' }).click();
			await expect(page).toHaveURL(/instrument=basse/);
			await expect(results.getByText(bassist.displayName)).toBeVisible();
			await expect(results.getByText(drummer.displayName)).toHaveCount(0);
			if (process.env.E2E_SHOTS) {
				await page.setViewportSize({ width: 390, height: 844 });
				await page.screenshot({
					path: `${process.env.E2E_SHOTS}/recherche-mobile.png`,
					fullPage: false
				});
				await page.setViewportSize({ width: 1280, height: 720 });
			}
		});

		await test.step('5. Une carte mène au profil public', async () => {
			await results.getByRole('link', { name: new RegExp(bassist.displayName) }).click();
			await expect(page).toHaveURL(new RegExp(`/@${bassist.handle}$`));
			await expect(
				page.getByRole('heading', { level: 1, name: bassist.displayName })
			).toBeVisible();
		});
	});
});
