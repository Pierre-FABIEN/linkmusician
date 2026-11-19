/**
 * P1 (E10, #36) : libération des étapes `WorkStep` d'une personne qui perd la
 * gestion d'un morceau. Départ, retrait, rétrogradation, suppression de
 * compte ; étape terminée intacte ; gestion conservée ailleurs ; rejeu sans
 * double acte ; courses départ ↔ prise en charge ordonnées par barrières.
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/works/release
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
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
const { releaseStepsOnBandExit } = await import('./release');
const bands = await import('../bands/service');
const { personAnonymizationOps } = await import('#lib/prisma/actors/person');

const prefix = `work-release-${Date.now()}-`;
const now = new Date('2026-11-19T09:00:00Z');
const later = new Date('2026-11-19T18:00:00Z');
const role = { kind: 'COMPOSITION' as const, instrumentSlug: null };
const actorIds: string[] = [];
const userIds: string[] = [];
const transaction = db.$transaction.bind(db);
type Action = 'claim' | 'start' | 'finish' | 'reset' | 'reopen' | 'release';

/** Comme le formulaire : la révision vue juste avant l'action. */
async function apply(workId: string, who: string, action: Action, at = now, revision?: number) {
	const row = await db.workStep.findFirst({
		where: { workId, kind: 'RECORDING' },
		select: { revision: true }
	});
	return steps.applyWorkStep(
		workId,
		who,
		{ kind: 'RECORDING', action, confirm: true, revision: revision ?? row?.revision ?? 0 },
		at
	);
}

async function person(label: string) {
	const user = await db.user.create({
		data: { email: `${prefix}${label}@example.test`, referralCode: `${prefix}${label}` }
	});
	const actor = await db.actor.create({
		data: {
			kind: 'PERSON',
			handle: `${prefix}${label}`,
			displayName: label,
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
	actorIds.push(actor.id);
	userIds.push(user.id);
	return { id: actor.id, userId: user.id, handle: actor.handle };
}

/** Léa (OWNER), Thomas (ADMIN), Zoé (membre) et un morceau du groupe. */
async function team(label: string) {
	const lea = await person(`${label}-lea`);
	const thomas = await person(`${label}-thomas`);
	const zoe = await person(`${label}-zoe`);
	const band = await bands.createBand(lea.id, { name: `${prefix}${label}`, title: null }, now);
	actorIds.push(band.id);
	const rows: Record<string, string> = {};
	for (const p of [thomas, zoe]) {
		await bands.inviteToBand(band.id, lea.id, { handle: p.handle, title: null }, now);
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: p.id, status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, p.id, true, now);
		rows[p.id] = invite.id;
	}
	await bands.setRole(rows[thomas.id], lea.id, 'ADMIN', now);
	const work = await works.createWork(
		lea.id,
		{ title: `${label} morceau`, genreIds: [], band: band.handle, roles: [role] },
		now
	);
	return { lea, thomas, zoe, band, work, thomasRow: rows[thomas.id], zoeRow: rows[zoe.id] };
}

const stepOf = (workId: string) =>
	db.workStep.findFirstOrThrow({ where: { workId, kind: 'RECORDING' } });
const actsOf = (workId: string) =>
	db.workStepAct.findMany({
		where: { step: { workId } },
		orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }]
	});

function barrier() {
	let release!: () => void;
	const promise = new Promise<void>((resolve) => {
		release = resolve;
	});
	return { promise, release };
}

async function reached(signal: Promise<void>) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			signal,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error('barrière non atteinte')), 20000);
			})
		]);
	} finally {
		clearTimeout(timer);
	}
}

/** Intercepte la prochaine vraie transaction interactive : chaque verrou
 * consultatif passe par `hook` (clé, exécution). Aucune simulation du SQL. */
