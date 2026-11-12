/**
 * Fiche d'un lieu revendiqué (P5-03b) sur la base de `.env`, schéma `e2e` :
 * décision de revendication notifiée (Q29) ; fiche, conditions de
 * publication et rang « Lieu ouvert » ; une date publiée par le lieu, chez
 * lui, sans le métier d'organisateur·rice (Q34) ; co-gestion par une
 * personne majeure ; page publique. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/venues/profile
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
if (enabled) process.env.DATABASE_URL = url.toString();
const db = createPrismaClient(url.toString());

vi.mock('#lib/server', () => ({ prisma: db }));
vi.mock('$app/env/private', () => ({ SECRET_ADDRESS_SEARCH_MODE: 'e2e' }));
vi.mock('#lib/server/rate-limit', () => ({
	RefillingTokenBucket: class {
		consume = async () => true;
		check = async () => true;
	}
}));

// Cloudinary simulé (P5-03d) : l'envoi est signé, le fichier « relu » est une photo.
vi.mock('#lib/server/media/cloudinary', () => ({
	isCloudinaryConfigured: () => true,
	signUpload: ({ mediaId }: { mediaId: string }) => ({
		publicId: `test/${mediaId}`,
		uploadUrl: 'https://api.cloudinary.test/upload',
		fields: {}
	}),
	fetchAsset: async () => ({
		bytes: 200_000,
		durationSec: null,
		format: 'jpg',
		url: 'https://res.cloudinary.test/comptoir.jpg'
	}),
	destroyAsset: async () => {}
}));

const claims = await import('./claims');
const { finalizeUpload, startUpload } = await import('#lib/server/media/service');
const venueProfile = await import('./profile');
const { createGigSlot } = await import('../opportunities/gigSlots');
const { exportPersonData } = await import('#lib/prisma/actors/person');

const PREFIX = 'venueprofile-test-';
const YEAR = 365.25 * 86_400_000;
const inTenDays = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!enabled)('fiche d’un lieu (schéma e2e)', { timeout: 120_000 }, () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};
	const venues: Record<string, string> = {};
	let rock = '';

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ displayName: { startsWith: 'Venueprofile Test' } },
					{ person: { user: { email: { startsWith: PREFIX } } } }
				]
			},
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		const venueIds = (
			await db.venue.findMany({
				where: { name: { startsWith: 'Venueprofile Test' } },
				select: { id: true }
			})
		).map((v) => v.id);
		await db.adminAuditLog.deleteMany({ where: { targetId: { in: [...list, ...venueIds] } } });
		await db.venue.deleteMany({ where: { id: { in: venueIds } } });
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	const fiche = (over: Partial<Parameters<typeof venueProfile.updateVenueProfile>[2]> = {}) => ({
		capacity: 80,
		stage: 'Petite scène, sono 2 × 500 W',
		conditions: ['HAT' as const],
		days: [4, 5],
		ageRule: 'DAYTIME_MINORS' as const,
		genreIds: [rock],
		...over
	});

	beforeAll(async () => {
		await cleanup();
		rock = (await db.genre.findUniqueOrThrow({ where: { slug: 'rock' } })).id;
		for (const [name, age] of [
			['patron', 45],
			['serveuse', 24],
			['ado', 16],
			['modo', 35]
		] as const) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			users[name] = user.id;
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Venueprofile Test ${name}`,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								birthDate: new Date(Date.now() - age * YEAR)
							}
						}
					}
				})
			).id;
		}
		for (const [key, name] of [
			['bar', 'Venueprofile Test Le Comptoir'],
			['other', 'Venueprofile Test Ailleurs']
		] as const) {
			venues[key] = (
				await db.venue.create({
					data: {
						name,
						nameKey: name.toLowerCase(),
						kind: 'BAR',
						communeCode: '31555',
						communeName: 'Toulouse',
						departmentCode: '31',
						lat: 43.6,
						lng: 1.44,
						createdById: ids.modo,
						validatedAt: new Date()
					}
				})
			).id;
		}
		// Le patron revendique le bar (P5-03a), la modération approuve.
		await claims.startClaim(venues.bar, ids.patron);
		await claims.submitClaimProof(venues.bar, ids.patron, 'https://www.instagram.com/comptoir');
		const claim = await db.venueClaim.findFirstOrThrow({ where: { venueId: venues.bar } });
		await claims.approveVenueClaim(claim.id, { userId: users.modo });
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('la décision de revendication est notifiée (Q29)', async () => {
		expect(
			await db.notification.count({ where: { recipientActorId: ids.patron, type: 'VENUE_CLAIM' } })
		).toBe(1);
	});

	it('une fiche incomplète ne se publie pas ; complète, elle donne « Lieu ouvert »', async () => {
		expect(await venueProfile.venueForManager(venues.bar, ids.serveuse)).toBeNull();
		await venueProfile.updateVenueProfile(venues.bar, ids.patron, fiche({ stage: '' }));
		await expect(venueProfile.setVenuePublished(venues.bar, ids.patron, true)).rejects.toThrow(
			/Complète/
		);
		expect((await venueProfile.venueForManager(venues.bar, ids.patron))?.gaps).toEqual([
			'la scène et le son'
		]);
		expect(await venueProfile.publicVenueProfile(venues.bar, ids.serveuse)).toBeNull();
		await venueProfile.updateVenueProfile(venues.bar, ids.patron, fiche());
		await venueProfile.setVenuePublished(venues.bar, ids.patron, true);
		const manager = await venueProfile.venueForManager(venues.bar, ids.patron);
		expect(manager?.rank.tier?.id).toBe('VENUE_OPEN');
		expect(manager?.quests.find((q) => q.id === 'venue.fiche')?.done).toBe(true);
		// L'organisation prend la commune du lieu.
		const org = await db.venue.findUniqueOrThrow({
			where: { id: venues.bar },
			select: { claimedByActorId: true }
		});
		expect(
			await db.actorLocation.findUnique({ where: { actorId: org.claimedByActorId! } })
		).toMatchObject({ communeCode: '31555' });
		expect(await venueProfile.publicVenueProfile(venues.bar, ids.serveuse)).toMatchObject({
			capacity: 80,
			ageRule: 'DAYTIME_MINORS',
			tier: { id: 'VENUE_OPEN' }
		});
	});

	it('vider la fiche la dépublie', async () => {
		const { unpublished } = await venueProfile.updateVenueProfile(
			venues.bar,
			ids.patron,
			fiche({ conditions: [] })
		);
		expect(unpublished).toBe(true);
		await venueProfile.updateVenueProfile(venues.bar, ids.patron, fiche());
		await venueProfile.setVenuePublished(venues.bar, ids.patron, true);
	});

	it('le lieu publie une date chez lui, sans le métier d’organisateur·rice (Q34)', async () => {
		const { claimedByActorId: orgId } = await db.venue.findUniqueOrThrow({
			where: { id: venues.bar },
			select: { claimedByActorId: true }
		});
		const form = {
			venueId: venues.bar,
			day: inTenDays,
			start: '21:00',
			title: 'Jeudi rock au Comptoir',
			description: 'Deux groupes, chapeau et une boisson offerte, fin à minuit.',
			slots: 2,
			radiusKm: 25
		};
		await expect(
			createGigSlot(ids.patron, { ...form, venueId: venues.other }, new Date(), orgId)
		).rejects.toThrow(/chez lui/);
		await expect(createGigSlot(ids.patron, form)).rejects.toThrow(/Organisateur·rice/);
		const { id } = await createGigSlot(ids.patron, form, new Date(), orgId);
		expect(await db.opportunity.findUniqueOrThrow({ where: { id } })).toMatchObject({
			issuerActorId: orgId,
			postedById: ids.patron,
			venueId: venues.bar
		});
		expect(
			(await venueProfile.publicVenueProfile(venues.bar, ids.serveuse))?.gigSlots.map((g) => g.id)
		).toEqual([id]);
		expect(
			(await venueProfile.venueForManager(venues.bar, ids.patron))?.quests.find(
				(q) => q.id === 'venue.date'
			)?.done
		).toBe(true);
	});

	it('co-gestion : une personne majeure, sans métier exigé ; pas un·e mineur·e', async () => {
		await expect(
			venueProfile.inviteVenueManager(venues.bar, ids.patron, PREFIX + 'ado')
		).rejects.toThrow(/majeure/);
		await venueProfile.inviteVenueManager(venues.bar, ids.patron, PREFIX + 'serveuse');
		const [invite] = await venueProfile.myVenueInvites(ids.serveuse);
		await venueProfile.answerVenueInvite(invite.membershipId, ids.serveuse, true);
		expect((await venueProfile.myVenues(ids.serveuse)).map((v) => v.venueId)).toEqual([venues.bar]);
		expect(await venueProfile.venueForManager(venues.bar, ids.serveuse)).not.toBeNull();
		const exported = await exportPersonData(users.serveuse);
		expect(exported?.organisations).toEqual([
			expect.objectContaining({ organisation: 'Venueprofile Test Le Comptoir', role: 'ADMIN' })
		]);
	});

	it('photos (P5-03d) : la gestion seulement, publiques une fois validées, huit au plus', async () => {
		const handle = (
			await db.actor.findFirstOrThrow({
				where: { organization: { kind: 'VENUE', venueClaims: { some: { venueId: venues.bar } } } },
				select: { handle: true }
			})
		).handle;
		// Un nom qui n'est pas celui d'un lieu : rien (le studio prend le relais).
		expect(await venueProfile.venueForPhotoUpload(PREFIX + 'patron', ids.patron)).toBeNull();
		await expect(venueProfile.venueForPhotoUpload(handle, ids.ado)).rejects.toMatchObject({
			status: 404
		});
		// La personne qui envoie est de confiance (TL1) : sa photo passe en ligne.
		await db.actor.update({ where: { id: ids.patron }, data: { trustLevel: 1 } });
		const orgId = await venueProfile.venueForPhotoUpload(handle, ids.patron);
		const { mediaId } = await startUpload(
			orgId!,
			{ mimeType: 'image/jpeg', bytes: 200_000, title: 'La scène', isDemo: false },
			{ uploaderId: ids.patron, onlyImages: true }
		);
		expect(await finalizeUpload(mediaId)).toMatchObject({ status: 'PUBLISHED' });
		expect((await venueProfile.publicVenueProfile(venues.bar, ids.ado))?.photos).toEqual([
			{ id: mediaId, title: 'La scène', url: 'https://res.cloudinary.test/comptoir.jpg' }
		]);
		expect(
			(await venueProfile.venueForManager(venues.bar, ids.patron))?.photos.map((p) => p.status)
		).toEqual(['PUBLISHED']);
		await db.media.createMany({
			data: Array.from({ length: 7 }, (_, i) => ({
				actorId: orgId!,
				kind: 'IMAGE' as const,
				provider: 'CLOUDINARY' as const,
				status: 'PUBLISHED' as const,
				title: `Photo ${i}`
			}))
		});
		await expect(venueProfile.venueForPhotoUpload(handle, ids.patron)).rejects.toThrow(
			'8 photos au plus'
		);
		await expect(venueProfile.deleteVenuePhoto(venues.bar, ids.ado, mediaId)).rejects.toMatchObject(
			{ status: 404 }
		);
		await venueProfile.deleteVenuePhoto(venues.bar, ids.patron, mediaId);
		expect(await db.media.count({ where: { id: mediaId } })).toBe(0);
		// Aucune XP pour une photo.
		expect(
			await db.xpTransaction.count({ where: { ruleId: { contains: 'media' }, actorId: orgId! } })
		).toBe(0);
	});
});
