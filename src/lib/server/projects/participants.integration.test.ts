/**
 * P4a (D72) : participant·es et capacités d'un projet, schéma e2e uniquement
 * (`PROGRESSION_INTEGRATION=1`). Matrice §6.2 en appels forgés pour chaque
 * profil, non-élévation (I2, I11), révocation à barrières (I12), départ du
 * groupe, mineur·es, blocages, projet clos, groupe dissous, quotas, RGPD.
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
const { projectView } = await import('./view');
const { projectsOverview } = await import('./overview');
const { projectsExport, projectAnonymizationOps } = await import('./export');
const works = await import('../works/service');
const bands = await import('../bands/service');
const { blockActor } = await import('../blocking/service');
const { MAX_PENDING_PROJECT_INVITES } = await import('#lib/projects/participants');

const prefix = `part-${Date.now()}-`;
const actors: string[] = [];
const users: string[] = [];
const transaction = db.$transaction.bind(db);
const role = { kind: 'COMPOSITION' as const, instrumentSlug: null };
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
	const memberRow = await db.membership.findFirstOrThrow({
		where: { orgId: created.id, personId: member, status: 'ACTIVE' }
	});
	return { id: created.id, handle: created.handle, owner, admin, member, memberRow: memberRow.id };
}

async function work(
	ownerId: string,
	title: string,
	opts: { band?: string; composed?: boolean } = {}
) {
	const w = await works.createWork(
		ownerId,
		{ title, band: opts.band ?? null, genreIds: [], roles: [role] },
		now
	);
	if (opts.composed) await db.work.update({ where: { id: w.id }, data: { state: 'COMPOSED' } });
	return w.id;
}

const ep = (name = 'EP Lumière', owner: string | null = null) => ({
	name,
	kind: 'EP' as const,
	description: null,
	startsOn: null,
	dueOn: null,
	owner
});

/** Invite puis fait accepter ; renvoie l'identifiant de participation. */
async function join(inviter: string, projectId: string, personId: string, coordinate = false) {
	await team.inviteParticipant(
		inviter,
		projectId,
		{ handle: await handleOf(personId), role: null, coordinate },
		now
	);
	const row = await db.projectParticipant.findFirstOrThrow({
		where: { projectId, personId, status: 'INVITED' }
	});
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

describe.skipIf(!enabled)(
	'projets P4a : participant·es (intégration)',
	{ timeout: 240_000 },
	() => {
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

		it('invitation : avant d’accepter, le minimum ; après, la fiche partagée ; quitter ferme tout', async () => {
			const b = await band('parcours');
			const guest = await person('ingé');
			const p = await projects.createProject(b.owner, {
				...ep('EP secret'),
				owner: b.id,
				description: 'Sortie en mars'
			});
			const shown = await work(b.owner, 'Lumière', { band: b.handle, composed: true });
			const hidden = await work(b.owner, 'Featuring secret', { band: b.handle });
			await projects.addProjectItem(b.owner, p.id, {
				workId: shown,
				share: null,
				workingTitle: null
			});
			await projects.addProjectItem(b.owner, p.id, {
				workId: hidden,
				share: null,
				workingTitle: null
			});

			await team.inviteParticipant(
				b.owner,
				p.id,
				{ handle: await handleOf(guest), role: 'Ingé son', coordinate: false },
				now
			);
			// §9.3 : nom, type, porteur, qui invite, capacités ; rien d'autre.
			const invitations = await team.myInvitations(guest);
			expect(invitations).toEqual([
				expect.objectContaining({
					projectName: 'EP secret',
					kind: 'EP',
					owner: `${prefix}parcours`,
					invitedBy: 'parcours-owner',
					role: 'Ingé son',
					capabilities: []
				})
			]);
			const text = JSON.stringify(invitations);
			for (const secret of ['Sortie en mars', 'Lumière', 'Featuring secret']) {
				expect(text).not.toContain(secret);
			}
			// Invitée, elle ne lit pas encore la fiche.
			expect(await projectView(p.id, guest)).toBeNull();
			expect(
				await db.notification.count({ where: { recipientActorId: guest, type: 'PROJECT_INVITE' } })
			).toBe(1);

			await team.answerInvitation(guest, invitations[0].id, true, now);
			const view = (await projectView(p.id, guest))!;
			expect(view.role).toBe('participate');
			expect(view.items.map((i) => [i.title, i.href, i.manage])).toEqual([
				['Lumière', null, false]
			]);
			expect(JSON.stringify(view)).not.toContain('Featuring secret');
			expect(view.team.map((m) => [m.isMe, m.role])).toEqual([[true, 'Ingé son']]);
			expect(view.journal.map((j) => j.kind)).not.toContain('INVITED');
			expect(
				await db.notification.count({
					where: { recipientActorId: b.owner, type: 'PROJECT_JOINED' }
				})
			).toBe(1);
			const overview = await projectsOverview(guest, now);
			expect(overview.map((o) => [o.name, o.role, o.items])).toEqual([
				['EP secret', 'participate', 1]
			]);
			// La gestion voit l'invitation dans le journal ; pas la personne participante.
			const managerView = (await projectView(p.id, b.owner))!;
			expect(managerView.journal.find((j) => j.kind === 'INVITED')?.person).toBe('ingé');

			await team.leaveProject(guest, p.id, now);
			expect(await projectView(p.id, guest)).toBeNull();
			expect(await projectsOverview(guest, now)).toEqual([]);
			const acts = await db.projectAct.findMany({
				where: { projectId: p.id, subjectId: guest },
				orderBy: { occurredAt: 'asc' }
			});
			expect(acts.map((a) => a.kind)).toEqual(['INVITED', 'JOINED', 'LEFT']);
		});

		it('matrice §6.2 : chaque profil, chaque action, appels forgés', async () => {
			const b = await band('matrice');
			const [coord, part, former, third] = [
				await person('coord'),
				await person('part'),
				await person('ancien'),
				await person('tiers')
			];
			const p = await projects.createProject(b.owner, { ...ep('EP matrice'), owner: b.id });
			const bandSong = await work(b.owner, 'Chanson du groupe', { band: b.handle, composed: true });
			const ranged = await projects.addProjectItem(b.owner, p.id, {
				workId: bandSong,
				share: 'SUMMARY',
				workingTitle: null
			});
			const coordId = await join(b.owner, p.id, coord, true);
			const partId = await join(b.owner, p.id, part);
			await join(b.owner, p.id, former);
			await team.leaveProject(former, p.id, now);
			const target = await person('cible');
			const targetHandle = await handleOf(target);
			const editIn = (name = 'EP matrice') => ({
				...ep(name),
				description: 'Nouvelle phrase',
				startsOn: new Date('2026-12-01'),
				dueOn: new Date('2027-01-15')
			});
			const otherSongs = new Map<string, string>();
			for (const who of [coord, part, b.member, former, third])
				otherSongs.set(who, await work(who, `Morceau de ${who.slice(-4)}`));

			// Ce qu'aucun profil hors gestion ne peut faire : 403 si l'on lit le
			// projet (coordination, participation), 404 sinon (membre, ancien·ne, tiers).
			const readers = new Map([
				[coord, 403],
				[part, 403],
				[b.member, 404],
				[former, 404],
				[third, 404]
			]);
			for (const [who, status] of readers) {
				await rejects(projects.updateProject(who, p.id, editIn('Renommé')), status);
				await rejects(projects.setProjectStatus(who, p.id, 'DONE'), status);
				await rejects(projects.deleteProject(who, p.id), status);
				await rejects(
					projects.updateProjectItemShare(who, p.id, {
						itemId: ranged.id,
						share: 'WORK',
						workingTitle: null
					}),
					status
				);
				await rejects(projects.removeProjectItem(who, p.id, ranged.id), status);
				await rejects(team.proposeCapability(who, p.id, partId, 'COORDINATE', now), status);
				await rejects(team.revokeCapability(who, p.id, coordId, 'COORDINATE'), status);
				await rejects(team.removeParticipant(who, p.id, partId, now), status);
				await rejects(
					team.inviteParticipant(
						who,
						p.id,
						{ handle: targetHandle, role: null, coordinate: true },
						now
					),
					who === coord ? 403 : status
				);
			}
			// Participation simple, membre, ancien·ne, tiers : ni dates, ni rangement, ni invitation.
			for (const [who, status] of readers) {
				if (who === coord) continue;
				await rejects(projects.updateProject(who, p.id, editIn()), status);
				await rejects(
					projects.addProjectItem(who, p.id, {
						workId: otherSongs.get(who)!,
						share: null,
						workingTitle: null
					}),
					status
				);
				await rejects(
					team.inviteParticipant(
						who,
						p.id,
						{ handle: targetHandle, role: null, coordinate: false },
						now
					),
					status
				);
			}
			// Coordination : dates et phrase (pas le nom), ses propres morceaux,
			// invitations simples ; jamais le morceau d'autrui.
			await projects.updateProject(coord, p.id, editIn());
			const after = await db.project.findUniqueOrThrow({ where: { id: p.id } });
			expect([after.name, after.description]).toEqual(['EP matrice', 'Nouvelle phrase']);
			await rejects(
				projects.updateProject(coord, p.id, { ...editIn(), kind: 'ALBUM' as const }),
				403
			);
			await rejects(
				projects.addProjectItem(coord, p.id, {
					workId: otherSongs.get(part)!,
					share: null,
					workingTitle: null
				}),
				404
			);
			const mine = await projects.addProjectItem(coord, p.id, {
				workId: otherSongs.get(coord)!,
				share: null,
				workingTitle: null
			});
			await team.inviteParticipant(
				coord,
				p.id,
				{ handle: targetHandle, role: null, coordinate: false },
				now
			);
			const invited = await db.projectParticipant.findFirstOrThrow({
				where: { projectId: p.id, personId: target, status: 'INVITED' }
			});
			expect(invited.proposedCapabilities).toEqual([]);
			await projects.removeProjectItem(coord, p.id, mine.id);
			// Accepter ou refuser : seulement pour soi.
			await rejects(team.answerInvitation(part, invited.id, true, now), 404);
			await rejects(team.answerInvitation(coord, invited.id, false, now), 404);
			// Identifiant de participation d'un autre projet : jamais accepté.
			const other = await projects.createProject(b.owner, { ...ep('Autre'), owner: b.id });
			await rejects(team.removeParticipant(b.owner, other.id, partId, now), 404);
			await rejects(team.proposeCapability(b.owner, other.id, partId, 'COORDINATE', now), 404);
			// La gestion fait tout cela.
			await team.removeParticipant(b.owner, p.id, invited.id, now);
			await team.revokeCapability(b.owner, p.id, coordId, 'COORDINATE');
			expect((await projectView(p.id, coord))!.role).toBe('participate');
			await rejects(projects.updateProject(coord, p.id, editIn()), 403);
		});

		it('I2, I11 : ni participation ni coordination ne donnent un droit sur un morceau', async () => {
			const b = await band('elevation');
			const coord = await person('producteur');
			const p = await projects.createProject(b.owner, { ...ep('EP prod'), owner: b.id });
			const song = await work(b.owner, 'Titre du groupe', { band: b.handle, composed: true });
			await projects.addProjectItem(b.owner, p.id, {
				workId: song,
				share: 'WORK',
				workingTitle: null
			});
			await join(b.owner, p.id, coord, true);
			await join(b.owner, p.id, b.member, true);

			for (const who of [coord, b.member]) {
				expect(await works.workAccess(song, who)).toMatchObject({ manage: false });
				await expect(
					works.updateWork(song, who, { title: 'Volé', genreIds: [] })
				).rejects.toThrow();
				await expect(works.deleteWork(song, who)).rejects.toThrow();
				const view = (await projectView(p.id, who))!;
				expect(view.role).toBe('coordinate');
				expect(view.items.map((i) => [i.href, i.manage, i.share])).toEqual([[null, false, null]]);
			}
			// Aucune adhésion ni aucun rôle de groupe n'a changé.
			expect(await db.membership.count({ where: { orgId: b.id, personId: coord } })).toBe(0);
			expect(
				(await db.membership.findFirstOrThrow({ where: { orgId: b.id, personId: b.member } })).role
			).toBe('MEMBER');
			expect(await db.work.findUniqueOrThrow({ where: { id: song } })).toMatchObject({
				title: 'Titre du groupe'
			});
			// Aucune XP, aucun événement : le projet ne prouve rien (I3).
			expect(await db.xpTransaction.count({ where: { actorId: coord } })).toBe(0);
		});

		it('capacité : proposée, acceptée ; ajout consenti, retrait sans acceptation', async () => {
			const me = await person('porteuse');
			const guest = await person('aide');
			const p = await projects.createProject(me, ep());
			const id = await join(me, p.id, guest);
			await team.proposeCapability(me, p.id, id, 'COORDINATE', now);
			// Proposée seulement : aucun effet.
			await rejects(
				projects.updateProject(guest, p.id, {
					...ep(),
					description: 'x',
					startsOn: null,
					dueOn: null
				}),
				403
			);
			expect((await projectView(p.id, guest))!.me?.proposed).toEqual(['Coordination']);
			await rejects(team.proposeCapability(me, p.id, id, 'COORDINATE', now), 409);
			await team.answerCapability(guest, p.id, true, now);
			await projects.updateProject(guest, p.id, {
				...ep(),
				description: 'x',
				startsOn: null,
				dueOn: null
			});
			await team.revokeCapability(me, p.id, id, 'COORDINATE');
			await rejects(
				projects.updateProject(guest, p.id, {
					...ep(),
					description: 'y',
					startsOn: null,
					dueOn: null
				}),
				403
			);
			const kinds = (
				await db.projectAct.findMany({
					where: { projectId: p.id, subjectId: guest },
					orderBy: { occurredAt: 'asc' }
				})
			).map((a) => [a.kind, a.capability]);
			expect(kinds).toEqual([
				['INVITED', null],
				['JOINED', null],
				['CAPABILITY_GRANTED', 'COORDINATE'],
				['CAPABILITY_REVOKED', 'COORDINATE']
			]);
		});

		it('barrière : capacité retirée juste avant l’écriture de la coordination, l’écriture échoue', async () => {
			const me = await person('course-gestion');
			const coord = await person('course-coord');
			const p = await projects.createProject(me, ep());
			const id = await join(me, p.id, coord, true);
			let fired = false;
			const keys = observeNextTransaction(async (key) => {
				if (key === `project:${p.id}` && !fired) {
					fired = true;
					// La révocation passe avant que l'écriture ne tienne `project:`.
					await team.revokeCapability(me, p.id, id, 'COORDINATE');
				}
			});
			await rejects(
				projects.updateProject(coord, p.id, {
					...ep(),
					description: 'Trop tard',
					startsOn: null,
					dueOn: null
				}),
				403
			);
			expect(keys[0]).toBe(`project:${p.id}`);
			expect((await db.project.findUniqueOrThrow({ where: { id: p.id } })).description).toBeNull();
			expect(await db.projectAct.count({ where: { projectId: p.id, kind: 'UPDATED' } })).toBe(0);
		});

		it('barrière : la révocation attend l’écriture en cours, qui se termine strictement avant', async () => {
			const b = await band('attente');
			const coord = await person('attente-coord');
			const p = await projects.createProject(b.owner, { ...ep(), owner: b.id });
			const id = await join(b.owner, p.id, coord, true);
			let revoke: Promise<unknown> | null = null;
			let settled = false;
			observeNextTransaction(async (key) => {
				if (key === `band:${b.id}` && !revoke) {
					// L'écriture tient `project:` : la révocation doit attendre.
					revoke = team.revokeCapability(b.owner, p.id, id, 'COORDINATE').finally(() => {
						settled = true;
					});
					await sleep(400);
					expect(settled).toBe(false);
				}
			});
			await projects.updateProject(coord, p.id, {
				...ep(),
				description: 'Juste à temps',
				startsOn: null,
				dueOn: null
			});
			await revoke;
			const acts = await db.projectAct.findMany({
				where: { projectId: p.id, kind: { in: ['UPDATED', 'CAPABILITY_REVOKED'] } },
				orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }]
			});
			expect(acts.map((a) => a.kind)).toEqual(['UPDATED', 'CAPABILITY_REVOKED']);
			expect(acts[0].occurredAt.getTime()).toBeLessThanOrEqual(acts[1].occurredAt.getTime());
		});

		it('barrière : départ du groupe pendant une écriture, la capacité reçue comme membre tombe', async () => {
			const b = await band('depart');
			const p = await projects.createProject(b.owner, { ...ep(), owner: b.id });
			const id = await join(b.owner, p.id, b.member, true);
			expect((await db.projectParticipant.findUniqueOrThrow({ where: { id } })).asMember).toBe(
				true
			);
			let leaving: Promise<unknown> | null = null;
			const keys = observeNextTransaction(async (key) => {
				if (key === `band:${b.id}` && !leaving) {
					// `project:` est tenu ; le départ prend `band:` avant l'écriture.
					leaving = bands.leaveBand(b.id, b.member, now);
					for (let i = 0; i < 50; i++) {
						const row = await db.membership.findUniqueOrThrow({ where: { id: b.memberRow } });
						if (row.status === 'LEFT') break;
						await sleep(100);
					}
				}
			});
			await rejects(
				projects.updateProject(b.member, p.id, {
					...ep(),
					description: 'Après le départ',
					startsOn: null,
					dueOn: null
				}),
				403
			);
			await leaving;
			expect(keys).toEqual([`project:${p.id}`, `band:${b.id}`]);
			const row = await db.projectParticipant.findUniqueOrThrow({ where: { id } });
			// Il reste participant, sans capacité ; l'acte automatique est écrit.
			expect([row.status, row.capabilities, row.asMember]).toEqual(['ACTIVE', [], false]);
			expect(
				await db.projectAct.count({
					where: { projectId: p.id, kind: 'CAPABILITY_REVOKED', subjectId: b.member }
				})
			).toBe(1);
			expect((await projectView(p.id, b.member))!.role).toBe('participate');
		});

		it('capacité d’une personne extérieure : elle reste au départ d’un membre ; retrait d’un membre', async () => {
			const b = await band('exterieur');
			const outsider = await person('label');
			const p = await projects.createProject(b.owner, { ...ep(), owner: b.id });
			await join(b.owner, p.id, outsider, true);
			// Un ADMIN gère déjà le projet : l'inviter n'a pas de sens.
			await rejects(
				team.inviteParticipant(
					b.owner,
					p.id,
					{ handle: await handleOf(b.admin), role: null, coordinate: false },
					now
				),
				409
			);
			const memberRow = await join(b.owner, p.id, b.member, true);
			await bands.removeMember(b.memberRow, b.owner, now);
			const row = await db.projectParticipant.findUniqueOrThrow({ where: { id: memberRow } });
			expect(row.capabilities).toEqual([]);
			const ext = await db.projectParticipant.findFirstOrThrow({
				where: { projectId: p.id, personId: outsider }
			});
			expect(ext.capabilities).toEqual(['COORDINATE']);
			expect(ext.asMember).toBe(false);
		});

		it('mineur·es : seulement dans un projet de leur groupe, jamais la coordination', async () => {
			const b = await band('mineurs');
			const minor = await person('ado', new Date('2012-05-01'));
			await db.membership.create({
				data: { orgId: b.id, personId: minor, role: 'MEMBER', status: 'ACTIVE', startedAt: now }
			});
			const outsider = await person('ado-ext', new Date('2012-05-01'));
			const personal = await projects.createProject(b.owner, ep('Projet perso'));
			const bandProject = await projects.createProject(b.owner, {
				...ep('Projet du groupe'),
				owner: b.id
			});
			const h = await handleOf(minor);
			await rejects(
				team.inviteParticipant(
					b.owner,
					personal.id,
					{ handle: h, role: null, coordinate: false },
					now
				),
				400
			);
			await rejects(
				team.inviteParticipant(
					b.owner,
					bandProject.id,
					{ handle: await handleOf(outsider), role: null, coordinate: false },
					now
				),
				400
			);
			const refused = await rejects(
				team.inviteParticipant(
					b.owner,
					bandProject.id,
					{ handle: h, role: null, coordinate: true },
					now
				),
				400
			);
			// Sans dire pourquoi (D37).
			expect(refused.message).toContain('ne peut pas recevoir d’invitation');
			const id = await join(b.owner, bandProject.id, minor);
			await rejects(team.proposeCapability(b.owner, bandProject.id, id, 'COORDINATE', now), 409);
			expect((await projectView(bandProject.id, minor))!.role).toBe('participate');
		});

		it('blocages dans les deux sens : invitation refusée, invitation masquée, équipe filtrée', async () => {
			const me = await person('bloque-gestion');
			const [a, c, d] = [
				await person('bloquee'),
				await person('bloqueuse'),
				await person('tardive')
			];
			const p = await projects.createProject(me, ep());
			await blockActor(me, a);
			await blockActor(c, me);
			for (const who of [a, c]) {
				await rejects(
					team.inviteParticipant(
						me,
						p.id,
						{ handle: await handleOf(who), role: null, coordinate: false },
						now
					),
					404
				);
			}
			await team.inviteParticipant(
				me,
				p.id,
				{ handle: await handleOf(d), role: null, coordinate: false },
				now
			);
			expect(await team.myInvitations(d)).toHaveLength(1);
			await blockActor(d, me);
			expect(await team.myInvitations(d)).toHaveLength(0);
			// Dans l'équipe, une personne bloquée n'apparaît pas.
			const e = await person('equipe');
			const f = await person('equipe-bloquee');
			await join(me, p.id, e);
			await join(me, p.id, f);
			await blockActor(e, f);
			const names = (await projectView(p.id, e))!.team.map((m) => m.name);
			expect(names).toContain('equipe');
			expect(names).not.toContain('equipe-bloquee');
		});

		it('projet clos : participation gelée ; quitter, retirer, révoquer restent possibles', async () => {
			const me = await person('clos');
			const [x, y, z] = [await person('clos-x'), await person('clos-y'), await person('clos-z')];
			const p = await projects.createProject(me, ep());
			const xId = await join(me, p.id, x, true);
			const yId = await join(me, p.id, y);
			await team.inviteParticipant(
				me,
				p.id,
				{ handle: await handleOf(z), role: null, coordinate: false },
				now
			);
			const zRow = await db.projectParticipant.findFirstOrThrow({
				where: { projectId: p.id, personId: z }
			});
			await projects.setProjectStatus(me, p.id, 'DONE');
			await rejects(
				team.inviteParticipant(
					me,
					p.id,
					{ handle: await handleOf(await person('clos-w')), role: null, coordinate: false },
					now
				),
				409
			);
			await rejects(team.answerInvitation(z, zRow.id, true, now), 409);
			await rejects(team.proposeCapability(me, p.id, yId, 'COORDINATE', now), 409);
			await rejects(
				projects.updateProject(x, p.id, { ...ep(), description: 'x', startsOn: null, dueOn: null }),
				409
			);
			await team.answerInvitation(z, zRow.id, false, now);
			await team.revokeCapability(me, p.id, xId, 'COORDINATE');
			await team.removeParticipant(me, p.id, yId, now);
			await team.leaveProject(x, p.id, now);
			expect(await projectView(p.id, x)).toBeNull();
			expect(await projectView(p.id, y)).toBeNull();
		});

		it('groupe dissous : les participant·es lisent encore, en lecture seule (Q77)', async () => {
			const owner = await person('seule');
			const created = await bands.createBand(
				owner,
				{ name: `${prefix}solo-band`, title: null },
				now
			);
			actors.push(created.id);
			const guest = await person('reste');
			const p = await projects.createProject(owner, { ...ep('Dernier EP'), owner: created.id });
			await join(owner, p.id, guest, true);
			const result = await bands.leaveBand(created.id, owner, now);
			expect(result.dissolved).toBe(true);
			expect(await projectView(p.id, owner)).toBeNull();
			const view = (await projectView(p.id, guest))!;
			expect([view.name, view.can.live, view.can.coordinate]).toEqual(['Dernier EP', false, false]);
			await rejects(
				projects.updateProject(guest, p.id, {
					...ep('Dernier EP'),
					description: 'x',
					startsOn: null,
					dueOn: null
				}),
				403
			);
			await team.leaveProject(guest, p.id, now);
			expect(await projectView(p.id, guest)).toBeNull();
		});

		it('quotas et réinvitation : invitations en attente plafonnées, refus récent respecté', async () => {
			const me = await person('quota');
			const p = await projects.createProject(me, ep());
			const guests: string[] = [];
			for (let i = 0; i <= MAX_PENDING_PROJECT_INVITES; i++) guests.push(await person(`q${i}`));
			for (const g of guests.slice(0, MAX_PENDING_PROJECT_INVITES))
				await team.inviteParticipant(
					me,
					p.id,
					{ handle: await handleOf(g), role: null, coordinate: false },
					now
				);
			await rejects(
				team.inviteParticipant(
					me,
					p.id,
					{ handle: await handleOf(guests.at(-1)!), role: null, coordinate: false },
					now
				),
				409
			);
			const first = await db.projectParticipant.findFirstOrThrow({
				where: { projectId: p.id, personId: guests[0] }
			});
			await team.answerInvitation(guests[0], first.id, false, now);
			await rejects(
				team.inviteParticipant(
					me,
					p.id,
					{ handle: await handleOf(guests[0]), role: null, coordinate: false },
					now
				),
				400
			);
			// Deux invitations simultanées de la même personne : une seule ligne.
			const twin = await person('jumelle');
			const h = await handleOf(twin);
			const results = await Promise.allSettled([
				team.inviteParticipant(me, p.id, { handle: h, role: null, coordinate: false }, now),
				team.inviteParticipant(me, p.id, { handle: h, role: null, coordinate: false }, now)
			]);
			expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			expect(
				await db.projectParticipant.count({ where: { projectId: p.id, personId: twin } })
			).toBe(1);
		});

		it('RGPD : export des participations, anonymisation « Compte supprimé »', async () => {
			const b = await band('rgpd');
			const guest = await person('exportée');
			const p = await projects.createProject(b.owner, { ...ep('EP rgpd'), owner: b.id });
			const secret = await work(b.owner, 'Inédit', { band: b.handle });
			await projects.addProjectItem(b.owner, p.id, {
				workId: secret,
				share: null,
				workingTitle: null
			});
			await team.inviteParticipant(
				b.owner,
				p.id,
				{ handle: await handleOf(guest), role: 'Régie', coordinate: true },
				now
			);
			const row = await db.projectParticipant.findFirstOrThrow({
				where: { projectId: p.id, personId: guest }
			});
			await team.answerInvitation(guest, row.id, true, now);

			const exported = await projectsExport(guest);
			expect(exported.participations).toEqual([
				expect.objectContaining({
					projet: 'EP rgpd',
					etat: 'Active',
					role: 'Régie',
					capacites: ['Coordination'],
					invitation_de: 'rgpd-owner'
				})
			]);
			expect(exported.actes_me_concernant.map((a) => a.acte)).toEqual([
				'INVITED',
				'JOINED',
				'CAPABILITY_GRANTED'
			]);
			expect(JSON.stringify(exported)).not.toContain('Inédit');

			await transaction(projectAnonymizationOps(guest, now));
			await db.actor.update({ where: { id: guest }, data: { deletedAt: now, displayName: 'x' } });
			const after = await db.projectParticipant.findUniqueOrThrow({ where: { id: row.id } });
			expect([after.status, after.role, after.capabilities]).toEqual(['LEFT', null, []]);
			expect(await db.projectAct.count({ where: { subjectId: guest } })).toBe(0);
			const view = (await projectView(p.id, b.owner))!;
			expect(view.team).toEqual([]);
			expect(view.journal.find((j) => j.kind === 'JOINED')?.person).toBe('Compte supprimé');

			// Les projets personnels d'une personne qui part emportent leurs participations.
			const host = await person('hote');
			const own = await projects.createProject(host, ep('Perso'));
			await join(host, own.id, b.member);
			await transaction(projectAnonymizationOps(host, now));
			expect(await db.projectParticipant.count({ where: { projectId: own.id } })).toBe(0);
		});

		it('U3 : personnes connues à inviter, jamais d’adhésion d’office, quota et mineur·e', async () => {
			const b = await band('u3');
			const minor = await person('u3-ado', new Date('2012-05-01'));
			await db.membership.create({
				data: { orgId: b.id, personId: minor, role: 'MEMBER', status: 'ACTIVE', startedAt: now }
			});
			const contact = await person('u3-contact');
			const minorContact = await person('u3-ado-contact', new Date('2012-05-01'));
			const blocked = await person('u3-bloque');
			const stranger = await person('u3-inconnu');
			for (const id of [contact, minorContact, blocked])
				await db.musicalTie.create({ data: { ownerId: b.owner, contactId: id } });
			await blockActor(blocked, b.owner);
			const p = await projects.createProject(b.owner, { ...ep('Projet U3'), owner: b.id });

			// La gestion : membres d'abord, sans la co-gestion ni l'inconnu·e, ni le
			// contact mineur hors du groupe, ni la personne qui bloque.
			const seen = (await team.inviteCandidates(b.owner, p.id, now))!;
			expect(seen.canPropose).toBe(true);
			const ids = seen.candidates.map((c) => c.id);
			expect(ids.slice(0, 2).sort()).toEqual([b.member, minor].sort());
			expect(ids).toContain(contact);
			for (const absent of [b.owner, b.admin, minorContact, blocked, stranger])
				expect(ids).not.toContain(absent);
			expect(seen.candidates.find((c) => c.id === minor)?.canCoordinate).toBe(false);
			expect(seen.candidates.find((c) => c.id === contact)?.canCoordinate).toBe(true);

			// Un simple membre ne peut pas inviter : aucune liste.
			expect(await team.inviteCandidates(b.member, p.id, now)).toBeNull();

			// « Inviter les membres » : une invitation chacun·e, mineur·e compris·e, jamais active.
			const members = seen.candidates.filter((c) => c.member).map((c) => c.id);
			const result = await team.inviteMany(b.owner, p.id, members, now);
			expect(result).toMatchObject({ skipped: 0, quota: null });
			expect(result.invited).toHaveLength(2);
			const rows = await db.projectParticipant.findMany({ where: { projectId: p.id } });
			expect(rows.map((r) => r.status)).toEqual(['INVITED', 'INVITED']);
			expect(rows.every((r) => r.capabilities.length === 0)).toBe(true);
			// Déjà invité·es : la liste ne les propose plus.
			const after = (await team.inviteCandidates(b.owner, p.id, now))!;
			expect(after.candidates.some((c) => c.member)).toBe(false);

			// La coordination voit la liste, sans ce qui distingue un·e mineur·e.
			const coord = await person('u3-coord');
			await join(b.owner, p.id, coord, true);
			const coordView = (await team.inviteCandidates(coord, p.id, now))!;
			expect(coordView.canPropose).toBe(false);
			expect(coordView.candidates.every((c) => c.canCoordinate === false)).toBe(true);

			// Un contact mineur hors du groupe, forcé dans la série : refus muet.
			const muted = await team.inviteMany(b.owner, p.id, [minorContact, stranger], now);
			expect(muted).toMatchObject({ skipped: 1, quota: null });
			expect(muted.invited).toEqual(['u3-inconnu']);

			// Quota (Q79) : la série s'arrête et le dit.
			const crowd = await projects.createProject(b.owner, ep('Foule'));
			const many = await Promise.all(
				Array.from({ length: MAX_PENDING_PROJECT_INVITES + 2 }, (_, i) => person(`u3-f${i}`))
			);
			const first = await team.inviteMany(b.owner, crowd.id, many, now);
			expect(first.invited).toHaveLength(MAX_PENDING_PROJECT_INVITES);
			const more = await team.inviteMany(b.owner, crowd.id, many.slice(-2), now);
			expect(more.invited).toHaveLength(0);
			expect(more.quota).toMatch(/invitations en attente/);
			expect(more.skipped).toBe(2);
		});

		it('U3 : coordination proposée visible dans « À traiter », jamais pour un·e mineur·e', async () => {
			const b = await band('u3-offre');
			const p = await projects.createProject(b.owner, { ...ep('Offre'), owner: b.id });
			const guest = await person('u3-offre-invite');
			const pid = await join(b.owner, p.id, guest);
			expect(await team.myCapabilityOffers(guest, now)).toEqual([]);
			await team.proposeCapability(b.owner, p.id, pid, 'COORDINATE', now);
			expect(await team.myCapabilityOffers(guest, now)).toEqual([
				{ projectId: p.id, projectName: 'Offre', owner: `${prefix}u3-offre` }
			]);
			await projects.setProjectStatus(b.owner, p.id, 'DONE');
			expect(await team.myCapabilityOffers(guest, now)).toEqual([]);
		});
	}
);
