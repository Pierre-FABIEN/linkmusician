import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P8 (D77) — scénario B de la conception 19 : Camille, chanteuse et
 * guitariste, joue **en son nom**. Elle n'a aucun groupe et n'en crée pas.
 * Elle propose « Concert » à Sam, qui gère une association vérifiée ; « Qui
 * a joué » la propose d'office ; Sam confirme ; « La scène » est franchie
 * sur sa carte, sa fiche compte le concert, et rien ne l'invite à monter un
 * groupe pour y arriver.
 *
 * Écrit le 19/11/2026, **non exécuté** dans la session (recette globale).
 * Hors périmètre (P8b) : candidater en son nom à un plateau « solo ».
 */
test.describe('LinkMusician — artiste solo sur scène (P8)', () => {
	test.setTimeout(6 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('un concert en son nom, vérifié par l’hôte, sans groupe', async ({
		page,
		account,
		browser
	}) => {
		const samAccount = makeAccount();
		const samContext = await browser.newContext();
		const samPage = await samContext.newPage();
		const suffix = Math.random().toString(36).slice(2, 8);
		const assoName = `E2E Asso Solo ${suffix}`;
		const assoHandle = `e2e-asso-solo-${suffix}`;
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(samPage, samAccount);
			await skipOnboarding(samPage, samAccount.email);
			const adult = new Date('1992-06-21T00:00:00Z');
			const camille = await db.person.update({
				where: { userId: (await requireUser(account.email)).id },
				data: { birthDate: adult },
				include: { actor: true }
			});
			const sam = await db.person.update({
				where: { userId: (await requireUser(samAccount.email)).id },
				data: { birthDate: adult },
				include: { actor: true }
			});
			// Camille est musicienne ; aucun groupe, aucun groupe « Solo ».
			await db.personTrack.upsert({
				where: { personId_track: { personId: camille.actorId, track: 'MUSICIAN' } },
				create: { personId: camille.actorId, track: 'MUSICIAN', isPrimary: true },
				update: {}
			});
			await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: assoHandle,
					displayName: assoName,
					organization: {
						create: {
							kind: 'PROMOTER',
							verifiedAt: new Date(),
							promoter: { create: { eventKinds: ['CONCERTS'] } },
							memberships: {
								create: {
									personId: sam.actorId,
									role: 'OWNER',
									status: 'ACTIVE',
									startedAt: new Date()
								}
							}
						}
					}
				}
			});
			const conversationId = (
				await db.conversation.create({
					data: {
						pairKey: [camille.actorId, sam.actorId].sort().join(':'),
						initiatorId: camille.actorId,
						participants: {
							create: [
								{ actorId: camille.actorId, state: 'ACCEPTED' },
								{ actorId: sam.actorId, state: 'ACCEPTED' }
							]
						}
					},
					select: { id: true }
				})
			).id;
			const scene = page.getByRole('list', { name: 'Épreuves · Scène' });

			await test.step('1. Avant : « La scène » ouverte, sans exiger de groupe', async () => {
				await page.goto('/espace/carte/scene');
				await waitForAppReady(page);
				await expect(page.getByText(/se franchit avec un groupe/)).toHaveCount(0);
				await expect(page.getByText(/en ton nom ou avec ton groupe/)).toBeVisible();
				await expect(page.getByRole('link', { name: /Monter un groupe/ })).toHaveCount(0);
			});

			await test.step('2. Camille propose « Concert » en son nom', async () => {
				await page.goto(`/messages/${conversationId}`);
				await waitForAppReady(page);
				await page.getByText('Proposer une collaboration').click();
				await page.getByRole('combobox', { name: 'Type' }).selectOption('GIG');
				const who = page.getByRole('combobox', { name: 'Qui a joué' });
				await expect(who).toContainText(`Moi (${camille.actor.displayName})`);
				await expect(
					page.getByText(/compte pour ton parcours, en ton nom, sans groupe/)
				).toBeVisible();
				await expect(page.getByRole('combobox', { name: 'Lieu ou organisation' })).toContainText(
					`${assoName} (vérifié)`
				);
				const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
				await page.getByLabel('Date', { exact: true }).fill(yesterday);
				await page.getByLabel('Titre').fill('Camille au Bikini');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByRole('button', { name: 'Proposer' }).click();
				await expect(
					page.getByText(`En attente de la confirmation de ${sam.actor.displayName}`)
				).toBeVisible();
			});

			await test.step('3. Proposé, pas confirmé : rien n’est franchi', async () => {
				await page.goto('/espace/carte');
				await waitForAppReady(page);
				await expect(scene).not.toContainText('La scène · Franchie');
				expect(
					await db.milestone.count({
						where: { bandId: camille.actorId, definitionId: 'FIRST_GIG' }
					})
				).toBe(0);
			});

			await test.step('4. Sam confirme pour l’association', async () => {
				await samPage.goto(`/messages/${conversationId}`);
				await waitForAppReady(samPage);
				await samPage.getByRole('button', { name: 'Confirmer' }).click();
				await expect(samPage.getByText('Confirmée par vous deux ✓')).toBeVisible();
			});

			await test.step('5. « La scène » franchie en son nom, toujours sans groupe', async () => {
				await page.goto('/espace/carte');
				await waitForAppReady(page);
				await expect(scene).toContainText('La scène · Franchie');
				await page.goto('/espace/carte/scene');
				await waitForAppReady(page);
				await expect(page.getByText(/Premier concert · en ton nom/)).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				expect(
					await db.membership.count({
						where: { personId: camille.actorId, org: { kind: 'BAND' } }
					})
				).toBe(0);
			});

			await test.step('6. La carte souvenir se partage', async () => {
				const response = await page.request.get(
					`/api/carriere/souvenir/${camille.actor.handle}/5.png`
				);
				expect(response.status()).toBe(200);
				expect(response.headers()['content-type']).toBe('image/png');
			});
		} finally {
			await samContext.close();
			await db.actor.deleteMany({ where: { handle: assoHandle } });
			await deleteUser(samAccount.email).catch(() => {});
		}
	});
});
