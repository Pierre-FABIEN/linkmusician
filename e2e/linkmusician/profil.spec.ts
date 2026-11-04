import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P1-06b — « Mon profil » : bio, statut pro déclaré, recherche, matériel,
 * pratique, mobilité et liens (D17, D18). Un lien d'un autre domaine est
 * refusé ; un lien sans `https://` est complété.
 */
test.describe('LinkMusician — profil complet', () => {
	test.setTimeout(5 * 60_000);

	test('édition du profil complet', async ({ page, account }) => {
		await signUpAndVerify(page, account);

		await test.step('1. Métier musicien', async () => {
			await skipOnboarding(page, account.email);
		});

		await test.step('2. Un lien Spotify qui n’en est pas un est refusé', async () => {
			await page.goto('/profil');
			await waitForAppReady(page);
			await page.getByLabel('Spotify').fill('https://youtube.com/@lea');
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(
				page.getByText('Cette adresse ne correspond pas à ce type de lien.')
			).toBeVisible();
		});

		await test.step('3. Profil complet enregistré', async () => {
			await page.getByLabel('Spotify').fill('');
			await page.getByLabel('Présentation').fill('Guitariste punk.\n\nCherche un groupe.');
			await page.getByLabel(/Semi-pro/).check();
			await page.getByLabel('Jams').check();
			await page.getByLabel('Local de répétition').check();
			await page.getByLabel('Je joue depuis').fill('2012');
			await page.getByLabel("Je me déplace jusqu'à").selectOption('25');
			await page.getByLabel('Bandcamp').fill('lea.bandcamp.com');
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText('Ton profil est enregistré.').first()).toBeVisible();

			const user = await requireUser(account.email);
			const person = await db.person.findUniqueOrThrow({
				where: { userId: user.id },
				include: { actor: true, links: true }
			});
			expect(person.actor.bio).toBe('Guitariste punk.\n\nCherche un groupe.');
			expect(person.proStatus).toBe('SEMI_PRO');
			expect(person.lookingFor).toEqual(['JAMS']);
			expect(person.equipment).toEqual(['REHEARSAL_SPACE']);
			expect(person.practiceSince).toBe(2012);
			expect(person.travelRadiusKm).toBe(25);
			expect(person.links.map((l) => [l.kind, l.url])).toEqual([
				['BANDCAMP', 'https://lea.bandcamp.com/']
			]);
		});
	});
});
