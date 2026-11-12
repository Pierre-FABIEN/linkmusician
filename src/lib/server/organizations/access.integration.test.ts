/** DASH-02a : autorisations relues sur le schéma e2e, jamais depuis le contexte métier. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import dotenv from 'dotenv';
import { createPrismaClient } from '../../../../prisma/client.js';
import { STRUCTURE_KINDS } from '#lib/structures/rules';
const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = createPrismaClient(url.toString());
vi.mock('#lib/server', () => ({ prisma: db }));
const { structureAccess } = await import('./access');
const { myStructures, myStructure } = await import('./structures');
const { teamOf, answerInvite, leaveOrRemoveManager } = await import('./comanagement');
const { setStudioPublished } = await import('../studios/service');
const prefix = `dash02a-${Date.now()}-`;
const actors: string[] = [];
const orgs: string[] = [];
const memberships: string[] = [];

describe.skipIf(!enabled)('structures : gestion et révocation', { timeout: 60_000 }, () => {
	beforeAll(async () => {
		for (const name of ['owner', 'member', 'admin', 'outsider']) {
			const a = await db.actor.create({
				data: { kind: 'PERSON', handle: prefix + name, displayName: name }
			});
			actors.push(a.id);
		}
		for (const kind of STRUCTURE_KINDS) {
			const a = await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: prefix + kind.toLowerCase(),
					displayName: kind,
					organization: {
						create: { kind, ...(kind === 'STUDIO' ? { studio: { create: {} } } : {}) }
					}
				}
			});
			orgs.push(a.id);
			for (const [i, role] of ['OWNER', 'MEMBER', 'ADMIN'].entries()) {
				const m = await db.membership.create({
					data: {
						orgId: a.id,
						personId: actors[i],
						role: role as 'OWNER' | 'MEMBER' | 'ADMIN',
						status: 'ACTIVE'
					}
				});
				if (role === 'ADMIN') memberships.push(m.id);
			}
		}
	});
	afterAll(async () => {
		await db.actor.deleteMany({ where: { id: { in: [...actors, ...orgs] } } });
		await db.$disconnect();
	});
	it('vérifie le type exact, les cinq types et la révocation entre deux requêtes', async () => {
		for (const [i, kind] of STRUCTURE_KINDS.entries()) {
			expect((await structureAccess(db, orgs[i], actors[0], kind))?.permissions).toContain(
				'manage'
			);
			expect((await structureAccess(db, orgs[i], actors[1], kind))?.permissions).toEqual([]);
			expect(await structureAccess(db, orgs[i], actors[3], kind)).toBeNull();
			const wrongKind = kind === 'BAND' ? 'STUDIO' : 'BAND';
			expect(await structureAccess(db, orgs[i], actors[0], wrongKind)).toBeNull();
			await db.membership.update({ where: { id: memberships[i] }, data: { status: 'INVITED' } });
			expect(await structureAccess(db, orgs[i], actors[2], kind)).toBeNull();
			await db.membership.update({ where: { id: memberships[i] }, data: { status: 'ACTIVE' } });
			expect((await structureAccess(db, orgs[i], actors[2], kind))?.permissions).toContain(
				'manage'
			);
			await db.membership.update({ where: { id: memberships[i] }, data: { status: 'REMOVED' } });
			expect(await structureAccess(db, orgs[i], actors[2], kind)).toBeNull();
		}
		await expect(setStudioPublished(orgs[1], actors[1], false)).rejects.toMatchObject({
			status: 403
		});
		await expect(setStudioPublished(orgs[1], actors[2], false)).rejects.toMatchObject({
			status: 404
		});
		await expect(teamOf(orgs[2], actors[1])).rejects.toMatchObject({ status: 403 });
	});
	it('ne projette que mes participations et aucun autre membre ou élève', async () => {
		expect(await myStructures(actors[3])).toEqual([]);
		expect(await myStructure(orgs[0], actors[3])).toBeNull();
		const mine = await myStructures(actors[1]);
		expect(mine).toHaveLength(5);
		expect(mine.every((s) => !s.manager)).toBe(true);
		const school = await myStructure(orgs[4], actors[1]);
		expect(school).toMatchObject({ roleLabel: 'Élève', manager: false });
		expect(JSON.stringify(school)).not.toMatch(/students|owner|admin/);
		await db.organization.update({
			where: { actorId: orgs[0] },
			data: { dissolvedAt: new Date() }
		});
		expect(await myStructure(orgs[0], actors[1])).toBeNull();
		await db.actor.update({ where: { id: orgs[1] }, data: { deletedAt: new Date() } });
		expect(await structureAccess(db, orgs[1], actors[0])).toBeNull();
	});
	it('une invitation retirée ne peut pas être acceptée', async () => {
		const c = {
			kind: 'PROMOTER' as const,
			noun: 'cette organisation',
			maxManaged: 3,
			canBeInvited: async () => true,
			notEligible: 'Invitation impossible.',
			notification: 'ORG_INVITE' as const,
			inviteHref: '/organisations'
		};
		const invite = await db.membership.create({
			data: { orgId: orgs[3], personId: actors[3], role: 'ADMIN', status: 'INVITED' }
		});
		expect((await myStructure(orgs[3], actors[3]))?.manager).toBe(false);
		await leaveOrRemoveManager(c, orgs[3], actors[0], invite.id);
		await expect(answerInvite(c, invite.id, actors[3], true)).rejects.toMatchObject({
			status: 404
		});
		expect(await structureAccess(db, orgs[3], actors[3])).toBeNull();
	});
	it('ne réactive pas une invitation révoquée pendant l’attente du verrou', async () => {
		const orgId = orgs[3];
		const invite = await db.membership.create({
			data: { orgId, personId: actors[3], role: 'ADMIN', status: 'INVITED' }
		});
		let release!: () => void;
		let held!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const locked = new Promise<void>((resolve) => {
			held = resolve;
		});
		const revoke = db.$transaction(
			async (tx) => {
				await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`org:${orgId}`}))`;
				held();
				await gate;
				await tx.membership.update({
					where: { id: invite.id },
					data: { status: 'DECLINED', endedAt: new Date() }
				});
			},
			{ timeout: 20_000 }
		);
		await Promise.race([locked, revoke]);
		const answer = answerInvite(
			{
				kind: 'PROMOTER',
				noun: 'cette organisation',
				maxManaged: 3,
				canBeInvited: async () => true,
				notEligible: '',
				notification: 'ORG_INVITE',
				inviteHref: '/organisations'
			},
			invite.id,
			actors[3],
			true
		).then(
			() => null,
			(error: unknown) => error
		);
		try {
			await vi.waitFor(
				async () => {
					const [row] = await db.$queryRaw<{ waiting: boolean }[]>`SELECT EXISTS (
					SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND NOT granted
					AND objid = hashtext(${`org:${orgId}`})::oid
				) AS waiting`;
					expect(row.waiting).toBe(true);
				},
				{ timeout: 5_000, interval: 50 }
			);
		} finally {
			release();
			await revoke;
		}
		expect(await answer).toMatchObject({ status: 404 });
		expect((await db.membership.findUniqueOrThrow({ where: { id: invite.id } })).status).toBe(
			'DECLINED'
		);
	});
});
