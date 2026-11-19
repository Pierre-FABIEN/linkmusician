/**
 * U3b-b (D76, conception 22) : besoins d'un projet, schéma e2e uniquement
 * (`PROGRESSION_INTEGRATION=1`). Matrice §5 en appels forgés pour chaque
 * profil, N1 à N6, révocation (§6.2) et courses à barrières (I12), projet
 * clos, quotas (Q93), lecture filtrée, journal, RGPD (§9.2).
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
const projects = await import('./service');
const team = await import('./participants');
const needs = await import('./needs');
const { projectView } = await import('./view');
const { projectsExport, projectAnonymizationOps } = await import('./export');
const bands = await import('../bands/service');
const { createOpportunity, OpportunityError } = await import('../opportunities/service');
const { setActorLocation } = await import('../geo/queries');
const { inboxFor } = await import('../space/inbox');
const { E2E_COMMUNES } = await import('#lib/geo/communes-e2e');
const { MAX_LIVE_NEEDS_PER_PROJECT, MAX_NEEDS_PER_DAY } = await import('#lib/projects/needs');

const prefix = `need-${Date.now()}-`;
const actors: string[] = [];
const users: string[] = [];
const transaction = db.$transaction.bind(db);
const now = new Date('2026-11-19T12:00:00Z');
let n = 0;

async function person(name: string, birthDate = new Date('1990-01-01')) {
	const tag = `${prefix}${name}-${n++}`;
	const user = await db.user.create({ data: { email: `${tag}@example.test`, referralCode: tag } });
	users.push(user.id);
	const actor = await db.actor.create({
		data: {
			kind: 'PERSON',
			handle: tag,
			displayName: name,
			trustLevel: 2,
			person: {
				create: {
					userId: user.id,
					birthDate,
					termsAcceptedAt: now,
					onboardedAt: now,
					tracks: { create: { track: 'MUSICIAN', isPrimary: true } }
				}
			}
		}
	});
	actors.push(actor.id);
	return actor.id;
}

const handleOf = async (id: string) =>
	(await db.actor.findUniqueOrThrow({ where: { id }, select: { handle: true } })).handle!;

/** Groupe : responsable, co-gestion (ADMIN), simple membre. */
async function band(label: string) {
	const [owner, admin, member] = [
		await person(`${label}-owner`),
		await person(`${label}-admin`),
		await person(`${label}-member`)
	];
	const created = await bands.createBand(owner, { name: `${prefix}${label}`, title: null }, now);
	actors.push(created.id);
	for (const id of [admin, member]) {
		await bands.inviteToBand(created.id, owner, { handle: await handleOf(id), title: null }, now);
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: created.id, personId: id, status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, id, true, now);
	}
	const adminRow = await db.membership.findFirstOrThrow({
		where: { orgId: created.id, personId: admin, status: 'ACTIVE' }
	});
	await bands.setRole(adminRow.id, owner, 'ADMIN', now);
	return { id: created.id, owner, admin, member };
}

const ep = (owner: string | null = null) => ({
	name: 'EP Lumière',
	kind: 'EP' as const,
	description: null,
	startsOn: null,
	dueOn: null,
	owner
});

async function invite(inviter: string, projectId: string, personId: string, coordinate = false) {
	await team.inviteParticipant(
		inviter,
		projectId,
		{ handle: await handleOf(personId), role: null, coordinate },
		now
	);
	return db.projectParticipant.findFirstOrThrow({
		where: { projectId, personId, status: 'INVITED' }
	});
}

async function join(inviter: string, projectId: string, personId: string, coordinate = false) {
	const row = await invite(inviter, projectId, personId, coordinate);
	await team.answerInvitation(personId, row.id, true, now);
	return row.id;
}

async function rejects(p: Promise<unknown>, status: number) {
	const err = await p.then(
		() => null,
		(e: unknown) => e
	);
	expect(err).toBeInstanceOf(projects.ProjectError);
	expect((err as InstanceType<typeof projects.ProjectError>).status).toBe(status);
	return err as InstanceType<typeof projects.ProjectError>;
}

/** Remplace la prochaine transaction par une transaction observée : `onLock`
 * est appelé avant chaque verrou consultatif pris. */
