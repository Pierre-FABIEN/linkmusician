import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import dotenv from 'dotenv';
import { createPrismaClient } from '../../../../prisma/client.js';
const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = createPrismaClient(url.toString());
vi.mock('#lib/server', () => ({ prisma: db }));
const agency = await import('./service');
const { structureAccess } = await import('../organizations/access');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');
const prefix = 'agency-test-';
const people: Record<string, string> = {};
const orgs: string[] = [];
async function create() {
	const org = await agency.createAgency(people.owner, { name: prefix + orgs.length });
	orgs.push(org.id);
	return org.id;
}
async function member(orgId: string, key: string) {
	return db.membership.findFirstOrThrow({
		where: { orgId, personId: people[key], status: { in: ['ACTIVE', 'INVITED'] } }
	});
}
async function invite(orgId: string, key: string, role = 'MEMBER') {
	await agency.inviteAgencyMember(orgId, people.owner, { handle: prefix + key, role });
}
async function cleanup() {
	await db.actor.deleteMany({
		where: {
			OR: [
				{ handle: { startsWith: prefix } },
				{ person: { user: { email: { startsWith: prefix } } } }
			]
		}
	});
	await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
}
describe.skipIf(!enabled)('agences privées (schéma e2e)', { timeout: 90_000 }, () => {
	beforeAll(async () => {
		await cleanup();
		for (const key of ['owner', 'admin', 'collab', 'outsider', 'minor']) {
			const user = await db.user.create({
				data: { email: `${prefix}${key}@example.test`, referralCode: prefix + key }
			});
			const row = await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: prefix + key,
					displayName: key,
					person: {
						create: {
							userId: user.id,
							birthDate: new Date(key === 'minor' ? '2010-01-01' : '1990-01-01'),
							termsAcceptedAt: new Date(),
							tracks: {
								create: {
									track: key === 'owner' || key === 'admin' ? 'MANAGER' : 'MUSICIAN',
									isPrimary: true
								}
							}
						}
					}
				}
			});
			people[key] = row.id;
		}
	}, 90_000);
	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});
	it('crée une organisation privée, sans représentation ni gain', async () => {
		await expect(
			agency.createAgency(people.collab, { name: 'Agence non autorisée' })
		).rejects.toMatchObject({ status: 403 });
		await expect(
			agency.createAgency(people.minor, { name: 'Agence mineure' })
		).rejects.toMatchObject({ status: 403 });
		const id = await create();
		expect(await db.actor.findUnique({ where: { id } })).toMatchObject({ hidden: true });
		expect((await structureAccess(db, id, people.owner, 'AGENCY'))?.permissions).toContain(
			'agency.manage'
		);
		expect(await db.representation.count({ where: { agentId: people.owner } })).toBe(0);
		expect(await db.xpTransaction.count({ where: { actorId: people.owner } })).toBe(0);
		const extra1 = await create();
		const extra2 = await create();
		await expect(agency.createAgency(people.owner, { name: 'Quatrième agence' })).rejects.toThrow(
			/3 agences/
		);
		await agency.closeAgency(extra1, people.owner);
		await agency.closeAgency(extra2, people.owner);
	});
	it('accepte des collaborateurs sans exposer l’équipe ni donner de gestion', async () => {
		const id = orgs[0];
		await invite(id, 'collab');
		expect(await agency.agencyForMe(id, people.collab)).toMatchObject({
			status: 'INVITED',
			role: 'MEMBER'
		});
		await expect(agency.agencyTeam(id, people.collab)).rejects.toMatchObject({ status: 404 });
		await agency.answerAgencyInvite(id, people.collab, true);
		await expect(agency.agencyTeam(id, people.collab)).rejects.toMatchObject({ status: 403 });
		expect(JSON.stringify(await agency.agencyForMe(id, people.collab))).not.toContain('owner');
		await expect(
			agency.inviteAgencyMember(id, people.collab, { handle: prefix + 'outsider', role: 'MEMBER' })
		).rejects.toMatchObject({ status: 403 });
		await expect(
			agency.inviteAgencyMember(id, people.owner, { handle: prefix + 'minor', role: 'MEMBER' })
		).rejects.toMatchObject({ status: 403 });
		await expect(
			agency.inviteAgencyMember(id, people.owner, { handle: prefix + 'outsider', role: 'ADMIN' })
		).rejects.toMatchObject({ status: 403 });
		await expect(
			agency.inviteAgencyMember(id, people.owner, { handle: prefix + 'admin', role: 'OWNER' })
		).rejects.toMatchObject({ status: 400 });
	});
	it('la co-gestion ne peut ni nommer un gestionnaire ni retirer un collaborateur actif', async () => {
		const id = orgs[0];
		await invite(id, 'admin', 'ADMIN');
		await agency.answerAgencyInvite(id, people.admin, true);
		await expect(
			agency.inviteAgencyMember(id, people.admin, { handle: prefix + 'outsider', role: 'ADMIN' })
		).rejects.toMatchObject({ status: 403 });
		await expect(
			agency.removeAgencyMember(id, people.admin, (await member(id, 'collab')).id)
		).rejects.toMatchObject({ status: 403 });
		await agency.inviteAgencyMember(id, people.admin, {
			handle: prefix + 'outsider',
			role: 'MEMBER'
		});
		await agency.removeAgencyMember(id, people.owner, (await member(id, 'admin')).id);
		await expect(agency.answerAgencyInvite(id, people.outsider, true)).rejects.toMatchObject({
			status: 403
		});
		await expect(agency.agencyTeam(id, people.admin)).rejects.toMatchObject({ status: 404 });
		await expect(
			agency.inviteAgencyMember(id, people.admin, { handle: prefix + 'minor', role: 'MEMBER' })
		).rejects.toMatchObject({ status: 404 });
		await agency.removeAgencyMember(id, people.owner, (await member(id, 'outsider')).id);
	});
	it('relit les droits après attente du verrou avant d’accepter', async () => {
		const id = orgs[0];
		await invite(id, 'outsider');
		let ready!: () => void;
		let release!: () => void;
		const held = new Promise<void>((r) => {
			ready = r;
		});
		const gate = new Promise<void>((r) => {
			release = r;
		});
		const revoke = db.$transaction(
			async (tx) => {
				await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`org:${id}`}))`;
				await tx.membership.update({
					where: { id: (await member(id, 'outsider')).id },
					data: { status: 'DECLINED', endedAt: new Date() }
				});
				ready();
				await gate;
			},
			{ timeout: 20000 }
		);
		await held;
		const answer = agency.answerAgencyInvite(id, people.outsider, true).then(
			() => null,
			(e: unknown) => e
		);
		try {
			await vi.waitFor(
				async () => {
					const [row] = await db.$queryRaw<
						{ waiting: boolean }[]
					>`SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted AND objid=hashtext(${`org:${id}`})::oid) AS waiting`;
					expect(row.waiting).toBe(true);
				},
				{ timeout: 5000, interval: 50 }
			);
		} finally {
			release();
			await revoke;
		}
		expect(await answer).toMatchObject({ status: 404 });
	});
	it('un blocage apparu après invitation empêche l’acceptation', async () => {
		const id = orgs[0];
		await invite(id, 'outsider');
		await db.block.create({
			data: { blockerActorId: people.owner, blockedActorId: people.outsider }
		});
		try {
			await expect(agency.answerAgencyInvite(id, people.outsider, true)).rejects.toMatchObject({
				status: 403
			});
		} finally {
			await db.block.deleteMany({
				where: { blockerActorId: people.owner, blockedActorId: people.outsider }
			});
		}
		await agency.answerAgencyInvite(id, people.outsider, false);
	});
	it('transmet uniquement à la co-gestion et ferme sans promouvoir un collaborateur', async () => {
		const id = orgs[0];
		await expect(
			agency.removeAgencyMember(id, people.owner, (await member(id, 'owner')).id)
		).rejects.toThrow(/co-gestion/);
		await invite(id, 'admin', 'ADMIN');
		await agency.answerAgencyInvite(id, people.admin, true);
		await agency.removeAgencyMember(id, people.owner, (await member(id, 'owner')).id);
		expect((await member(id, 'admin')).role).toBe('OWNER');
		await agency.closeAgency(id, people.admin);
		expect(await agency.agencyForMe(id, people.collab)).toBeNull();
		expect(await db.membership.count({ where: { orgId: id, status: 'ACTIVE' } })).toBe(0);
	});
	it('exporte les adhésions et ne transmet pas l’agence à un collaborateur lors de l’anonymisation', async () => {
		const id = await create();
		await invite(id, 'collab');
		await agency.answerAgencyInvite(id, people.collab, true);
		const person = await db.person.findUniqueOrThrow({ where: { actorId: people.owner } });
		expect((await exportPersonData(person.userId))?.agences).toEqual(
			expect.arrayContaining([expect.objectContaining({ role: 'OWNER', statut: 'ACTIVE' })])
		);
		await db.$transaction(await personAnonymizationOps(person.userId));
		expect(await agency.agencyForMe(id, people.collab)).toBeNull();
		expect(
			await db.membership.findFirst({
				where: { orgId: id, personId: people.collab, status: 'REMOVED' }
			})
		).toMatchObject({ role: 'MEMBER', endedAt: expect.any(Date) });
		expect(await db.organization.findUnique({ where: { actorId: id } })).toMatchObject({
			dissolvedAt: expect.any(Date)
		});
	});
});
