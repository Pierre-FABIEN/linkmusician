import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { makeLocalPillar, skipOnboarding } from '../support/linkmusician';

/**
 * P4-13b — Parrainage (conception 07 §4.8) : Paul, Pilier local, présente
 * Léa à Jo, deux personnes de son réseau qui n'ont jamais joué ensemble.
 * Léa reçoit la présentation. Tant qu'elles n'ont pas collaboré, rien ; dès
 * que leur répétition est confirmée des deux côtés, Paul devient Passeur.
 */
test.describe('LinkMusician — parrainage', () => {
	test.setTimeout(6 * 60_000);

	test('je présente deux personnes, elles jouent ensemble : Passeur', async ({
		page,
		account,
		browser
	}) => {
		const leaAccount = makeAccount();
		const joAccount = makeAccount();
		const leaContext = await browser.newContext();
		const joContext = await browser.newContext();
		const leaPage = await leaContext.newPage();
		const joPage = await joContext.newPage();
		const person = async (email: string) =>
			db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(email)).id },
				include: { actor: true }
			});
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(leaPage, leaAccount);
			await skipOnboarding(leaPage, leaAccount.email);
			await signUpAndVerify(joPage, joAccount);
			await skipOnboarding(joPage, joAccount.email);
			const [paul, lea, jo] = await Promise.all([
				person(account.email),
				person(leaAccount.email),
				person(joAccount.email)
			]);
			// Paul est Pilier local ; Léa et Jo sont dans son carnet, et il leur parle
			// (présenter exige une conversation acceptée, D82).
			await makeLocalPillar(paul.actorId);
			await db.savedContact.createMany({
				data: [
					{ ownerId: paul.actorId, contactId: lea.actorId },
					{ ownerId: paul.actorId, contactId: jo.actorId }
				]
			});
			for (const contactId of [lea.actorId, jo.actorId]) {
				await db.conversation.create({
					data: {
						pairKey: [paul.actorId, contactId].sort().join(':'),
						initiatorId: paul.actorId,
						participants: {
							create: [
								{ actorId: paul.actorId, state: 'ACCEPTED' },
								{ actorId: contactId, state: 'ACCEPTED' }
							]
						}
					}
				});
			}
			const passeur = () =>
				db.actorAchievement.count({ where: { actorId: paul.actorId, achievementId: 'passeur' } });

			await test.step('1. Mon espace : « Parrainer »', async () => {
				await page.goto('/espace');
				await waitForAppReady(page);
				await page.getByRole('link', { name: /Parrainer/ }).click();
				await waitForPath(page, '/espace/parrainage');
				await waitForAppReady(page);
			});

			await test.step('2. Je présente Léa à Jo', async () => {
				await page.getByRole('combobox', { name: 'Je présente' }).selectOption(lea.actor.handle);
				await page.getByRole('combobox', { name: 'à', exact: true }).selectOption(jo.actor.handle);
				await page.getByLabel(/Un mot pour dire pourquoi/).fill('Vous cherchez un projet funk.');
				await expectNoA11yViolations(page, ['.cartButton']);
				await page.getByRole('button', { name: 'Les présenter' }).click();
				await expect(page.getByText(/C’est fait : .* sont prévenu·es/).first()).toBeVisible();
				const list = page.getByRole('region', { name: 'Mes présentations' });
				await expect(list).toContainText(lea.actor.displayName);
				await expect(list).not.toContainText('Ont collaboré');
				expect(await passeur()).toBe(0);
			});

			await test.step('3. Léa reçoit la présentation', async () => {
				await leaPage.goto('/notifications');
				await waitForAppReady(leaPage);
				const note = leaPage.getByText(new RegExp(`te présente ${jo.actor.displayName}`));
				await expect(note).toBeVisible();
			});

			await test.step('4. Elles répètent ensemble : Paul devient Passeur', async () => {
				const conversation = await db.conversation.create({
					data: {
						pairKey: [lea.actorId, jo.actorId].sort().join(':'),
						initiatorId: lea.actorId,
						participants: {
							create: [
								{ actorId: lea.actorId, state: 'ACCEPTED' },
								{ actorId: jo.actorId, state: 'ACCEPTED' }
							]
						}
					}
				});
				await leaPage.goto(`/messages/${conversation.id}`);
				await waitForAppReady(leaPage);
				await leaPage.getByText(/Proposer une collaboration/).click();
				await leaPage.getByLabel('Type').selectOption('REHEARSAL');
				await leaPage.getByLabel('Titre').fill('Première répète');
				await leaPage.getByRole('button', { name: 'Proposer' }).click();
				// Le journal replié contient aussi le titre ; vérifier la carte visible.
				await expect(
					leaPage
						.getByRole('list', { name: 'Collaborations', exact: true })
						.getByText('Première répète', { exact: false })
				).toBeVisible();

				await joPage.goto(`/messages/${conversation.id}`);
				await waitForAppReady(joPage);
				await joPage.getByRole('button', { name: 'Confirmer' }).click();
				await expect(joPage.getByRole('button', { name: "Ce n'est pas exact" })).toBeHidden();

				await page.reload();
				await waitForAppReady(page);
				await expect(page.getByRole('region', { name: 'Mes présentations' })).toContainText(
					'Ont collaboré'
				);
				expect(await passeur()).toBe(1);
			});
		} finally {
			await leaContext.close();
			await joContext.close();
			await deleteUser(leaAccount.email).catch(() => {});
			await deleteUser(joAccount.email).catch(() => {});
		}
	});
});
