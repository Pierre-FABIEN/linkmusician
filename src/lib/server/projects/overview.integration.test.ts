/**
 * P3 / U2 : projection « Mes projets » et « Hors projet », schéma e2e
 * uniquement (`PROGRESSION_INTEGRATION=1`). Droits (gestion du porteur
 * seulement, I2), visibilité des éléments (I6) dans les compteurs et la
 * dernière activité, indépendance des projets, même morceau dans deux
 * projets, perte de gestion, blocage, suppression, indépendance du métier
 * affiché, aucune XP (I3), et nombre de requêtes constant (pas de N+1).
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
const base = createPrismaClient(url.toString());
const counter = { ops: 0 };
const db = base.$extends({
	query: {
		$allOperations({ args, query }) {
			counter.ops++;
			return query(args);
		}
	}
});
vi.mock('#lib/server', () => ({ prisma: db }));
const projects = await import('./service');
const { projectView } = await import('./view');
const { projectsOverview, outsideCount, outsideProjects } = await import('./overview');
const { mainProject, homeProjects } = await import('#lib/projects/overview');
const works = await import('../works/service');
const bands = await import('../bands/service');
const { blockActor } = await import('../blocking/service');

const prefix = `ovw-${Date.now()}-`;
const actors: string[] = [];
const users: string[] = [];
const role = { kind: 'COMPOSITION' as const, instrumentSlug: null };
const now = new Date('2026-11-19T12:00:00Z');
let n = 0;

async function person(name: string) {
	const tag = `${prefix}${name}-${n++}`;
	const user = await base.user.create({
		data: { email: `${tag}@example.test`, referralCode: tag }
	});
	users.push(user.id);
	const actor = await base.actor.create({
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
		const handle = (await base.actor.findUniqueOrThrow({ where: { id } })).handle!;
		await bands.inviteToBand(created.id, owner, { handle, title: null }, now);
		const invite = await base.membership.findFirstOrThrow({
			where: { orgId: created.id, personId: id, status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, id, true, now);
	}
	const adminRow = await base.membership.findFirstOrThrow({
		where: { orgId: created.id, personId: admin, status: 'ACTIVE' }
	});
	await bands.setRole(adminRow.id, owner, 'ADMIN', now);
	return { id: created.id, handle: created.handle, owner, admin, member, adminRow: adminRow.id };
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
	if (opts.composed) await base.work.update({ where: { id: w.id }, data: { state: 'COMPOSED' } });
	return w.id;
}

const project = (
	name: string,
	kind: 'EP' | 'ALBUM' | 'TOUR' | 'CAMPAIGN' = 'EP',
	owner: string | null = null
) => ({ name, kind, description: null, startsOn: null, dueOn: null, owner });

const range = (
	me: string,
	projectId: string,
	workId: string,
	share: 'NONE' | 'SUMMARY' | null = null
) => projects.addProjectItem(me, projectId, { workId, share, workingTitle: null });

const xpOf = (ids: string[]) => base.xpTransaction.count({ where: { actorId: { in: ids } } });

describe.skipIf(!enabled)('« Mes projets » P3 / U2 (intégration)', { timeout: 240_000 }, () => {
	beforeAll(async () => {
		await base.$queryRaw`SELECT 1`;
	});

	afterAll(async () => {
		vi.restoreAllMocks();
		await base.project.deleteMany({ where: { ownerId: { in: actors } } });
		await base.actor.deleteMany({ where: { id: { in: actors } } });
		await base.user.deleteMany({ where: { id: { in: users } } });
		await base.domainEvent.deleteMany({ where: { actorIds: { hasSome: actors } } });
		await base.$disconnect();
	});

	it('compte neuf : aucun projet, rien hors projet, une seule requête', async () => {
		const me = await person('neuf');
		counter.ops = 0;
		expect(await projectsOverview(me)).toEqual([]);
		expect(counter.ops).toBe(1);
		expect(await outsideCount(me)).toBe(0);
		const out = await outsideProjects(me);
		expect([out.outside, out.ranged, out.others, out.targets]).toEqual([[], [], [], []]);
	});

	it('projet personnel : tuile, prochaine action réelle, hors projet, aucune XP', async () => {
		const me = await person('solo');
		const idea = await work(me, 'Brouillon');
		const song = await work(me, 'Aube', { composed: true });
		const xp = await xpOf([me]);
		expect(await outsideCount(me)).toBe(2);

		const { id } = await projects.createProject(me, project('EP Lumière'));
		let [tile] = await projectsOverview(me);
		expect(tile).toMatchObject({
			id,
			name: 'EP Lumière',
			kindLabel: 'EP',
			family: 'recorded',
			statusLabel: 'En cours',
			owner: { isMe: true },
			role: 'manage',
			roleLabel: 'Je gère',
			items: 0,
			progress: 'Aucun morceau rangé',
			nextAction: { kind: 'range' }
		});
		expect(tile.myLastActAt).not.toBeNull();

		await range(me, id, song);
		[tile] = await projectsOverview(me);
		expect(tile.items).toBe(1);
		expect(tile.progress).toBe('1 morceau rangé, composé');
		expect(tile.nextAction.kind).toBe('range');
		expect(await outsideCount(me)).toBe(1);

		await range(me, id, idea);
		[tile] = await projectsOverview(me);
		expect(tile.nextAction).toMatchObject({ kind: 'resume', href: `/morceaux/${idea}` });
		expect(await outsideCount(me)).toBe(0);

		// La projection et la fiche disent la même chose.
		const view = (await projectView(id, me))!;
		expect(tile.items).toBe(view.counts.items);
		expect(view.resumable).toEqual({ workId: idea, title: 'Brouillon' });
		expect(await xpOf([me])).toBe(xp);
	});

	it('groupe : la gestion voit le projet, le simple membre rien ; ses morceaux restent à leur gestion', async () => {
		const b = await band('lumiere');
		const bandSong = await work(b.owner, 'Hymne', { band: b.handle, composed: true });
		const { id } = await projects.createProject(b.owner, project('Album du groupe', 'ALBUM', b.id));
		await range(b.owner, id, bandSong);

		for (const reader of [b.owner, b.admin]) {
			const [tile] = await projectsOverview(reader);
			expect(tile).toMatchObject({ id, items: 1, owner: { isMe: false }, roleLabel: 'Je gère' });
		}
		expect(await projectsOverview(b.member)).toEqual([]);
		// Le simple membre ne gère pas le morceau du groupe : jamais « hors projet » pour lui.
		expect(await outsideCount(b.member)).toBe(0);
		const out = await outsideProjects(b.member);
		expect(out.others.map((w) => w.id)).toContain(bandSong);
		expect(out.outside).toEqual([]);
		expect(out.targets).toEqual([]);
		// Pour la gestion, le morceau est rangé dans un projet qu'elle peut ouvrir.
		const adminOut = await outsideProjects(b.admin);
		expect(adminOut.ranged.find((w) => w.id === bandSong)?.projects.map((p) => p.id)).toEqual([id]);

		// Retrait de gestion : la projection suit immédiatement.
		await bands.setRole(b.adminRow, b.owner, 'MEMBER', now);
		expect(await projectsOverview(b.admin)).toEqual([]);
		expect(await outsideCount(b.admin)).toBe(0);
	});

	it('plusieurs projets d’un même porteur : indépendants, tri stable, projet principal déduit', async () => {
		const me = await person('multi');
		const s1 = await work(me, 'Un', { composed: true });
		const s2 = await work(me, 'Deux', { composed: true });
		const album = await projects.createProject(me, project('Album', 'ALBUM'));
		const tour = await projects.createProject(me, project('Tournée', 'TOUR'));
		const camp = await projects.createProject(me, project('Campagne', 'CAMPAIGN'));
		await range(me, album.id, s1);
		await range(me, album.id, s2);

		let list = await projectsOverview(me);
		const byId = (id: string) => list.find((p) => p.id === id)!;
		expect(byId(album.id).items).toBe(2);
		expect(byId(tour.id)).toMatchObject({
			items: 0,
			family: 'stage',
			progress: 'Aucune date posée'
		});
		expect(byId(tour.id).nextAction.kind).toBe('range');
		expect(byId(camp.id).family).toBe('other');
		// Ma dernière action est dans l'album : il est le projet principal.
		expect(mainProject(list)?.id).toBe(album.id);

		// Clore la tournée ne touche ni l'album ni la campagne.
		await projects.setProjectStatus(me, tour.id, 'DONE');
		list = await projectsOverview(me);
		expect(byId(tour.id)).toMatchObject({ status: 'DONE', nextAction: { kind: 'consult' } });
		expect(byId(album.id)).toMatchObject({ status: 'ACTIVE', items: 2 });
		expect(list.map((p) => p.status)).toEqual(['ACTIVE', 'ACTIVE', 'DONE']);
		// Une action dans la campagne la fait passer en tête ; l'accueil n'en montre que trois.
		await range(me, camp.id, s1);
		list = await projectsOverview(me);
		expect(mainProject(list)?.id).toBe(camp.id);
		expect(homeProjects(list, camp.id).map((p) => p.id)).toEqual([album.id]);
		// Stable : deux lectures, même ordre.
		expect((await projectsOverview(me)).map((p) => p.id)).toEqual(list.map((p) => p.id));
	});

	it('même morceau dans deux projets : compté dans chacun, ni hors projet ni en double', async () => {
		const me = await person('double');
		const song = await work(me, 'Partout', { composed: true });
		const single = await projects.createProject(me, project('Single', 'EP'));
		const album = await projects.createProject(me, project('Album', 'ALBUM'));
		await range(me, single.id, song);
		await range(me, album.id, song);
		const list = await projectsOverview(me);
		expect(list.map((p) => p.items)).toEqual([1, 1]);
		const out = await outsideProjects(me);
		expect(out.outside).toEqual([]);
		expect(out.ranged).toHaveLength(1);
		expect(out.ranged[0].projects.map((p) => p.id).sort()).toEqual([single.id, album.id].sort());
		expect(await outsideCount(me)).toBe(0);

		// Retiré d'un seul : toujours rangé ; retiré des deux : hors projet.
		const item = await base.projectItem.findFirstOrThrow({ where: { projectId: single.id } });
		await projects.removeProjectItem(me, single.id, item.id);
		expect(await outsideCount(me)).toBe(0);
		await projects.deleteProject(me, album.id);
		expect(await outsideCount(me)).toBe(1);
		expect((await projectsOverview(me)).map((p) => p.id)).toEqual([single.id]);
		// Supprimer un projet ne supprime pas le morceau.
		expect(await base.work.count({ where: { id: song } })).toBe(1);
	});

	it('éléments invisibles : ni compteur, ni date d’activité, ni projet d’autrui révélé', async () => {
		const b = await band('prive');
		const { id } = await projects.createProject(b.owner, project('EP du groupe', 'EP', b.id));
		const ownerBefore = (await projectsOverview(b.owner))[0];
		// La co-gestion range son morceau personnel, sans partage, plus tard.
		const secret = await work(b.admin, 'Secret');
		await new Promise((r) => setTimeout(r, 20));
		await range(b.admin, id, secret, 'NONE');

		const [ownerTile] = await projectsOverview(b.owner);
		expect(ownerTile.items).toBe(0);
		expect(ownerTile.lastActivityAt).toEqual(ownerBefore.lastActivityAt);
		expect((await projectView(id, b.owner))!.counts.items).toBe(0);
		// Pour la co-gestion, son morceau est rangé et compté.
		const [adminTile] = await projectsOverview(b.admin);
		expect(adminTile.items).toBe(1);
		expect(adminTile.lastActivityAt!.getTime()).toBeGreaterThan(
			ownerBefore.lastActivityAt!.getTime()
		);

		// Un projet personnel de la co-gestion n'apparaît jamais au responsable du groupe.
		const mine = await projects.createProject(b.admin, project('À moi'));
		expect((await projectsOverview(b.owner)).map((p) => p.id)).not.toContain(mine.id);
	});

	it('blocage : un élément partagé d’une personne bloquée disparaît des compteurs', async () => {
		const b = await band('bloc');
		const { id } = await projects.createProject(b.owner, project('EP', 'EP', b.id));
		const shared = await work(b.admin, 'Partagé', { composed: true });
		await range(b.admin, id, shared, 'SUMMARY');
		expect((await projectsOverview(b.owner))[0].items).toBe(1);
		await blockActor(b.owner, b.admin);
		expect((await projectsOverview(b.owner))[0].items).toBe(0);
		expect((await projectView(id, b.owner))!.counts.items).toBe(0);
	});

	it('requêtes forgées : la projection ne lit que l’identité de session', async () => {
		const me = await person('moi');
		const other = await person('autre');
		const { id } = await projects.createProject(other, project('Pas à moi'));
		expect((await projectsOverview(me)).map((p) => p.id)).not.toContain(id);
		// Ranger le morceau d'autrui dans mon projet reste refusé (P2).
		const theirs = await work(other, 'À autrui');
		const mineP = await projects.createProject(me, project('Le mien'));
		await expect(range(me, mineP.id, theirs)).rejects.toBeInstanceOf(projects.ProjectError);
		const out = await outsideProjects(me);
		expect(out.outside.map((w) => w.id)).not.toContain(theirs);
	});

	it('métier affiché sans effet : mêmes projets, même ordre', async () => {
		const me = await person('metiers');
		await projects.createProject(me, project('A'));
		await projects.createProject(me, project('B', 'TOUR'));
		const before = await projectsOverview(me);
		await base.personTrack.create({ data: { personId: me, track: 'PRODUCER', isPrimary: false } });
		const after = await projectsOverview(me);
		expect(after.map((p) => [p.id, p.roleLabel])).toEqual(before.map((p) => [p.id, p.roleLabel]));
	});

	it('coût : requêtes constantes, quel que soit le nombre de projets et d’éléments', async () => {
		const me = await person('perf');
		const songs = await Promise.all(
			Array.from({ length: 12 }, (_, i) => work(me, `T${i}`, { composed: i % 2 === 0 }))
		);
		const ids: string[] = [];
		for (let i = 0; i < 6; i++) ids.push((await projects.createProject(me, project(`P${i}`))).id);
		const measure = async () => {
			counter.ops = 0;
			await projectsOverview(me);
			return counter.ops;
		};
		const few = await measure();
		for (const [i, pid] of ids.entries())
			for (const s of songs.slice(0, 2 + i)) await range(me, pid, s);
		const many = await measure();
		expect(many).toBe(few);
		expect(many).toBeLessThanOrEqual(7);
	});
});
