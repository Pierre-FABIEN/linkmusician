import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P1-11 — Profil public et tableau de bord : le tableau de bord reflète le
 * gain d'une démo publiée (raison lisible, succès) ; le profil public montre
 * palier et succès mais jamais l'XP ; un profil masqué renvoie une 404, ses
 * médias aussi.
 */
test.describe('LinkMusician — profil public et tableau de bord', () => {
	test.setTimeout(5 * 60_000);

	// Bouton panier du boilerplate (boutique active en e2e, en veille dans
	// LinkMusician), voir docs/plan/remontees-boilerplate.md, n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	test('gain d’une démo, profil public, masquage', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const user = await requireUser(account.email);
		const person = await db.person.findUniqueOrThrow({
			where: { userId: user.id },
			include: { actor: true }
		});
		const handle = person.actor.handle;

		await test.step('1. Tableau de bord vide : objectifs, aucun gain', async () => {
			await page.goto('/espace');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { name: 'Tes prochains objectifs' })).toBeVisible();
			await expect(page.getByText(/Aucun gain pour l.instant/)).toBeVisible();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('2. Une démo publiée apparaît dans les gains', async () => {
			// Membre de confiance : le lien est publié d'office (P1-08a).
			await db.actor.update({ where: { id: person.actorId }, data: { trustLevel: 2 } });
			await page.goto('/profil/medias');
			await waitForAppReady(page);
			await page.getByLabel('Adresse').fill('https://soundcloud.com/lea/premier-titre');
			await page.getByLabel('Titre (facultatif)').fill('Premier titre');
			await page.getByRole('button', { name: 'Ajouter' }).click();
			await expect(page.getByText('+100 XP').first()).toBeVisible();

			await page.goto('/espace');
			await waitForAppReady(page);
			const history = page.getByRole('list', { name: 'Historique des gains' });
			await expect(history.getByText('Première démo publiée')).toBeVisible();
			await expect(history.getByText('+100 XP')).toBeVisible();
			// L'objectif « Publie ta première démo » n'est plus proposé.
			await expect(page.getByText('Publie ta première démo')).toHaveCount(0);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('3. Profil public : palier et succès, jamais l’XP', async () => {
			const response = await page.goto(`/@${handle}`);
			expect(response?.status()).toBe(200);
			await waitForAppReady(page);
			await expect(
				page.getByRole('heading', { level: 1, name: person.actor.displayName })
			).toBeVisible();
			await expect(page.getByText('Premier son')).toBeVisible();
			await expect(page.locator('main').getByText(/\bXP\b/)).toHaveCount(0);
			const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
			expect(jsonLd.some((s) => s.includes('"@type":"Person"'))).toBe(true);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);

			// Une seule adresse par profil : les majuscules redirigent.
			await page.goto(`/@${handle.toUpperCase()}`);
			expect(new URL(page.url()).pathname).toBe(`/@${handle}`);
		});

		await test.step('4. Profil masqué : 404, médias compris', async () => {
			await page.goto('/reglages');
			await waitForAppReady(page);
			await page.getByLabel('Masquer mon profil public').check();
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText('Ton profil public est masqué.')).toBeVisible();
			await expect
				.poll(
					async () => (await db.actor.findUniqueOrThrow({ where: { id: person.actorId } })).hidden
				)
				.toBe(true);

			const profile = await page.goto(`/@${handle}`);
			expect(profile?.status()).toBe(404);
			const media = await db.media.findFirstOrThrow({
				where: { actorId: person.actorId, status: 'PUBLISHED' }
			});
			const mediaPage = await page.goto(`/medias/${media.id}`);
			expect(mediaPage?.status()).toBe(404);
		});
	});

	test('handle inconnu : 404', async ({ page }) => {
		const response = await page.goto('/@personne-inconnue-p111');
		expect(response?.status()).toBe(404);
	});
});
