/**
 * DASH-06a (#51, D68) : prise en charge de l'enregistrement, schéma e2e.
 * Parcours de Thomas (sans métier d'ingé son), droits relus sous verrou,
 * demandes concurrentes, morceau de groupe et révocation, absence d'effet
 * sur le morceau et la progression, export et anonymisation.
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/works/steps
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
const bands = await import('../bands/service');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const prefix = `work-steps-${Date.now()}-`;
const now = new Date('2026-11-17T09:00:00Z');
const later = new Date('2026-11-17T18:00:00Z');
const role = { kind: 'COMPOSITION' as const, instrumentSlug: null };
const ids: Record<string, string> = {};
const users: Record<string, string> = {};
const REC = 'RECORDING' as const;
const act = (
	action: 'claim' | 'start' | 'finish' | 'reset' | 'reopen' | 'release',
	confirm = false
) => ({
	kind: REC,
	action,
	confirm
});

/** Comme le formulaire : la révision vue juste avant l'action. */
async function apply(
	workId: string,
	who: string,
	form: { kind: 'RECORDING' | 'MIXING'; action: Parameters<typeof act>[0]; confirm: boolean },
	at: Date,
	revision?: number
) {
	const row = await db.workStep.findFirst({
		where: { workId, kind: form.kind },
		select: { revision: true }
	});
	return steps.applyWorkStep(
		workId,
		who,
		{ ...form, revision: revision ?? row?.revision ?? 0 },
		at
	);
}

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
	// Par identifiants : l'anonymisation change le @handle des personnes.
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

