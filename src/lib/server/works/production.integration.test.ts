/**
 * DASH-06c (#53, D70) : une réalisation déclarée fait avancer le morceau sans
 * en être la preuve, schéma e2e. Fiche, parcours et besoin réel lisent la
 * même règle ; ni `recordedAt`, ni événement, ni XP ; un fait de
 * collaboration prime et survit à une réouverture ; rien de public.
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/works/production
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import dotenv from 'dotenv';
import { createPrismaClient } from '../../../../prisma/client.js';

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

const works = await import('./service');
const steps = await import('./steps');
const { workJourney } = await import('./journey');

const prefix = `work-production-${Date.now()}-`;
const now = new Date('2026-11-17T09:00:00Z');
const later = new Date('2026-11-17T18:00:00Z');
const composition = { kind: 'COMPOSITION' as const, instrumentSlug: null };
const ids: Record<string, string> = {};
const users: Record<string, string> = {};

async function person(name: string) {
	const user = await db.user.create({
		data: { email: `${prefix}${name}@example.test`, referralCode: `${prefix}${name}` }
	});
	const actor = await db.actor.create({
		data: {
			kind: 'PERSON',
			handle: `${prefix}${name}`,
			displayName: name,
			trustLevel: 2,
			person: {
				create: {
					userId: user.id,
					birthDate: new Date('1995-01-01'),
					termsAcceptedAt: now,
					onboardedAt: now,
					tracks: { create: { track: 'MUSICIAN', isPrimary: true } }
				}
			}
		}
	});
	ids[name] = actor.id;
	users[name] = user.id;
}

async function cleanup() {
	const actors = await db.actor.findMany({
		where: { OR: [{ handle: { startsWith: prefix } }, { id: { in: Object.values(ids) } }] },
		select: { id: true }
	});
	const list = actors.map((a) => a.id);
	await db.work.deleteMany({ where: { ownerId: { in: list } } });
	await db.actor.deleteMany({ where: { id: { in: list } } });
	await db.user.deleteMany({
		where: { OR: [{ email: { startsWith: prefix } }, { id: { in: Object.values(users) } }] }
	});
	if (list.length) await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
}

async function step(
	workId: string,
	who: string,
	action: 'claim' | 'start' | 'finish' | 'reopen',
	at: Date
) {
	const row = await db.workStep.findFirst({ where: { workId, kind: 'RECORDING' } });
	return steps.applyWorkStep(
		workId,
		who,
		{ kind: 'RECORDING', action, revision: row?.revision ?? 0, confirm: action === 'finish' },
		at
	);
}

async function composedWork(title: string) {
	const work = await works.createWork(
		ids.thomas,
		{ title, genreIds: [], band: null, roles: [composition] },
		now
	);
	await db.work.update({
		where: { id: work.id },
		data: { state: 'COMPOSED', proof: 'DECLARED', composedAt: now }
	});
	return work;
}

describe.skipIf(!enabled)('production déclarée (schéma e2e)', () => {
	beforeAll(async () => {
		await cleanup();
		for (const name of ['thomas', 'outsider']) await person(name);
	}, 60_000);
	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('Thomas termine son enregistrement : déclaré, puis le mixage, sans preuve ni XP', async () => {
		const work = await composedWork('Midnight Groove');
		let page = await works.workPage(work.id, ids.thomas, now);
		expect(page?.nextNeed).toBe('RECORDING');

		await step(work.id, ids.thomas, 'claim', now);
		page = await works.workPage(work.id, ids.thomas, now);
		// Pris en charge : plus de besoin de recrutement, rien de franchi.
		expect(page?.nextNeed).toBeNull();
		expect(page?.production.RECORDING).toBeNull();

		const events = await db.domainEvent.count({ where: { actorIds: { has: ids.thomas } } });
		const xp = await db.xpTransaction.count({ where: { actorId: ids.thomas } });
		await step(work.id, ids.thomas, 'start', now);
		await step(work.id, ids.thomas, 'finish', later);

		page = await works.workPage(work.id, ids.thomas, later);
		expect(page?.production.RECORDING).toEqual({
			source: 'DECLARED',
			at: later,
			declaredBy: 'thomas'
		});
		expect(page?.nextNeed).toBe('MIXING');
		// Ni date de collaboration, ni preuve, ni événement, ni XP.
		const fresh = await db.work.findUniqueOrThrow({ where: { id: work.id } });
		expect(fresh).toMatchObject({ recordedAt: null, proof: 'DECLARED' });
		expect(await db.domainEvent.count({ where: { actorIds: { has: ids.thomas } } })).toBe(events);
		expect(await db.xpTransaction.count({ where: { actorId: ids.thomas } })).toBe(xp);
		expect(await db.collaboration.count({ where: { workId: work.id } })).toBe(0);

		// Le parcours dit la même chose, marqué « déclaré ».
		const journey = await workJourney(work.id, later, page!.production);
		const rec = journey?.steps.find((s) => s.kind === 'RECORDING');
		expect(rec).toMatchObject({ declaredBy: 'thomas', verified: false, pro: null });
		expect(journey?.done).toBe(false);

		// Rouvrir retire la date déclarée et le besoin de mixage.
		await step(work.id, ids.thomas, 'reopen', later);
		page = await works.workPage(work.id, ids.thomas, later);
		expect(page?.production.RECORDING).toBeNull();
		expect(page?.nextNeed).toBeNull();
	}, 60_000);

	it('un fait de collaboration prime et survit à la réouverture de l’étape', async () => {
		const work = await composedWork('Collab First');
		await db.work.update({ where: { id: work.id }, data: { recordedAt: now } });
		await step(work.id, ids.thomas, 'claim', now);
		await step(work.id, ids.thomas, 'finish', later);
		let page = await works.workPage(work.id, ids.thomas, later);
		expect(page?.production.RECORDING).toEqual({ source: 'COLLABORATION', at: now });
		await step(work.id, ids.thomas, 'reopen', later);
		page = await works.workPage(work.id, ids.thomas, later);
		expect(page?.production.RECORDING).toEqual({ source: 'COLLABORATION', at: now });
		expect((await db.work.findUniqueOrThrow({ where: { id: work.id } })).recordedAt).toEqual(now);
	}, 60_000);

	it('hors équipe : la réalisation déclarée reste privée', async () => {
		const work = await composedWork('Private Home');
		await step(work.id, ids.thomas, 'claim', now);
		await step(work.id, ids.thomas, 'finish', later);
		const page = await works.workPage(work.id, ids.outsider, later);
		expect(page?.production.RECORDING).toBeNull();
		expect(page?.nextNeed).toBeNull();
	}, 60_000);
});
