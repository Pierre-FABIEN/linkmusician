import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';

/**
 * P1-03b — « Qui es-tu ? » : une personne sans métier est envoyée sur l'écran
 * de choix, en coche deux, désigne le principal, puis le change dans les
 * réglages. Exactement un métier principal à chaque étape (D15).
 */
async function tracksOf(email: string) {
	const user = await requireUser(email);
	const person = await db.person.findUniqueOrThrow({
		where: { userId: user.id },
		include: { tracks: true }
	});
	// Tri alphabétique en JS : en SQL, un enum se trie dans l'ordre de sa déclaration.
	return person.tracks
		.map((t) => ({ track: t.track, isPrimary: t.isPrimary }))
		.sort((a, b) => a.track.localeCompare(b.track));
}

test.describe('LinkMusician — métiers', () => {
	test.setTimeout(5 * 60_000);

	test('choix de deux métiers, puis changement du principal', async ({ page, account }) => {
		await signUpAndVerify(page, account);

		await test.step("1. L'espace renvoie vers « Qui es-tu ? »", async () => {
			await page.goto('/espace');
			await waitForPath(page, '/qui-es-tu');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { name: /Qui es-tu/ })).toBeVisible();
		});

		await test.step('2. Sans métier coché, le choix est refusé', async () => {
			await page.getByRole('button', { name: 'Continuer' }).click();
			await expect(page.getByText('Choisis au moins un métier.').first()).toBeVisible();
			expect(await tracksOf(account.email)).toEqual([]);
		});

		await test.step('3. Deux métiers, Booker principal', async () => {
			await page.getByLabel('Musicien·ne').check();
			await page.getByLabel('Booker / programmateur·rice').check();
			await page.locator('input[type="radio"][name="primary"][value="BOOKER"]').check();
			await page.getByRole('button', { name: 'Continuer' }).click();
			await waitForPath(page, '/demarrer/instruments');

			expect(await tracksOf(account.email)).toEqual([
				{ track: 'BOOKER', isPrimary: true },
				{ track: 'MUSICIAN', isPrimary: false }
			]);
		});

		await test.step("4. L'onboarding fini, l'écran de choix n'est plus proposé", async () => {
			const user = await requireUser(account.email);
			await db.person.update({ where: { userId: user.id }, data: { onboardedAt: new Date() } });
			await page.goto('/qui-es-tu');
			await waitForPath(page, '/espace');
		});

		await test.step('5. Réglages : le principal passe à Musicien·ne', async () => {
			await page.goto('/reglages/metiers');
			await waitForAppReady(page);
			await page.locator('input[type="radio"][name="primary"][value="MUSICIAN"]').check();
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText('Tes métiers sont enregistrés.').first()).toBeVisible();

			expect(await tracksOf(account.email)).toEqual([
				{ track: 'BOOKER', isPrimary: false },
				{ track: 'MUSICIAN', isPrimary: true }
			]);
		});
	});
});