function observeNext(hook: (key: string, run: () => Promise<number>) => Promise<number>) {
	const spy = vi.spyOn(db, '$transaction');
	spy.mockImplementationOnce((async (
		callback: (tx: Prisma.TransactionClient) => Promise<unknown>
	) => {
		spy.mockRestore();
		return transaction(
			async (tx) => {
				await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '8s'");
				const observed = new Proxy(tx, {
					get(target, property) {
						if (property === '$executeRaw')
							return (...args: Parameters<Prisma.TransactionClient['$executeRaw']>) =>
								hook(String(args[1]), () => target.$executeRaw(...args));
						const value = Reflect.get(target, property);
						return typeof value === 'function' ? value.bind(target) : value;
					}
				});
				return callback(observed);
			},
			{ timeout: 40000 }
		);
	}) as typeof db.$transaction);
	return spy;
}

/** Attend qu'une demande de verrou consultatif soit en attente dans PostgreSQL. */
async function advisoryWaiting() {
	for (let i = 0; i < 100; i++) {
		const [row] = await db.$queryRaw<{ n: number }[]>`
			SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND NOT granted`;
		if (row.n > 0) return;
		await new Promise((r) => setTimeout(r, 50));
	}
	throw new Error('aucune attente de verrou observée');
}

async function cleanup() {
	const actors = await db.actor.findMany({
		where: { OR: [{ handle: { startsWith: prefix } }, { id: { in: actorIds } }] },
		select: { id: true }
	});
	const list = actors.map((a) => a.id);
	await db.work.deleteMany({ where: { ownerId: { in: list } } });
	await db.actor.deleteMany({ where: { id: { in: list } } });
	await db.user.deleteMany({
		where: { OR: [{ email: { startsWith: prefix } }, { id: { in: userIds } }] }
	});
	if (list.length) await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
}

