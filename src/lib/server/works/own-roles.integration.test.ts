/**
 * DASH-06b (#52, D69) : ajouter un rôle du son à son propre crédit, schéma e2e.
 * Un seul contributeur, rejeu sans doublon, rôle à pourvoir pourvu, tiers et
 * membre non gestionnaire refusés, aucune part ni XP de composition, course
 * avec un crédit automatique, export et anonymisation.
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/works/own-roles
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
const bands = await import('../bands/service');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const prefix = `work-own-roles-${Date.now()}-`;
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

const contributors = (workId: string) => db.workContributor.count({ where: { workId } });
const rolesOf = (workId: string, personId: string) =>
	db.workRole.findMany({
		where: { workId, contributor: { personId } },
		select: { kind: true },
		orderBy: { createdAt: 'asc' }
	});

describe.skipIf(!enabled)('rôles du son ajoutés à son propre crédit (schéma e2e)', () => {
	beforeAll(async () => {
		await cleanup();
		for (const name of ['thomas', 'lea', 'outsider', 'member']) await person(name);
	}, 60_000);
	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('Thomas ajoute « prise de son » à son crédit : un seul contributeur, rejeu sans effet', async () => {
		const work = await works.createWork(
			ids.thomas,
			{ title: 'Midnight Groove', genreIds: [], band: null, roles: [composition] },
			now
		);
		const xpBefore = await db.xpTransaction.count({ where: { actorId: ids.thomas } });

		expect(await works.addOwnSoundRole(work.id, ids.thomas, 'RECORDING', now)).toEqual({
			changed: true
		});
		expect(await works.addOwnSoundRole(work.id, ids.thomas, 'RECORDING', later)).toEqual({
			changed: false
		});
		expect(await contributors(work.id)).toBe(1);
		expect((await rolesOf(work.id, ids.thomas)).map((r) => r.kind)).toEqual([
			'COMPOSITION',
			'RECORDING'
		]);
		const acts = await db.workRoleAct.findMany({ where: { workId: work.id } });
		expect(acts).toHaveLength(1);
		expect(acts[0]).toMatchObject({ personId: ids.thomas, kind: 'ADDED', roleKind: 'RECORDING' });
		// Aucune nouvelle attribution initiale rejouée, aucune XP.
		expect(await db.workCreditAct.count({ where: { workId: work.id } })).toBe(1);
		expect(await db.xpTransaction.count({ where: { actorId: ids.thomas } })).toBe(xpBefore);
		// Rôle du son : pas de part de composition, pas de preuve.
		const fresh = await db.work.findUniqueOrThrow({ where: { id: work.id } });
		expect(fresh).toMatchObject({ state: 'IDEA', proof: null, recordedAt: null });
		// Aucun succès « Première prise de son » par auto-crédit.
		const unlocked = await db.actorAchievement.count({
			where: { actorId: ids.thomas, achievementId: 'first-recording-credit' }
		});
		expect(unlocked).toBe(0);

		// Lecture : le rôle n'est plus proposé.
		const page = await works.workPage(work.id, ids.thomas, now);
		expect(page?.myCredit?.addableSoundRoles).toEqual(['MIXING', 'MASTERING', 'PRODUCTION']);
		const history = await works.creditHistoryForMe(ids.thomas);
		expect(history.map((h) => h.action)).toContain('Rôle du son ajouté à son propre crédit');
	}, 60_000);

	it('pourvoit un rôle à pourvoir identique plutôt que de le dupliquer', async () => {
		const work = await works.createWork(
			ids.thomas,
			{ title: 'Open Mix', genreIds: [], band: null, roles: [composition] },
			now
		);
		await works.addOpenRole(work.id, ids.thomas, { kind: 'MIXING', instrumentSlug: null });
		await works.addOwnSoundRole(work.id, ids.thomas, 'MIXING', now);
		const roles = await db.workRole.findMany({ where: { workId: work.id, kind: 'MIXING' } });
		expect(roles).toHaveLength(1);
		expect(roles[0].contributorId).not.toBeNull();
	}, 60_000);

	it('refuse un tiers, une personne sans crédit et un crédit en attente', async () => {
		const work = await works.createWork(
			ids.lea,
			{ title: 'Third Party', genreIds: [], band: null, roles: [composition] },
			now
		);
		await expect(works.addOwnSoundRole(work.id, ids.outsider, 'RECORDING', now)).rejects.toThrow(
			/portent ce morceau/
		);
		// Thomas crédité par Léa, en attente : il ne gère pas, refus.
		await works.creditPerson(work.id, ids.lea, {
			handle: `${prefix}thomas`,
			roles: [composition]
		});
		await expect(works.addOwnSoundRole(work.id, ids.thomas, 'RECORDING', now)).rejects.toThrow(
			/portent ce morceau/
		);
		expect(await db.workRoleAct.count({ where: { workId: work.id } })).toBe(0);
	}, 60_000);

	it('morceau de groupe : la gestion créditée enrichit son crédit, un membre non', async () => {
		const band = await bands.createBand(ids.lea, { name: `${prefix}groupe`, title: null }, now);
		await bands.inviteToBand(band.id, ids.lea, { handle: `${prefix}member`, title: null }, now);
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids.member, status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, ids.member, true, now);
		const work = await works.createWork(
			ids.lea,
			{ title: 'Band Song', genreIds: [], band: band.handle, roles: [composition] },
			now
		);
		await works.creditPerson(work.id, ids.lea, {
			handle: `${prefix}member`,
			roles: [composition]
		});
		await works.confirmCredit(work.id, ids.member, now);
		await expect(works.addOwnSoundRole(work.id, ids.member, 'RECORDING', now)).rejects.toThrow(
			/portent ce morceau/
		);
		expect(await works.addOwnSoundRole(work.id, ids.lea, 'RECORDING', now)).toEqual({
			changed: true
		});
		expect(await contributors(work.id)).toBe(2);
	}, 60_000);

	it('course avec un crédit de collaboration : un seul rôle, au plus un acte', async () => {
		const work = await works.createWork(
			ids.thomas,
			{ title: 'Race', genreIds: [], band: null, roles: [composition] },
			now
		);
		await Promise.all([
			works.addOwnSoundRole(work.id, ids.thomas, 'PRODUCTION', now),
			db.$transaction((tx) =>
				works.creditFromCollaboration(
					tx,
					{ workId: work.id, personId: ids.thomas, kind: 'PRODUCTION' },
					now
				)
			),
			works.addOwnSoundRole(work.id, ids.thomas, 'PRODUCTION', now)
		]);
		expect(await db.workRole.count({ where: { workId: work.id, kind: 'PRODUCTION' } })).toBe(1);
		expect(await db.workRoleAct.count({ where: { workId: work.id } })).toBeLessThanOrEqual(1);
		expect(await contributors(work.id)).toBe(1);
	}, 60_000);

	it('export et anonymisation', async () => {
		const exported = await exportPersonData(users.thomas);
		const morceaux = (exported as { morceaux: Record<string, unknown[]> }).morceaux;
		expect(morceaux.roles_ajoutes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ morceau: 'Midnight Groove', role: 'Prise de son' })
			])
		);
		await db.$transaction(await personAnonymizationOps(users.thomas));
		// Ses morceaux partent avec leurs actes (cascade).
		expect(await db.workRoleAct.count({ where: { personId: ids.thomas } })).toBe(0);
	}, 120_000);
});
