/**
 * Scènes ouvertes récurrentes (P5-04a) sur la base de `.env`, schéma `e2e` :
 * le lieu publie « tous les jeudis », les jams des 4 semaines existent
 * (idempotent), la gestion du lieu en est hôte, la jam est tenue au 3ᵉ
 * « J'y étais » (50 XP × confiance pour qui l'a publiée, rien pour les présent·es, une
 * date pour le rang du lieu), un lieu réservé aux adultes est caché aux
 * mineur·es, l'arrêt clôture les jams à venir, l'export RGPD les cite.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/jam/series
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

const series = await import('./series');
const jams = await import('./publicJams');
const { iWasThere, removeFromJam } = await import('./afterJam');
const { venueForManager } = await import('#lib/server/venues/profile');
const { exportPersonData } = await import('#lib/prisma/actors/person');

const PREFIX = 'series-test-';
const YEAR = 365.25 * 86_400_000;
const HOUR = 3_600_000;
// Mercredi 11 novembre 2026, midi à Paris : le premier jeudi est le 12.
const NOW = new Date('2026-11-11T11:00:00Z');

describe.skipIf(!enabled)('scènes ouvertes récurrentes (schéma e2e)', { timeout: 120_000 }, () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};
	let venueId = '';
	let orgId = '';
	let seriesId = '';

	async function cleanup() {
		const venues = await db.venue.findMany({
			where: { name: { startsWith: 'Series Test' } },
			select: { id: true, claimedByActorId: true }
		});
		await db.venue.deleteMany({ where: { id: { in: venues.map((v) => v.id) } } });
		const actors = await db.actor.findMany({
			where: { OR: [{ handle: { startsWith: PREFIX } }] },
			select: { id: true }
		});
		await db.actor.deleteMany({ where: { id: { in: actors.map((a) => a.id) } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	beforeAll(async () => {
		await cleanup();
		for (const [name, age, trust] of [
			['patron', 45, 2],
			['serveuse', 24, 2],
			['lea', 30, 2],
			['malik', 28, 2],
			['zoe', 33, 2],
			['ado', 16, 1]
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
						displayName: `Series Test ${name}`,
						trustLevel: trust,
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
		orgId = (
			await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: `${PREFIX}comptoir`,
					displayName: 'Series Test Le Comptoir',
					organization: {
						create: {
							kind: 'VENUE',
							memberships: {
								create: [
									{ personId: ids.patron, role: 'OWNER', status: 'ACTIVE' },
									{ personId: ids.serveuse, role: 'ADMIN', status: 'ACTIVE' }
								]
							},
							venueProfile: {
								create: {
									capacity: 60,
									stage: 'Petite scène',
									days: [4],
									ageRule: 'ALL_AGES',
									publishedAt: new Date()
								}
							}
						}
					}
				}
			})
		).id;
		venueId = (
			await db.venue.create({
				data: {
					name: 'Series Test Le Comptoir',
					nameKey: 'series test le comptoir',
					kind: 'BAR',
					communeCode: '31555',
					communeName: 'Toulouse',
					departmentCode: '31',
					lat: 43.6,
					lng: 1.43,
					createdById: ids.patron,
					validatedAt: new Date(),
					claimedByActorId: orgId,
					backline: ['DRUMS']
				}
			})
		).id;
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	const form = {
		weekday: 4,
		start: '20:00',
		end: '23:00',
		title: 'Scène ouverte du jeudi',
		description: '',
		genre: undefined,
		spots: [{ instrument: 'batterie', count: 1 }]
	};

	it('seule la gestion du lieu publie une scène ouverte', async () => {
		await expect(series.createJamSeries(ids.lea, venueId, form, NOW)).rejects.toThrow(
			/gèrent le lieu/
		);
	});

	it('publie les jeudis des 4 semaines à venir, au nom du lieu, sans doublon', async () => {
		({ id: seriesId } = await series.createJamSeries(ids.serveuse, venueId, form, NOW));
		const created = await db.opportunity.findMany({
			where: { seriesId },
			orderBy: { startsAt: 'asc' },
			include: { jamSpots: true }
		});
		expect(created.map((j) => j.startsAt?.toISOString())).toEqual([
			'2026-11-12T19:00:00.000Z',
			'2026-11-19T19:00:00.000Z',
			'2026-11-26T19:00:00.000Z',
			'2026-12-03T19:00:00.000Z'
		]);
		expect(created[0]).toMatchObject({
			issuerActorId: orgId,
			postedById: ids.serveuse,
			kind: 'JAM',
			backline: ['DRUMS']
		});
		expect(created[0].jamSpots).toHaveLength(1);
		// Le job du lendemain ajoute une semaine, et rien d'autre.
		const tomorrow = new Date(NOW.getTime() + 24 * HOUR);
		const again = await series.generateSeriesJams(tomorrow);
		expect(again.jamsCreated).toBe(0);
		const nextWeek = new Date(NOW.getTime() + 7 * 24 * HOUR);
		await series.generateSeriesJams(nextWeek);
		expect(await db.opportunity.count({ where: { seriesId } })).toBe(5);
	});

	it('le mode jam la montre « Tous les jeudis », hébergée par le lieu', async () => {
		const first = await db.opportunity.findFirstOrThrow({
			where: { seriesId },
			orderBy: { startsAt: 'asc' }
		});
		const card = await jams.getJam(first.id, ids.lea, NOW);
		expect(card).toMatchObject({
			recurring: 'Tous les jeudis',
			host: { href: `/lieux/${venueId}` },
			isHost: false
		});
		// La gestion du lieu en est hôte, les deux personnes.
		expect((await jams.getJam(first.id, ids.patron, NOW))?.isHost).toBe(true);
		expect((await jams.getJam(first.id, ids.serveuse, NOW))?.canManage).toBe(true);
		await expect(jams.comeToJam(first.id, ids.patron, null, NOW)).rejects.toThrow(/tiens/);
		// Le patron désigne un lead.
		await jams.setJamLead(first.id, ids.patron, `${PREFIX}lea`, NOW);
	});

	it('la jam est tenue au 3ᵉ présent : 50 XP pour qui l’a publiée, une date pour le lieu', async () => {
		const first = await db.opportunity.findFirstOrThrow({
			where: { seriesId },
			orderBy: { startsAt: 'asc' }
		});
		const after = new Date(first.endsAt!.getTime() + HOUR);
		// L'hôte ne compte pas parmi les présent·es.
		await iWasThere(first.id, ids.patron, after);
		await iWasThere(first.id, ids.lea, after);
		await iWasThere(first.id, ids.malik, after);
		expect((await db.opportunity.findUniqueOrThrow({ where: { id: first.id } })).heldAt).toBeNull();
		await iWasThere(first.id, ids.zoe, after);
		expect(
			(await db.opportunity.findUniqueOrThrow({ where: { id: first.id } })).heldAt
		).not.toBeNull();
		const gains = await db.xpTransaction.findMany({ where: { ruleId: 'jam.held' } });
		expect(gains.filter((g) => [ids.lea, ids.malik, ids.zoe].includes(g.actorId))).toEqual([]);
		// Comptes neufs : la confiance recalculée est TL0, le gain est pondéré (50 × 0,1).
		expect(gains.filter((g) => g.actorId === ids.serveuse)).toEqual([
			expect.objectContaining({ amount: 5, track: 'PROMOTER', reason: 'Jam publique tenue ×0,1' })
		]);
		// Une seule fois, même si quelqu'un repasse ou si un faux présent est retiré.
		await iWasThere(first.id, ids.zoe, after);
		await removeFromJam(first.id, ids.patron, `${PREFIX}zoe`, after);
		expect(await db.xpTransaction.count({ where: { ruleId: 'jam.held' } })).toBe(gains.length);
		const managed = await venueForManager(venueId, ids.patron);
		expect(managed?.rank.dates).toBe(1);
	});

	it('un lieu réservé aux adultes est caché aux mineur·es', async () => {
		const first = await db.opportunity.findFirstOrThrow({
			where: { seriesId, startsAt: { gt: NOW } },
			orderBy: { startsAt: 'desc' }
		});
		// 20 h-23 h : déjà invisible pour un·e mineur·e (22 h).
		await db.jamSeries.update({ where: { id: seriesId }, data: { endTime: '21:30' } });
		await db.opportunity.update({
			where: { id: first.id },
			data: { endsAt: new Date(first.startsAt!.getTime() + 1.5 * HOUR) }
		});
		expect(await jams.getJam(first.id, ids.ado, NOW)).not.toBeNull();
		await db.venueProfile.update({ where: { orgId }, data: { ageRule: 'ADULTS' } });
		expect(await jams.getJam(first.id, ids.ado, NOW)).toBeNull();
		await db.venueProfile.update({ where: { orgId }, data: { ageRule: 'ALL_AGES' } });
	});

	it('l’export RGPD cite la série ; l’arrêt clôture les jams à venir', async () => {
		const data = await exportPersonData(users.serveuse);
		expect(data?.scenes_ouvertes_publiees).toEqual([
			expect.objectContaining({ titre: 'Scène ouverte du jeudi', jour_de_la_semaine: 4 })
		]);
		await series.stopJamSeries(ids.patron, seriesId, NOW);
		const open = await db.opportunity.count({
			where: { seriesId, status: 'OPEN', startsAt: { gt: NOW } }
		});
		expect(open).toBe(0);
		expect((await series.generateSeriesJams(NOW)).jamsCreated).toBe(0);
	});
});
