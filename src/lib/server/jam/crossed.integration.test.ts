/**
 * « Apprécier les musicos croisés » (P2-15, D50) sur la base de `.env`,
 * schéma `e2e` : la jam en cours et celles de la semaine, autres présent·es
 * et appréciations déjà laissées ; un faux présent retiré ne compte pas.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/jam
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

const { crossedJams } = await import('./afterJam');

const PREFIX = 'crossed-test-';
const YEAR = 365.25 * 86_400_000;
const HOUR = 3_600_000;

describe.skipIf(!enabled)('musicos croisés (schéma e2e)', { timeout: 60_000 }, () => {
	const ids: Record<string, string> = {};

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { handle: { startsWith: PREFIX } },
			select: { id: true }
		});
		await db.actor.deleteMany({ where: { id: { in: actors.map((a) => a.id) } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	beforeAll(async () => {
		await cleanup();
		for (const name of ['lea', 'malik', 'zoe', 'faux', 'sam']) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Crossed Test ${name}`,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								birthDate: new Date(Date.now() - 30 * YEAR)
							}
						}
					}
				})
			).id;
		}
		const venue = await db.venue.create({
			data: {
				name: 'Crossed Test Bar',
				nameKey: 'crossed test bar',
				kind: 'BAR',
				communeCode: '31555',
				communeName: 'Toulouse',
				departmentCode: '31',
				lat: 43.6,
				lng: 1.43,
				createdById: ids.sam,
				validatedAt: new Date()
			}
		});
		const now = Date.now();
		const jam = (title: string, startsAt: number, endsAt: number) =>
			db.opportunity.create({
				data: {
					kind: 'JAM',
					status: 'OPEN',
					title,
					description: 'Test',
					issuerActorId: ids.sam,
					startsAt: new Date(startsAt),
					endsAt: new Date(endsAt),
					expiresAt: new Date(endsAt),
					venueId: venue.id
				}
			});
		const past = await jam('Crossed passée', now - 3 * 24 * HOUR, now - 3 * 24 * HOUR + 3 * HOUR);
		const live = await jam('Crossed en cours', now - HOUR, now + 2 * HOUR);
		await jam('Crossed trop ancienne', now - 10 * 24 * HOUR, now - 10 * 24 * HOUR + 3 * HOUR);
		const at = new Date();
		await db.jamAttendance.createMany({
			data: [
				{ opportunityId: past.id, actorId: ids.lea, attendedAt: at },
				{ opportunityId: past.id, actorId: ids.malik, attendedAt: at },
				{ opportunityId: past.id, actorId: ids.zoe, attendedAt: at },
				{ opportunityId: past.id, actorId: ids.faux, attendedAt: at, removedAt: at },
				{ opportunityId: live.id, actorId: ids.lea },
				{ opportunityId: live.id, actorId: ids.malik, attendedAt: at }
			]
		});
		await db.jamEndorsement.create({
			data: {
				opportunityId: past.id,
				fromActorId: ids.lea,
				toActorId: ids.malik,
				quality: 'GROOVE'
			}
		});
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('la jam en cours puis celle de la semaine, avec ce qu’il reste à apprécier', async () => {
		const jams = await crossedJams(ids.lea);
		expect(jams.map((j) => j.title)).toEqual(['Crossed en cours', 'Crossed passée']);
		expect(jams[0]).toMatchObject({ attended: false, others: 1, given: 0 });
		// Le faux présent retiré ne compte pas ; Malik est déjà apprécié.
		expect(jams[1]).toMatchObject({ attended: true, others: 2, given: 1 });
	});
});
