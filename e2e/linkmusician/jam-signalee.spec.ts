import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * #91b (RV-01) — Une inscrite arrive sur place : pas de jam. Elle le
 * signale ; l'hôte est prévenu sans savoir par qui et répond ; la
 * modération confirme et interdit d'organiser 7 jours ; l'hôte ne peut plus
 * publier de jam, sans que sa préférence soit touchée.
 */
test.describe('LinkMusician — jam signalée', () => {
	test.setTimeout(7 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('signalement, réponse, décision et interdiction', async ({ page, account, browser }) => {
		const guestAccount = makeAccount();
		const modAccount = makeAccount();
		const guestContext = await browser.newContext();
		const modContext = await browser.newContext();
		const guest = await guestContext.newPage();
		const mod = await modContext.newPage();
		let hostId: string | null = null;
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(guest, guestAccount);
			await skipOnboarding(guest, guestAccount.email);
			await signUpAndVerify(mod, modAccount);
			await skipOnboarding(mod, modAccount.email);
			await db.user.update({ where: { email: modAccount.email }, data: { role: 'MODERATOR' } });
			const actorOf = async (email: string) =>
				(await db.person.findUniqueOrThrow({ where: { userId: (await requireUser(email)).id } }))
					.actorId;
			hostId = await actorOf(account.email);
			const guestId = await actorOf(guestAccount.email);
			await db.person.update({ where: { actorId: hostId }, data: { organizesJams: true } });
			const venue = await db.venue.create({
				data: {
					name: 'E2E Bar Fantôme',
					nameKey: 'e2e bar fantome',
					kind: 'BAR',
					communeCode: '31555',
					communeName: 'Toulouse',
					departmentCode: '31',
					lat: 43.6,
					lng: 1.44,
					createdById: hostId,
					validatedAt: new Date()
				}
			});
			const startsAt = new Date(Date.now() - 3_600_000);
			const endsAt = new Date(Date.now() + 2 * 3_600_000);
			const jam = await db.opportunity.create({
				data: {
					issuerActorId: hostId,
					kind: 'JAM',
					title: 'E2E Jam fantôme',
					description: '',
					startsAt,
					endsAt,
					expiresAt: endsAt,
					venueId: venue.id,
					// Inscrite la veille.
					attendances: {
						create: [{ actorId: guestId, createdAt: new Date(startsAt.getTime() - 86_400_000) }]
					}
				}
			});

			await test.step('1. L’inscrite signale depuis le terrain', async () => {
				await guest.goto(`/jams/${jam.id}`);
				await waitForAppReady(guest);
				await guest.getByRole('link', { name: /la jam n’a pas lieu \? Signale-le/ }).click();
				await expect(guest.getByRole('heading', { name: 'La jam n’a pas lieu ?' })).toBeVisible();
				await expectNoA11yViolations(guest, A11Y_EXCLUDE);
				await guest.getByLabel('Aucune jam à cette adresse').check();
				await guest.getByLabel('Je me suis rendu·e sur place.').check();
				await guest.getByRole('button', { name: 'Signaler' }).click();
				await expect(guest.getByText(/L’organisation est prévenue/)).toBeVisible();
				// Ni présence ni XP.
				const attendance = await db.jamAttendance.findUniqueOrThrow({
					where: { opportunityId_actorId: { opportunityId: jam.id, actorId: guestId } }
				});
				expect(attendance.attendedAt).toBeNull();
			});

			await test.step('2. L’hôte est prévenu sans savoir qui, et répond', async () => {
				const notification = await db.notification.findFirstOrThrow({
					where: { recipientActorId: hostId!, type: 'JAM_REPORTED' }
				});
				expect(notification.fromActorId).toBeNull();
				await page.goto(`/jams/${jam.id}`);
				await waitForAppReady(page);
				await page.getByRole('link', { name: 'Réponds ou annule' }).click();
				await expect(page.getByText('Un problème a été signalé sur ta jam.').first()).toBeVisible();
				await page.getByLabel(/Ta réponse/).fill('Le bar a fermé sans me prévenir.');
				await page.getByRole('button', { name: 'Envoyer ma réponse' }).click();
				await expect(page.getByText('Réponse enregistrée')).toBeVisible();
			});

			await test.step('3. La modération confirme et interdit d’organiser 7 jours', async () => {
				await mod.goto('/moderation/jams');
				await waitForAppReady(mod);
				const dossier = mod.getByRole('article', { name: 'Dossier E2E Jam fantôme' });
				await expect(dossier.getByText('Le bar a fermé sans me prévenir.')).toBeVisible();
				await expectNoA11yViolations(mod, A11Y_EXCLUDE);
				await dossier.getByLabel(/Motif de la décision/).fill('Aucune jam ce soir-là, confirmé.');
				await dossier.getByLabel(/Suite, si le manquement/).selectOption('restrict7');
				await dossier.getByRole('button', { name: 'Confirmer le manquement' }).click();
				await expect(mod.getByText('Manquement confirmé.')).toBeVisible();
				await expect(mod.getByRole('article', { name: /Interdiction / }).first()).toBeVisible();
			});

			await test.step('4. L’hôte ne peut plus publier ; sa préférence reste', async () => {
				await page.goto('/jams/nouvelle');
				await waitForAppReady(page);
				await expect(
					page.getByText(/retiré la possibilité d’organiser des jams jusqu’au/)
				).toBeVisible();
				await expect(page.getByRole('button', { name: 'Publier la jam' })).toHaveCount(0);
				expect(
					(await db.person.findUniqueOrThrow({ where: { actorId: hostId! } })).organizesJams
				).toBe(true);
				expect(
					await db.notification.count({
						where: { recipientActorId: guestId, type: 'JAM_INCIDENT_CLOSED' }
					})
				).toBe(1);
			});
		} finally {
			await guestContext.close();
			await modContext.close();
			if (hostId) {
				await db.opportunity.deleteMany({ where: { issuerActorId: hostId } });
				await db.venue.deleteMany({ where: { createdById: hostId } });
			}
			await deleteUser(guestAccount.email);
			await deleteUser(modAccount.email);
		}
	});
});
