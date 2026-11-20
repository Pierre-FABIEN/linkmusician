/**
 * Jam tenue et jam invalidée (#93, RV-01) sur la base de `.env`, schéma
 * `e2e`. Une jam publiée au nom d'un lieu n'est jamais « tenue » pendant
 * qu'elle se déroule ; le job la rattrape une fois finie. Si la modération
 * confirme qu'elle n'a pas eu lieu, `jam.held` et les appréciations de la
 * jam sont repris par transactions négatives liées, exactement une fois.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/jam/heldInvalidation
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

const { iWasThere, endorse, markEndedJamsHeld, invalidateJam } = await import('./afterJam');
const incidents = await import('./incidents');

const PREFIX = 'held-test-';
const YEAR = 365.25 * 86_400_000;
const HOUR = 3_600_000;
// La jam : de 19 h à 22 h (Paris), le samedi 14 novembre 2026.
const START = new Date('2026-11-14T18:00:00Z');
const END = new Date('2026-11-14T21:00:00Z');
const DURING = new Date('2026-11-14T20:00:00Z');
const AFTER = new Date('2026-11-14T22:00:00Z');

describe.skipIf(!enabled)('jam tenue puis invalidée (schéma e2e)', { timeout: 90_000 }, () => {
	const ids: Record<string, string> = {};
	let orgId = '';
	let jamId = '';
	let moderatorUserId = '';

	async function cleanup() {
		await db.venue.deleteMany({ where: { name: { startsWith: 'Held Test' } } });
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(name: string) {
		const user = await db.user.create({
			data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
		});
		ids[name] = (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + name,
					displayName: `Held ${name}`,
					trustLevel: 1,
					createdAt: new Date(START.getTime() - YEAR),
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: START,
							onboardedAt: START,
							birthDate: new Date(START.getTime() - 30 * YEAR)
						}
					}
				}
			})
		).id;
	}

	const xpOf = async (actorId: string) =>
		(await db.xpTransaction.aggregate({ where: { actorId }, _sum: { amount: true } }))._sum
			.amount ?? 0;

	beforeAll(async () => {
		await cleanup();
		for (const name of ['gerant', 'a', 'b', 'c', 'temoin']) await person(name);
		moderatorUserId = (
			await db.user.create({
				data: { email: `${PREFIX}modo@example.test`, referralCode: `${PREFIX}modo` }
			})
		).id;
		orgId = (
			await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: `${PREFIX}bar`,
					displayName: 'Held Bar',
					organization: {
						create: {
							kind: 'VENUE',
							memberships: {
								create: [{ personId: ids.gerant, role: 'OWNER', status: 'ACTIVE' }]
							},
							venueProfile: { create: { publishedAt: START } }
						}
					}
				}
			})
		).id;
		const venue = await db.venue.create({
			data: {
				name: 'Held Test Bar',
				nameKey: 'held test bar',
				kind: 'BAR',
				communeCode: '31555',
				communeName: 'Toulouse',
				departmentCode: '31',
				lat: 43.6,
				lng: 1.43,
				createdById: ids.gerant,
				validatedAt: START,
				claimedByActorId: orgId
			}
		});
		jamId = (
			await db.opportunity.create({
				data: {
					kind: 'JAM',
					status: 'OPEN',
					title: 'Held jam',
					description: 'Test',
					issuerActorId: orgId,
					postedById: ids.gerant,
					startsAt: START,
					endsAt: END,
					expiresAt: END,
					venueId: venue.id,
					// Le témoin s'était inscrit la veille, sans venir.
					attendances: {
						create: [{ actorId: ids.temoin, createdAt: new Date(START.getTime() - 24 * HOUR) }]
					}
				},
				select: { id: true }
			})
		).id;
		// B partage ses jams passées : A pourra l'apprécier (D81).
		await db.activityVisibilityPreference.create({
			data: { actorId: ids.b, past: 'PUBLIC', future: 'PRIVATE' }
		});
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('trois présences pendant la jam ne la rendent pas « tenue » avant sa fin', async () => {
		for (const name of ['a', 'b', 'c']) await iWasThere(jamId, ids[name], DURING);
		expect((await db.opportunity.findUniqueOrThrow({ where: { id: jamId } })).heldAt).toBeNull();
		expect(await xpOf(ids.gerant)).toBe(0);
	});

	it('une fois finie, le job la rend tenue, une seule fois', async () => {
		expect(await markEndedJamsHeld(AFTER)).toBeGreaterThanOrEqual(1);
		expect(
			(await db.opportunity.findUniqueOrThrow({ where: { id: jamId } })).heldAt
		).not.toBeNull();
		const gain = await xpOf(ids.gerant);
		expect(gain).toBeGreaterThan(0);
		await markEndedJamsHeld(AFTER);
		expect(await xpOf(ids.gerant)).toBe(gain);
	});

	it('jam fictive confirmée : jam.held et appréciations repris exactement une fois', async () => {
		// Chaque événement recalcule la confiance : on rend à A son palier de test.
		await db.actor.update({ where: { id: ids.a }, data: { trustLevel: 1 } });
		await endorse(jamId, ids.a, { to: `${PREFIX}b`, quality: 'GROOVE' }, AFTER);
		expect(await xpOf(ids.b)).toBeGreaterThan(0);
		// Le témoin, inscrit la veille, signale ; la modération confirme.
		await incidents.reportJam(
			jamId,
			ids.temoin,
			{ reason: 'NO_JAM', wentThere: true, details: '' },
			AFTER
		);
		const [item] = (await incidents.jamIncidentQueue(AFTER)).filter((i) => i.jam.id === jamId);
		await incidents.decideIncident(
			item.id,
			{ decision: 'confirm', sanction: 'none', note: 'Aucune jam ce soir-là' },
			{ userId: moderatorUserId },
			AFTER
		);
		expect(await xpOf(ids.gerant)).toBe(0);
		expect(await xpOf(ids.b)).toBe(0);
		// Registre en ajout seul : chaque gain et sa reprise liée.
		const reversals = await db.xpTransaction.count({
			where: { actorId: { in: [ids.gerant, ids.b] }, reversesId: { not: null } }
		});
		expect(reversals).toBe(2);
		expect(
			await db.jamEndorsement.count({ where: { opportunityId: jamId, revokedAt: null } })
		).toBe(0);
		// Rejouer l'invalidation ne reprend rien de plus, et n'émet qu'un jam.invalidated.
		await invalidateJam(jamId, 'Rejeu', AFTER);
		expect(
			await db.xpTransaction.count({
				where: { actorId: { in: [ids.gerant, ids.b] }, reversesId: { not: null } }
			})
		).toBe(2);
		expect(
			await db.domainEvent.count({
				where: { type: 'jam.invalidated', payload: { path: ['jamId'], equals: jamId } }
			})
		).toBe(1);
	});
});
