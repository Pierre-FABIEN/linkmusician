import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, skipOnboarding } from '../support/linkmusician';

/**
 * P5-06 — Concerts vérifiés : Léa, qui joue dans Les Rats, propose « Concert »
 * dans sa conversation avec Sam, qui gère une association vérifiée. Le groupe
 * et l'hôte sont préremplis ; Sam confirme ; la page du groupe montre
 * « Premier concert » vérifié.
 */
test.describe('LinkMusician — concerts vérifiés', () => {
	test.setTimeout(6 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('un concert confirmé par une association vérifiée', async ({ page, account, browser }) => {
		const samAccount = makeAccount();
		const samContext = await browser.newContext();
		const samPage = await samContext.newPage();
		const suffix = Math.random().toString(36).slice(2, 8);
		const bandName = `E2E Les Rats ${suffix}`;
		const assoName = `E2E Asso Bruit ${suffix}`;
		const malik = await createMusician({ name: 'Malik', commune: toulouse });
		let bandHandle = '';
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(samPage, samAccount);
			await skipOnboarding(samPage, samAccount.email);
			const adult = new Date('1990-04-04T00:00:00Z');
			const lea = await db.person.update({
				where: { userId: (await requireUser(account.email)).id },
				data: { birthDate: adult },
				include: { actor: true }
			});
			const sam = await db.person.update({
				where: { userId: (await requireUser(samAccount.email)).id },
				data: { birthDate: adult },
				include: { actor: true }
			});
			// Les Rats (formé : Léa et Malik), et l'association vérifiée de Sam.
			bandHandle = `e2e-rats-${suffix}`;
			await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: bandHandle,
					displayName: bandName,
					organization: {
						create: {
							kind: 'BAND',
							formedAt: new Date(),
							memberships: {
								create: [
									{ personId: lea.actorId, role: 'OWNER', status: 'ACTIVE', startedAt: new Date() },
									{
										personId: malik.actorId,
										role: 'MEMBER',
										status: 'ACTIVE',
										startedAt: new Date()
									}
								]
							}
						}
					}
				}
			});
			await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: `e2e-asso-${suffix}`,
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
						pairKey: [lea.actorId, sam.actorId].sort().join(':'),
						initiatorId: lea.actorId,
						participants: {
							create: [
								{ actorId: lea.actorId, state: 'ACCEPTED' },
								{ actorId: sam.actorId, state: 'ACCEPTED' }
							]
						}
					},
					select: { id: true }
				})
			).id;

			await test.step('1. Léa propose « Concert » : groupe et hôte préremplis', async () => {
				await page.goto(`/messages/${conversationId}`);
				await waitForAppReady(page);
				await page.getByText('Proposer une collaboration').click();
				await page.getByRole('combobox', { name: 'Type' }).selectOption('GIG');
				await expect(page.getByRole('combobox', { name: 'Qui a joué' })).toContainText(bandName);
				await expect(page.getByRole('combobox', { name: 'Lieu ou organisation' })).toContainText(
					`${assoName} (vérifié)`
				);
				const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
				await page.getByLabel('Date', { exact: true }).fill(yesterday);
				await page.getByLabel('Titre').fill('Concert au Bikini');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByRole('button', { name: 'Proposer' }).click();
				await expect(
					page.getByText(`En attente de la confirmation de ${sam.actor.displayName}`)
				).toBeVisible();
			});

			await test.step('2. Sam confirme pour l’association', async () => {
				await samPage.goto(`/messages/${conversationId}`);
				await waitForAppReady(samPage);
				await samPage.getByRole('button', { name: 'Confirmer' }).click();
				await expect(samPage.getByText('Confirmée par vous deux ✓')).toBeVisible();
			});

			await test.step('3. La page du groupe : « Premier concert » vérifié', async () => {
				await page.goto(`/@${bandHandle}`);
				await waitForAppReady(page);
				const steps = page.getByRole('list', { name: 'Étapes franchies' });
				await expect(
					steps.getByRole('listitem').filter({ hasText: 'Premier concert' })
				).toContainText('Vérifiée');
			});
		} finally {
			await samContext.close();
			await db.actor.deleteMany({ where: { handle: { in: [bandHandle, `e2e-asso-${suffix}`] } } });
			await deleteMusicians([malik]);
			await deleteUser(samAccount.email).catch(() => {});
		}
	});
});
