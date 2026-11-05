import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, promoteToAdmin, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P1-13 — Indicateurs produit : une visite de l'espace est relevée (une
 * ligne par jour au plus), et `/admin/indicateurs` affiche les indicateurs
 * disponibles, réservés aux administrateurs.
 */
test.describe('LinkMusician — indicateurs produit', () => {
	test.setTimeout(5 * 60_000);

	test('relevé d’activité et page des indicateurs', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const user = await requireUser(account.email);
		const person = await db.person.findUniqueOrThrow({ where: { userId: user.id } });

		await test.step('1. Deux visites de l’espace : un seul jour relevé', async () => {
			await page.goto('/espace');
			await waitForAppReady(page);
			await page.goto('/reglages');
			await waitForAppReady(page);
			await expect
				.poll(() => db.actorActivityDay.count({ where: { actorId: person.actorId } }))
				.toBe(1);
		});

		await test.step('2. Réservé aux administrateurs', async () => {
			await page.goto('/admin/indicateurs');
			expect(new URL(page.url()).pathname).not.toBe('/admin/indicateurs');
		});

		await test.step('3. Un administrateur voit les indicateurs', async () => {
			await promoteToAdmin(account.email);
			await page.goto('/admin/indicateurs');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { name: 'Indicateurs produit' })).toBeVisible();
			await expect(page.getByRole('heading', { name: 'Onboarding terminé' })).toBeVisible();
			await expect(
				page.getByRole('heading', { name: 'Conversation réciproque dans les 14 jours' })
			).toBeVisible();
			await expect(page.getByText('Pas encore assez de recul').first()).toBeVisible();
			await expect(page.getByRole('table', { name: 'Personnes par métier' })).toContainText(
				'Musicien'
			);
			await page.getByRole('link', { name: 'Depuis le début' }).click();
			await expect(page).toHaveURL(/periode=tout/);
			// Défauts du boilerplate signalés en amont (remontees-boilerplate.md) :
			// liens dans des boutons de la barre latérale admin (n° 15) et nom du
			// bouton panier (n° 14, boutique active en e2e seulement).
			await expectNoA11yViolations(page, ['[data-sidebar="menu-button"]', '.cartButton']);
		});
	});
});
