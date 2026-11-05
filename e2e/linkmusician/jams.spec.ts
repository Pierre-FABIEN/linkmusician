import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P2-14b — Jams publiques : voir une jam dans un lieu autour de soi, dire
 * « Je viens » (sans XP), publier sa propre jam dans un lieu de l'annuaire.
 */
test.describe('LinkMusician — jams publiques', () => {
	test.setTimeout(5 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];
	const blagnac = { code: '31069', nom: 'Blagnac', dep: '31', lat: 43.6459, lng: 1.3785 };

	test('je viens à la jam du Préau, puis je publie la mienne', async ({ page, account }) => {
		const host = await createMusician({ name: 'Hôte', commune: blagnac });
		let myActorId: string | null = null;
		try {
			const venue = await db.venue.create({
				data: {
					name: 'E2E Le Préau',
					nameKey: 'e2e le preau',
					kind: 'CAFE_CONCERT',
					communeCode: blagnac.code,
					communeName: blagnac.nom,
					departmentCode: blagnac.dep,
					lat: blagnac.lat,
					lng: blagnac.lng,
					createdById: host.actorId
				}
			});
			const startsAt = new Date(Date.now() + 26 * 3600 * 1000);
			const endsAt = new Date(startsAt.getTime() + 3 * 3600 * 1000);
			const drums = await db.instrument.findUniqueOrThrow({ where: { slug: 'batterie' } });
			const jam = await db.opportunity.create({
				data: {
					issuerActorId: host.actorId,
					kind: 'JAM',
					title: 'E2E Bœuf du Préau',
					description: 'Backline sur place.',
					startsAt,
					endsAt,
					expiresAt: endsAt,
					venueId: venue.id,
					jamSpots: { create: [{ instrumentId: drums.id, count: 1 }] }
				}
			});

			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await setCity(page);
			myActorId = (
				await db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(account.email)).id }
				})
			).actorId;

			await test.step('1. La jam du lieu voisin est dans le mode jam', async () => {
				await page.goto('/jam');
				await waitForAppReady(page);
				const list = page.getByRole('list', { name: 'Jams à venir' });
				await list.getByRole('link', { name: /E2E Bœuf du Préau/ }).click();
				await expect(page.getByRole('heading', { name: 'E2E Bœuf du Préau' })).toBeVisible();
				await expect(page.getByText('Batterie × 1')).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('2. Je viens, sans XP, puis je me ravise', async () => {
				await page.getByRole('button', { name: 'Je viens' }).click();
				await expect(page.getByText('Tu viens. On compte sur toi !')).toBeVisible();
				await expect(page.getByText('1 musicien·ne vient')).toBeVisible();
				expect(
					await db.jamAttendance.count({ where: { opportunityId: jam.id, actorId: myActorId! } })
				).toBe(1);
				expect(await db.xpTransaction.count({ where: { actorId: myActorId! } })).toBe(0);
				await page.getByRole('button', { name: 'Je ne viens plus' }).click();
				await expect(page.getByRole('button', { name: 'Je viens' })).toBeVisible();
				expect(await db.jamAttendance.count({ where: { opportunityId: jam.id } })).toBe(0);
			});

			await test.step('3. Je publie ma jam au Préau', async () => {
				await page.goto(`/lieux/${venue.id}`);
				await waitForAppReady(page);
				await page.getByRole('link', { name: 'Publier une jam ici' }).click();
				await waitForAppReady(page);
				await expect(page.getByLabel('Lieu')).toHaveValue(venue.id);
				await page.getByLabel('Titre').fill('Jam acoustique du dimanche');
				await page.getByLabel('Instrument à ajouter').selectOption('basse');
				await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				// Demain, pour que le début ne soit jamais passé.
				const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
				await page.getByLabel('Jour').fill(tomorrow);
				await page.getByRole('button', { name: 'Publier la jam' }).click();
				await expect(
					page.getByRole('heading', { name: 'Jam acoustique du dimanche' })
				).toBeVisible();
				await expect(page.getByText('C’est ta jam.')).toBeVisible();
				const mine = await db.opportunity.findFirstOrThrow({
					where: { issuerActorId: myActorId! },
					include: { jamSpots: true }
				});
				expect(mine).toMatchObject({ kind: 'JAM', venueId: venue.id });
				expect(mine.jamSpots).toHaveLength(1);
			});
		} finally {
			await db.opportunity.deleteMany({
				where: { issuerActorId: { in: [host.actorId, ...(myActorId ? [myActorId] : [])] } }
			});
			await db.venue.deleteMany({ where: { createdById: host.actorId } });
			await deleteMusicians([host]);
		}
	});
});
