import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P2-12, P2-12b — Menu du jeu : présentation pas à pas la première fois,
 * accès direct ensuite, dernier mode retenu ; « Ta prochaine étape » dans
 * chaque mode ; la bascule directe met aussi à jour le mode préféré.
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
		const careerChoice = page.locator('button[name="mode"][value="CAREER"]');
		const jamChoice = page.locator('button[name="mode"][value="JAM"]');

		await test.step('1. Le menu du jeu', async () => {
			await page.goto('/jouer');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { level: 1, name: 'Choisis ton mode' })).toBeVisible();
			await expect(careerChoice).toContainText('en complétant ton profil');
			await expect(jamChoice).toContainText('tes points montent');
			const initialViewport = page.viewportSize();
			await page.setViewportSize({ width: 1440, height: 900 });
			const careerCard = await careerChoice.boundingBox();
			const jamCard = await jamChoice.boundingBox();
			expect(careerCard).not.toBeNull();
			expect(jamCard).not.toBeNull();
			if (!careerCard || !jamCard) throw new Error('Les cartes de mode doivent être visibles.');
			expect(careerCard.width).toBeGreaterThan(500);
			expect(Math.abs(careerCard.y - jamCard.y)).toBeLessThan(2);
			await page.setViewportSize({ width: 320, height: 800 });
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
			).toBe(true);
			if (initialViewport) await page.setViewportSize(initialViewport);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('2. Mode jam, la première fois : présentation en 3 étapes', async () => {
			await jamChoice.click();
			await expect(page).toHaveURL(/\/jouer\/jam$/);
			await expect(page.getByText('Étape 1 sur 3')).toBeVisible();
			await expect(page.getByRole('heading', { name: 'Jouer pour le plaisir' })).toBeVisible();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			await page.getByRole('button', { name: 'Suivant' }).click();
			await expect(page.getByRole('heading', { name: 'Fais-toi remarquer' })).toBeVisible();
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
			await expect(jamChoice).toContainText('Mode jam');
			await expect(jamChoice).toContainText('Reprendre');
			await jamChoice.click();
			await expect(page).toHaveURL(/\/jam$/);
		});

		await test.step('4. Mode carrière : présentation passée, prochaine étape', async () => {
			await page.goto('/jouer');
			await waitForAppReady(page);
			await careerChoice.click();
			await expect(page).toHaveURL(/\/jouer\/carriere$/);
			await page.getByRole('button', { name: 'Passer' }).click();
			await expect(page).toHaveURL(/\/espace$/);
			await expect(page.getByText('Ta prochaine étape')).toBeVisible();
			const saved = await db.person.findUniqueOrThrow({ where: { actorId: person.actorId } });
			expect(saved.preferredMode).toBe('CAREER');
			expect([...saved.modeIntrosSeen].sort()).toEqual(['CAREER', 'JAM']);
		});

		await test.step('5. La pastille bascule directement de mode', async () => {
			await page.goto(`/@${person.actor.handle}`);
			await waitForAppReady(page);
			await expect(page.locator('header').getByRole('link', { name: 'Découvrir' })).toBeVisible();
			await page.getByRole('button', { name: 'Passer au Mode jam' }).click();
			await expect(page).toHaveURL(/\/jam$/);
			let saved = await db.person.findUniqueOrThrow({ where: { actorId: person.actorId } });
			expect(saved.preferredMode).toBe('JAM');
			await page.getByRole('button', { name: 'Passer au Mode carrière' }).click();
			await expect(page).toHaveURL(/\/espace$/);
			saved = await db.person.findUniqueOrThrow({ where: { actorId: person.actorId } });
			expect(saved.preferredMode).toBe('CAREER');
		});
	});
});
