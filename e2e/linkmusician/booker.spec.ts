import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, skipOnboarding } from '../support/linkmusician';

/**
 * P5-07 — Booker : Nina, booker, propose d'accompagner Les Rats depuis la
 * page du groupe. Tant que Léa (qui gère le groupe) n'a pas confirmé, rien
 * ne compte : pas d'artiste sur sa carte, pas de « Booké par ». Léa
 * confirme ; Les Rats apparaissent sur le profil de Nina ; le concert
 * suivant, booké par Nina et confirmé par Sam, la crédite sur sa piste.
 */
test.describe('LinkMusician — booker et manager', () => {
	test.setTimeout(6 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('un accompagnement confirmé, puis une date bookée', async ({ page, account, browser }) => {
		const leaAccount = makeAccount();
		const samAccount = makeAccount();
		const leaContext = await browser.newContext();
		const samContext = await browser.newContext();
		const leaPage = await leaContext.newPage();
		const samPage = await samContext.newPage();
		const suffix = Math.random().toString(36).slice(2, 8);
		const bandName = `E2E Les Rats ${suffix}`;
		const bandHandle = `e2e-rats-${suffix}`;
		const assoHandle = `e2e-asso-${suffix}`;
		const malik = await createMusician({ name: 'Malik', commune: toulouse });
		try {
			for (const [p, a] of [
				[page, account],
				[leaPage, leaAccount],
				[samPage, samAccount]
			] as const) {
				await signUpAndVerify(p, a);
				await skipOnboarding(p, a.email);
			}
			const adult = new Date('1990-04-04T00:00:00Z');
			const adultOf = async (email: string) =>
				db.person.update({
					where: { userId: (await requireUser(email)).id },
					data: { birthDate: adult },
					include: { actor: true }
				});
			const nina = await adultOf(account.email);
			const lea = await adultOf(leaAccount.email);
			const sam = await adultOf(samAccount.email);
			await db.personTrack.create({ data: { personId: nina.actorId, track: 'BOOKER' } });
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
					handle: assoHandle,
					displayName: `E2E Asso Bruit ${suffix}`,
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

			await test.step('1. Nina propose d’accompagner Les Rats depuis leur page', async () => {
				await page.goto(`/@${bandHandle}`);
				await waitForAppReady(page);
				await page.getByRole('link', { name: `Proposer d’accompagner ${bandName}` }).click();
				await expect(page).toHaveURL(/\/accompagnement\?artiste=/);
				await expect(page.getByLabel('Nom d’utilisateur de l’artiste')).toHaveValue(bandHandle);
				await page
					.getByLabel('Un mot (facultatif)')
					.fill('Je vous trouve des dates dans le Sud-Ouest.');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByRole('button', { name: 'Envoyer la proposition' }).click();
				const mine = page.getByRole('region', { name: 'Les artistes que j’accompagne' });
				await expect(mine).toContainText(bandName);
				await expect(mine).toContainText('En attente de réponse');
			});

			await test.step('2. Non confirmé : rien sur la carte de Nina, pas de « Booké par »', async () => {
				await page.goto(`/@${nina.actor.handle}`);
				await waitForAppReady(page);
				await expect(page.getByText('Pas encore d’accompagnement confirmé.')).toBeVisible();
				await leaPage.goto(`/messages/${conversationId}`);
				await waitForAppReady(leaPage);
				await leaPage.getByText('Proposer une collaboration').click();
				await leaPage.getByRole('combobox', { name: 'Type' }).selectOption('GIG');
				await expect(leaPage.getByRole('combobox', { name: 'Groupe' })).toBeVisible();
				await expect(leaPage.getByRole('combobox', { name: 'Booké par (facultatif)' })).toHaveCount(
					0
				);
			});

			await test.step('3. Léa confirme pour le groupe', async () => {
				await leaPage.goto('/accompagnement');
				await waitForAppReady(leaPage);
				const request = leaPage.getByRole('region', { name: 'Propositions à trancher' });
				await expect(request).toContainText(nina.actor.displayName);
				await expect(request).toContainText('comme booker');
				await expectNoA11yViolations(leaPage, A11Y_EXCLUDE);
				await request.getByRole('button', { name: 'Confirmer' }).click();
				await expect(leaPage.getByRole('region', { name: 'Qui m’accompagne' })).toContainText(
					nina.actor.displayName
				);
			});

			await test.step('4. Le profil de Nina montre Les Rats', async () => {
				await page.goto(`/@${nina.actor.handle}`);
				await waitForAppReady(page);
				await expect(page.getByRole('link', { name: bandName })).toBeVisible();
				await expect(page.getByText('Confirmé par chaque artiste.')).toBeVisible();
			});

			await test.step('5. Un concert booké par Nina, confirmé par Sam, la crédite', async () => {
				await leaPage.goto(`/messages/${conversationId}`);
				await waitForAppReady(leaPage);
				await leaPage.getByText('Proposer une collaboration').click();
				await leaPage.getByRole('combobox', { name: 'Type' }).selectOption('GIG');
				await leaPage
					.getByRole('combobox', { name: 'Booké par (facultatif)' })
					.selectOption({ label: nina.actor.displayName });
				const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
				await leaPage.getByLabel('Date', { exact: true }).fill(yesterday);
				await leaPage.getByLabel('Titre').fill('Concert booké par Nina');
				await leaPage.getByRole('button', { name: 'Proposer' }).click();
				await expect(
					leaPage.getByText(`En attente de la confirmation de ${sam.actor.displayName}`)
				).toBeVisible();
				await samPage.goto(`/messages/${conversationId}`);
				await waitForAppReady(samPage);
				await samPage.getByRole('button', { name: 'Confirmer' }).click();
				await expect(samPage.getByText('Confirmée par vous deux ✓')).toBeVisible();
				await expect
					.poll(async () =>
						db.xpTransaction.count({
							where: { actorId: nina.actorId, ruleId: 'gig.held', track: 'BOOKER' }
						})
					)
					.toBe(1);
			});
		} finally {
			await leaContext.close();
			await samContext.close();
			await db.actor.deleteMany({ where: { handle: { in: [bandHandle, assoHandle] } } });
			await deleteMusicians([malik]);
			await deleteUser(leaAccount.email).catch(() => {});
			await deleteUser(samAccount.email).catch(() => {});
		}
	});
});
