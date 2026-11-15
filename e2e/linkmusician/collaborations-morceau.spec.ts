import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P4-06 — Collaboration liée au morceau : Sam, ingé son, propose dans la
 * conversation une session d'enregistrement sur le morceau composé de Léa,
 * en assurant la prestation ; Léa confirme ; le morceau passe « Enregistré »
 * et Sam gagne sur sa piste d'ingé son (rang « Premiers projets ») ; le
 * morceau figure dans ses crédits confirmés (P4-07).
 */
test.describe('LinkMusician — collaborations liées au morceau', () => {
	test.setTimeout(6 * 60_000);

	test('une session confirmée fait passer le morceau « enregistré »', async ({
		page,
		account,
		browser
	}) => {
		const samAccount = makeAccount();
		const samContext = await browser.newContext();
		const samPage = await samContext.newPage();
		const title = `Nuit blanche ${Math.random().toString(36).slice(2, 6)}`;
		try {
			// Léa (account) : musicienne avec un morceau composé.
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const lea = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			const work = await db.work.create({
				data: {
					title,
					ownerId: lea.actorId,
					createdById: lea.actorId,
					state: 'COMPOSED',
					composedAt: new Date()
				}
			});
			// Sam : ingé son, déjà en conversation ouverte avec Léa.
			await signUpAndVerify(samPage, samAccount);
			await skipOnboarding(samPage, samAccount.email);
			const sam = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(samAccount.email)).id },
				include: { actor: true }
			});
			await db.personTrack.create({
				data: { personId: sam.actorId, track: 'SOUND_ENGINEER', isPrimary: false }
			});
			await db.soundEngineerProfile.create({
				data: { personId: sam.actorId, specialties: ['RECORDING'] }
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

			await test.step('1. Sam propose la session, en assurant la prise de son', async () => {
				await samPage.goto(`/messages/${conversation.id}`);
				await waitForAppReady(samPage);
				await samPage.getByText(/Proposer une collaboration/).click();
				await samPage.getByLabel('Type').selectOption('RECORDING');
				await samPage.getByLabel('Moi').check();
				await samPage.getByLabel(/Morceau concerné/).selectOption(work.id);
				await samPage.getByLabel('Titre').fill('Prise voix et guitare');
				await expectNoA11yViolations(samPage, ['.cartButton']);
				await samPage.getByRole('button', { name: 'Proposer' }).click();
				await expect(samPage.getByText(`Morceau : ${title}`)).toBeVisible();
				await expect(samPage.getByText('Prestation : toi')).toBeVisible();
				const summary = samPage
					.locator('summary')
					.filter({ hasText: 'Journal des validations de collaboration' });
				await summary.focus();
				await samPage.keyboard.press('Enter');
				const journal = samPage.locator('details').filter({ has: summary });
				await expect(journal.locator('time[datetime]')).toHaveCount(2);
				await expect(journal.getByText('Collaboration acceptée', { exact: true })).toHaveCount(1);
				await expect(journal.getByText('Achèvement confirmé', { exact: true })).toHaveCount(1);
			});

			await test.step('2. Léa confirme : le morceau est « Enregistré »', async () => {
				await page.goto(`/messages/${conversation.id}`);
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Confirmer' }).click();
				// La réponse est enregistrée quand les boutons de réponse disparaissent
				// (« Prestation : … » s'affiche déjà avant).
				await expect(page.getByRole('button', { name: "Ce n'est pas exact" })).toBeHidden();
				await expect(page.getByText(`Prestation : ${sam.actor.displayName}`)).toBeVisible();
				const summary = page
					.locator('summary')
					.filter({ hasText: 'Journal des validations de collaboration' });
				await summary.focus();
				await page.keyboard.press('Enter');
				const journal = page.locator('details').filter({ has: summary });
				await expect(journal.locator('time[datetime]')).toHaveCount(4);
				await expect(journal.getByText(sam.actor.displayName, { exact: true })).toHaveCount(2);
				await expectNoA11yViolations(page, ['.cartButton']);
				await page.setViewportSize({ width: 390, height: 844 });
				expect(
					await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
				).toBe(true);
				await expect(journal).toBeVisible();
				await page.setViewportSize({ width: 1280, height: 720 });
				await page.goto(`/morceaux/${work.id}`);
				await waitForAppReady(page);
				await expect(
					page.getByRole('list', { name: 'Étapes du morceau' }).getByText(/Enregistré le/)
				).toBeVisible();
			});

			await test.step('3. Sam gagne sur sa piste d’ingé son', async () => {
				const gains = await db.xpTransaction.groupBy({
					by: ['track'],
					where: { actorId: sam.actorId, ruleId: 'collaboration.completed' },
					_sum: { amount: true }
				});
				expect(gains.map((g) => g.track)).toEqual(['SOUND_ENGINEER']);
				await samPage.goto(`/@${sam.actor.handle}`);
				await waitForAppReady(samPage);
				await expect(samPage.getByText('Premiers projets').first()).toBeVisible();
			});

			await test.step('4. Le morceau apparaît dans les crédits confirmés de Sam (P4-07)', async () => {
				await expect(samPage.getByRole('heading', { name: 'Crédits confirmés' })).toBeVisible();
				// Dans la carte « Morceaux » et dans la carte « Ingé son ».
				const links = samPage.getByRole('link', { name: title });
				await expect(links).toHaveCount(2);
				for (const link of await links.all()) {
					await expect(link).toHaveAttribute('href', `/morceaux/${work.id}`);
				}
				await expect(samPage.getByText('Prise de son').first()).toBeVisible();
				// Succès sans XP (P4-07b, D54).
				await expect(samPage.getByText('Première prise de son').first()).toBeVisible();
			});
		} finally {
			await samContext.close();
			await deleteUser(samAccount.email).catch(() => {});
		}
	});
});

