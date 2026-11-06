/**
 * Tests d'intégration du moteur de progression (P1-07), sur la base de
 * `.env`, schéma `e2e` (jamais `public`). Désactivés par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/progression
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { MemoryLedger } from './core/memory';
import { MILESTONES, PROOF_STATUSES } from './core/events';
import { emit, type NewDomainEvent } from './events';
import { emitAndProcess, processEvent, reverseGain } from './processor';
import { appendGains } from './ledger';
import { seedReferentials } from '../../../../prisma/seed-referentials.js';
import { ACCOUNT_TRACK, rebuildAll } from './projector';
import { onProfileChanged } from './profile';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const PREFIX = 'prog-test-';

describe.skipIf(!enabled)('moteur de progression (schéma e2e)', () => {
	let db: PrismaClient;
	let people: string[] = [];
	let bands: string[] = [];

	const tx = <T>(
		fn: (t: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) => Promise<T>
	) => db.$transaction(fn, { timeout: 30_000, maxWait: 30_000 });

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { handle: { startsWith: PREFIX } },
			select: { id: true }
		});
		const ids = actors.map((a) => a.id);
		if (ids.length === 0) return;
		await db.actor.deleteMany({ where: { id: { in: ids } } }); // cascade : registre, projections, succès
		await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: ids } } });
	}

	beforeAll(async () => {
		const url = new URL(
			dotenv.config({ quiet: true }).parsed?.DATABASE_URL ?? process.env.DATABASE_URL ?? ''
		);
		url.searchParams.set('schema', 'e2e');
		db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
		await cleanup();
		await seedReferentials(db);
		const make = async (name: string) =>
			(
				await db.actor.create({
					data: { kind: 'PERSON', handle: PREFIX + name, displayName: name }
				})
			).id;
		people = await Promise.all(['ana', 'ben', 'cleo', 'dan', 'eli', 'fay'].map(make));
		bands = await Promise.all(['les-tests', 'unit'].map(make));
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db?.$disconnect();
	}, 120_000);

	it('traiter deux fois le même événement ne crédite qu’une fois', async () => {
		const [ana] = people;
		const first = await tx((t) => emitAndProcess(t, { type: 'profile.completed', actorId: ana }));
		expect(first.inserted).toBe(1);
		const again = await tx((t) => processEvent(t, first.eventId));
		expect(again.skipped).toBe(true);
		// Même en forçant l'écriture des gains : la contrainte d'unicité tient.
		expect(await tx((t) => appendGains(t, first.eventId, first.gains))).toBe(0);
		expect(await db.xpTransaction.count({ where: { sourceEventId: first.eventId } })).toBe(1);
	}, 120_000);

	it('le registre est en ajout seul ; une annulation est une ligne négative', async () => {
		const [, ben] = people;
		const result = await tx((t) =>
			emitAndProcess(t, { type: 'media.published', actorId: ben, mediaId: 'm1', kind: 'DEMO' })
		);
		const row = await db.xpTransaction.findFirstOrThrow({
			where: { sourceEventId: result.eventId }
		});
		await expect(
			db.xpTransaction.update({ where: { id: row.id }, data: { amount: 9999 } })
		).rejects.toThrow(/ajout seul/);
		await expect(db.xpTransaction.delete({ where: { id: row.id } })).rejects.toThrow(/ajout seul/);
		const reversal = await tx((t) => reverseGain(t, row.id, 'démo retirée par la modération'));
		expect(reversal?.amount).toBe(-row.amount);
		expect(await tx((t) => reverseGain(t, row.id, 'deux fois'))).toBeNull();
		const progress = await db.actorProgress.findUniqueOrThrow({
			where: { actorId_track: { actorId: ben, track: 'MUSICIAN' } }
		});
		expect(progress.xp).toBe(0); // projection recalculée après l'annulation
	}, 120_000);

	it('200 événements aléatoires : registre = projection = registre en mémoire, rebuild identique', async () => {
		await cleanupLedgerOf(people.slice(2).concat(bands));
		const actors = people.slice(2); // cleo, dan, eli, fay : historique vierge
		const memory = new MemoryLedger();
		let seed = 42;
		const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
		const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
		const start = new Date('2026-01-01T09:00:00Z').getTime();
		const status = new Map<string, (typeof PROOF_STATUSES)[number]>();

		for (let i = 0; i < 200; i++) {
			const occurredAt = new Date(start + i * 9 * 3_600_000); // toutes les 9 h, ~75 jours
			const a = pick(actors);
			const b = pick(actors.filter((x) => x !== a));
			const band = pick(bands);
			const kind = Math.floor(rand() * 8);
			let input: NewDomainEvent;
			if (kind === 0) input = { type: 'profile.completed', actorId: a };
			else if (kind === 1)
				input = {
					type: 'media.published',
					actorId: a,
					mediaId: `m${i}`,
					kind: pick(['DEMO', 'DEMO', 'PHOTO'] as const)
				};
			else if (kind === 2)
				input = {
					type: 'conversation.reciprocated',
					actorId: a,
					counterpartId: b,
					fromOpportunity: rand() < 0.8
				};
			else if (kind === 3) input = { type: 'membership.accepted', personId: a, bandId: band };
			else if (kind === 4)
				input = {
					type: 'collaboration.completed',
					collaborationId: `c${i}`,
					participantIds: rand() < 0.7 ? [a, b] : [a, b, pick(actors)]
				};
			else if (kind === 5)
				input = {
					type: 'endorsement.received',
					actorId: a,
					endorserId: b,
					skill: pick(['guitare', 'chant', 'fiabilité'])
				};
			else if (kind === 6) input = { type: 'profile.updated', actorId: a };
			else {
				const milestone = pick(MILESTONES);
				const key = `${band}|${milestone}`;
				const from = status.get(key) ?? null;
				const to = pick(PROOF_STATUSES);
				status.set(key, to);
				input = {
					type: 'milestone.attested',
					bandId: band,
					milestone,
					from,
					to,
					memberIds: [a, b]
				};
			}
			const result = await tx((t) => emitAndProcess(t, { ...input, occurredAt } as NewDomainEvent));
			memory.apply({ ...input, id: result.eventId, occurredAt });
		}

		const ids = [...actors, ...bands];
		const sums = await db.xpTransaction.groupBy({
			by: ['actorId', 'track'],
			where: { actorId: { in: ids } },
			_sum: { amount: true }
		});
		const projection = await db.actorProgress.findMany({ where: { actorId: { in: ids } } });
		for (const s of sums) {
			const p = projection.find((r) => r.actorId === s.actorId && r.track === s.track);
			expect(p?.xp, `${s.actorId}/${s.track}`).toBe(s._sum.amount);
		}
		for (const id of ids) {
			const total = sums
				.filter((s) => s.actorId === id)
				.reduce((n, s) => n + (s._sum.amount ?? 0), 0);
			expect(projection.find((r) => r.actorId === id && r.track === ACCOUNT_TRACK)?.xp ?? 0).toBe(
				total
			);
			// La base et le registre en mémoire appliquent les mêmes règles au même historique.
			expect(total, `total de ${id}`).toBe(memory.xp(id));
		}
		expect(sums.length).toBeGreaterThan(4);

		const snapshot = (rows: { actorId: string; track: string; xp: number; level: number }[]) =>
			rows.map((r) => `${r.actorId}|${r.track}|${r.xp}|${r.level}`).sort();
		const before = snapshot(await db.actorProgress.findMany());
		await tx((t) => rebuildAll(t));
		expect(snapshot(await db.actorProgress.findMany())).toEqual(before);
	}, 600_000);

	it('le profil complété ne rapporte qu’une fois', async () => {
		const actorId = people[1]; // ben : profil vierge
		const genre = await db.genre.findFirstOrThrow();
		const instrument = await db.instrument.findFirstOrThrow();
		await db.person.create({
			data: {
				actorId,
				userId: await testUserId(),
				birthDate: new Date('1990-01-01'),
				termsAcceptedAt: new Date()
			}
		});
		await db.personInstrument.create({
			data: { personId: actorId, instrumentId: instrument.id, declaredLevel: 3, isPrimary: true }
		});
		await db.actorGenre.create({ data: { actorId, genreId: genre.id } });
		await db.actor.update({ where: { id: actorId }, data: { bio: 'Bassiste.' } });
		const before = await onProfileChanged(actorId, db);
		expect(before.xp).toBe(0); // pas encore de ville
		await db.$executeRaw`INSERT INTO "e2e"."actor_locations" ("actorId", "communeCode", "communeName", "departmentCode", "point", "updatedAt")
			VALUES (${actorId}, '31555', 'Toulouse', '31', public.ST_SetSRID(public.ST_MakePoint(1.43, 43.6), 4326)::public.geography, now())`;
		const done = await onProfileChanged(actorId, db);
		expect(done).toMatchObject({ xp: 150, achievements: ['profile-complete'] });
		expect((await onProfileChanged(actorId, db)).xp).toBe(0);
	}, 120_000);

	async function cleanupLedgerOf(ids: string[]) {
		// Historique vierge pour la simulation : on recrée les acteurs (le
		// registre en ajout seul ne se vide pas autrement).
		for (const id of ids) {
			if ((await db.xpTransaction.count({ where: { actorId: id } })) > 0)
				throw new Error(`historique non vide : ${id}`);
		}
	}

	async function testUserId() {
		const email = `${PREFIX}${Date.now()}@example.test`;
		const user = await db.user.create({
			data: { email, referralCode: `PT${Date.now()}`.slice(0, 12) }
		});
		afterCleanup.push(user.id);
		return user.id;
	}
	const afterCleanup: string[] = [];
	afterAll(async () => {
		if (afterCleanup.length) await db.user.deleteMany({ where: { id: { in: afterCleanup } } });
	});
});

// Garde : `emit` refuse un événement mal formé avant toute écriture.
describe('emit', () => {
	it('valide l’événement', async () => {
		const fakeTx = { domainEvent: { create: () => Promise.resolve() } } as never;
		await expect(emit(fakeTx, { type: 'profile.completed' } as never)).rejects.toThrow();
	});
});
