import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
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
const d = await import('./delegations');
const { endRepresentation } = await import('./service');
const agencies = await import('../agencies/service');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');
const prefix = 'delegation-test-';
const people: Record<string, string> = {};
const orgs: string[] = [];
let agencyId = '';
let parentId = '';
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
const now = new Date();
async function propose(allowEnd = false, extra: Record<string, unknown> = {}) {
	return d.proposeDelegation(
		people.agent,
		{ representationId: parentId, agencyId, delegate: prefix + 'delegate', allowEnd, ...extra },
		now
	);
}
async function approveBoth(id: string) {
	await d.answerDelegation(id, people.delegate, true, now);
	await d.approveDelegation(id, people.artist, true, now);
}
const parent = () => db.representation.findUniqueOrThrow({ where: { id: parentId } });
describe.skipIf(!enabled)(
	'affectations consenties et droits métier (e2e)',
	{ timeout: 90000 },
	() => {
		beforeAll(async () => {
			await cleanup();
			for (const key of ['agent', 'delegate', 'artist', 'admin', 'outsider', 'minor']) {
				const user = await db.user.create({
					data: { email: prefix + key + '@example.test', referralCode: prefix + key }
				});
				const actor = await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: prefix + key,
						displayName: key,
						person: {
							create: {
								userId: user.id,
								birthDate: new Date(key === 'minor' ? '2010-01-01' : '1990-01-01'),
								termsAcceptedAt: now,
								tracks: {
									create: {
										track: ['agent', 'admin'].includes(key) ? 'MANAGER' : 'MUSICIAN',
										isPrimary: true
									}
								}
							}
						}
					}
				});
				people[key] = actor.id;
			}
		}, 90000);
		beforeEach(async () => {
			agencyId = (await agencies.createAgency(people.agent, { name: prefix + 'agence' })).id;
			orgs.push(agencyId);
			for (const [key, role] of [
				['delegate', 'MEMBER'],
				['admin', 'ADMIN']
			] as const) {
				await agencies.inviteAgencyMember(agencyId, people.agent, { handle: prefix + key, role });
				await agencies.answerAgencyInvite(agencyId, people[key], true);
			}
			parentId = (
				await db.representation.create({
					data: {
						agentId: people.agent,
						artistId: people.artist,
						kind: 'MANAGER',
						status: 'CONFIRMED',
						confirmedAt: now,
						confirmedById: people.artist,
						allowedActions: ['CAREER_SUPPORT'],
						departmentCodes: ['31'],
						message: 'Mot confidentiel du mandat',
						expiresAt: new Date(now.getTime() + 30 * 86400000)
					}
				})
			).id;
		});
		afterEach(async () => {
			await db.representation.deleteMany({ where: { id: parentId } });
			await db.actor.deleteMany({ where: { id: { in: orgs } } });
			orgs.length = 0;
		});
		afterAll(async () => {
			await cleanup();
			await db.$disconnect();
		});
		it('exige un agent titulaire, un collaborateur actif et majeur, sans droit d’administrateur implicite', async () => {
			const input = {
				representationId: parentId,
				agencyId,
				delegate: prefix + 'delegate',
				allowEnd: false
			};
			await expect(d.proposeDelegation(people.admin, input, now)).rejects.toMatchObject({
				status: 403
			});
			await expect(propose(false, { delegate: prefix + 'outsider' })).rejects.toMatchObject({
				status: 403
			});
			await expect(propose(false, { delegate: prefix + 'minor' })).rejects.toMatchObject({
				status: 403
			});
			const id = await propose();
			expect(await d.delegationForMe(id, people.admin)).toBeNull();
			expect(await d.myDelegations(people.admin, agencyId)).toEqual([]);
			for (const key of ['agent', 'delegate', 'artist']) {
				const mine = await d.myDelegations(people[key]);
				expect(mine.map((x) => x.id)).toEqual([id]);
				expect(JSON.stringify(mine)).not.toContain('Mot confidentiel');
				expect(mine[0]).not.toHaveProperty('departmentCodes');
			}

			expect(JSON.stringify(await d.delegationForMe(id, people.delegate))).not.toContain(
				'Mot confidentiel'
			);
			await expect(d.proposeDelegation(people.delegate, input, now)).rejects.toMatchObject({
				status: 403
			});
			expect(
				await db.xpTransaction.count({ where: { actorId: { in: Object.values(people) } } })
			).toBe(0);
		});
		it('ne donne aucun droit avant les deux accords et refuse la fin non autorisée', async () => {
			const id = await propose();
			expect((await d.delegationForMe(id, people.delegate))?.effective).toBe(false);
			expect((await d.delegationForMe(id, people.delegate))?.departmentCodes).toEqual([]);
			await d.answerDelegation(id, people.delegate, true, now);
			await expect(endRepresentation(parentId, people.delegate, now)).rejects.toMatchObject({
				status: 403
			});
			await d.approveDelegation(id, people.artist, true, now);
			expect((await d.delegationForMe(id, people.delegate))?.effective).toBe(true);
			expect((await d.delegationForMe(id, people.delegate))?.canEnd).toBe(false);
			await expect(d.endDelegatedRepresentation(id, people.delegate, now)).rejects.toMatchObject({
				status: 403
			});
			await expect(endRepresentation(parentId, people.delegate, now)).rejects.toMatchObject({
				status: 403
			});
		});
		it('projette un historique privé, sans conditions ni notification supplémentaire', async () => {
			const id = await propose();
			const notifications = () => db.notification.count({ where: { href: `/delegations/${id}` } });
			const before = await notifications();
			const initial = await d.delegationForMe(id, people.delegate);
			expect(initial?.activity.map((e) => [e.action, e.author])).toEqual([
				['Affectation proposée', 'agent']
			]);
			await approveBoth(id);
			await d.revokeDelegation(id, people.artist, now);
			for (const key of ['agent', 'delegate', 'artist']) {
				const detail = await d.delegationForMe(id, people[key]);
				expect(detail?.activity).toHaveLength(4);
				expect(detail?.activity.find((e) => e.id.endsWith(':accepted'))?.author).toBe('delegate');
				expect(detail?.activity.find((e) => e.id.endsWith(':approved'))?.author).toBe('artist');
				expect(detail?.activity.find((e) => e.id.endsWith(':ended'))?.author).toBe('artist');
				expect(JSON.stringify(detail?.activity)).not.toMatch(
					/Mot confidentiel|CAREER_SUPPORT|departmentCodes|personId/
				);
			}
			// L’administrateur de l’agence n’est pas partie à cette affectation.
			expect(await d.delegationForMe(id, people.admin)).toBeNull();
			expect(await d.delegationForMe(id, people.outsider)).toBeNull();
			expect(await notifications()).toBe(before);
			await db.actor.update({ where: { id: people.artist }, data: { deletedAt: now } });
			try {
				const detail = await d.delegationForMe(id, people.agent);
				expect(detail?.activity.find((e) => e.id.endsWith(':ended'))?.author).toBe(
					'Compte supprimé'
				);
			} finally {
				await db.actor.update({ where: { id: people.artist }, data: { deletedAt: null } });
			}
		});
		it('termine un accompagnement uniquement avec le droit consenti et conserve l’auteur réel', async () => {
			const id = await propose(true);
			await approveBoth(id);
			await d.endDelegatedRepresentation(id, people.delegate, now);
			expect(await parent()).toMatchObject({ status: 'ENDED', endedById: people.delegate });
			expect((await d.delegationForMe(id, people.delegate))?.effective).toBe(false);
			expect(await db.xpTransaction.count({ where: { actorId: people.delegate } })).toBe(0);
		});
		it('borne la durée par le mandat et retire les droits à expiration', async () => {
			await expect(
				propose(false, {
					expiresOn: new Date(now.getTime() + 60 * 86400000).toISOString().slice(0, 10)
				})
			).rejects.toThrow(/parent/);
			const expiry = new Date(now.getTime() + 2 * 86400000).toISOString().slice(0, 10);
			const id = await propose(true, { expiresOn: expiry });
			await approveBoth(id);
			const later = new Date(now.getTime() + 3 * 86400000);
			expect((await d.delegationForMe(id, people.delegate, later))?.canEnd).toBe(false);
			await expect(endRepresentation(parentId, people.delegate, later)).rejects.toMatchObject({
				status: 403
			});
			const detail = await d.delegationForMe(id, people.delegate, now);
			expect(detail?.departmentCodes).toEqual(['31']);
			expect(detail?.allowedActions).toEqual(['CAREER_SUPPORT']);
		});
		it('permet à l’artiste de refuser ou retirer, sans réutilisation des anciens accords', async () => {
			const id = await propose(true);
			await d.approveDelegation(id, people.artist, false, now);
			await expect(d.answerDelegation(id, people.delegate, true, now)).rejects.toMatchObject({
				status: 404
			});
			const second = await propose(true);
			await approveBoth(second);
			await d.revokeDelegation(second, people.artist, now);
			await expect(endRepresentation(parentId, people.delegate, now)).rejects.toMatchObject({
				status: 403
			});
			expect(await parent()).toMatchObject({ status: 'CONFIRMED' });
			expect(await db.representationDelegation.findUnique({ where: { id: second } })).toMatchObject(
				{ endedById: people.artist, endedAt: now }
			);
		});
		it('ne réactive jamais une affectation après départ puis nouvelle adhésion à l’agence', async () => {
			const id = await propose(true);
			await approveBoth(id);
			const membership = await db.membership.findFirstOrThrow({
				where: { orgId: agencyId, personId: people.delegate, status: 'ACTIVE' }
			});
			await agencies.removeAgencyMember(agencyId, people.agent, membership.id);
			await agencies.inviteAgencyMember(agencyId, people.agent, {
				handle: prefix + 'delegate',
				role: 'MEMBER'
			});
			await agencies.answerAgencyInvite(agencyId, people.delegate, true);
			expect((await d.delegationForMe(id, people.delegate))?.canEnd).toBe(false);
			await expect(endRepresentation(parentId, people.delegate, now)).rejects.toMatchObject({
				status: 403
			});
		});
		it('refuse après révocation pendant l’attente du verrou, y compris via le service métier direct', async () => {
			const id = await propose(true);
			await approveBoth(id);
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
					await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`org:${agencyId}`}))`;
					await tx.membership.updateMany({
						where: { orgId: agencyId, personId: people.delegate, status: 'ACTIVE' },
						data: { status: 'REMOVED', endedAt: now }
					});
					ready();
					await gate;
				},
				{ timeout: 20000 }
			);
			await held;
			const ending = endRepresentation(parentId, people.delegate, now).then(
				() => null,
				(e: unknown) => e
			);
			try {
				await vi.waitFor(
					async () => {
						const [lock] = await db.$queryRaw<
							{ waiting: boolean }[]
						>`SELECT EXISTS (SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted AND objid=hashtext(${`org:${agencyId}`})::oid) AS waiting`;
						expect(lock.waiting).toBe(true);
					},
					{ timeout: 5000, interval: 50 }
				);
			} finally {
				release();
				await revoke;
			}
			expect(await ending).toMatchObject({ status: 403 });
			expect((await parent()).status).toBe('CONFIRMED');
		});
		it('retire les droits si le titulaire quitte l’agence ou si un blocage apparaît', async () => {
			const id = await propose(true);
			await approveBoth(id);
			await db.block.create({
				data: { blockerActorId: people.artist, blockedActorId: people.delegate }
			});
			try {
				await expect(endRepresentation(parentId, people.delegate, now)).rejects.toMatchObject({
					status: 403
				});
			} finally {
				await db.block.deleteMany({
					where: { blockerActorId: people.artist, blockedActorId: people.delegate }
				});
			}
			const owner = await db.membership.findFirstOrThrow({
				where: { orgId: agencyId, personId: people.agent, status: 'ACTIVE' }
			});
			await agencies.removeAgencyMember(agencyId, people.agent, owner.id);
			await expect(endRepresentation(parentId, people.delegate, now)).rejects.toMatchObject({
				status: 403
			});
		});
		it('réserve l’approbation du groupe à sa gestion actuelle, pas à la gestion de l’agence', async () => {
			const band = await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: prefix + 'band',
					displayName: 'Band',
					organization: {
						create: {
							kind: 'BAND',
							memberships: {
								create: [
									{ personId: people.artist, role: 'OWNER', status: 'ACTIVE' },
									{ personId: people.outsider, role: 'MEMBER', status: 'ACTIVE' }
								]
							}
						}
					}
				}
			});
			orgs.push(band.id);
			await db.representation.update({ where: { id: parentId }, data: { artistId: band.id } });
			const id = await propose();
			await expect(d.approveDelegation(id, people.outsider, true, now)).rejects.toMatchObject({
				status: 403
			});
			await expect(d.approveDelegation(id, people.admin, true, now)).rejects.toMatchObject({
				status: 403
			});
			await d.approveDelegation(id, people.artist, true, now);
			await d.answerDelegation(id, people.delegate, true, now);
			expect((await d.delegationForMe(id, people.delegate))?.effective).toBe(true);
		});
		it('exporte les accords et termine les droits à l’anonymisation du collaborateur', async () => {
			const id = await propose(true);
			await approveBoth(id);
			const person = await db.person.findUniqueOrThrow({ where: { actorId: people.delegate } });
			expect((await exportPersonData(person.userId))?.affectations).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						actions: ['VIEW_MANDATE', 'END_MANDATE'],
						approuve_par: 'artist'
					})
				])
			);
			await db.$transaction(await personAnonymizationOps(person.userId));
			expect(await db.representationDelegation.findUnique({ where: { id } })).toMatchObject({
				endedAt: expect.any(Date)
			});
			expect((await parent()).status).toBe('CONFIRMED');
			// Rétablir seulement le fixture pour les hooks suivants ; aucun mandat n’est réactivé.
		});
	}
);
