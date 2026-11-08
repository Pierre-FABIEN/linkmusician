import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P3-12 — Écran de carrière en page-menu (D50) et ambition : je choisis
 * « Monter sur scène », l'objectif mis en avant change ; j'en change, rien
 * n'est retiré.
 */
test.describe('LinkMusician — écran de carrière', () => {
	test.setTimeout(2 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('je choisis mon ambition, mes objectifs suivent', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const person = await db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(account.email)).id }
		});
		// Profil de base rempli en base : les objectifs d'ambition passent devant.
		const guitar = await db.instrument.findUniqueOrThrow({ where: { slug: 'guitare-electrique' } });
		const rock = await db.genre.findUniqueOrThrow({ where: { slug: 'rock' } });
		await db.personInstrument.create({
			data: { personId: person.actorId, instrumentId: guitar.id, declaredLevel: 3, isPrimary: true }
		});
		await db.actorGenre.create({ data: { actorId: person.actorId, genreId: rock.id } });
		await setCity(page);

		const menu = page.getByRole('navigation', { name: 'Mode carrière' });
		await test.step('1. Le menu de carrière : l’ambition est à choisir', async () => {
			await page.goto('/espace');
			await waitForAppReady(page);
			await expect(menu.getByRole('link', { name: /Mon ambition.*À choisir/ })).toBeVisible();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('2. « Monter sur scène » : un groupe et un morceau d’abord', async () => {
			await menu.getByRole('link', { name: /Mon ambition/ }).click();
			await page.getByLabel(/Monter sur scène/).check();
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText(/C’est noté : « Monter sur scène »/)).toBeVisible();
			await page.goto('/espace/objectifs');
			await waitForAppReady(page);
			await expect(page.getByText('Rejoins ou monte un groupe')).toBeVisible();
		});

		await test.step('3. « Enregistrer et sortir » : la démo passe devant', async () => {
			await page.goto('/espace/ambition');
			await waitForAppReady(page);
			await page.getByLabel(/Enregistrer et sortir/).check();
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText(/C’est noté/)).toBeVisible();
			await page.goto('/espace/objectifs');
			await waitForAppReady(page);
			await expect(page.getByText('Publie ta première démo')).toBeVisible();
			expect(
				(await db.person.findUniqueOrThrow({ where: { actorId: person.actorId } })).ambition
			).toBe('RECORD');
		});
	});
});
