import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P1-12 — Signalement → décision du modérateur. Un compte neuf publie un lien
 * (en attente) ; un modérateur le valide ; le même modérateur, comme membre,
 * le signale ; puis, comme modérateur, retire le média. P2-10 : un cercle
 * fermé repéré la nuit apparaît dans la file et se classe sans sanction.
 */
test.describe('LinkMusician — modération', () => {
	test.setTimeout(8 * 60_000);

	test('signalement puis décision du modérateur', async ({ page, account, browser }) => {
		const moderatorAccount = makeAccount();
		const modContext = await browser.newContext();
		const mod = await modContext.newPage();
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const author = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});

			await test.step('1. L’auteur (confiance 0) ajoute un lien : en attente', async () => {
				await page.goto('/profil/medias');
				await waitForAppReady(page);
				await page.getByLabel('Adresse').fill('https://soundcloud.com/auteur/titre');
				await page.getByLabel('Titre (facultatif)').fill('Titre à modérer');
				await page.getByRole('button', { name: 'Ajouter' }).click();
				await expect(page.getByText('il sera visible après validation').first()).toBeVisible();
			});
			const media = await db.media.findFirstOrThrow({ where: { actorId: author.actorId } });

			await test.step('2. Le modérateur valide le média', async () => {
				await signUpAndVerify(mod, moderatorAccount);
				await skipOnboarding(mod, moderatorAccount.email);
				await db.user.update({
					where: { email: moderatorAccount.email },
					data: { role: 'MODERATOR' }
				});
				await mod.goto('/moderation');
				await waitForAppReady(mod);
				const card = mod.getByRole('article', { name: 'Média Titre à modérer' });
				// Clic direct sur l'élément (le défilement personnalisé peut tromper
				// Playwright), puis vérification en base plutôt que sur la notification.
				await card
					.getByRole('button', { name: 'Valider' })
					.evaluate((b) => (b as HTMLButtonElement).click());
				await expect
					.poll(
						async () => (await db.media.findUniqueOrThrow({ where: { id: media.id } })).status,
						{
							timeout: 30_000
						}
					)
					.toBe('PUBLISHED');
			});

			await test.step('3. Un membre signale le média', async () => {
				await mod.goto(`/medias/${media.id}`);
				await waitForAppReady(mod);
				await mod.getByText('Signaler', { exact: true }).click();
				await mod.getByLabel('Motif').selectOption('SPAM');
				await mod.getByLabel('Précisions (facultatif)').fill('Publicité déguisée');
				await mod.getByRole('button', { name: 'Envoyer le signalement' }).click();
				await expect(mod.getByText('ton signalement est transmis').first()).toBeVisible();
			});

			await test.step('4. Le modérateur retire le média', async () => {
				await mod.goto('/moderation');
				await waitForAppReady(mod);
				await expect(mod.getByText('« Publicité déguisée »')).toBeVisible();
				// Clic direct sur l'élément (le défilement personnalisé peut tromper
				// Playwright), puis vérification en base plutôt que sur la notification.
				await mod
					.getByRole('button', { name: 'Retirer le média' })
					.evaluate((b) => (b as HTMLButtonElement).click());
				await expect
					.poll(
						async () => (await db.media.findUniqueOrThrow({ where: { id: media.id } })).status,
						{
							timeout: 30_000
						}
					)
					.toBe('REJECTED');
				// Le signalement est fermé après la suppression du fichier : on attend.
				await expect
					.poll(
						async () =>
							(await db.report.findFirstOrThrow({ where: { targetId: media.id } })).status,
						{
							timeout: 30_000
						}
					)
					.toBe('ACTIONED');
				const response = await page.goto(`/medias/${media.id}`);
				expect(response?.status()).toBe(404);
			});

			await test.step('5. Cercle fermé : en revue, classé sans sanction (P2-10)', async () => {
				const modPerson = await db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(moderatorAccount.email)).id },
					include: { actor: true }
				});
				const memberIds = [author.actorId, modPerson.actorId].sort();
				const found = await db.collusionCase.create({
					data: {
						memberIds,
						memberKey: memberIds.join('|'),
						interactions: 5,
						density: 1,
						sharedIps: 1
					}
				});
				await mod.goto('/moderation');
				await waitForAppReady(mod);
				const card = mod
					.getByRole('article', { name: 'Cercle fermé de 2 personnes' })
					.filter({ hasText: modPerson.actor.displayName });
				await expect(card).toBeVisible();
				await expect(card.getByText('1 adresse IP partagée entre membres.')).toBeVisible();
				await card
					.getByRole('button', { name: "Rien d'anormal" })
					.evaluate((b) => (b as HTMLButtonElement).click());
				await expect
					.poll(
						async () =>
							(await db.collusionCase.findUniqueOrThrow({ where: { id: found.id } })).status,
						{
							timeout: 30_000
						}
					)
					.toBe('DISMISSED');
				expect(await db.sanction.count({ where: { actorId: { in: memberIds } } })).toBe(0);
			});
		} finally {
			await db.collusionCase.deleteMany({
				where: {
					memberIds: {
						has:
							(await db.person.findFirst({ where: { user: { email: account.email } } }))?.actorId ??
							''
					}
				}
			});
			await modContext.close();
			await deleteUser(moderatorAccount.email);
		}
	});
});
