import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P2-12, P2-12b — Menu du jeu : présentation pas à pas la première fois,
 * accès direct ensuite, dernier mode retenu ; « Ta prochaine étape » dans
 * chaque mode ; la navigation de l'espace suit aussi sur le profil public.
 */
test.describe('LinkMusician — modes de jeu', () => {
	test.setTimeout(6 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	test('menu, présentation, prochaine étape', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const person = await db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(account.email)).id },
			include: { actor: true }
		});

		await test.step('1. Le menu du jeu', async () => {
			await page.goto('/jouer');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { level: 1, name: 'Choisis ton mode' })).toBeVisible();
			await expect(page.getByRole('button', { name: /Mode carrière/ })).toContainText(
				'en complétant ton profil'
			);
			await expect(page.getByRole('button', { name: /Mode jam/ })).toContainText(
				'rapporte des points'
			);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('2. Mode jam, la première fois : présentation en 3 étapes', async () => {
			await page.getByRole('button', { name: /Mode jam/ }).click();
			await expect(page).toHaveURL(/\/jouer\/jam$/);
			await expect(page.getByText('Étape 1 sur 3')).toBeVisible();
			await expect(page.getByRole('heading', { name: 'Jouer pour le plaisir' })).toBeVisible();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			await page.getByRole('button', { name: 'Suivant' }).click();
			await expect(page.getByRole('heading', { name: 'Tu gagnes aussi des points' })).toBeVisible();
			await page.getByRole('button', { name: 'Suivant' }).click();
			await expect(page.getByText('Étape 3 sur 3')).toBeVisible();
			await page.getByRole('button', { name: 'C’est parti !'.replace('’', "'") }).click();
			await expect(page).toHaveURL(/\/jam$/);
			await expect(page.getByRole('heading', { name: 'Indique ta ville' })).toBeVisible(); // Ta prochaine étape
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('3. Ensuite : accès direct, « Reprendre »', async () => {
			await page.goto('/jouer');
			await waitForAppReady(page);
			const first = page
				.getByRole('button')
				.filter({ hasText: /Mode (jam|carrière)/ })
				.first();
			await expect(first).toContainText('Mode jam');
			await expect(first).toContainText('Reprendre');
			await first.click();
			await expect(page).toHaveURL(/\/jam$/);
		});

		await test.step('4. Mode carrière : présentation passée, prochaine étape', async () => {
			await page.goto('/jouer');
			await waitForAppReady(page);
			await page.getByRole('button', { name: /Mode carrière/ }).click();
			await expect(page).toHaveURL(/\/jouer\/carriere$/);
			await page.getByRole('button', { name: 'Passer' }).click();
			await expect(page).toHaveURL(/\/espace$/);
			await expect(page.getByText('Ta prochaine étape')).toBeVisible();
			const saved = await db.person.findUniqueOrThrow({ where: { actorId: person.actorId } });
			expect(saved.preferredMode).toBe('CAREER');
			expect([...saved.modeIntrosSeen].sort()).toEqual(['CAREER', 'JAM']);
		});

		await test.step('5. Profil public : la navigation de l’espace reste', async () => {
			await page.goto(`/@${person.actor.handle}`);
			await waitForAppReady(page);
			await expect(page.getByRole('navigation', { name: 'Espace', exact: true })).toBeVisible();
			await expect(
				page.getByRole('link', { name: /Mode carrière : changer de mode/ })
			).toBeVisible();
		});
	});
});