describe.skipIf(!enabled)('P1 : étapes libérées à la perte de gestion (schéma e2e)', () => {
	beforeAll(cleanup, 60_000);
	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('départ volontaire : l’étape en cours est libérée, historisée, reprise par la gestion', async () => {
		const t = await team('depart');
		await apply(t.work.id, t.thomas.id, 'claim');
		await apply(t.work.id, t.thomas.id, 'start');
		const before = await db.work.findUniqueOrThrow({ where: { id: t.work.id } });
		const credits = await db.workContributor.findMany({ where: { workId: t.work.id } });

		await bands.leaveBand(t.band.id, t.thomas.id, later);

		expect(await stepOf(t.work.id)).toMatchObject({
			status: 'TODO',
			assigneeId: null,
			startedAt: null,
			doneAt: null,
			mode: null,
			place: null,
			revision: 3
		});
		const acts = await actsOf(t.work.id);
		expect(acts.map((a) => a.kind)).toEqual(['CLAIMED', 'STARTED', 'AUTO_RELEASED']);
		expect(acts[2]).toMatchObject({
			authorId: t.thomas.id,
			assigneeId: t.thomas.id,
			fromStatus: 'IN_PROGRESS',
			toStatus: 'TODO',
			occurredAt: later
		});
		// Rien d'autre ne bouge : morceau, crédits.
		const after = await db.work.findUniqueOrThrow({ where: { id: t.work.id } });
		expect(after).toMatchObject({
			state: before.state,
			proof: before.proof,
			recordedAt: before.recordedAt
		});
		expect(await db.workContributor.findMany({ where: { workId: t.work.id } })).toEqual(credits);

		// La gestion la voit libre, avec l'historique, et la reprend.
		const [view] = (await steps.workStepsFor(t.work.id, t.lea.id))!;
		expect(view).toMatchObject({ assigned: false, status: 'TODO', actions: ['claim'] });
		expect(view.history[0]).toMatchObject({
			kind: 'AUTO_RELEASED',
			author: t.thomas.handle.slice(prefix.length),
			assignee: t.thomas.handle.slice(prefix.length)
		});
		await apply(t.work.id, t.lea.id, 'claim', later);
		expect(await stepOf(t.work.id)).toMatchObject({ assigneeId: t.lea.id, status: 'TODO' });
	}, 120_000);

	it('retrait par la gestion : l’acte porte la personne qui retire', async () => {
		const t = await team('retrait');
		await apply(t.work.id, t.thomas.id, 'claim');
		await bands.removeMember(t.thomasRow, t.lea.id, later);
		expect(await stepOf(t.work.id)).toMatchObject({ assigneeId: null, status: 'TODO' });
		const last = (await actsOf(t.work.id)).at(-1)!;
		expect(last).toMatchObject({
			kind: 'AUTO_RELEASED',
			authorId: t.lea.id,
			assigneeId: t.thomas.id,
			fromStatus: 'TODO'
		});
	}, 120_000);

	it('rétrogradation en simple membre : libérée ; transmission du groupe : conservée', async () => {
		const t = await team('role');
		await apply(t.work.id, t.thomas.id, 'claim');
		// Léa transmet le groupe à Thomas puis redevient ADMIN : tous deux gèrent encore.
		await bands.transferOwnership(t.thomasRow, t.lea.id, now);
		expect(await stepOf(t.work.id)).toMatchObject({ assigneeId: t.thomas.id });
		expect((await actsOf(t.work.id)).map((a) => a.kind)).toEqual(['CLAIMED']);
		const leaRow = await db.membership.findFirstOrThrow({
			where: { orgId: t.band.id, personId: t.lea.id, status: 'ACTIVE' }
		});
		// Léa (ADMIN) prend l'étape ; Thomas, OWNER, la repasse simple membre.
		await apply(t.work.id, t.thomas.id, 'release');
		await apply(t.work.id, t.lea.id, 'claim');
		await apply(t.work.id, t.lea.id, 'start');
		await bands.setRole(leaRow.id, t.thomas.id, 'ADMIN', now); // inchangé : aucun acte
		expect((await actsOf(t.work.id)).filter((a) => a.kind === 'AUTO_RELEASED')).toHaveLength(0);
		await bands.setRole(leaRow.id, t.thomas.id, 'MEMBER', later);
		expect(await stepOf(t.work.id)).toMatchObject({ assigneeId: null, status: 'TODO' });
		expect((await actsOf(t.work.id)).at(-1)).toMatchObject({
			kind: 'AUTO_RELEASED',
			authorId: t.thomas.id,
			assigneeId: t.lea.id,
			fromStatus: 'IN_PROGRESS'
		});
	}, 120_000);

	it('étape terminée : intacte au départ, historique conservé', async () => {
		const t = await team('termine');
		await apply(t.work.id, t.thomas.id, 'claim');
		await apply(t.work.id, t.thomas.id, 'start');
		await apply(t.work.id, t.thomas.id, 'finish');
		const done = await stepOf(t.work.id);
		const acts = await actsOf(t.work.id);
		await bands.leaveBand(t.band.id, t.thomas.id, later);
		expect(await stepOf(t.work.id)).toEqual(done);
		expect(await actsOf(t.work.id)).toEqual(acts);
		// La fiche le montre toujours fait, au nom de Thomas ; rien à reprendre.
		const [view] = (await steps.workStepsFor(t.work.id, t.lea.id))!;
		expect(view).toMatchObject({ status: 'DONE', assigned: true, actions: [] });
	}, 120_000);

	it('gestion conservée ailleurs : seules les étapes du groupe quitté sont libérées', async () => {
		const t = await team('ailleurs');
		// Thomas gère aussi son propre morceau et un second groupe.
		const own = await works.createWork(
			t.thomas.id,
			{ title: 'Perso', genreIds: [], band: null, roles: [role] },
			now
		);
		const other = await bands.createBand(t.thomas.id, { name: `${prefix}autre`, title: null }, now);
		actorIds.push(other.id);
		const otherWork = await works.createWork(
			t.thomas.id,
			{ title: 'Autre groupe', genreIds: [], band: other.handle, roles: [role] },
			now
		);
		for (const id of [t.work.id, own.id, otherWork.id]) await apply(id, t.thomas.id, 'claim');

		// Appel direct tant qu'il gère encore : rien n'est libéré.
		expect(
			await transaction((tx) =>
				releaseStepsOnBandExit(
					tx,
					{ bandId: t.band.id, personId: t.thomas.id, authorId: t.thomas.id },
					later
				)
			)
		).toBe(0);
		expect(await stepOf(t.work.id)).toMatchObject({ assigneeId: t.thomas.id });

		await bands.leaveBand(t.band.id, t.thomas.id, later);
		expect(await stepOf(t.work.id)).toMatchObject({ assigneeId: null });
		expect(await stepOf(own.id)).toMatchObject({ assigneeId: t.thomas.id });
		expect(await stepOf(otherWork.id)).toMatchObject({ assigneeId: t.thomas.id });
	}, 120_000);

	it('rejouer : aucune mutation ni acte en double', async () => {
		const t = await team('rejeu');
		await apply(t.work.id, t.thomas.id, 'claim');
		await bands.removeMember(t.thomasRow, t.lea.id, later);
		const step = await stepOf(t.work.id);
		const count = (await actsOf(t.work.id)).length;
		await expect(bands.removeMember(t.thomasRow, t.lea.id, later)).rejects.toThrow(/ne fait plus/);
		await expect(bands.leaveBand(t.band.id, t.thomas.id, later)).rejects.toThrow(/fais pas partie/);
		expect(
			await transaction((tx) =>
				releaseStepsOnBandExit(
					tx,
					{ bandId: t.band.id, personId: t.thomas.id, authorId: t.lea.id },
					later
				)
			)
		).toBe(0);
		expect(await stepOf(t.work.id)).toEqual(step);
		expect(await actsOf(t.work.id)).toHaveLength(count);
	}, 120_000);

	it('suppression du compte : non terminée libérée, terminée gardée « Compte supprimé »', async () => {
		const t = await team('compte');
		const doneWork = await works.createWork(
			t.lea.id,
			{ title: 'Fini', genreIds: [], band: t.band.handle, roles: [role] },
			now
		);
		await apply(t.work.id, t.thomas.id, 'claim');
		await apply(t.work.id, t.thomas.id, 'start');
		await apply(doneWork.id, t.thomas.id, 'claim');
		await apply(doneWork.id, t.thomas.id, 'finish');

		await db.$transaction(await personAnonymizationOps(t.thomas.userId));

		expect(await stepOf(t.work.id)).toMatchObject({
			status: 'TODO',
			assigneeId: null,
			startedAt: null,
			mode: null
		});
		expect((await actsOf(t.work.id)).at(-1)).toMatchObject({
			kind: 'AUTO_RELEASED',
			authorId: null,
			assigneeId: null,
			fromStatus: 'IN_PROGRESS',
			toStatus: 'TODO'
		});
		expect(await db.workStepAct.count({ where: { assigneeId: t.thomas.id } })).toBe(0);
		expect(await db.workStepAct.count({ where: { authorId: t.thomas.id } })).toBe(0);
		// Terminée : elle reste terminée, sans nom, et ne se reprend pas.
		expect(await stepOf(doneWork.id)).toMatchObject({ status: 'DONE', assigneeId: null });
		const [view] = (await steps.workStepsFor(doneWork.id, t.lea.id))!;
		expect(view).toMatchObject({
			status: 'DONE',
			assigned: true,
			assignee: 'Compte supprimé',
			actions: []
		});
		await expect(apply(doneWork.id, t.lea.id, 'claim')).rejects.toThrow(/déjà terminée/);
		// La non terminée se reprend.
		await apply(t.work.id, t.lea.id, 'claim', later);
		expect(await stepOf(t.work.id)).toMatchObject({ assigneeId: t.lea.id });
	}, 120_000);

	it('course : le départ tient band:, la prise en charge de Thomas attend puis est refusée', async () => {
		const t = await team('course-a');
		const held = barrier();
		const resume = barrier();
		const requested: string[] = [];
		observeNext(async (key, run) => {
			requested.push(key);
			const result = await run();
			if (key === `band:${t.band.id}`) {
				held.release();
				await resume.promise;
			}
			return result;
		});
		const leaving = bands.leaveBand(t.band.id, t.thomas.id, later);
		await reached(held.promise);
		const claiming = apply(t.work.id, t.thomas.id, 'claim', later);
		void claiming.catch(() => {});
		try {
			await advisoryWaiting();
		} finally {
			resume.release();
		}
		await leaving;
		await expect(claiming).rejects.toThrow(/portent ce morceau/);
		// Le départ ne prend jamais work: après band: (ordre §6.7).
		expect(requested).toEqual([`band:${t.band.id}`]);
		expect(await db.workStep.count({ where: { workId: t.work.id } })).toBe(0);
	}, 120_000);

	it('course : la prise en charge tient band:, le départ attend puis la libère', async () => {
		const t = await team('course-b');
		const held = barrier();
		const resume = barrier();
		observeNext(async (key, run) => {
			const result = await run();
			if (key === `band:${t.band.id}`) {
				held.release();
				await resume.promise;
			}
			return result;
		});
		const claiming = apply(t.work.id, t.thomas.id, 'claim', now);
		await reached(held.promise);
		const leaving = bands.leaveBand(t.band.id, t.thomas.id, later);
		void leaving.catch(() => {});
		try {
			await advisoryWaiting();
		} finally {
			resume.release();
		}
		await claiming;
		await leaving;
		expect(await stepOf(t.work.id)).toMatchObject({ assigneeId: null, status: 'TODO' });
		expect((await actsOf(t.work.id)).map((a) => a.kind)).toEqual(['CLAIMED', 'AUTO_RELEASED']);
	}, 120_000);

	it('course : Léa reprend pendant le départ ; jamais deux responsables', async () => {
		const t = await team('course-c');
		await apply(t.work.id, t.thomas.id, 'claim');
		const seen = (await stepOf(t.work.id)).revision;
		const held = barrier();
		const resume = barrier();
		observeNext(async (key, run) => {
			const result = await run();
			if (key === `band:${t.band.id}`) {
				held.release();
				await resume.promise;
			}
			return result;
		});
		const leaving = bands.leaveBand(t.band.id, t.thomas.id, later);
		await reached(held.promise);
		// Léa a vu l'étape avant la libération : sa demande est périmée, sans acte.
		const claiming = apply(t.work.id, t.lea.id, 'claim', later, seen);
		void claiming.catch(() => {});
		try {
			await advisoryWaiting();
		} finally {
			resume.release();
		}
		await leaving;
		await expect(claiming).rejects.toThrow(/changé entre-temps/);
		expect(await stepOf(t.work.id)).toMatchObject({ assigneeId: null });
		expect((await actsOf(t.work.id)).map((a) => a.kind)).toEqual(['CLAIMED', 'AUTO_RELEASED']);
	}, 120_000);

	it('course : suppression du compte pendant sa prise en charge ; libérée à la fin', async () => {
		const t = await team('course-d');
		const held = barrier();
		const resume = barrier();
		observeNext(async (key, run) => {
			const result = await run();
			if (key === `band:${t.band.id}`) {
				held.release();
				await resume.promise;
			}
			return result;
		});
		const claiming = apply(t.work.id, t.thomas.id, 'claim', now);
		await reached(held.promise);
		// L'anonymisation verrouille work: d'abord : elle attend la prise en charge.
		const erasing = personAnonymizationOps(t.thomas.userId).then((ops) => db.$transaction(ops));
		void erasing.catch(() => {});
		try {
			await advisoryWaiting();
		} finally {
			resume.release();
		}
		await claiming;
		await erasing;
		expect(await stepOf(t.work.id)).toMatchObject({ assigneeId: null, status: 'TODO' });
		expect((await actsOf(t.work.id)).map((a) => a.kind)).toEqual(['CLAIMED', 'AUTO_RELEASED']);
	}, 120_000);
});
