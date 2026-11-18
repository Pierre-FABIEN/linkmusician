/**
 * P2 (D72) : socle du projet, schéma e2e uniquement (`PROGRESSION_INTEGRATION=1`).
 * Droits croisés, partage (I6), blocages, perte de gestion sous barrière
 * (I7, I12), indépendance des morceaux (I1), aucune preuve (I3), RGPD.
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
const { projectView, rangeableWorks } = await import('./view');
const { projectsExport, projectAnonymizationOps } = await import('./export');
const works = await import('../works/service');
const bands = await import('../bands/service');
const { blockActor, unblockActor } = await import('../blocking/service');
const { MAX_ACTIVE_PROJECTS } = await import('#lib/projects/rules');

const prefix = `proj-${Date.now()}-`;
const actors: string[] = [];
const users: string[] = [];
const transaction = db.$transaction.bind(db);
const role = { kind: 'COMPOSITION' as const, instrumentSlug: null };
const now = new Date('2026-11-18T12:00:00Z');
let n = 0;

async function person(name: string) {
	const tag = `${prefix}${name}-${n++}`;
	const user = await db.user.create({
		data: { email: `${tag}@example.test`, referralCode: tag }
	});
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
					birthDate: new Date('1990-01-01'),
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
		const handle = (await db.actor.findUniqueOrThrow({ where: { id } })).handle!;
		await bands.inviteToBand(created.id, owner, { handle, title: null }, now);
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: created.id, personId: id, status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, id, true, now);
	}
	const adminRow = await db.membership.findFirstOrThrow({
		where: { orgId: created.id, personId: admin, status: 'ACTIVE' }
	});
	await bands.setRole(adminRow.id, owner, 'ADMIN', now);
	return { id: created.id, handle: created.handle, owner, admin, member, adminRow: adminRow.id };
}

/** Structure créée en base (studio, lieu, organisation, agence), une gestion. */
async function structure(kind: 'STUDIO' | 'VENUE' | 'PROMOTER' | 'AGENCY', manager: string) {
	const tag = `${prefix}${kind}-${n++}`;
	const org = await db.actor.create({
		data: {
			kind: 'ORGANIZATION',
			handle: tag,
			displayName: tag,
			organization: {
				create: {
					kind,
					...(kind === 'STUDIO' ? { studio: { create: {} } } : {}),
					memberships: {
						create: { personId: manager, role: 'OWNER', status: 'ACTIVE', startedAt: now }
					}
				}
			}
		}
	});
	actors.push(org.id);
	return org.id;
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

const ep = (name = 'EP Lumière') => ({
	name,
	kind: 'EP' as const,
	description: null,
	startsOn: null,
	dueOn: null,
	owner: null
});

async function proofs(ids: string[]) {
	const [xp, events, milestones] = await Promise.all([
		db.xpTransaction.count({ where: { actorId: { in: ids } } }),
		db.domainEvent.count({ where: { actorIds: { hasSome: ids } } }),
		db.milestone.count({ where: { bandId: { in: ids } } })
	]);
	return { xp, events, milestones };
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

describe.skipIf(!enabled)('projets P2 (intégration)', { timeout: 180_000 }, () => {
	beforeAll(async () => {
		await db.$queryRaw`SELECT 1`;
	});

	afterAll(async () => {
		vi.restoreAllMocks();
		await db.project.deleteMany({ where: { ownerId: { in: actors } } });
		await db.actor.deleteMany({ where: { id: { in: actors } } });
		await db.user.deleteMany({ where: { id: { in: users } } });
		await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: actors } } });
		await db.$disconnect();
	});

	it('parcours personnel : créer, ranger, partager, retirer, supprimer ; le morceau reste intact', async () => {
		const me = await person('lea');
		const idea = await work(me, 'Idée secrète');
		const song = await work(me, 'Lumière', { composed: true });
		const before = await db.work.findUniqueOrThrow({
			where: { id: song },
			include: { contributors: { include: { roles: true } } }
		});
		const proofsBefore = await proofs([me]);

		const { id } = await projects.createProject(me, ep());
		const a = await projects.addProjectItem(me, id, {
			workId: song,
			share: null,
			workingTitle: null
		});
		const b = await projects.addProjectItem(me, id, {
			workId: idea,
			share: null,
			workingTitle: null
		});
		// Partage proposé : public → résumé, privé → rien ; jamais travail.
		expect(a.share).toBe('SUMMARY');
		expect(b.share).toBe('NONE');

		await projects.updateProjectItemShare(me, id, {
			itemId: b.id,
			share: 'WORK',
			workingTitle: 'Titre 2'
		});
		const view = (await projectView(id, me))!;
		expect(view.items.map((i) => [i.title, i.share, i.manage])).toEqual([
			['Lumière', 'SUMMARY', true],
			['Idée secrète', 'WORK', true]
		]);
		expect(view.items[0].href).toBe(`/morceaux/${song}`);
		expect(view.counts).toEqual({ items: 2, composed: 1 });
		expect(view.journal.map((j) => j.kind)).toEqual([
			'SHARE_CHANGED',
			'ITEM_ADDED',
			'ITEM_ADDED',
			'CREATED'
		]);
		expect(await rangeableWorks(me, id)).toEqual([]);

		await projects.removeProjectItem(me, id, a.id);
		expect((await projectView(id, me))!.counts.items).toBe(1);
		const deleted = await projects.deleteProject(me, id);
		expect(deleted.items).toBe(1);
		expect(await projectView(id, me)).toBeNull();
		expect(await db.projectAct.count({ where: { projectId: id } })).toBe(0);

		const after = await db.work.findUniqueOrThrow({
			where: { id: song },
			include: { contributors: { include: { roles: true } } }
		});
		expect(after).toEqual({ ...before, updatedAt: after.updatedAt });
		expect(after.updatedAt).toEqual(before.updatedAt);
		expect(await db.work.count({ where: { id: idea } })).toBe(1);
		// I3 : ni XP, ni événement de progression, ni étape.
		expect(await proofs([me])).toEqual(proofsBefore);
	});

	it('un morceau dans deux projets ; supprimer l’un laisse l’autre et le morceau', async () => {
		const me = await person('solo');
		const song = await work(me, 'Single et album', { composed: true });
		const single = await projects.createProject(me, { ...ep('Single'), kind: 'SINGLE' });
		const album = await projects.createProject(me, { ...ep('Album'), kind: 'ALBUM' });
		await projects.addProjectItem(me, single.id, { workId: song, share: null, workingTitle: null });
		await projects.addProjectItem(me, album.id, { workId: song, share: null, workingTitle: null });
		await rejects(
			projects.addProjectItem(me, album.id, { workId: song, share: null, workingTitle: null }),
			409
		);
		await projects.deleteProject(me, single.id);
		expect((await projectView(album.id, me))!.items.map((i) => i.title)).toEqual([
			'Single et album'
		]);
		// Supprimer le morceau retire le lien, pas le projet.
		await works.deleteWork(song, me);
		const view = (await projectView(album.id, me))!;
		expect(view.items).toEqual([]);
		expect(view.journal.some((j) => j.kind === 'ITEM_ADDED')).toBe(false);
	});

	it('porteurs : personne, groupe (gestion), studio, lieu, organisation ; jamais agence ni simple membre', async () => {
		const b = await band('porteurs');
		const producer = await person('producteur');
		const studio = await structure('STUDIO', producer);
		const venue = await structure('VENUE', producer);
		const promoter = await structure('PROMOTER', producer);
		const agency = await structure('AGENCY', producer);

		for (const owner of [studio, venue, promoter]) {
			const p = await projects.createProject(producer, { ...ep(), kind: 'PRODUCTION', owner });
			expect((await projectView(p.id, producer))!.owner.isMe).toBe(false);
		}
		await rejects(projects.createProject(producer, { ...ep(), owner: agency }), 403);
		await rejects(projects.createProject(b.member, { ...ep(), owner: b.id }), 403);
		// Identifiant forgé : le porteur d'un·e autre.
		await rejects(projects.createProject(b.member, { ...ep(), owner: producer }), 403);
		await rejects(projects.createProject(b.member, { ...ep(), owner: 'nope' }), 403);

		const p = await projects.createProject(b.admin, { ...ep(), owner: b.id });
		expect(await projectView(p.id, b.owner)).not.toBeNull();
		expect(await projectView(p.id, b.admin)).not.toBeNull();
		// I2 : l'adhésion seule n'ouvre pas le projet du groupe.
		expect(await projectView(p.id, b.member)).toBeNull();
		const memberWork = await work(b.member, 'Morceau du membre');
		await rejects(
			projects.addProjectItem(b.member, p.id, {
				workId: memberWork,
				share: null,
				workingTitle: null
			}),
			404
		);
		await rejects(projects.setProjectStatus(b.member, p.id, 'DONE'), 404);
		await rejects(projects.deleteProject(b.member, p.id), 404);
	});

	it('404 identique : projet inexistant, privé d’autrui, élément d’un autre projet', async () => {
		const me = await person('owner404');
		const other = await person('tiers404');
		const mine = await projects.createProject(me, ep());
		const theirs = await projects.createProject(other, ep('Autre'));
		const theirWork = await work(other, 'Leur morceau', { composed: true });
		const theirItem = await projects.addProjectItem(other, theirs.id, {
			workId: theirWork,
			share: 'WORK',
			workingTitle: null
		});

		expect(await projectView('inexistant', me)).toBeNull();
		expect(await projectView(theirs.id, me)).toBeNull();
		const missing = await rejects(projects.setProjectStatus(me, 'inexistant', 'DONE'), 404);
		const hidden = await rejects(projects.setProjectStatus(me, theirs.id, 'DONE'), 404);
		expect(hidden.message).toBe(missing.message);

		// Ranger le morceau d'autrui dans mon projet (I5) : refusé, sans rien dire.
		const forged = await rejects(
			projects.addProjectItem(me, mine.id, {
				workId: theirWork,
				share: 'WORK',
				workingTitle: null
			}),
			404
		);
		const ghost = await rejects(
			projects.addProjectItem(me, mine.id, {
				workId: 'inexistant',
				share: null,
				workingTitle: null
			}),
			404
		);
		expect(forged.message).toBe(ghost.message);
		// Élément d'un autre projet sous mon projet : introuvable.
		await rejects(
			projects.updateProjectItemShare(me, mine.id, {
				itemId: theirItem.id,
				share: 'NONE',
				workingTitle: null
			}),
			404
		);
		await rejects(projects.removeProjectItem(me, mine.id, theirItem.id), 404);
		await rejects(projects.removeProjectItem(me, theirs.id, theirItem.id), 404);
		expect(await db.projectItem.count({ where: { id: theirItem.id } })).toBe(1);
		expect(await rangeableWorks(me, mine.id)).toEqual([]);
	});

	it('partage dans un projet de groupe : rien, résumé, titre de travail, compteurs et journal', async () => {
		const b = await band('partage');
		const p = await projects.createProject(b.owner, { ...ep(), owner: b.id });
		const secret = await work(b.admin, 'Featuring secret');
		const item = await projects.addProjectItem(b.admin, p.id, {
			workId: secret,
			share: null,
			workingTitle: null
		});
		expect(item.share).toBe('NONE');

		// Rien : ni titre, ni existence, ni compteur, ni acte.
		let seen = (await projectView(p.id, b.owner))!;
		expect(seen.items).toEqual([]);
		expect(seen.counts.items).toBe(0);
		expect(seen.journal.map((j) => j.kind)).toEqual(['CREATED']);
		expect(JSON.stringify(seen)).not.toContain('Featuring secret');

		// Seule la gestion du morceau choisit son partage.
		await rejects(
			projects.updateProjectItemShare(b.owner, p.id, {
				itemId: item.id,
				share: 'WORK',
				workingTitle: null
			}),
			403
		);
		await projects.updateProjectItemShare(b.admin, p.id, {
			itemId: item.id,
			share: 'SUMMARY',
			workingTitle: 'Titre 3'
		});
		seen = (await projectView(p.id, b.owner))!;
		expect(seen.items).toEqual([
			{
				id: item.id,
				title: 'Titre 3',
				state: 'Idée',
				share: null,
				shareLabel: null,
				workingTitle: null,
				href: null,
				manage: false
			}
		]);
		expect(JSON.stringify(seen)).not.toContain('Featuring secret');
		expect(JSON.stringify(seen)).not.toContain(secret);
		expect(seen.journal.find((j) => j.kind === 'ITEM_ADDED')?.subject).toBe('Titre 3');

		// Blocage, dans un sens puis dans l'autre : l'élément disparaît.
		await blockActor(b.owner, b.admin);
		seen = (await projectView(p.id, b.owner))!;
		expect(seen.items).toEqual([]);
		expect(seen.journal.some((j) => j.subject === 'Titre 3')).toBe(false);
		await unblockActor(b.owner, b.admin);
		await blockActor(b.admin, b.owner);
		seen = (await projectView(p.id, b.owner))!;
		expect(seen.items).toEqual([]);
		// L'auteur bloqué n'est pas nommé dans les actes visibles.
		const owners = (await projectView(p.id, b.admin))!;
		expect(owners.journal.find((j) => j.kind === 'CREATED')?.author).toBe('Une personne');
		await unblockActor(b.admin, b.owner);

		// La gestion du projet retire l'élément d'autrui ; le morceau reste.
		await projects.removeProjectItem(b.owner, p.id, item.id);
		expect(await db.work.count({ where: { id: secret } })).toBe(1);
		// Le retrait reste lisible de la gestion du morceau, pas des autres.
		const adminView = (await projectView(p.id, b.admin))!;
		expect(adminView.journal.find((j) => j.kind === 'ITEM_REMOVED')?.subject).toBe(
			'Featuring secret'
		);
		const ownerView = (await projectView(p.id, b.owner))!;
		expect(ownerView.journal.some((j) => j.kind === 'ITEM_REMOVED')).toBe(false);
	});

	it('perte de la gestion : l’écriture suivante est refusée, la lecture se réduit au partage', async () => {
		const b = await band('perte');
		const mine = await projects.createProject(b.admin, ep('Projet perso'));
		const bandSong = await work(b.owner, 'Morceau du groupe', { band: b.handle, composed: true });
		const bandIdea = await work(b.owner, 'Idée du groupe', { band: b.handle });
		const other = await work(b.owner, 'Autre du groupe', { band: b.handle });
		await projects.addProjectItem(b.admin, mine.id, {
			workId: bandSong,
			share: null,
			workingTitle: null
		});
		const idea = await projects.addProjectItem(b.admin, mine.id, {
			workId: bandIdea,
			share: null,
			workingTitle: null
		});

		await bands.setRole(b.adminRow, b.owner, 'MEMBER', now);
		await rejects(
			projects.addProjectItem(b.admin, mine.id, { workId: other, share: null, workingTitle: null }),
			404
		);
		await rejects(
			projects.updateProjectItemShare(b.admin, mine.id, {
				itemId: idea.id,
				share: 'WORK',
				workingTitle: null
			}),
			403
		);
		const view = (await projectView(mine.id, b.admin))!;
		// Résumé : lisible sans lien ; rien : invisible.
		expect(view.items.map((i) => [i.title, i.manage, i.href])).toEqual([
			['Morceau du groupe', false, null]
		]);
		// Le projet reste à elle : elle peut toujours retirer le lien qu'elle voit.
		await projects.removeProjectItem(b.admin, mine.id, view.items[0].id);
		// La gestion du groupe retire le lien, même sans lire le projet d'autrui.
		await projects.removeProjectItem(b.owner, mine.id, idea.id);
		expect(await db.projectItem.count({ where: { projectId: mine.id } })).toBe(0);
		expect(await db.work.count({ where: { id: { in: [bandSong, bandIdea] } } })).toBe(2);
	});

	it('concurrence : la gestion retirée pendant un rangement est relue sous verrou (I12)', async () => {
		const b = await band('course');
		const p = await projects.createProject(b.owner, { ...ep(), owner: b.id });
		const song = await work(b.owner, 'Pris dans la course', { band: b.handle });
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
									// Projet et morceau sont tenus : la gestion change avant `band:`.
									if (key === `band:${b.id}`)
										await bands.setRole(b.adminRow, b.owner, 'MEMBER', now);
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
		await rejects(
			projects.addProjectItem(b.admin, p.id, { workId: song, share: null, workingTitle: null }),
			404
		);
		expect(keys).toEqual([`project:${p.id}`, `work:${song}`, `band:${b.id}`]);
		expect(await db.projectItem.count({ where: { projectId: p.id } })).toBe(0);
		expect(await db.projectAct.count({ where: { projectId: p.id, kind: 'ITEM_ADDED' } })).toBe(0);
	});

	it('concurrence : deux rangements simultanés du même morceau, un seul lien', async () => {
		const me = await person('double');
		const p = await projects.createProject(me, ep());
		const song = await work(me, 'Deux onglets');
		const results = await Promise.allSettled([
			projects.addProjectItem(me, p.id, { workId: song, share: null, workingTitle: null }),
			projects.addProjectItem(me, p.id, { workId: song, share: null, workingTitle: null })
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const refused = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
		expect((refused.reason as InstanceType<typeof projects.ProjectError>).status).toBe(409);
		expect(await db.projectItem.count({ where: { projectId: p.id } })).toBe(1);
	});

	it('projet clos : en lecture, partage seulement réduit, réouverture', async () => {
		const me = await person('clos');
		const p = await projects.createProject(me, ep());
		const song = await work(me, 'Rangé avant', { composed: true });
		const later = await work(me, 'Trop tard');
		const item = await projects.addProjectItem(me, p.id, {
			workId: song,
			share: 'WORK',
			workingTitle: null
		});
		await projects.setProjectStatus(me, p.id, 'DONE');
		await rejects(projects.setProjectStatus(me, p.id, 'ABANDONED'), 409);
		await rejects(
			projects.addProjectItem(me, p.id, { workId: later, share: null, workingTitle: null }),
			409
		);
		await rejects(projects.updateProject(me, p.id, { ...ep('Renommé') }), 409);
		await projects.updateProjectItemShare(me, p.id, {
			itemId: item.id,
			share: 'SUMMARY',
			workingTitle: null
		});
		await rejects(
			projects.updateProjectItemShare(me, p.id, {
				itemId: item.id,
				share: 'WORK',
				workingTitle: null
			}),
			409
		);
		await projects.setProjectStatus(me, p.id, 'ACTIVE');
		await projects.updateProject(me, p.id, { ...ep('Renommé') });
		const view = (await projectView(p.id, me))!;
		expect(view.name).toBe('Renommé');
		expect(view.journal.filter((j) => j.kind === 'STATUS_CHANGED').map((j) => j.toStatus)).toEqual([
			'En cours',
			'Atteint'
		]);
	});

	it('quota de projets en cours par porteur, y compris à la réouverture', async () => {
		const me = await person('quota');
		const ids: string[] = [];
		for (let i = 0; i < MAX_ACTIVE_PROJECTS; i++)
			ids.push((await projects.createProject(me, ep(`Projet ${i}`))).id);
		await rejects(projects.createProject(me, ep('Un de trop')), 409);
		await projects.setProjectStatus(me, ids[0], 'ABANDONED');
		const extra = await projects.createProject(me, ep('Place libérée'));
		await rejects(projects.setProjectStatus(me, ids[0], 'ACTIVE'), 409);
		expect(extra.id).toBeTruthy();
	});

	it('journal en ajout seul (I8) : UPDATE et DELETE refusés par la base', async () => {
		const me = await person('journal');
		const p = await projects.createProject(me, ep());
		const row = await db.projectAct.findFirstOrThrow({ where: { projectId: p.id } });
		await expect(
			db.projectAct.update({ where: { id: row.id }, data: { kind: 'UPDATED' } })
		).rejects.toThrow();
		await expect(db.projectAct.delete({ where: { id: row.id } })).rejects.toThrow();
		// L'oubli de l'auteur est permis ; la cascade du projet aussi.
		await db.projectAct.update({ where: { id: row.id }, data: { authorId: null } });
		await db.project.delete({ where: { id: p.id } });
		expect(await db.projectAct.count({ where: { projectId: p.id } })).toBe(0);
	});

	it('RGPD : export, anonymisation (projets personnels supprimés, auteur oublié ailleurs)', async () => {
		const b = await band('rgpd');
		const own = await projects.createProject(b.admin, ep('Mon EP'));
		const mySong = await work(b.admin, 'Ma chanson', { composed: true });
		await projects.addProjectItem(b.admin, own.id, {
			workId: mySong,
			share: null,
			workingTitle: 'Titre A'
		});
		const shared = await projects.createProject(b.owner, { ...ep('EP du groupe'), owner: b.id });
		const bandSong = await work(b.owner, 'Chanson du groupe', { band: b.handle });
		await projects.addProjectItem(b.admin, shared.id, {
			workId: bandSong,
			share: null,
			workingTitle: null
		});

		const exported = await projectsExport(b.admin);
		expect(exported.portes).toHaveLength(1);
		expect(exported.portes[0]).toMatchObject({ nom: 'Mon EP', type: 'EP', etat: 'En cours' });
		expect(exported.portes[0].elements).toEqual([
			expect.objectContaining({
				morceau: 'Ma chanson',
				titre_affiche: 'Titre A',
				partage: 'Résumé'
			})
		]);
		expect(exported.actes_dans_les_projets_de_structures).toEqual([
			expect.objectContaining({ acte: 'ITEM_ADDED', projet: 'EP du groupe' })
		]);
		expect(JSON.stringify(exported)).not.toContain('Chanson du groupe');

		await transaction(projectAnonymizationOps(b.admin));
		expect(await db.project.count({ where: { id: own.id } })).toBe(0);
		expect(await db.work.count({ where: { id: mySong } })).toBe(1);
		expect(await db.projectAct.count({ where: { authorId: b.admin } })).toBe(0);
		const item = await db.projectItem.findFirstOrThrow({ where: { projectId: shared.id } });
		expect(item.addedById).toBeNull();
		expect((await projectView(shared.id, b.owner))!.journal[0].author).toBe('Compte supprimé');

		// Suppression complète d'un acteur porteur : cascade sans erreur (trigger I8).
		await db.actor.delete({ where: { id: b.admin } });
	});
});
