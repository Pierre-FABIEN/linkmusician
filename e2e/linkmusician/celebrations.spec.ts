import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P2-11 — Célébrations : la publication d'une démo se fête (gain, succès,
 * niveau), une fois et une seule.
 */
test.describe('LinkMusician — célébrations', () => {
	test.setTimeout(5 * 60_000);

	test('une démo publiée se fête une seule fois', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const user = await requireUser(account.email);
		const person = await db.person.findUniqueOrThrow({ where: { userId: user.id } });
		const region = page.getByRole('status', { name: 'Célébrations' });

		await test.step('1. Rien à fêter au départ', async () => {
			await page.goto('/espace');
			await waitForAppReady(page);
			await expect(region).toBeAttached();
			await expect(region.getByRole('button', { name: 'Fermer' })).toHaveCount(0);
		});

		await test.step('2. La démo publiée se fête', async () => {
			// Membre de confiance : le lien est publié d'office (P1-08a).
			await db.actor.update({ where: { id: person.actorId }, data: { trustLevel: 2 } });
			await page.goto('/profil/medias');
			await waitForAppReady(page);
			await page.getByLabel('Adresse').fill('https://soundcloud.com/lea/premier-titre');
			await page.getByLabel('Titre (facultatif)').fill('Premier titre');
			await page.getByRole('button', { name: 'Ajouter' }).click();
			await expect(region.getByText('Succès débloqué : Premier son')).toBeVisible();
			await expect(region.getByText('Première démo publiée')).toBeVisible();
			await expect(region.getByText('+100 XP')).toBeVisible();
			if (process.env.E2E_SHOTS) {
				await page.screenshot({ path: `${process.env.E2E_SHOTS}/celebrations.png` });
			}
			// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
			await expectNoA11yViolations(page, ['.cartButton']);
			await expect
				.poll(
					async () =>
						(await db.person.findUniqueOrThrow({ where: { actorId: person.actorId } }))
							.celebrationsSeenAt
				)
				.not.toBeNull();
		});

		await test.step('3. Une seule fois : rien à la visite suivante', async () => {
			await page.goto('/espace');
			await waitForAppReady(page);
			await expect(region.getByRole('button', { name: 'Fermer' })).toHaveCount(0);
		});
	});
});
