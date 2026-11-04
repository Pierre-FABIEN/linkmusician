import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P1-06 — « Mon profil musical » : deux instruments avec niveau déclaré et
 * instrument principal, deux genres, des influences. Puis l'export RGPD les
 * contient.
 */
async function personOf(email: string) {
	const user = await requireUser(email);
	return db.person.findUniqueOrThrow({ where: { userId: user.id } });
}

test.describe('LinkMusician — profil musical', () => {
	test.setTimeout(5 * 60_000);

	test('édition du profil musical', async ({ page, account }) => {
		await signUpAndVerify(page, account);

		await test.step('1. Métier musicien', async () => {
			await skipOnboarding(page, account.email);
		});

		await test.step('2. Sans genre, le profil est refusé', async () => {
			await page.goto('/profil/musical');
			await waitForAppReady(page);
			await page.getByLabel('Instrument à ajouter').selectOption({ label: 'Guitare électrique' });
			await page.getByLabel('Niveau en Guitare électrique').selectOption('3');
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText('Choisis au moins un genre.')).toBeVisible();
		});

		await test.step('3. Deux instruments, deux genres, des influences', async () => {
			await page.getByLabel('Instrument à ajouter').selectOption({ label: 'Chant' });
			await page.getByLabel('Niveau en Chant').selectOption('2');
			await page.locator('input[name="primaryInstrumentId"]').nth(1).check();
			await page.getByLabel('Punk', { exact: true }).check();
			await page.getByLabel('Jazz', { exact: true }).check();
			await page.getByLabel('Influences').fill('The Clash\nNina Simone\nthe clash');
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText('Ton profil musical est enregistré.').first()).toBeVisible();

			const person = await personOf(account.email);
			const instruments = await db.personInstrument.findMany({
				where: { personId: person.actorId },
				include: { instrument: true }
			});
			expect(
				instruments
					.map((i) => [i.instrument.slug, i.declaredLevel, i.isPrimary])
					.sort((a, b) => String(a[0]).localeCompare(String(b[0])))
			).toEqual([
				['chant', 2, true],
				['guitare-electrique', 3, false]
			]);
			const genres = await db.actorGenre.findMany({
				where: { actorId: person.actorId },
				include: { genre: true }
			});
			expect(genres.map((g) => g.genre.slug).sort()).toEqual(['jazz', 'punk']);
			const influences = await db.influence.findMany({
				where: { actorId: person.actorId },
				orderBy: { sortOrder: 'asc' }
			});
			expect(influences.map((i) => i.label)).toEqual(['The Clash', 'Nina Simone']);
		});

		await test.step('4. Les valeurs sont relues au rechargement', async () => {
			await page.reload();
			await waitForAppReady(page);
			await expect(page.getByLabel('Niveau en Chant')).toHaveValue('2');
			await expect(page.getByLabel('Punk', { exact: true })).toBeChecked();
		});
	});
});
