import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P2-14b — Jams publiques : voir une jam dans un lieu autour de soi, dire
 * « Je viens » (sans XP), publier sa propre jam dans un lieu de l'annuaire.
 * P2-14c — Formation du lead (places réservées) et matériel sur place.
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
					createdById: host.actorId,
					validatedAt: new Date()
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
				await expect(page.getByText('1 place ouverte')).toBeVisible();
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
	test('le lead invite une batteuse, elle accepte ; la fiche dit quoi apporter', async ({
		page,
		account,
		browser
	}) => {
		const host = await createMusician({ name: 'Hôte', commune: blagnac });
		const drummerAccount = makeAccount();
		const drummerContext = await browser.newContext();
		const drummerPage = await drummerContext.newPage();
		try {
			const [drums, bass] = await Promise.all([
				db.instrument.findUniqueOrThrow({ where: { slug: 'batterie' } }),
				db.instrument.findUniqueOrThrow({ where: { slug: 'basse' } })
			]);
			const venue = await db.venue.create({
				data: {
					name: 'E2E Le Taquin',
					nameKey: 'e2e le taquin',
					kind: 'BAR',
					communeCode: blagnac.code,
					communeName: blagnac.nom,
					departmentCode: blagnac.dep,
					lat: blagnac.lat,
					lng: blagnac.lng,
					createdById: host.actorId,
					validatedAt: new Date(),
					backline: ['DRUMS', 'BASS_AMP']
				}
			});

			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await setCity(page);
			await signUpAndVerify(drummerPage, drummerAccount);
			await skipOnboarding(drummerPage, drummerAccount.email);
			const person = async (email: string) =>
				db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(email)).id },
					include: { actor: true }
				});
			const me = await person(account.email);
			const drummer = await person(drummerAccount.email);
			// Je joue de la basse ; l'hôte me confie le lead de sa jam.
			await db.personInstrument.create({
				data: { personId: me.actorId, instrumentId: bass.id, declaredLevel: 3, isPrimary: true }
			});
			const startsAt = new Date(Date.now() + 26 * 3600 * 1000);
			const endsAt = new Date(startsAt.getTime() + 3 * 3600 * 1000);
			const jam = await db.opportunity.create({
				data: {
					issuerActorId: host.actorId,
					leadActorId: me.actorId,
					kind: 'JAM',
					title: 'E2E Jam du Taquin',
					description: '',
					startsAt,
					endsAt,
					expiresAt: endsAt,
					venueId: venue.id,
					backline: ['DRUMS', 'BASS_AMP'],
					jamSpots: {
						create: [
							{ instrumentId: drums.id, count: 1 },
							{ instrumentId: bass.id, count: 1 }
						]
					}
				}
			});

			await test.step('1. La fiche me dit d’apporter ma basse, l’ampli est là', async () => {
				await page.goto(`/jams/${jam.id}`);
				await waitForAppReady(page);
				await expect(page.getByText('Apporte ta basse et tes câbles.')).toBeVisible();
				await expect(page.getByText('Sur place : l’ampli basse.')).toBeVisible();
				await expect(page.getByText(`Lead : ${me.actor.displayName}`)).toBeVisible();
			});

			await test.step('2. J’invite la batteuse : sa place est réservée', async () => {
				const lineup = page.getByRole('region', { name: 'Compose ta formation' });
				await lineup.getByLabel('Identifiant').fill(`@${drummer.actor.handle}`);
				await lineup.getByLabel('Instrument').selectOption('batterie');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await lineup.getByRole('button', { name: 'Inviter' }).click();
				await expect(lineup.getByText(/Batterie · en attente/)).toBeVisible();
				const spots = page.getByRole('region', { name: 'On cherche' });
				await expect(spots.getByText('Complet · 1 réservée par le lead')).toBeVisible();
			});

			await test.step('3. La batteuse voit l’invitation et accepte', async () => {
				await drummerPage.goto('/jam');
				await waitForAppReady(drummerPage);
				const invites = drummerPage.getByRole('region', { name: /On t’invite à jouer/ });
				await invites.getByRole('link', { name: /E2E Jam du Taquin/ }).click();
				await expect(drummerPage.getByText('Apporte tes baguettes.')).toBeVisible();
				await expect(drummerPage.getByText('Sur place : la batterie.')).toBeVisible();
				await expectNoA11yViolations(drummerPage, A11Y_EXCLUDE);
				await drummerPage.getByRole('button', { name: 'J’accepte' }).click();
				await expect(
					drummerPage.getByText('Tu fais partie de la formation. On compte sur toi !')
				).toBeVisible();
			});

			await test.step('4. La formation est affichée, sans XP', async () => {
				await page.reload();
				await waitForAppReady(page);
				const lineup = page.getByRole('region', { name: 'La formation' });
				await expect(lineup.getByText(drummer.actor.displayName)).toBeVisible();
				const invite = await db.jamInvite.findUniqueOrThrow({
					where: { opportunityId_actorId: { opportunityId: jam.id, actorId: drummer.actorId } }
				});
				expect(invite.status).toBe('ACCEPTED');
				expect(
					await db.xpTransaction.count({
						where: { actorId: { in: [me.actorId, drummer.actorId] } }
					})
				).toBe(0);
			});

			await test.step('5. Je viens à la basse : la place ouverte est prise', async () => {
				await expect(page.getByLabel('Je joue')).toHaveValue('basse');
				await page.getByRole('button', { name: 'Je viens' }).click();
				await expect(page.getByText('Tu viens. On compte sur toi !')).toBeVisible();
				await expect(page.getByText('2 musicien·nes viennent')).toBeVisible();
				const attendance = await db.jamAttendance.findUniqueOrThrow({
					where: { opportunityId_actorId: { opportunityId: jam.id, actorId: me.actorId } }
				});
				expect(attendance.instrumentId).toBe(bass.id);
			});
		} finally {
			await drummerContext.close();
			await db.opportunity.deleteMany({ where: { issuerActorId: host.actorId } });
			await db.venue.deleteMany({ where: { createdById: host.actorId } });
			await deleteUser(drummerAccount.email);
			await deleteMusicians([host]);
		}
	});
});