function observeNextTransaction(onLock: (key: string) => Promise<void>) {
	const keys: string[] = [];
	const spy = vi.spyOn(db, '$transaction');
	spy.mockImplementationOnce((async (
		callback: (tx: Prisma.TransactionClient) => Promise<unknown>,
		options?: unknown
	) => {
		spy.mockRestore();
		return transaction(
			async (tx) => {
				const observed = new Proxy(tx, {
					get(target, property) {
						if (property === '$executeRaw')
							return async (...args: Parameters<Prisma.TransactionClient['$executeRaw']>) => {
								const key = String(args[1]);
								keys.push(key);
								await onLock(key);
								return target.$executeRaw(...args);
							};
						const value = Reflect.get(target, property);
						return typeof value === 'function' ? value.bind(target) : value;
					}
				});
				return callback(observed);
			},
			options as { timeout: number }
		);
	}) as typeof db.$transaction);
	return keys;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const engineer = (description: string | null = null) => ({
	track: 'SOUND_ENGINEER' as const,
	specialty: 'RECORDING',
	instrument: null,
	description
});
const booker = { track: 'BOOKER' as const, specialty: null, instrument: null, description: null };

/** Projet d'un groupe, avec une coordinatrice et une participante simple. */
async function scene(label: string) {
	const b = await band(label);
	const coord = await person(`${label}-coord`);
	const guest = await person(`${label}-guest`);
	const p = await projects.createProject(b.owner, ep(b.id));
	const coordRow = await join(b.owner, p.id, coord, true);
	const guestRow = await join(b.owner, p.id, guest);
	return { b, p, coord, guest, coordRow, guestRow };
}

const statusOf = async (id: string) =>
	(await db.projectNeed.findUniqueOrThrow({ where: { id } })).status;

describe.skipIf(!enabled)('projets U3b-b : besoins (intégration)', { timeout: 240_000 }, () => {
	beforeAll(async () => {
		await db.$queryRaw`SELECT 1`;
	});

	afterAll(async () => {
		vi.restoreAllMocks();
		await db.project.deleteMany({ where: { ownerId: { in: actors } } });
		await db.notification.deleteMany({ where: { recipientActorId: { in: actors } } });
		await db.actor.deleteMany({ where: { id: { in: actors } } });
		await db.user.deleteMany({ where: { id: { in: users } } });
		await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: actors } } });
		await db.$disconnect();
	});

	it('matrice : gestion ouvre, coordination propose, les autres n’ajoutent rien', async () => {
		const { b, p, coord, guest } = await scene('matrice');
		const invited = await person('invitee');
		await invite(b.owner, p.id, invited);
		const outsider = await person('dehors');

		const open = await needs.addNeed(b.owner, p.id, engineer('Cinq titres en janvier'), now);
		expect(open.status).toBe('OPEN');
		const byAdmin = await needs.addNeed(b.admin, p.id, booker, now);
		expect(byAdmin.status).toBe('OPEN');
		const proposed = await needs.addNeed(coord, p.id, booker, now);
		expect(proposed.status).toBe('PROPOSED');

		// Participation simple : lit la fiche, n'ajoute pas (403).
		await rejects(needs.addNeed(guest, p.id, booker, now), 403);
		// Simple membre non participant, invitée, extérieure : le projet n'existe pas (404, I2).
		await rejects(needs.addNeed(b.member, p.id, booker, now), 404);
		await rejects(needs.addNeed(invited, p.id, booker, now), 404);
		await rejects(needs.addNeed(outsider, p.id, booker, now), 404);
		await rejects(needs.decideNeed(outsider, p.id, proposed.id, 'open', now), 404);
		await rejects(needs.decideNeed(b.member, p.id, proposed.id, 'open', now), 404);

		const row = await db.projectNeed.findUniqueOrThrow({ where: { id: open.id } });
		expect([row.createdById, row.decidedById, row.description]).toEqual([
			b.owner,
			b.owner,
			'Cinq titres en janvier'
		]);
	});

	it('N1, N2, N4 : seule la gestion ouvre ; ouvrir ne crée ni invitation, ni annonce, ni XP', async () => {
		const { b, p, coord } = await scene('ouvrir');
		const proposed = await needs.addNeed(coord, p.id, engineer(), now);
		// La coordination ne valide pas sa propre proposition (N1).
		await rejects(needs.decideNeed(coord, p.id, proposed.id, 'open', now), 403);

		const before = {
			participants: await db.projectParticipant.count({ where: { projectId: p.id } }),
			opportunities: await db.opportunity.count({ where: { issuerActorId: { in: actors } } }),
			events: await db.domainEvent.count({ where: { actorIds: { hasSome: actors } } }),
			xp: await db.xpTransaction.count({ where: { actorId: { in: actors } } })
		};
		await needs.decideNeed(b.owner, p.id, proposed.id, 'open', now);
		expect(await statusOf(proposed.id)).toBe('OPEN');
		const id = (await needs.addNeed(b.owner, p.id, booker, now)).id;
		await needs.fillNeed(b.owner, p.id, id, null, now);

		expect(await db.projectParticipant.count({ where: { projectId: p.id } })).toBe(
			before.participants
		);
		expect(await db.opportunity.count({ where: { issuerActorId: { in: actors } } })).toBe(
			before.opportunities
		);
		expect(await db.domainEvent.count({ where: { actorIds: { hasSome: actors } } })).toBe(
			before.events
		);
		expect(await db.xpTransaction.count({ where: { actorId: { in: actors } } })).toBe(before.xp);
		const decided = await db.projectNeed.findUniqueOrThrow({ where: { id: proposed.id } });
		expect(decided.decidedById).toBe(b.owner);
	});

	it('refuser, retirer, traiter deux fois, besoin d’un autre projet', async () => {
		const { b, p, coord, guest } = await scene('refus');
		const first = await needs.addNeed(coord, p.id, engineer(), now);
		await needs.decideNeed(b.admin, p.id, first.id, 'decline', now);
		expect(await statusOf(first.id)).toBe('DECLINED');
		// Déjà tranchée : la seconde décision est refusée (409), sans acte de plus.
		await rejects(needs.decideNeed(b.owner, p.id, first.id, 'open', now), 409);
		expect(await db.projectAct.count({ where: { needId: first.id, kind: 'NEED_OPENED' } })).toBe(0);

		const second = await needs.addNeed(coord, p.id, booker, now);
		// Retirer : l'autrice seule.
		await rejects(needs.withdrawNeed(guest, p.id, second.id, now), 403);
		await rejects(needs.withdrawNeed(b.owner, p.id, second.id, now), 403);
		await needs.withdrawNeed(coord, p.id, second.id, now);
		expect(await statusOf(second.id)).toBe('CANCELLED');

		// Un identifiant d'un autre projet ne se distingue pas d'un besoin absent.
		const other = await projects.createProject(b.owner, ep(b.id));
		await rejects(needs.decideNeed(b.owner, other.id, first.id, 'open', now), 404);
	});

	it('pourvu, rouvrir, annuler, modifier', async () => {
		const { b, p, coord, guest, guestRow } = await scene('pourvu');
		const need = await needs.addNeed(b.owner, p.id, engineer(), now);
		// Désigner une personne qui ne participe pas : refusé.
		const stranger = await person('etranger');
		const strangerParticipation = await db.projectParticipant.findFirst({
			where: { personId: stranger }
		});
		expect(strangerParticipation).toBeNull();
		await rejects(needs.fillNeed(coord, p.id, need.id, 'participation-forgee', now), 404);
		await needs.fillNeed(coord, p.id, need.id, guestRow, now);
		let row = await db.projectNeed.findUniqueOrThrow({ where: { id: need.id } });
		expect([row.status, row.filledById]).toEqual(['FILLED', guest]);
		// Pourvu ne crée ni tâche, ni crédit : la participation reste la même.
		expect(
			(await db.projectParticipant.findUniqueOrThrow({ where: { id: guestRow } })).status
		).toBe('ACTIVE');

		await rejects(needs.reopenNeed(guest, p.id, need.id, now), 403);
		await needs.reopenNeed(coord, p.id, need.id, now);
		row = await db.projectNeed.findUniqueOrThrow({ where: { id: need.id } });
		expect([row.status, row.filledById]).toEqual(['OPEN', null]);

		// Modifier un besoin ouvert, annuler : la gestion seule.
		await rejects(needs.updateNeed(coord, p.id, need.id, booker, now), 403);
		await needs.updateNeed(b.owner, p.id, need.id, engineer('Prise et mixage'), now);
		expect((await db.projectNeed.findUniqueOrThrow({ where: { id: need.id } })).description).toBe(
			'Prise et mixage'
		);
		await rejects(needs.cancelNeed(coord, p.id, need.id, now), 403);
		await needs.cancelNeed(b.owner, p.id, need.id, now);
		expect(await statusOf(need.id)).toBe('CANCELLED');

		// Instrument : seulement pour un·e musicien·ne, relu en base.
		const instrument = await db.instrument.findFirstOrThrow({ where: { active: true } });
		const musician = await needs.addNeed(
			b.owner,
			p.id,
			{ track: 'MUSICIAN', specialty: null, instrument: instrument.slug, description: null },
			now
		);
		expect(
			(await db.projectNeed.findUniqueOrThrow({ where: { id: musician.id } })).instrumentId
		).toBe(instrument.id);
		await rejects(
			needs.addNeed(
				b.owner,
				p.id,
				{ track: 'MUSICIAN', specialty: null, instrument: 'instrument-inconnu', description: null },
				now
			),
			400
		);
	});

	it('révocation : coordination retirée, départ, retrait : les propositions en attente tombent', async () => {
		const { b, p, coord, coordRow } = await scene('revocation');
		const pending = await needs.addNeed(coord, p.id, engineer(), now);
		const opened = await needs.addNeed(coord, p.id, booker, now);
		await needs.decideNeed(b.owner, p.id, opened.id, 'open', now);
		await team.revokeCapability(b.owner, p.id, coordRow, 'COORDINATE');
		expect(await statusOf(pending.id)).toBe('CANCELLED');
		// Un besoin ouvert appartient au projet : il reste.
		expect(await statusOf(opened.id)).toBe('OPEN');
		const cancelled = await db.projectAct.findFirstOrThrow({
			where: { needId: pending.id, kind: 'NEED_CANCELLED' }
		});
		expect([cancelled.authorId, cancelled.subjectId]).toEqual([b.owner, coord]);

		// Départ et retrait : idem.
		const leaver = await person('partante');
		const leaverRow = await join(b.owner, p.id, leaver, true);
		const left = await needs.addNeed(leaver, p.id, booker, now);
		await team.leaveProject(leaver, p.id, now);
		expect(await statusOf(left.id)).toBe('CANCELLED');

		const removed = await person('retiree');
		const removedRow = await join(b.owner, p.id, removed, true);
		const gone = await needs.addNeed(removed, p.id, booker, now);
		await team.removeParticipant(b.owner, p.id, removedRow, now);
		expect(await statusOf(gone.id)).toBe('CANCELLED');
		expect(leaverRow).toBeTruthy();
	});

	it('départ du groupe : la coordination reçue comme membre tombe, ses propositions aussi', async () => {
		const b = await band('membre');
		const p = await projects.createProject(b.owner, ep(b.id));
		await join(b.owner, p.id, b.member, true);
		const pending = await needs.addNeed(b.member, p.id, booker, now);
		await bands.leaveBand(b.id, b.member, now);
		expect(await statusOf(pending.id)).toBe('CANCELLED');
	});

	it('barrière : coordination retirée juste avant la validation, la validation échoue', async () => {
		const { b, p, coord, coordRow } = await scene('course-revoque');
		const pending = await needs.addNeed(coord, p.id, engineer(), now);
		let fired = false;
		const keys = observeNextTransaction(async (key) => {
			if (key === `project:${p.id}` && !fired) {
				fired = true;
				// Le retrait passe avant que la validation ne tienne `project:`.
				await team.revokeCapability(b.owner, p.id, coordRow, 'COORDINATE');
			}
		});
		await rejects(needs.decideNeed(b.admin, p.id, pending.id, 'open', now), 409);
		expect(keys[0]).toBe(`project:${p.id}`);
		expect(await statusOf(pending.id)).toBe('CANCELLED');
		expect(await db.projectAct.count({ where: { needId: pending.id, kind: 'NEED_OPENED' } })).toBe(
			0
		);
	});

	it('barrière : deux personnes de la gestion tranchent en même temps, une seule l’emporte', async () => {
		const { b, p, coord } = await scene('course-gestion');
		const pending = await needs.addNeed(coord, p.id, engineer(), now);
		let rival: Promise<unknown> | null = null;
		let settled = false;
		observeNextTransaction(async (key) => {
			if (key === `band:${b.id}` && !rival) {
				// L'ouverture tient `project:` : le refus concurrent attend.
				rival = needs
					.decideNeed(b.admin, p.id, pending.id, 'decline', now)
					.then(
						() => 'ok',
						(e: unknown) => e
					)
					.finally(() => {
						settled = true;
					});
				await sleep(400);
				expect(settled).toBe(false);
			}
		});
		await needs.decideNeed(b.owner, p.id, pending.id, 'open', now);
		// Assignée dans la fermeture : TypeScript la croit encore `null` ici.
		const lost: unknown = await (rival as Promise<unknown> | null);
		expect(lost).toBeInstanceOf(projects.ProjectError);
		expect((lost as InstanceType<typeof projects.ProjectError>).status).toBe(409);
		expect(await statusOf(pending.id)).toBe('OPEN');
		expect(
			await db.projectAct.count({
				where: { needId: pending.id, kind: { in: ['NEED_OPENED', 'NEED_DECLINED'] } }
			})
		).toBe(1);
	});

	it('projet clos : les besoins se lisent sans changer ; retirer sa proposition reste possible', async () => {
		const { b, p, coord } = await scene('clos');
		const pending = await needs.addNeed(coord, p.id, engineer(), now);
		const opened = await needs.addNeed(b.owner, p.id, booker, now);
		await projects.setProjectStatus(b.owner, p.id, 'DONE');
		await rejects(needs.addNeed(b.owner, p.id, booker, now), 409);
		await rejects(needs.decideNeed(b.owner, p.id, pending.id, 'open', now), 409);
		await rejects(needs.fillNeed(b.owner, p.id, opened.id, null, now), 409);
		// Rien n'est annulé d'office : une réouverture les retrouve.
		expect(await statusOf(opened.id)).toBe('OPEN');
		await needs.withdrawNeed(coord, p.id, pending.id, now);
		expect(await statusOf(pending.id)).toBe('CANCELLED');
		const view = (await projectView(p.id, b.owner))!;
		expect(view.needs.find((x) => x.id === opened.id)?.actions).toEqual([]);
	});

	it('quotas : 20 besoins ouverts ou proposés par projet', async () => {
		const me = await person('quota');
		const p = await projects.createProject(me, ep());
		await db.projectNeed.createMany({
			data: Array.from({ length: MAX_LIVE_NEEDS_PER_PROJECT }, () => ({
				projectId: p.id,
				status: 'OPEN' as const,
				track: 'BOOKER' as const,
				createdById: null
			}))
		});
		const err = await rejects(needs.addNeed(me, p.id, booker, now), 409);
		expect(err.code).toBe('quota');
		await db.projectNeed.updateMany({ where: { projectId: p.id }, data: { status: 'FILLED' } });
		expect((await needs.addNeed(me, p.id, booker, now)).status).toBe('OPEN');
	});

	it('quota sur 24 h : deux ajouts simultanés dans deux projets, un seul passe', async () => {
		const me = await person('quota-jour');
		const a = await projects.createProject(me, ep());
		const b = await projects.createProject(me, ep());
		await db.projectNeed.createMany({
			data: Array.from({ length: MAX_NEEDS_PER_DAY - 1 }, () => ({
				projectId: a.id,
				status: 'CANCELLED' as const,
				track: 'BOOKER' as const,
				createdById: me,
				createdAt: now
			}))
		});
		const results = await Promise.allSettled([
			needs.addNeed(me, a.id, booker, now),
			needs.addNeed(me, b.id, booker, now)
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const refused = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
		expect((refused.reason as InstanceType<typeof projects.ProjectError>).code).toBe('quota');
	});

	it('lecture : ce que voit chaque rôle, et le journal filtré', async () => {
		const { b, p, coord, guest } = await scene('lecture');
		const mine = await needs.addNeed(coord, p.id, engineer('Ma proposition'), now);
		const opened = await needs.addNeed(b.owner, p.id, booker, now);
		const other = await person('autre-coord');
		await join(b.owner, p.id, other, true);

		const asManager = (await projectView(p.id, b.owner))!;
		expect(asManager.needs.map((x) => x.id)).toEqual([mine.id, opened.id]);
		expect(asManager.needs[0].actions).toEqual(expect.arrayContaining(['open', 'decline']));

		const asCoord = (await projectView(p.id, coord))!;
		expect(asCoord.needs.map((x) => x.id)).toEqual([mine.id, opened.id]);
		expect(asCoord.needs[0].actions).toEqual(['update', 'withdraw']);

		const asOther = (await projectView(p.id, other))!;
		expect(asOther.needs.map((x) => x.id)).toEqual([opened.id]);

		const asGuest = (await projectView(p.id, guest))!;
		expect(asGuest.needs.map((x) => x.id)).toEqual([opened.id]);
		expect(asGuest.needs[0].actions).toEqual([]);
		expect(asGuest.needs[0].searchHref).toBe('/decouvrir?metier=booker');
		// La proposition d'autrui n'apparaît pas non plus dans son journal.
		expect(asGuest.journal.some((j) => j.kind === 'NEED_PROPOSED')).toBe(false);
		expect(asManager.journal.some((j) => j.kind === 'NEED_PROPOSED')).toBe(true);

		// Simple membre du groupe, non participant : pas de fiche du tout (I2).
		expect(await projectView(p.id, b.member)).toBeNull();
	});

	it('RGPD : export, puis anonymisation', async () => {
		const { b, p, coord, guest, guestRow } = await scene('rgpd');
		const kept = await needs.addNeed(coord, p.id, engineer('Validée par la gestion'), now);
		await needs.decideNeed(b.owner, p.id, kept.id, 'open', now);
		const refused = await needs.addNeed(coord, p.id, booker, now);
		await needs.updateNeed(coord, p.id, refused.id, { ...booker, description: 'Texte libre' }, now);
		await needs.decideNeed(b.owner, p.id, refused.id, 'decline', now);
		const pending = await needs.addNeed(coord, p.id, { ...booker, description: 'En attente' }, now);
		await needs.fillNeed(b.owner, p.id, kept.id, guestRow, now);

		const exported = await projectsExport(coord);
		expect(exported.besoins_formules.map((x) => x.etat)).toEqual([
			'Pourvu',
			'Non retenu',
			'Proposé'
		]);
		expect((await projectsExport(guest)).besoins_pourvus).toHaveLength(1);

		await transaction(projectAnonymizationOps(coord, now));
		const rows = await db.projectNeed.findMany({
			where: { id: { in: [kept.id, refused.id, pending.id] } },
			orderBy: { createdAt: 'asc' }
		});
		expect(rows.map((r) => [r.status, r.description, r.createdById])).toEqual([
			['FILLED', 'Validée par la gestion', null],
			['DECLINED', null, null],
			['CANCELLED', null, null]
		]);
		await transaction(projectAnonymizationOps(guest, now));
		expect((await db.projectNeed.findUniqueOrThrow({ where: { id: kept.id } })).filledById).toBe(
			null
		);
	});

	it('À traiter : la gestion voit les propositions à trancher, plus après la décision', async () => {
		const { b, p, coord, guest } = await scene('a-traiter');
		const proposed = await needs.addNeed(coord, p.id, engineer(), now);
		const inbox = await inboxFor({ actorId: b.admin, birthDate: new Date('1990-01-01') }, now);
		expect(inbox.needProposals.map((x) => [x.needId, x.label, x.author])).toEqual([
			[proposed.id, 'Ingé son · Prise de son', `${'a-traiter'}-coord`]
		]);
		expect(inbox.answers).toBeGreaterThanOrEqual(1);
		// Ni la coordination (autrice), ni la participation, ni le simple membre ne la voient.
		for (const id of [coord, guest, b.member]) {
			const other = await inboxFor({ actorId: id, birthDate: new Date('1990-01-01') }, now);
			expect(other.needProposals).toEqual([]);
		}
		await needs.decideNeed(b.owner, p.id, proposed.id, 'open', now);
		const after = await inboxFor({ actorId: b.owner, birthDate: new Date('1990-01-01') }, now);
		expect(after.needProposals).toEqual([]);
	});

	it('annonce : préparée depuis un besoin, liée sous verrou ; refusée hors du périmètre', async () => {
		const toulouse = E2E_COMMUNES.find((c) => c.nom === 'Toulouse')!;
		const me = await person('annonce');
		await setActorLocation(me, toulouse, { db, schema: 'e2e' });
		const p = await projects.createProject(me, ep());
		const need = await needs.addNeed(me, p.id, engineer('Cinq titres'), now);
		const form = {
			kind: 'SESSION_WORK' as const,
			title: 'Ingé son · Prise de son',
			description: 'Une prise de son pour cinq titres, à Toulouse.',
			radiusKm: 25,
			durationDays: 14,
			slots: 1,
			target: 'SOUND_ENGINEER' as const,
			specialty: 'RECORDING'
		};
		// Un autre métier que celui du besoin : rien n'est créé (transaction annulée).
		const before = await db.opportunity.count({ where: { issuerActorId: me } });
		await expect(
			createOpportunity(
				me,
				{ ...form, target: 'PRODUCER', specialty: undefined },
				now,
				null,
				need.id
			)
		).rejects.toBeInstanceOf(OpportunityError);
		expect(await db.opportunity.count({ where: { issuerActorId: me } })).toBe(before);

		const { id } = await createOpportunity(me, form, now, null, need.id);
		const linked = await db.projectNeed.findUniqueOrThrow({ where: { id: need.id } });
		expect(linked.opportunityId).toBe(id);
		expect(await db.projectAct.count({ where: { needId: need.id, kind: 'NEED_LINKED' } })).toBe(1);
		// L'annonce ne reprend ni le nom du projet ni la phrase du besoin.
		const opportunity = await db.opportunity.findUniqueOrThrow({ where: { id } });
		expect(JSON.stringify(opportunity)).not.toContain('EP Lumière');
		// Une seconde annonce pour le même besoin : refusée, et rien n'est créé.
		await expect(createOpportunity(me, form, now, null, need.id)).rejects.toBeInstanceOf(
			OpportunityError
		);
		expect(await db.opportunity.count({ where: { issuerActorId: me } })).toBe(before + 1);
		const view = (await projectView(p.id, me))!;
		expect(view.needs[0].opportunity).toEqual({ id, open: true, applications: 0 });
		expect(view.needs[0].opportunityQuery).toBeNull();

		// Projet de groupe (Q100), métier booker (Q99), personne extérieure : refusés.
		const b = await band('annonce-groupe');
		await setActorLocation(b.owner, toulouse, { db, schema: 'e2e' });
		const bandProject = await projects.createProject(b.owner, ep(b.id));
		const bandNeed = await needs.addNeed(b.owner, bandProject.id, engineer(), now);
		await expect(createOpportunity(b.owner, form, now, null, bandNeed.id)).rejects.toBeInstanceOf(
			OpportunityError
		);
		expect((await projectView(bandProject.id, b.owner))!.needs[0].opportunityRefusal).toMatch(
			/Au nom d’un groupe/
		);
		const bookerNeed = await needs.addNeed(me, p.id, booker, now);
		expect(
			(await projectView(p.id, me))!.needs.find((x) => x.id === bookerNeed.id)?.opportunityRefusal
		).toMatch(/booker/);
		const stranger = await person('annonce-etranger');
		await setActorLocation(stranger, toulouse, { db, schema: 'e2e' });
		const other = await needs.addNeed(me, p.id, engineer(), now);
		await expect(createOpportunity(stranger, form, now, null, other.id)).rejects.toBeInstanceOf(
			OpportunityError
		);
		expect(
			(await db.projectNeed.findUniqueOrThrow({ where: { id: other.id } })).opportunityId
		).toBe(null);
	});

	it('journal en ajout seul : la colonne du besoin ne se réécrit pas', async () => {
		const me = await person('journal');
		const p = await projects.createProject(me, ep());
		const need = await needs.addNeed(me, p.id, booker, now);
		const row = await db.projectAct.findFirstOrThrow({ where: { needId: need.id } });
		await expect(
			db.projectAct.update({ where: { id: row.id }, data: { needId: 'autre' } })
		).rejects.toThrow();
	});
});