test('refus et annulation explicite restent datés dans le journal privé', async ({
	page,
	account
}) => {
	test.setTimeout(4 * 60_000);
	await signUpAndVerify(page, account);
	await skipOnboarding(page, account.email);
	const me = await db.person.findUniqueOrThrow({
		where: { userId: (await requireUser(account.email)).id },
		include: { actor: true }
	});
	// Un second compte réel permet de vérifier que les actes sont attribués au lecteur qui agit.
	const otherUser = await db.user.create({
		data: { email: `dash05k-${Date.now()}@example.test`, referralCode: `dash05k-${Date.now()}` }
	});
	try {
		const other = await db.actor.create({
			data: {
				kind: 'PERSON',
				handle: `dash05k-${Date.now()}`,
				displayName: 'Partenaire du journal',
				person: {
					create: {
						userId: otherUser.id,
						termsAcceptedAt: new Date(),
						birthDate: new Date('1990-01-01')
					}
				}
			}
		});
		const conversation = await db.conversation.create({
			data: {
				pairKey: [me.actorId, other.id].sort().join(':'),
				initiatorId: me.actorId,
				participants: {
					create: [
						{ actorId: me.actorId, state: 'ACCEPTED' },
						{ actorId: other.id, state: 'ACCEPTED' }
					]
				}
			}
		});
		for (const cancel of [false, true]) {
			const collab = await db.collaboration.create({
				data: {
					kind: 'REHEARSAL',
					title: cancel ? 'Répète annulée' : 'Proposition refusée',
					proposedById: cancel ? me.actorId : other.id,
					conversationId: conversation.id,
					happenedOn: new Date('2090-01-01'),
					participants: {
						create: [
							{ actorId: me.actorId, acceptedAt: cancel ? new Date() : null },
							{ actorId: other.id, acceptedAt: cancel ? null : new Date() }
						]
					}
				}
			});
			await page.goto(`/messages/${conversation.id}`);
			await waitForAppReady(page);
			await page
				.getByRole('button', { name: cancel ? 'Annuler' : "Ce n'est pas exact", exact: true })
				.click();
			await expect(page.getByRole('list', { name: 'Collaborations', exact: true })).toHaveCount(0);
			await page.reload();
			await waitForAppReady(page);
			const summary = page
				.locator('summary')
				.filter({ hasText: 'Journal des validations de collaboration' });
			await summary.focus();
			await page.keyboard.press('Enter');
			const journal = page.locator('details').filter({ has: summary });
			await expect(
				journal.getByText(
					cancel ? 'Collaboration annulée' : 'Proposition de collaboration refusée',
					{ exact: true }
				)
			).toBeVisible();
			await expect(journal.getByText(me.actor.displayName, { exact: true }).last()).toBeVisible();
			await expect(journal.locator('time').last()).toHaveAttribute('datetime', /T.*Z$/);
			const participant = await db.collaborationParticipant.findUniqueOrThrow({
				where: { collaborationId_actorId: { collaborationId: collab.id, actorId: me.actorId } }
			});
			expect(participant[cancel ? 'cancelledAt' : 'declinedAt']).not.toBeNull();
			expect(participant[cancel ? 'declinedAt' : 'cancelledAt']).toBeNull();
		}
		await page.setViewportSize({ width: 390, height: 844 });
		const notice = page.getByRole('button', { name: 'Compris', exact: true });
		if (await notice.isVisible()) await notice.click();
		await expectNoA11yViolations(page, ['.cartButton']);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
		).toBe(true);
	} finally {
		await deleteUser(otherUser.email);
	}
});
