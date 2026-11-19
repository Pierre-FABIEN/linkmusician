import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { promoteToAdmin } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * Melokiva Diagram (DIAGRAM-02, DIAGRAM-03, D80) : cartographie interne,
 * réservée aux comptes autorisés ; aucune mutation, aucune donnée réelle.
 */
test.describe('Melokiva Diagram', () => {
	test.setTimeout(4 * 60_000);

	test('réservé aux comptes autorisés, lectures comprises', async ({ page, account }) => {
		await page.goto('/diagram');
		await expect.poll(() => new URL(page.url()).pathname).toBe('/auth/login');

		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		for (const path of ['/diagram', '/diagram/d/etats-besoin', '/diagram/controle']) {
			const res = await page.goto(path);
			expect(res?.status(), path).toBe(404);
		}
		// Un endpoint ne passe pas par le layout : il garde sa propre garde.
		expect((await page.request.get('/diagram/api/recherche?q=besoin')).status()).toBe(404);
		expect((await page.request.get('/diagram/d/etats-besoin/svg')).status()).toBe(404);

		await promoteToAdmin(account.email);
		const res = await page.goto('/diagram');
		expect(res?.headers()['cache-control']).toContain('no-store');
		await waitForAppReady(page);
		await expect(
			page.getByRole('heading', { name: 'Vue globale de Melokiva', level: 1 })
		).toBeVisible();
	});

	test('trouver un processus et suivre le parcours de référence', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		await promoteToAdmin(account.email);

		// Recherche globale : un terme présent seulement dans le corps d'un processus.
		await page.goto('/diagram');
		await waitForAppReady(page);
		const search = page.getByRole('combobox', { name: 'Recherche globale' });
		await search.fill('retrait coordination');
		await expect(
			page.getByRole('option', { name: /Retirer la coordination/ }).first()
		).toBeVisible();
		await search.press('Enter');
		await expect(page).toHaveURL(/\/diagram\/recherche\?q=retrait/);
		await page
			.getByRole('link', { name: /Retirer la coordination/ })
			.first()
			.click();
		await expect(
			page.getByRole('heading', { level: 1, name: /Retirer la coordination/ })
		).toBeVisible();

		// Menu : filtrer, puis ouvrir une machine à états.
		const menu = page.getByRole('navigation', { name: 'Diagrammes' });
		await menu.getByRole('searchbox', { name: 'Filtrer le menu' }).fill('cycle de vie');
		await menu
			.getByRole('link', { name: /Cycle de vie d’un besoin/ })
			.first()
			.click();
		await expect(
			page.getByRole('heading', { level: 1, name: 'Cycle de vie d’un besoin' })
		).toBeVisible();

		const errors: string[] = [];
		page.on('pageerror', (err) => errors.push(err.message));
		// Lien profond vers un nœud : le panneau dit qui, quoi, quelles données.
		await page.goto('/diagram/d/parcours-groupe-ep?noeud=need-add');
		await waitForAppReady(page);
		const panel = page.getByRole('article', { name: /Elle ajoute le besoin/ });
		await expect(panel).toBeVisible();
		await expect(panel.getByText('ProjectNeed').first()).toBeVisible();
		await expect(panel.getByText(/Aucune invitation, annonce, participation ni XP/)).toBeVisible();

		// Clavier : choisir un autre nœud sans souris ; l'URL suit.
		const node = page.getByRole('button', { name: 'Inès invite Sam au projet' });
		await node.focus();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('article', { name: 'Inès invite Sam au projet' })).toBeVisible();
		await expect(page).toHaveURL(/noeud=invite/);

		// Rendu textuel et export SVG sûr.
		const text = page.locator('details', { hasText: 'Rendu textuel du diagramme' });
		await text.getByText(/Rendu textuel du diagramme/).click();
		await expect(
			text.getByRole('button', { name: 'Inès monte le groupe « Lumière »' })
		).toBeVisible();
		const svg = await page.request.get('/diagram/d/parcours-groupe-ep/svg');
		expect(svg.headers()['content-type']).toContain('image/svg+xml');
		const body = await svg.text();
		expect(body).toContain('<svg');
		expect(body).not.toMatch(/<script|\son\w+=|href=/i);

		expect(errors).toEqual([]);
		await expectNoA11yViolations(page);
	});

	test('sur téléphone : le menu s’ouvre en tiroir', async ({ page, account }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		await promoteToAdmin(account.email);
		await page.goto('/diagram/controle');
		await waitForAppReady(page);
		await expect(
			page.getByRole('heading', { level: 1, name: 'Couverture et contrôle' })
		).toBeVisible();
		await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
		const drawer = page.getByRole('dialog', { name: 'Menu des diagrammes' });
		await expect(drawer).toBeVisible();
		await drawer.getByRole('link', { name: 'Inventaire des processus' }).click();
		await expect(drawer).toBeHidden();
		await expect(page.getByRole('heading', { level: 1, name: 'Processus' })).toBeVisible();
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > window.innerWidth
		);
		expect(overflow).toBe(false);
	});
});
