/**
 * Revendication d'un lieu, niveau 1 (P5-03a, D31) sur la base de `.env`,
 * schéma `e2e` : majeur·es seulement ; un code stable tant que la demande
 * est ouverte ; lien de preuve en https ; à l'approbation, l'organisation
 * VENUE naît, gérée par la personne, la fiche pointe sur elle et les autres
 * demandes sont refusées ; refus avec motif ; journal ; droits sur le
 * matériel ; RGPD. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/venues
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

vi.mock('#lib/server', () => ({ prisma: db }));
vi.mock('$app/env/private', () => ({ SECRET_ADDRESS_SEARCH_MODE: 'e2e' }));
vi.mock('#lib/server/rate-limit', () => ({
	RefillingTokenBucket: class {
		consume = async () => true;
		check = async () => true;
	}
}));

const claims = await import('./claims');
const { getVenue } = await import('./service');
const { moderationJournal } = await import('#lib/server/moderation/journal');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const PREFIX = 'venueclaim-test-';
const YEAR = 365.25 * 86_400_000;
const moderator = { userId: '' };

describe.skipIf(!enabled)('revendication des lieux (schéma e2e)', { timeout: 120_000 }, () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};
	const venues: Record<string, string> = {};

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ displayName: { startsWith: 'Venueclaim Test' } },
					{ person: { user: { email: { startsWith: PREFIX } } } }
				]
			},
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		const venueIds = (
			await db.venue.findMany({
				where: { name: { startsWith: 'Venueclaim Test' } },
				select: { id: true }
			})
		).map((v) => v.id);
		await db.adminAuditLog.deleteMany({
			where: { targetId: { in: [...list, ...venueIds] } }
		});
		await db.venue.deleteMany({ where: { id: { in: venueIds } } });
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	beforeAll(async () => {
		process.env.DATABASE_URL = url.toString();
		await cleanup();
		for (const [name, age] of [
			['lea', 30],
			['malik', 40],
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
						displayName: `Venueclaim Test ${name}`,
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
		moderator.userId = users.modo;
		for (const [key, name] of [
			['bar', 'Venueclaim Test Le Comptoir'],
			['cafe', 'Venueclaim Test Café Rouge']
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
						createdById: ids.malik,
						validatedAt: new Date()
					}
				})
			).id;
		}
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('mineur·e : pas de revendication', async () => {
		const state = await claims.claimState(venues.bar, ids.ado);
		expect(state.blocker).toMatch(/majeur/);
		await expect(claims.startClaim(venues.bar, ids.ado)).rejects.toThrow(/majeur/);
	});

	it('un code stable tant que la demande est ouverte, puis le lien part en file', async () => {
		const code = await claims.startClaim(venues.bar, ids.lea);
		expect(code).toMatch(/^LM-[A-Z2-9]{8}$/);
		expect(await claims.startClaim(venues.bar, ids.lea)).toBe(code);
		expect((await claims.claimState(venues.bar, ids.lea)).mine).toMatchObject({
			status: 'AWAITING_PROOF',
			code
		});
		await expect(
			claims.submitClaimProof(venues.bar, ids.lea, 'http://instagram.com/comptoir')
		).rejects.toThrow(/https/);
		await expect(
			claims.submitClaimProof(venues.bar, ids.malik, 'https://www.instagram.com/x')
		).rejects.toThrow(/C’est mon lieu/);
		await claims.submitClaimProof(venues.bar, ids.lea, 'https://www.instagram.com/comptoir');
		const queue = await claims.pendingVenueClaims();
		expect(queue.find((q) => q.venue.id === venues.bar)).toMatchObject({
			code,
			proofUrl: 'https://www.instagram.com/comptoir',
			requestedBy: { handle: PREFIX + 'lea' }
		});
	});

	it('approbation : organisation VENUE gérée par la personne, autres demandes refusées', async () => {
		await claims.startClaim(venues.bar, ids.malik);
		await claims.submitClaimProof(venues.bar, ids.malik, 'https://www.facebook.com/comptoir');
		const leaClaim = await db.venueClaim.findFirstOrThrow({
			where: { venueId: venues.bar, requestedById: ids.lea }
		});
		// Avant : Malik, auteur de la fiche, peut modifier le matériel.
		expect((await getVenue(venues.bar, ids.malik))?.canEditBackline).toBe(true);
		const orgId = await claims.approveVenueClaim(leaClaim.id, moderator);
		const org = await db.organization.findUniqueOrThrow({
			where: { actorId: orgId },
			include: { actor: true, memberships: true }
		});
		expect(org.kind).toBe('VENUE');
		expect(org.actor.displayName).toBe('Venueclaim Test Le Comptoir');
		expect(org.memberships.map((m) => [m.personId, m.role, m.status])).toEqual([
			[ids.lea, 'OWNER', 'ACTIVE']
		]);
		expect((await db.venue.findUniqueOrThrow({ where: { id: venues.bar } })).claimedByActorId).toBe(
			orgId
		);
		expect((await claims.claimState(venues.bar, ids.malik)).claimed).toBe(true);
		expect(
			await db.venueClaim.findFirstOrThrow({
				where: { venueId: venues.bar, requestedById: ids.malik }
			})
		).toMatchObject({ status: 'REJECTED', reason: expect.stringMatching(/autre personne/) });
		// Le matériel passe à la gestion du lieu.
		expect((await getVenue(venues.bar, ids.lea))?.canEditBackline).toBe(true);
		expect((await getVenue(venues.bar, ids.malik))?.canEditBackline).toBe(false);
		await expect(claims.startClaim(venues.bar, ids.malik)).rejects.toThrow(/déjà géré/);
	});

	it('refus avec motif, montré à la personne ; chaque décision au journal', async () => {
		await claims.startClaim(venues.cafe, ids.malik);
		await claims.submitClaimProof(venues.cafe, ids.malik, 'https://www.instagram.com/rouge');
		const claim = await db.venueClaim.findFirstOrThrow({
			where: { venueId: venues.cafe, status: 'PENDING' }
		});
		await expect(claims.rejectVenueClaim(claim.id, ' ', moderator)).rejects.toThrow(/motif/);
		await claims.rejectVenueClaim(claim.id, 'Le code n’apparaît pas sur la page', moderator);
		expect((await claims.claimState(venues.cafe, ids.malik)).mine).toMatchObject({
			status: 'REJECTED',
			code: null,
			reason: 'Le code n’apparaît pas sur la page'
		});
		const { entries } = await moderationJournal({ family: 'venues' });
		const labels = entries
			.filter((e) => e.target?.label.startsWith('Venueclaim Test'))
			.map((e) => e.label);
		expect(labels).toEqual(['Revendication de lieu refusée', 'Revendication de lieu approuvée']);
	});

	it('RGPD : revendications exportées, puis demandeur et lien oubliés', async () => {
		const exported = await exportPersonData(users.malik);
		expect(exported?.revendications_de_lieux).toHaveLength(2);
		await db.$transaction(await personAnonymizationOps(users.malik));
		expect(
			await db.venueClaim.count({
				where: { venueId: { in: [venues.bar, venues.cafe] }, requestedById: null, proofUrl: null }
			})
		).toBe(2);
	});
});
