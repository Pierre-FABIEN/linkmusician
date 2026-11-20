/**
 * Après la jam et mineur·es (RV-01, #100) sur la base de `.env`, schéma
 * `e2e` : dans un lieu réservé aux adultes, un·e mineur·e ne voit pas « Qui
 * était là ? », ne déclare pas « J'y étais » et n'apprécie personne, même
 * pour une jam finie avant 22 h. Avant la jam, `forViewer` l'écartait déjà ;
 * l'après-jam ne vérifiait que le couvre-feu. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/jam/afterJamMinors
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

const { whoWasThere, iWasThere, endorse } = await import('./afterJam');

const PREFIX = 'minors-after-';
const YEAR = 365.25 * 86_400_000;
const HOUR = 3_600_000;
// Samedi 14 novembre 2026, 18 h à Paris : la jam de 14 h à 17 h est finie avant 22 h.
const NOW = new Date('2026-11-14T17:00:00Z');

describe.skipIf(!enabled)('après-jam des mineur·es (schéma e2e)', { timeout: 60_000 }, () => {
	const ids: Record<string, string> = {};
	let jamId = '';

	async function cleanup() {
		await db.venue.deleteMany({ where: { name: { startsWith: 'Minors After' } } });
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(name: string, age: number) {
		const user = await db.user.create({
			data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
		});
		ids[name] = (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + name,
					displayName: `Minors After ${name}`,
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: NOW,
							onboardedAt: NOW,
							birthDate: new Date(NOW.getTime() - age * YEAR)
						}
					}
				}
			})
		).id;
	}

	beforeAll(async () => {
		await cleanup();
		await person('host', 35);
		await person('adulte', 30);
		await person('mineure', 16);
		const org = await db.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle: `${PREFIX}bar`,
				displayName: 'Minors After Bar',
				organization: {
					create: {
						kind: 'VENUE',
						venueProfile: { create: { ageRule: 'ADULTS', publishedAt: NOW } }
					}
				}
			}
		});
		const venue = await db.venue.create({
			data: {
				name: 'Minors After Bar',
				nameKey: 'minors after bar',
				kind: 'BAR',
				communeCode: '31555',
				communeName: 'Toulouse',
				departmentCode: '31',
				lat: 43.6,
				lng: 1.43,
				createdById: ids.host,
				validatedAt: NOW,
				claimedByActorId: org.id
			}
		});
		const startsAt = new Date(NOW.getTime() - 4 * HOUR);
		const endsAt = new Date(NOW.getTime() - HOUR);
		jamId = (
			await db.opportunity.create({
				data: {
					kind: 'JAM',
					status: 'OPEN',
					title: 'Minors After jam',
					description: 'Test',
					issuerActorId: ids.host,
					startsAt,
					endsAt,
					expiresAt: endsAt,
					venueId: venue.id
				}
			})
		).id;
		await db.jamAttendance.createMany({
			data: [
				{ opportunityId: jamId, actorId: ids.adulte, attendedAt: NOW },
				// Ligne héritée d'avant le correctif : elle ne doit rien ouvrir.
				{ opportunityId: jamId, actorId: ids.mineure, attendedAt: NOW }
			]
		});
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('un·e adulte voit « Qui était là ? »', async () => {
		const data = await whoWasThere(jamId, ids.adulte, NOW);
		expect(data?.jam.title).toBe('Minors After jam');
	});

	it('un·e mineur·e ne voit ni ne déclare rien dans un lieu réservé aux adultes', async () => {
		expect(await whoWasThere(jamId, ids.mineure, NOW)).toBeNull();
		await expect(iWasThere(jamId, ids.mineure, NOW)).rejects.toMatchObject({ status: 404 });
		await expect(
			endorse(jamId, ids.mineure, { to: `${PREFIX}adulte`, quality: 'GROOVE' }, NOW)
		).rejects.toMatchObject({ status: 404 });
	});
});
