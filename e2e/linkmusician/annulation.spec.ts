import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * #91a (RV-01) — L'hôte annule sa jam avec un motif : l'inscrite est
 * prévenue (sans savoir qui annule), voit l'annulation et son motif ; la
 * trace reste. La clôture depuis la page d'annonce est refusée.
 */
test.describe('LinkMusician — annuler une jam', () => {
	test.setTimeout(5 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('l’hôte annule, l’inscrite est prévenue', async ({ page, account, browser }) => {
		const guestAccount = makeAccount();
		const guestContext = await browser.newContext();
		const guest = await guestContext.newPage();
		let hostId: string | null = null;
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(guest, guestAccount);
			await skipOnboarding(guest, guestAccount.email);
			const actorOf = async (email: string) =>
				(await db.person.findUniqueOrThrow({ where: { userId: (await requireUser(email)).id } }))
					.actorId;
			hostId = await actorOf(account.email);
			const guestId = await actorOf(guestAccount.email);
			const venue = await db.venue.create({
				data: {
					name: 'E2E Bar Annulé',
					nameKey: 'e2e bar annule',
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
			const startsAt = new Date(Date.now() + 26 * 3_600_000);
			const endsAt = new Date(startsAt.getTime() + 3 * 3_600_000);
			const jam = await db.opportunity.create({
				data: {
					issuerActorId: hostId,
					kind: 'JAM',
					title: 'E2E Jam à annuler',
					description: '',
					startsAt,
					endsAt,
					expiresAt: endsAt,
					venueId: venue.id,
					attendances: { create: [{ actorId: guestId }] }
				}
			});

			await test.step('1. La page d’annonce ne clôt pas une jam en silence', async () => {
				const origin = new URL(page.url()).origin;
				const forced = await page.request.post(`/annonces/${jam.id}?/close`, {
					form: { confirm: '1' },
					headers: { origin, 'x-sveltekit-action': 'true' }
				});
				expect(await forced.text()).toContain('Annule la jam depuis sa fiche');
				expect((await db.opportunity.findUniqueOrThrow({ where: { id: jam.id } })).status).toBe(
					'OPEN'
				);
			});

			await test.step('2. L’hôte annule avec un motif', async () => {
				await page.goto(`/jams/${jam.id}`);
				await waitForAppReady(page);
				await page.getByText('Annuler la jam', { exact: true }).click();
				await page.getByLabel(/Motif/).fill('Le bar ferme exceptionnellement');
				await page.getByRole('button', { name: 'Annuler la jam et prévenir' }).click();
				await expect(page.getByText('Cette jam est annulée. Ne te déplace pas.')).toBeVisible();
				const row = await db.opportunity.findUniqueOrThrow({ where: { id: jam.id } });
				expect(row.status).toBe('CLOSED');
				expect(row.cancelledAt).not.toBeNull();
				expect(await db.jamAttendance.count({ where: { opportunityId: jam.id } })).toBe(1);
			});

			await test.step('3. L’inscrite est prévenue et voit le motif', async () => {
				await guest.goto('/notifications');
				await waitForAppReady(guest);
				await guest.getByText(/« E2E Jam à annuler » est annulée/).click();
				await expect(guest.getByText('Cette jam est annulée. Ne te déplace pas.')).toBeVisible();
				await expect(guest.getByText('Motif : Le bar ferme exceptionnellement')).toBeVisible();
				await expectNoA11yViolations(guest, A11Y_EXCLUDE);
				const notification = await db.notification.findFirstOrThrow({
					where: { recipientActorId: guestId, type: 'JAM_CANCELLED' }
				});
				expect(notification.fromActorId).toBeNull();
			});
		} finally {
			await guestContext.close();
			if (hostId) {
				await db.opportunity.deleteMany({ where: { issuerActorId: hostId } });
				await db.venue.deleteMany({ where: { createdById: hostId } });
			}
			await deleteUser(guestAccount.email);
		}
	});
});
