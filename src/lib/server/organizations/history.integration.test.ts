/** DASH-05d/05e : actes réels de co-gestion, sur le schéma e2e uniquement. */
import { afterAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
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
const { answerInvite, leaveOrRemoveManager, inviteManager } = await import('./comanagement');
const studios = await import('../studios/service');
const { myStructure, myStructures, myComanagementHistory } = await import('./structures');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');
const prefix = `cohistory-${Date.now()}-`;
const people: Record<string, string> = {};
let orgId = '',
	membershipId = '',
	ownerMembership = '';
const config = (kind: 'PROMOTER' | 'VENUE') => ({
	kind,
	noun: 'cette structure',
	maxManaged: 10,
	canBeInvited: async () => true,
	notEligible: '',
	notification: 'ORG_INVITE' as const,
	inviteHref: '/organisations'
});

// Même contrat de journal pour trois circuits, en appelant leurs vrais services.
function operations(kind: 'PROMOTER' | 'VENUE' | 'STUDIO') {
	if (kind === 'STUDIO')
		return {
			answer: studios.answerStudioInvite,
			leave: studios.leaveOrRemoveStudioManager,
			invite: studios.inviteStudioManager
		};
	const c = config(kind);
	return {
		answer: (...args: Parameters<typeof studios.answerStudioInvite>) => answerInvite(c, ...args),
		leave: (...args: Parameters<typeof studios.leaveOrRemoveStudioManager>) =>
			leaveOrRemoveManager(c, ...args),
		invite: (...args: Parameters<typeof studios.inviteStudioManager>) => inviteManager(c, ...args)
	};
}

describe.skipIf(!enabled)('historique personnel de co-gestion', { timeout: 60000 }, () => {
	beforeEach(async () => {
		for (const name of ['owner', 'invitee', 'outsider']) {
			const user = await db.user.create({
				data: { email: `${prefix}${name}@example.test`, referralCode: prefix + name }
			});
			people[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: prefix + name,
						displayName: name,
						person: {
							create: {
								userId: user.id,
								birthDate: new Date('1990-01-01'),
								termsAcceptedAt: new Date(),
								tracks: { create: { track: 'SOUND_ENGINEER' } }
							}
						}
					}
				})
			).id;
		}
	});
	beforeEach(async () => {
		orgId = (
			await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: prefix + Math.random().toString(36).slice(2),
					displayName: 'Structure privée',
					organization: { create: { kind: 'PROMOTER' } }
				}
			})
		).id;
		ownerMembership = (
			await db.membership.create({
				data: {
					orgId,
					personId: people.owner,
					role: 'OWNER',
					status: 'ACTIVE',
					startedAt: new Date('2026-01-01')
				}
			})
		).id;
		membershipId = (
			await db.membership.create({
				data: {
					orgId,
					personId: people.invitee,
					role: 'ADMIN',
					status: 'INVITED',
					invitedById: people.owner
				}
			})
		).id;
	});
	afterEach(async () => {
		await db.actor.delete({ where: { id: orgId } });
		await db.actor.deleteMany({ where: { id: { in: Object.values(people) } } });
		await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
	});
	afterAll(async () => {
		await db.$disconnect();
	});
	const decisions = () =>
		db.membershipDecision.findMany({ where: { membershipId }, orderBy: { occurredAt: 'asc' } });
	for (const kind of ['PROMOTER', 'VENUE', 'STUDIO'] as const) {
		const { answer, leave, invite } = operations(kind);
		async function setKind() {
			await db.organization.update({ where: { actorId: orgId }, data: { kind } });
		}
		it(`${kind} : accepte une fois, puis conserve le départ sans accès aux outils`, async () => {
			await setKind();
			const notifications = await db.notification.count({
				where: { recipientActorId: people.invitee }
			});
			const outcomes = await Promise.allSettled([
				answer(membershipId, people.invitee, true),
				answer(membershipId, people.invitee, true)
			]);
			expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			const row = await db.membership.findUniqueOrThrow({ where: { id: membershipId } });
			expect(await decisions()).toEqual([
				expect.objectContaining({
					kind: 'ACCEPTED',
					authorId: people.invitee,
					occurredAt: row.startedAt
				})
			]);
			expect((await myStructure(orgId, people.invitee))?.activity.map((e) => e.action)).toEqual([
				'Invitation à la structure',
				'Invitation acceptée'
			]);
			await leave(orgId, people.invitee, membershipId);
			await expect(leave(orgId, people.invitee, membershipId)).rejects.toMatchObject({
				status: 404
			});
			expect(await myStructure(orgId, people.invitee)).toBeNull();
			expect(await myStructures(people.invitee)).toEqual([]);
			const history = await myComanagementHistory(people.invitee);
			expect(history[0]?.activity.map((e) => e.action)).toEqual([
				'Invitation à la structure',
				'Invitation acceptée',
				'Participation quittée'
			]);
			expect(await myComanagementHistory(people.outsider)).toEqual([]);
			expect((await myComanagementHistory(people.owner)).some((p) => p.id === membershipId)).toBe(
				false
			);
			expect(JSON.stringify(history)).not.toMatch(/authorId|personId|handle|permissions|href/);
			expect(await db.notification.count({ where: { recipientActorId: people.invitee } })).toBe(
				notifications
			);
		});
		it.each(['DECLINED', 'WITHDRAWN'] as const)(
			`${kind} : distingue %s et garde le premier auteur/date`,
			async (decision) => {
				await setKind();
				const act = () =>
					decision === 'DECLINED'
						? answer(membershipId, people.invitee, false)
						: leave(orgId, people.owner, membershipId);
				const outcomes = await Promise.allSettled([act(), act()]);
				expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
				const [first] = await decisions();
				await expect(act()).rejects.toMatchObject({ status: 404 });
				expect(await decisions()).toEqual([first]);
				const row = await db.membership.findUniqueOrThrow({ where: { id: membershipId } });
				expect(first).toMatchObject({
					kind: decision,
					authorId: decision === 'DECLINED' ? people.invitee : people.owner,
					occurredAt: row.endedAt
				});
				expect((await myComanagementHistory(people.invitee))[0].activity).toHaveLength(2);
				expect(await myStructure(orgId, people.invitee)).toBeNull();
				await invite(orgId, people.owner, prefix + 'invitee');
				const fresh = await db.membership.findFirstOrThrow({
					where: { orgId, personId: people.invitee, status: 'INVITED' }
				});
				expect(fresh.id).not.toBe(membershipId);
				await leave(orgId, people.invitee, fresh.id);
				expect(await db.membershipDecision.findMany({ where: { membershipId: fresh.id } })).toEqual(
					[expect.objectContaining({ kind: 'DECLINED', authorId: people.invitee })]
				);
				expect(await decisions()).toEqual([first]);
			}
		);
		it(`${kind} : arbitre refus et annulation concurrents`, async () => {
			await setKind();
			const results = await Promise.allSettled([
				answer(membershipId, people.invitee, false),
				leave(orgId, people.owner, membershipId)
			]);
			expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			const rows = await decisions();
			expect(rows).toHaveLength(1);
			expect(rows[0].authorId).toBe(rows[0].kind === 'DECLINED' ? people.invitee : people.owner);
		});
		it(`${kind} : retrait et transmission portent la personne qui agit`, async () => {
			await setKind();
			await answer(membershipId, people.invitee, true);
			await leave(orgId, people.owner, ownerMembership);
			expect((await db.membership.findUniqueOrThrow({ where: { id: membershipId } })).role).toBe(
				'OWNER'
			);
			expect(await decisions()).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ kind: 'RESPONSIBILITY_RECEIVED', authorId: people.owner })
				])
			);
			expect((await myComanagementHistory(people.owner))[0].activity.at(-1)?.action).toBe(
				'Participation quittée'
			);
			await expect(leave(orgId, people.invitee, membershipId)).rejects.toThrow(/seul·e/);
		});
	}
	it('retire un membre avec auteur réel, sans créer d’accès pour une ancienne gestion', async () => {
		const c = config('PROMOTER');
		await answerInvite(c, membershipId, people.invitee, true);
		await leaveOrRemoveManager(c, orgId, people.owner, membershipId);
		expect((await decisions()).at(-1)).toMatchObject({ kind: 'REMOVED', authorId: people.owner });
		expect(await myStructure(orgId, people.invitee)).toBeNull();
		expect((await myComanagementHistory(people.invitee))[0].activity.at(-1)?.action).toBe(
			'Participation retirée par la gestion'
		);
	});
	it('refuse tiers, autre type et structure dissoute sans aucune trace', async () => {
		await expect(
			answerInvite(config('PROMOTER'), membershipId, people.outsider, true)
		).rejects.toMatchObject({ status: 404 });
		await expect(
			leaveOrRemoveManager(config('PROMOTER'), orgId, people.outsider, membershipId)
		).rejects.toMatchObject({ status: 403 });
		await expect(
			leaveOrRemoveManager(config('VENUE'), orgId, people.invitee, membershipId)
		).rejects.toMatchObject({ status: 404 });
		await db.organization.update({ where: { actorId: orgId }, data: { dissolvedAt: new Date() } });
		await expect(
			leaveOrRemoveManager(config('PROMOTER'), orgId, people.invitee, membershipId)
		).rejects.toMatchObject({ status: 404 });
		expect(await decisions()).toEqual([]);
		expect(await myComanagementHistory(people.invitee)).toEqual([]);
		await db.organization.update({ where: { actorId: orgId }, data: { dissolvedAt: null } });
		await db.actor.update({ where: { id: orgId }, data: { deletedAt: new Date() } });
		expect(await myComanagementHistory(people.invitee)).toEqual([]);
	});
	it('rollback : départ, responsabilité et traces sont annulés ensemble', async () => {
		const c = config('PROMOTER');
		await answerInvite(c, membershipId, people.invitee, true);
		const transaction = db.$transaction.bind(db);
		const spy = vi.spyOn(db, '$transaction');
		spy.mockImplementationOnce((async (
			callback: (tx: Prisma.TransactionClient) => Promise<unknown>
		) =>
			transaction(async (tx) => {
				await callback(tx);
				throw new Error('rollback simulé');
			})) as unknown as typeof db.$transaction);
		try {
			await expect(leaveOrRemoveManager(c, orgId, people.owner, ownerMembership)).rejects.toThrow(
				'rollback simulé'
			);
		} finally {
			spy.mockRestore();
		}
		expect((await db.membership.findUniqueOrThrow({ where: { id: ownerMembership } })).status).toBe(
			'ACTIVE'
		);
		expect((await db.membership.findUniqueOrThrow({ where: { id: membershipId } })).role).toBe(
			'ADMIN'
		);
		expect((await decisions()).map((d) => d.kind)).toEqual(['ACCEPTED']);
		expect(await db.membershipDecision.count({ where: { membershipId: ownerMembership } })).toBe(0);
	});

	it('studio : refuse tiers, simple membre, type incorrect et studio fermé, sans trace', async () => {
		await db.organization.update({ where: { actorId: orgId }, data: { kind: 'STUDIO' } });
		await expect(
			studios.answerStudioInvite(membershipId, people.outsider, true)
		).rejects.toMatchObject({ status: 404 });
		await expect(
			studios.leaveOrRemoveStudioManager(orgId, people.outsider, membershipId)
		).rejects.toMatchObject({ status: 403 });
		const member = await db.membership.create({
			data: { orgId, personId: people.outsider, role: 'MEMBER', status: 'ACTIVE' }
		});
		await expect(
			studios.leaveOrRemoveStudioManager(orgId, people.outsider, membershipId)
		).rejects.toMatchObject({ status: 403 });
		await db.membership.delete({ where: { id: member.id } });
		await db.organization.update({ where: { actorId: orgId }, data: { kind: 'AGENCY' } });
		await expect(
			studios.leaveOrRemoveStudioManager(orgId, people.invitee, membershipId)
		).rejects.toMatchObject({ status: 404 });
		expect(await myComanagementHistory(people.invitee)).toEqual([]);
		await db.organization.update({
			where: { actorId: orgId },
			data: { kind: 'STUDIO', dissolvedAt: new Date() }
		});
		await expect(
			studios.leaveOrRemoveStudioManager(orgId, people.invitee, membershipId)
		).rejects.toMatchObject({ status: 404 });
		expect(await decisions()).toEqual([]);
		expect(await myComanagementHistory(people.invitee)).toEqual([]);
	});
	it('studio : annule ensemble succession, départ et actes si la transaction échoue', async () => {
		await db.organization.update({ where: { actorId: orgId }, data: { kind: 'STUDIO' } });
		await studios.answerStudioInvite(membershipId, people.invitee, true);
		const transaction = db.$transaction.bind(db);
		const spy = vi.spyOn(db, '$transaction');
		spy.mockImplementationOnce((async (
			callback: (tx: Prisma.TransactionClient) => Promise<unknown>
		) =>
			transaction(async (tx) => {
				await callback(tx);
				throw new Error('rollback studio');
			})) as unknown as typeof db.$transaction);
		try {
			await expect(
				studios.leaveOrRemoveStudioManager(orgId, people.owner, ownerMembership)
			).rejects.toThrow('rollback studio');
		} finally {
			spy.mockRestore();
		}
		expect((await db.membership.findUniqueOrThrow({ where: { id: ownerMembership } })).status).toBe(
			'ACTIVE'
		);
		expect((await db.membership.findUniqueOrThrow({ where: { id: membershipId } })).role).toBe(
			'ADMIN'
		);
		expect((await decisions()).map((d) => d.kind)).toEqual(['ACCEPTED']);
		expect(await db.membershipDecision.count({ where: { membershipId: ownerMembership } })).toBe(0);
	});
	it('studio : exporte puis anonymise les auteurs de retrait sans ouvrir un journal tiers', async () => {
		await db.organization.update({ where: { actorId: orgId }, data: { kind: 'STUDIO' } });
		await studios.answerStudioInvite(membershipId, people.invitee, true);
		await studios.leaveOrRemoveStudioManager(orgId, people.owner, membershipId);
		const user = await db.person.findUniqueOrThrow({ where: { actorId: people.owner } });
		expect((await exportPersonData(user.userId))?.actes_de_participation).toContainEqual(
			expect.objectContaining({
				role: 'auteur de décision',
				acte: 'Participation retirée par la gestion',
				auteur: 'owner'
			})
		);
		const participant = await db.person.findUniqueOrThrow({ where: { actorId: people.invitee } });
		expect((await exportPersonData(participant.userId))?.actes_de_participation).toContainEqual(
			expect.objectContaining({
				role: 'participation personnelle',
				acte: 'Participation retirée par la gestion',
				auteur: 'owner'
			})
		);
		expect((await myComanagementHistory(people.owner)).some((p) => p.id === membershipId)).toBe(
			false
		);
		await db.membership.create({
			data: { orgId, personId: people.outsider, role: 'ADMIN', status: 'ACTIVE' }
		});
		await db.$transaction(await personAnonymizationOps(user.userId));
		expect((await decisions()).at(-1)?.authorId).toBeNull();
		expect((await myComanagementHistory(people.invitee))[0].activity.at(-1)?.author).toBe(
			'Compte supprimé'
		);
		await db.actor.update({ where: { id: orgId }, data: { deletedAt: new Date() } });
		expect(await myComanagementHistory(people.invitee)).toEqual([]);
	});
	it('exporte ses actes pour autrui et anonymise leur auteur sans auteur de remplacement', async () => {
		await leaveOrRemoveManager(config('PROMOTER'), orgId, people.owner, membershipId);
		const owner = await db.person.findUniqueOrThrow({ where: { actorId: people.owner } });
		const exported = await exportPersonData(owner.userId);
		expect(exported?.actes_de_participation).toContainEqual(
			expect.objectContaining({
				role: 'auteur de décision',
				acte: 'Invitation annulée par la gestion',
				auteur: 'owner'
			})
		);
		// Un autre membre actif permet la transmission RGPD sans dissoudre la structure.
		await db.membership.create({
			data: { orgId, personId: people.outsider, role: 'ADMIN', status: 'ACTIVE' }
		});
		await db.$transaction(await personAnonymizationOps(owner.userId));
		expect((await decisions())[0].authorId).toBeNull();
		expect((await myComanagementHistory(people.invitee))[0].activity.at(-1)?.author).toBe(
			'Compte supprimé'
		);
	});
});