describe.skipIf(!enabled)('étapes prises en charge (schéma e2e)', () => {
	beforeAll(async () => {
		await cleanup();
		for (const name of ['thomas', 'lea', 'zoe', 'outsider']) await person(name);
	}, 60_000);
	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('Thomas prend, commence et termine l’enregistrement de son morceau', async () => {
		const work = await works.createWork(
			ids.thomas,
			{ title: 'Midnight Groove', genreIds: [], band: null, roles: [role] },
			now
		);
		const before = await db.work.findUniqueOrThrow({ where: { id: work.id } });
		const xpBefore = await db.xpTransaction.count({ where: { actorId: ids.thomas } });

		// Hors équipe : ni lecture ni écriture.
		expect(await steps.workStepsFor(work.id, ids.outsider)).toBeNull();
		await expect(apply(work.id, ids.outsider, act('claim'), now)).rejects.toThrow(
			/portent ce morceau/
		);
		// Étape fermée dans ce lot.
		await expect(
			apply(work.id, ids.thomas, { ...act('claim'), kind: 'MIXING' }, now)
		).rejects.toThrow(/bientôt/);

		expect(await apply(work.id, ids.thomas, act('claim'), now)).toEqual({
			changed: true,
			act: 'CLAIMED'
		});
		expect(await db.workStep.findFirstOrThrow({ where: { workId: work.id } })).toMatchObject({
			kind: 'RECORDING',
			mode: 'SELF',
			place: 'HOME',
			status: 'TODO',
			assigneeId: ids.thomas,
			startedAt: null,
			doneAt: null
		});
		// Rejouer ne crée ni étape ni acte.
		expect(await apply(work.id, ids.thomas, act('claim'), now)).toEqual({
			changed: false
		});
		await apply(work.id, ids.thomas, act('start'), now);
		await expect(apply(work.id, ids.thomas, act('finish'), later)).rejects.toThrow(/Confirme/);
		await apply(work.id, ids.thomas, act('finish', true), later);
		await apply(work.id, ids.thomas, act('finish', true), later);
		expect(await db.workStep.findFirstOrThrow({ where: { workId: work.id } })).toMatchObject({
			status: 'DONE',
			startedAt: now,
			doneAt: later
		});
		// Réouverture tracée, puis fin à nouveau.
		await apply(work.id, ids.thomas, act('reopen'), later);
		await apply(work.id, ids.thomas, act('finish', true), later);
		const acts = await db.workStepAct.findMany({
			where: { step: { workId: work.id } },
			orderBy: { occurredAt: 'asc' },
			select: { kind: true, authorId: true, fromStatus: true, toStatus: true }
		});
		expect(acts.map((a) => a.kind)).toEqual([
			'CLAIMED',
			'STARTED',
			'FINISHED',
			'REOPENED',
			'FINISHED'
		]);
		expect(acts.every((a) => a.authorId === ids.thomas)).toBe(true);

		// Aucun effet sur le morceau, ses crédits ou la progression (#53).
		const after = await db.work.findUniqueOrThrow({ where: { id: work.id } });
		expect(after.recordedAt).toBeNull();
		expect(after.state).toBe(before.state);
		expect(await db.workRole.count({ where: { workId: work.id, kind: 'RECORDING' } })).toBe(0);
		expect(await db.xpTransaction.count({ where: { actorId: ids.thomas } })).toBe(xpBefore);

		const view = (await steps.workStepsFor(work.id, ids.thomas))!;
		expect(view[0]).toMatchObject({ status: 'DONE', mine: true, actions: ['reopen'] });
		expect(view[0].history).toHaveLength(5);
	}, 60_000);

	it('deux prises en charge simultanées : une seule réussit, un seul acte', async () => {
		const work = await works.createWork(
			ids.thomas,
			{ title: 'Course', genreIds: [], band: null, roles: [role] },
			now
		);
		const results = await Promise.allSettled([
			apply(work.id, ids.thomas, act('claim'), now),
			apply(work.id, ids.thomas, act('claim'), now),
			apply(work.id, ids.thomas, act('start'), now)
		]);
		expect(
			results.every(
				(r) => r.status === 'fulfilled' || /en charge|changé entre-temps/.test(String(r.reason))
			)
		).toBe(true);
		expect(await db.workStep.count({ where: { workId: work.id } })).toBe(1);
		expect(
			await db.workStepAct.count({ where: { step: { workId: work.id }, kind: 'CLAIMED' } })
		).toBe(1);
	}, 60_000);

	it('morceau de groupe : la gestion seule, la personne responsable seule fait avancer', async () => {
		const band = await bands.createBand(ids.lea, { name: `${prefix}groupe`, title: null }, now);
		for (const who of ['thomas', 'zoe']) {
			await bands.inviteToBand(band.id, ids.lea, { handle: `${prefix}${who}`, title: null }, now);
			const invite = await db.membership.findFirstOrThrow({
				where: { orgId: band.id, personId: ids[who], status: 'INVITED' }
			});
			await bands.answerInvite(invite.id, ids[who], true, now);
		}
		const thomasRow = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids.thomas, status: 'ACTIVE' }
		});
		await bands.setRole(thomasRow.id, ids.lea, 'ADMIN', now);
		const work = await works.createWork(
			ids.lea,
			{ title: 'Groupe', genreIds: [], band: band.handle, roles: [role] },
			now
		);

		// Zoé, simple membre : elle voit l'étape mais ne la prend pas.
		await expect(apply(work.id, ids.zoe, act('claim'), now)).rejects.toThrow(/portent ce morceau/);
		expect((await steps.workStepsFor(work.id, ids.zoe))![0].actions).toEqual([]);

		await apply(work.id, ids.thomas, act('claim'), now);
		await apply(work.id, ids.thomas, act('start'), now);
		// Léa gère aussi, mais ne déclare pas le travail de Thomas.
		await expect(apply(work.id, ids.lea, act('finish', true), later)).rejects.toThrow(
			/responsable/
		);
		expect((await steps.workStepsFor(work.id, ids.zoe))![0].history).toEqual([]);

		// Thomas perd la co-gestion : il ne fait plus rien avancer.
		await bands.setRole(thomasRow.id, ids.lea, 'MEMBER', now);
		await expect(apply(work.id, ids.thomas, act('finish', true), later)).rejects.toThrow(
			/portent ce morceau/
		);
		// Léa libère l'étape ; l'acte garde Thomas comme responsable concerné.
		await apply(work.id, ids.lea, act('release'), later);
		expect(await db.workStep.findFirstOrThrow({ where: { workId: work.id } })).toMatchObject({
			assigneeId: null,
			status: 'TODO',
			startedAt: null,
			mode: null,
			place: null
		});
		expect(
			await db.workStepAct.findFirstOrThrow({
				where: { step: { workId: work.id }, kind: 'RELEASED' }
			})
		).toMatchObject({ authorId: ids.lea, assigneeId: ids.thomas, fromStatus: 'IN_PROGRESS' });
	}, 120_000);

	it('export et anonymisation : étapes et actes couverts, auteurs oubliés', async () => {
		const exported = await exportPersonData(users.thomas);
		const morceaux = (exported as { morceaux: Record<string, unknown[]> }).morceaux;
		expect(morceaux.etapes_prises_en_charge.length).toBeGreaterThanOrEqual(2);
		expect(morceaux.actes_d_etapes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'RELEASED', par_moi: false, me_concerne: true })
			])
		);
		// Léa a libéré l'étape de Thomas : après son anonymisation, l'acte reste sans auteur.
		await db.$transaction(await personAnonymizationOps(users.lea));
		expect(await db.workStepAct.count({ where: { authorId: ids.lea } })).toBe(0);
		await db.$transaction(await personAnonymizationOps(users.thomas));
		expect(await db.workStep.count({ where: { assigneeId: ids.thomas } })).toBe(0);
		expect(await db.workStepAct.count({ where: { assigneeId: ids.thomas } })).toBe(0);
	}, 120_000);

	it('supprimer définitivement un compte avec des actes d’étapes ne bloque pas', async () => {
		await person('hard');
		const work = await works.createWork(
			ids.hard,
			{ title: 'Suppression', genreIds: [], band: null, roles: [role] },
			now
		);
		await apply(work.id, ids.hard, act('claim'), now);
		await apply(work.id, ids.hard, act('start'), now);
		// Régression : deux SET NULL vers actors sur la même ligne + cascade de l'étape.
		await db.actor.delete({ where: { id: ids.hard } });
		expect(await db.workStep.count({ where: { workId: work.id } })).toBe(0);
	}, 60_000);

	it('un changement périmé est refusé sans acte ; un échec d’acte annule tout', async () => {
		const work = await works.createWork(
			ids.zoe,
			{ title: 'Deux onglets', genreIds: [], band: null, roles: [role] },
			now
		);
		await apply(work.id, ids.zoe, act('claim'), now);
		await apply(work.id, ids.zoe, act('start'), now);
		const seen = (await db.workStep.findFirstOrThrow({ where: { workId: work.id } })).revision;
		// Onglet A : terminer puis rouvrir. Onglet B, resté sur « En cours » : terminer.
		await apply(work.id, ids.zoe, act('finish', true), later, seen);
		await apply(work.id, ids.zoe, act('reopen'), later);
		await expect(apply(work.id, ids.zoe, act('finish', true), later, seen)).rejects.toThrow(
			/changé entre-temps/
		);
		const row = await db.workStep.findFirstOrThrow({ where: { workId: work.id } });
		expect(row).toMatchObject({ status: 'IN_PROGRESS', revision: seen + 2 });
		expect(await db.workStepAct.count({ where: { stepId: row.id } })).toBe(4);

		// L'acte échoue : l'étape reste telle quelle (même transaction).
		const transaction = db.$transaction.bind(db);
		const spy = vi.spyOn(db, '$transaction');
		spy.mockImplementationOnce(((callback: (tx: unknown) => Promise<unknown>, options: unknown) =>
			transaction(
				(tx) =>
					callback(
						new Proxy(tx, {
							get(target, property) {
								if (property === 'workStepAct')
									return { create: () => Promise.reject(new Error('acte refusé')) };
								const value = Reflect.get(target, property);
								return typeof value === 'function' ? value.bind(target) : value;
							}
						})
					),
				options as never
			)) as typeof db.$transaction);
		await expect(apply(work.id, ids.zoe, act('finish', true), later)).rejects.toThrow(
			/acte refusé/
		);
		spy.mockRestore();
		expect(await db.workStep.findFirstOrThrow({ where: { workId: work.id } })).toMatchObject({
			status: 'IN_PROGRESS',
			revision: row.revision,
			doneAt: null
		});
		expect(await db.workStepAct.count({ where: { stepId: row.id } })).toBe(4);
	}, 120_000);
});
