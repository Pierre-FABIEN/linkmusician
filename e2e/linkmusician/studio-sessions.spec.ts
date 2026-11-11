import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, skipOnboarding } from '../support/linkmusician';

/**
 * P4-03c — Sessions du studio : Sam, ingé son, gère un studio publié qui a
 * déjà reçu quatre client·es. Il propose à Léa, dans leur conversation, une
 * séance d'enregistrement « au studio » ; Léa confirme. C'est la 5ᵉ session
 * confirmée par un·e client·e : le studio passe « Actif », sur sa fiche et
 * sur sa page publique. Aucune XP pour le studio (le rang se lit dans les faits).
 */
test.describe('LinkMusician — sessions du studio', () => {
	test.setTimeout(6 * 60_000);
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('la 5ᵉ session confirmée rend le studio « Actif »', async ({ page, account, browser }) => {
		const leaAccount = makeAccount();
		const leaContext = await browser.newContext();
		const leaPage = await leaContext.newPage();
		const clients: Awaited<ReturnType<typeof createMusician>>[] = [];
		const suffix = Date.now().toString(36);
		const studioHandle = `studio-sessions-${suffix}`;
		const studioName = `Studio Sessions ${suffix}`;
		try {
			// Sam (account) : ingé son qui gère un studio publié.
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const sam = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			await db.personTrack.create({
				data: { personId: sam.actorId, track: 'SOUND_ENGINEER', isPrimary: false }
			});
			await db.soundEngineerProfile.create({
				data: { personId: sam.actorId, specialties: ['RECORDING'] }
			});
			const studio = await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: studioHandle,
					displayName: studioName,
					organization: {
						create: {
							kind: 'STUDIO',
							memberships: {
								create: {
									personId: sam.actorId,
									role: 'OWNER',
									status: 'ACTIVE',
									startedAt: new Date()
								}
							},
							studio: {
								create: {
									services: ['RECORDING'],
									gear: 'Console Audient',
									publishedAt: new Date(),
									rooms: { create: { name: 'Salle de prise', hourlyRate: 35, position: 0 } }
								}
							}
						}
					}
				}
			});

			// Quatre client·es déjà venu·es : une session terminée et confirmée chacun·e.
			for (let i = 0; i < 4; i++) {
				const client = await createMusician({
					name: `Client${i}`,
					commune: toulouse,
					instrument: ['guitare-electrique', 3]
				});
				clients.push(client);
				const at = new Date(Date.now() - (10 + i) * 86_400_000);
				await db.collaboration.create({
					data: {
						kind: 'RECORDING',
						status: 'COMPLETED',
						title: `Session ${i}`,
						happenedOn: at,
						completedAt: at,
						proposedById: sam.actorId,
						studioId: studio.id,
						participants: {
							create: [
								{ actorId: sam.actorId, acceptedAt: at, confirmedCompletionAt: at },
								{ actorId: client.actorId, acceptedAt: at, confirmedCompletionAt: at }
							]
						}
					}
				});
			}

			// Léa : musicienne, en conversation ouverte avec Sam.
			await signUpAndVerify(leaPage, leaAccount);
			await skipOnboarding(leaPage, leaAccount.email);
			const lea = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(leaAccount.email)).id }
			});
			const conversation = await db.conversation.create({
				data: {
					pairKey: [lea.actorId, sam.actorId].sort().join(':'),
					initiatorId: lea.actorId,
					participants: {
						create: [
							{ actorId: lea.actorId, state: 'ACCEPTED' },
							{ actorId: sam.actorId, state: 'ACCEPTED' }
						]
					}
				}
			});

			await test.step('1. Avant : 4 sessions, rang « Ouvert »', async () => {
				await page.goto(`/studios/${studioHandle}`);
				await waitForAppReady(page);
				const status = page.getByRole('region', { name: 'Statut de la fiche' });
				await expect(status).toContainText('Ouvert');
				await expect(status).toContainText('4 sessions confirmées avec 4 client·es');
			});

			await test.step('2. Sam propose une séance d’enregistrement au studio', async () => {
				await page.goto(`/messages/${conversation.id}`);
				await waitForAppReady(page);
				await page.getByText(/Proposer une collaboration/).click();
				await page.getByLabel('Type').selectOption('RECORDING');
				await page.getByLabel('Moi').check();
				await expect(page.getByLabel(/Au studio/)).toHaveValue(studioHandle);
				await page.getByLabel('Titre').fill('Prise voix');
				await expectNoA11yViolations(page, ['.cartButton']);
				await page.getByRole('button', { name: 'Proposer' }).click();
				await expect(page.getByText('Prise voix').first()).toBeVisible();
			});

			await test.step('3. Léa confirme : c’est la 5ᵉ session', async () => {
				await leaPage.goto(`/messages/${conversation.id}`);
				await waitForAppReady(leaPage);
				await leaPage.getByRole('button', { name: 'Confirmer' }).click();
				await expect(leaPage.getByRole('button', { name: "Ce n'est pas exact" })).toBeHidden();
			});

			await test.step('4. Le studio est « Actif », sur sa fiche et sa page publique', async () => {
				await page.goto(`/studios/${studioHandle}`);
				await waitForAppReady(page);
				const status = page.getByRole('region', { name: 'Statut de la fiche' });
				await expect(status).toContainText('Actif');
				await expect(status).toContainText('5 sessions confirmées avec 5 client·es');

				await leaPage.goto(`/@${studioHandle}`);
				await waitForAppReady(leaPage);
				await expect(
					leaPage.locator('span:has(> span.sr-only)').filter({ hasText: 'Rang du studio' })
				).toContainText('Actif');
				await expect(leaPage.getByText('5 sessions confirmées')).toBeVisible();

				// Le rang va au studio, jamais d'XP à son nom.
				expect(await db.xpTransaction.count({ where: { actorId: studio.id } })).toBe(0);
			});
		} finally {
			await leaContext.close();
			await db.actor.deleteMany({ where: { handle: studioHandle } });
			await deleteMusicians(clients);
			await deleteUser(leaAccount.email).catch(() => {});
		}
	});
});
