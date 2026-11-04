import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P1-08a — Médias : un compte neuf (confiance 0) ajoute un lien, qui attend
 * la validation et reste introuvable publiquement ; une fois membre de
 * confiance, son lien est publié d'office et la première démo rapporte.
 */
test.describe('LinkMusician — médias', () => {
	test.setTimeout(5 * 60_000);

	test('publication d’un lien externe', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);

		const user = await requireUser(account.email);
		const person = await db.person.findUniqueOrThrow({ where: { userId: user.id } });

		await test.step('1. Compte neuf : lien en attente, introuvable publiquement', async () => {
			await page.goto('/profil/medias');
			await waitForAppReady(page);
			await page.getByLabel('Adresse').fill('youtube.com/watch?v=dQw4w9WgXcQ');
			await page.getByLabel('Titre (facultatif)').fill('Démo en attente');
			await page.getByRole('button', { name: 'Ajouter' }).click();
			await expect(page.getByText('il sera visible après validation').first()).toBeVisible();
			const pending = await db.media.findFirstOrThrow({ where: { actorId: person.actorId } });
			expect(pending.status).toBe('PENDING_REVIEW');
			const response = await page.goto(`/medias/${pending.id}`);
			expect(response?.status()).toBe(404);
		});

		await test.step('2. Membre de confiance : lien publié, première démo +100 XP', async () => {
			await db.actor.update({ where: { id: person.actorId }, data: { trustLevel: 2 } });
			await page.goto('/profil/medias');
			await waitForAppReady(page);
			await page.getByLabel('Adresse').fill('https://soundcloud.com/lea/premier-titre');
			await page.getByLabel('Titre (facultatif)').fill('Premier titre');
			await page.getByRole('button', { name: 'Ajouter' }).click();
			await expect(page.getByText('+100 XP').first()).toBeVisible();
			const published = await db.media.findFirstOrThrow({
				where: { actorId: person.actorId, status: 'PUBLISHED' }
			});
			await page.goto(`/medias/${published.id}`);
			await expect(page.getByRole('heading', { name: 'Premier titre' })).toBeVisible();
		});
	});
});
