/** DASH-05g : véritables circuits d’admission et de sortie, schéma e2e uniquement. */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
const bands = await import('./service');
const { myStructure, myComanagementHistory } = await import('../organizations/structures');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');
const prefix = `band-history-${Date.now()}-`;
const people: Record<string, string> = {};
let bandId = '';
const at = (day: number) => new Date(`2026-11-${String(day).padStart(2, '0')}T12:00:00Z`);
const period = (who = 'member') =>
	db.membership.findFirstOrThrow({
		where: { orgId: bandId, personId: people[who] },
		orderBy: { createdAt: 'desc' }
	});
const decisions = (membershipId: string) =>
	db.membershipDecision.findMany({
		where: { membershipId },
		orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }]
	});
const invite = () =>
	bands.inviteToBand(bandId, people.owner, {
		handle: prefix + 'member',
		title: 'Texte privé à ne pas recopier'
	});
const request = () => bands.requestToJoin(bandId, people.member, at(1));

// Toute erreur de trace doit annuler aussi l’état, la progression et les notifications.
async function failDecisionWrite(action: () => Promise<unknown>, many = false) {
	const transaction = db.$transaction.bind(db);
	const spy = vi.spyOn(db, '$transaction');
	spy.mockImplementationOnce((async (
		callback: (tx: Prisma.TransactionClient) => Promise<unknown>
	) =>
		transaction(async (tx) => {
			const write = vi
				.spyOn(tx.membershipDecision, many ? 'createMany' : 'create')
				.mockRejectedValueOnce(new Error('trace refusée'));
			try {
				return await callback(tx);
			} finally {
				write.mockRestore();
			}
		})) as unknown as typeof db.$transaction);
	try {
		await expect(action()).rejects.toThrow('trace refusée');
	} finally {
		spy.mockRestore();
	}
}

describe.skipIf(!enabled)(
	'historique personnel des admissions aux groupes',
	{ timeout: 60000 },
	() => {
		beforeEach(async () => {
			for (const name of ['owner', 'member', 'outsider']) {
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
									onboardedAt: new Date()
								}
							}
						}
					})
				).id;
			}
			bandId = (await bands.createBand(people.owner, { name: prefix + 'groupe', title: null })).id;
		});
		afterEach(async () => {
			const ids = [bandId, ...Object.values(people)];
			await db.actor.deleteMany({ where: { id: { in: ids } } });
			await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
			await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: ids } } });
		});
		afterAll(async () => {
			await db.$disconnect();
		});

		// DASH-05h : anciennes périodes actives explicites, aucun acte initial déduit.
		async function active() {
			return db.membership.create({
				data: {
					orgId: bandId,
					personId: people.member,
					role: 'MEMBER',
					status: 'ACTIVE',
					startedAt: at(1)
				}
			});
		}
		it('rôles : chaque transition répétée est conservée ; les appels identiques sont sans effet', async () => {
			const row = await active();
			expect(await myComanagementHistory(people.member)).toEqual([]);
			for (const [role, day] of [
				['MEMBER', 2],
				['ADMIN', 3],
				['ADMIN', 4],
				['MEMBER', 5],
				['ADMIN', 6]
			] as const) {
				await bands.setRole(row.id, people.owner, role, at(day));
			}
			expect(
				(await decisions(row.id)).map(({ kind, authorId, occurredAt }) => ({
					kind,
					authorId,
					occurredAt
				}))
			).toEqual(
				[
					['BAND_ADMIN_GRANTED', 3],
					['BAND_MEMBER_SET', 5],
					['BAND_ADMIN_GRANTED', 6]
				].map(([kind, day]) => ({ kind, authorId: people.owner, occurredAt: at(Number(day)) }))
			);
			expect(await myComanagementHistory(people.owner)).toEqual([]);
			expect(await myComanagementHistory(people.outsider)).toEqual([]);
			expect((await myStructure(bandId, people.member))?.activity).toHaveLength(3);
			expect(
				await db.notification.count({ where: { recipientActorId: { in: Object.values(people) } } })
			).toBe(0);
			expect(await db.domainEvent.count({ where: { actorIds: { has: bandId } } })).toBe(0);
		});
		it('rôles identiques concurrents : deux succès, un seul changement réel', async () => {
			const row = await active();
			await Promise.all([
				bands.setRole(row.id, people.owner, 'ADMIN', at(2)),
				bands.setRole(row.id, people.owner, 'ADMIN', at(3))
			]);
			expect(await decisions(row.id)).toHaveLength(1);
			expect((await period()).role).toBe('ADMIN');
		});
		it('rôles opposés concurrents : chaque transition effective est conservée sous verrou', async () => {
			const row = await active();
			await Promise.all([
				bands.setRole(row.id, people.owner, 'ADMIN'),
				bands.setRole(row.id, people.owner, 'MEMBER')
			]);
			const list = await decisions(row.id);
			expect(list.filter((d) => d.kind === 'BAND_ADMIN_GRANTED')).toHaveLength(1);
			const demoted = list.some((d) => d.kind === 'BAND_MEMBER_SET');
			expect(list).toHaveLength(demoted ? 2 : 1);
			expect((await period()).role).toBe(demoted ? 'MEMBER' : 'ADMIN');
		});
		it('transmissions aller-retour répétées : deux actes par transmission, même date et auteur réel', async () => {
			const row = await active();
			const owner = await period('owner');
			for (const day of [2, 4]) {
				await bands.transferOwnership(row.id, people.owner, at(day));
				await expect(bands.transferOwnership(row.id, people.owner)).rejects.toMatchObject({
					status: 403
				});
				await bands.transferOwnership(owner.id, people.member, at(day + 1));
			}
			for (const [id, kinds] of [
				[row.id, ['BAND_OWNERSHIP_RECEIVED', 'BAND_OWNERSHIP_GIVEN']],
				[owner.id, ['BAND_OWNERSHIP_GIVEN', 'BAND_OWNERSHIP_RECEIVED']]
			] as const) {
				expect((await decisions(id)).map((d) => [d.kind, d.authorId, d.occurredAt])).toEqual(
					[2, 3, 4, 5].map((day, i) => [
						kinds[i % 2],
						i % 2 === 0 ? people.owner : people.member,
						at(day)
					])
				);
			}
			expect((await period('owner')).role).toBe('OWNER');
			expect((await period()).role).toBe('ADMIN');
		});
		it('transmission identique concurrente : une réussite, un refus, deux actes', async () => {
			const row = await active();
			const results = await Promise.allSettled([
				bands.transferOwnership(row.id, people.owner),
				bands.transferOwnership(row.id, people.owner)
			]);
			expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			expect(await decisions(row.id)).toHaveLength(1);
			expect(await decisions((await period('owner')).id)).toHaveLength(1);
		});

		it('transmissions concurrentes vers deux cibles : un seul nouveau responsable', async () => {
			const row = await active();
			const other = await db.membership.create({
				data: { orgId: bandId, personId: people.outsider, status: 'ACTIVE' }
			});
			const results = await Promise.allSettled([
				bands.transferOwnership(row.id, people.owner),
				bands.transferOwnership(other.id, people.owner)
			]);
			expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			expect(
				await db.membership.count({ where: { orgId: bandId, role: 'OWNER', status: 'ACTIVE' } })
			).toBe(1);
			expect(await db.membershipDecision.count({ where: { membership: { orgId: bandId } } })).toBe(
				2
			);
		});
		it('une transmission concurrente au changement de rôle respecte l’autorité relue', async () => {
			const row = await active();
			const results = await Promise.allSettled([
				bands.transferOwnership(row.id, people.owner),
				bands.setRole(row.id, people.owner, 'ADMIN')
			]);
			expect(results[0].status).toBe('fulfilled');
			expect((await period()).role).toBe('OWNER');
			expect(await db.membershipDecision.count({ where: { membership: { orgId: bandId } } })).toBe(
				results[1].status === 'fulfilled' ? 3 : 2
			);
		});
		it('refuse les tiers, la co-gestion, une cible responsable et un rôle OWNER forcé', async () => {
			const row = await active();
			await bands.setRole(row.id, people.owner, 'ADMIN');
			const owner = await period('owner');
			for (const who of [people.member, people.outsider]) {
				await expect(bands.setRole(owner.id, who, 'MEMBER')).rejects.toMatchObject({ status: 403 });
				await expect(bands.transferOwnership(owner.id, who)).rejects.toMatchObject({ status: 403 });
			}
			await expect(bands.setRole(owner.id, people.owner, 'MEMBER')).rejects.toThrow();
			await expect(bands.transferOwnership(owner.id, people.owner)).rejects.toThrow();
			await expect(bands.setRole(row.id, people.owner, 'OWNER' as 'ADMIN')).rejects.toThrow();
			expect(await decisions(row.id)).toHaveLength(1);
			expect(await decisions(owner.id)).toEqual([]);
		});
		it.each(['INVITED', 'REQUESTED', 'LEFT', 'REMOVED'] as const)(
			'refuse une cible %s sans acte',
			async (status) => {
				const row = await db.membership.create({
					data: { orgId: bandId, personId: people.member, status }
				});
				await expect(bands.setRole(row.id, people.owner, 'ADMIN')).rejects.toThrow();
				await expect(bands.transferOwnership(row.id, people.owner)).rejects.toThrow();
				expect(await decisions(row.id)).toEqual([]);
			}
		);
		it.each(['deleted', 'dissolved', 'wrong-kind'] as const)(
			'refuse un groupe %s',
			async (state) => {
				const row = await active();
				if (state === 'deleted')
					await db.actor.update({ where: { id: bandId }, data: { deletedAt: at(2) } });
				else
					await db.organization.update({
						where: { actorId: bandId },
						data: state === 'dissolved' ? { dissolvedAt: at(2) } : { kind: 'PROMOTER' }
					});
				await expect(bands.setRole(row.id, people.owner, 'ADMIN')).rejects.toMatchObject({
					status: 404
				});
				await expect(bands.transferOwnership(row.id, people.owner)).rejects.toMatchObject({
					status: 404
				});
				expect(await decisions(row.id)).toEqual([]);
			}
		);
		it('rollback : les rôles et les deux traces de transmission sont atomiques', async () => {
			const row = await active();
			await failDecisionWrite(() => bands.setRole(row.id, people.owner, 'ADMIN'));
			expect((await period()).role).toBe('MEMBER');
			await failDecisionWrite(() => bands.transferOwnership(row.id, people.owner), true);
			expect((await period()).role).toBe('MEMBER');
			expect((await period('owner')).role).toBe('OWNER');
			expect(await db.membershipDecision.count({ where: { membership: { orgId: bandId } } })).toBe(
				0
			);
		});
		it('maintient en base l’unicité des douze anciens types, sans limiter les nouveaux', async () => {
			const row = await active();
			for (const kind of [
				'ACCEPTED',
				'DECLINED',
				'WITHDRAWN',
				'LEFT',
				'REMOVED',
				'RESPONSIBILITY_RECEIVED',
				'JOIN_REQUESTED',
				'REQUEST_ACCEPTED',
				'REQUEST_DECLINED',
				'REQUEST_WITHDRAWN',
				'REQUEST_CLOSED',
				'RECRUITMENT_ACCEPTED'
			] as const) {
				await db.membershipDecision.create({ data: { membershipId: row.id, kind } });
				await expect(
					db.membershipDecision.create({ data: { membershipId: row.id, kind } })
				).rejects.toMatchObject({ code: 'P2002' });
			}
			for (const kind of [
				'BAND_ADMIN_GRANTED',
				'BAND_MEMBER_SET',
				'BAND_OWNERSHIP_GIVEN',
				'BAND_OWNERSHIP_RECEIVED'
			] as const) {
				await db.membershipDecision.createMany({
					data: [1, 2].map(() => ({ membershipId: row.id, kind, occurredAt: at(2) }))
				});
			}
			expect(await decisions(row.id)).toHaveLength(20);
		});
		it('exporte les rôles et transmissions personnels/pour autrui et anonymise sans acte de succession technique', async () => {
			const row = await active();
			await bands.setRole(row.id, people.owner, 'ADMIN', at(2));
			await bands.transferOwnership(row.id, people.owner, at(3));
			await bands.transferOwnership((await period('owner')).id, people.member, at(4));
			const owner = await db.person.findUniqueOrThrow({ where: { actorId: people.owner } });
			const exported = (await exportPersonData(owner.userId))!.actes_de_participation;
			expect(exported).toHaveLength(4);
			expect(exported).toContainEqual(
				expect.objectContaining({
					role: 'auteur de décision',
					acte: 'Co-gestion du groupe accordée',
					auteur: 'owner',
					date: at(2)
				})
			);
			expect(JSON.stringify(exported)).not.toMatch(/personId|membershipId/);
			expect(
				exported.every(
					(d) => Object.keys(d).sort().join(',') === 'acte,auteur,date,organisation,role'
				)
			).toBe(true);
			expect(JSON.stringify(exported.filter((d) => d.role === 'auteur de décision'))).not.toContain(
				'member'
			);
			const count = await db.membershipDecision.count({ where: { membership: { orgId: bandId } } });
			await db.$transaction(await personAnonymizationOps(owner.userId));
			expect((await period()).role).toBe('OWNER');
			expect(await db.membershipDecision.count({ where: { membership: { orgId: bandId } } })).toBe(
				count
			);
			expect((await decisions(row.id)).slice(0, 2).every((d) => d.authorId === null)).toBe(true);
			expect(
				(await myComanagementHistory(people.member))[0].activity.filter(
					(e) => e.author === 'Compte supprimé'
				)
			).toHaveLength(2);
			await db.membership.delete({ where: { id: row.id } });
			expect(await decisions(row.id)).toEqual([]);
		});

		it('accepte une seule fois, conserve le départ et ne redonne aucun outil', async () => {
			await invite();
			const row = await period();
			const outcomes = await Promise.allSettled([
				bands.answerInvite(row.id, people.member, true),
				bands.answerInvite(row.id, people.member, true)
			]);
			expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			expect(await decisions(row.id)).toEqual([
				expect.objectContaining({ kind: 'ACCEPTED', authorId: people.member })
			]);
			await bands.leaveBand(bandId, people.member);
			await expect(bands.leaveBand(bandId, people.member)).rejects.toMatchObject({ status: 404 });
			expect(await myStructure(bandId, people.member)).toBeNull();
			const notifications = await db.notification.count({
				where: { recipientActorId: { in: Object.values(people) } }
			});
			const events = await db.domainEvent.count({ where: { actorIds: { has: bandId } } });
			const history = await myComanagementHistory(people.member);
			expect(history[0].activity.map((e) => e.action)).toEqual([
				'Invitation à la structure',
				'Invitation acceptée',
				'Participation quittée'
			]);
			expect(await myComanagementHistory(people.owner)).toEqual([]);
			expect(await myComanagementHistory(people.outsider)).toEqual([]);
			expect(JSON.stringify(history)).not.toMatch(
				/authorId|personId|handle|permissions|href|Texte privé/
			);
			expect(
				await db.notification.count({ where: { recipientActorId: { in: Object.values(people) } } })
			).toBe(notifications);
			expect(await db.domainEvent.count({ where: { actorIds: { has: bandId } } })).toBe(events);
			expect(events).toBeGreaterThan(0);
		});
		it.each(['DECLINED', 'WITHDRAWN'] as const)(
			'invitation : distingue %s, conserve la décision et ouvre une nouvelle période',
			async (kind) => {
				await invite();
				const row = await period();
				const act = () =>
					kind === 'DECLINED'
						? bands.answerInvite(row.id, people.member, false)
						: bands.withdrawPending(row.id, people.owner);
				const results = await Promise.allSettled([act(), act()]);
				expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
				const first = await decisions(row.id);
				expect(first).toEqual([
					expect.objectContaining({
						kind,
						authorId: kind === 'DECLINED' ? people.member : people.owner
					})
				]);
				await expect(act()).rejects.toThrow();
				expect(await decisions(row.id)).toEqual(first);
				await invite();
				expect((await period()).id).not.toBe(row.id);
				expect(await decisions(row.id)).toEqual(first);
			}
		);
		it('arbitre refus personnel et annulation simultanés', async () => {
			await invite();
			const row = await period();
			const results = await Promise.allSettled([
				bands.answerInvite(row.id, people.member, false),
				bands.withdrawPending(row.id, people.owner)
			]);
			expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			const [d] = await decisions(row.id);
			expect(await decisions(row.id)).toHaveLength(1);
			expect(d.authorId).toBe(d.kind === 'DECLINED' ? people.member : people.owner);
		});
		it.each([true, false])(
			'demande : conserve l’auteur de la demande et de la réponse %s',
			async (accept) => {
				await request();
				const row = await period();
				await bands.answerRequest(row.id, people.owner, accept, at(2));
				expect(await decisions(row.id)).toEqual([
					expect.objectContaining({
						kind: 'JOIN_REQUESTED',
						authorId: people.member,
						occurredAt: at(1)
					}),
					expect.objectContaining({
						kind: accept ? 'REQUEST_ACCEPTED' : 'REQUEST_DECLINED',
						authorId: people.owner,
						occurredAt: at(2)
					})
				]);
				const activity = (await myComanagementHistory(people.member))[0].activity;
				expect(activity).toHaveLength(2);
				expect(activity.map((e) => e.author)).toEqual(['member', 'owner']);
				expect(activity.some((e) => e.action.includes('Invitation'))).toBe(false);
				await expect(bands.answerRequest(row.id, people.owner, accept)).rejects.toThrow();
				expect(await decisions(row.id)).toHaveLength(2);
			}
		);
		it('seul l’auteur retire sa demande ; une réponse concurrente ne peut la rejouer', async () => {
			await request();
			const row = await period();
			await expect(bands.withdrawPending(row.id, people.owner)).rejects.toMatchObject({
				status: 403
			});
			const results = await Promise.allSettled([
				bands.withdrawPending(row.id, people.member),
				bands.answerRequest(row.id, people.owner, false)
			]);
			expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			const list = await decisions(row.id);
			expect(list).toHaveLength(2);
			const d = list.find((d) => d.kind !== 'JOIN_REQUESTED')!;
			expect(d.authorId).toBe(d.kind === 'REQUEST_WITHDRAWN' ? people.member : people.owner);
		});
		it('conserve un retrait personnel de demande et distingue la demande suivante', async () => {
			await request();
			const row = await period();
			await bands.withdrawPending(row.id, people.member, at(2));
			const original = await decisions(row.id);
			expect(original.map((d) => d.kind)).toEqual(['JOIN_REQUESTED', 'REQUEST_WITHDRAWN']);
			expect(original[1]).toMatchObject({ authorId: people.member, occurredAt: at(2) });
			await expect(bands.withdrawPending(row.id, people.member)).rejects.toThrow();
			await bands.requestToJoin(bandId, people.member, at(3));
			const next = await db.membership.findFirstOrThrow({
				where: { orgId: bandId, personId: people.member, status: 'REQUESTED' }
			});
			expect(next.id).not.toBe(row.id);
			expect(await decisions(row.id)).toEqual(original);
			expect((await decisions(next.id)).map((d) => d.kind)).toEqual(['JOIN_REQUESTED']);
		});
		it('ne reconstruit pas l’envoi d’une ancienne demande lorsqu’elle reçoit une nouvelle réponse', async () => {
			const row = await db.membership.create({
				data: { orgId: bandId, personId: people.member, status: 'REQUESTED' }
			});
			expect(await myComanagementHistory(people.member)).toEqual([]);
			await bands.answerRequest(row.id, people.owner, false);
			expect((await decisions(row.id)).map((d) => d.kind)).toEqual(['REQUEST_DECLINED']);
			expect((await myComanagementHistory(people.member))[0].activity).toHaveLength(1);
		});
		it('un retrait porte le gestionnaire réel et ne donne pas accès aux périodes des collègues', async () => {
			await request();
			const row = await period();
			await bands.answerRequest(row.id, people.owner, true, at(2));
			await bands.removeMember(row.id, people.owner, at(3));
			expect((await decisions(row.id)).at(-1)).toMatchObject({
				kind: 'REMOVED',
				authorId: people.owner,
				occurredAt: at(3)
			});
			expect(await myStructure(bandId, people.member)).toBeNull();
			expect(await myComanagementHistory(people.owner)).toEqual([]);
			await expect(bands.removeMember(row.id, people.owner)).rejects.toThrow();
		});
		it('dissout : annule les invitations et clôt les demandes, sans fabriquer un refus personnel', async () => {
			await invite();
			const invitation = await period();
			await bands.requestToJoin(bandId, people.outsider, at(1));
			const demand = await period('outsider');
			await bands.leaveBand(bandId, people.owner, at(3));
			expect(await decisions(invitation.id)).toEqual([
				expect.objectContaining({ kind: 'WITHDRAWN', authorId: people.owner, occurredAt: at(3) })
			]);
			expect((await decisions(demand.id)).at(-1)).toMatchObject({
				kind: 'REQUEST_CLOSED',
				authorId: people.owner,
				occurredAt: at(3)
			});
			await expect(bands.withdrawPending(demand.id, people.outsider)).rejects.toMatchObject({
				status: 404
			});
			expect(await myComanagementHistory(people.outsider)).toEqual([]);
			const user = await db.person.findUniqueOrThrow({ where: { actorId: people.outsider } });
			expect((await exportPersonData(user.userId))?.actes_de_participation).toContainEqual(
				expect.objectContaining({
					acte: 'Demande close par dissolution du groupe',
					auteur: 'owner'
				})
			);
		});
		it('rollback : une trace refusée annule aussi acceptation et effets de progression', async () => {
			await invite();
			const row = await period();
			const notifications = await db.notification.count({
				where: { recipientActorId: people.owner }
			});
			await failDecisionWrite(() => bands.answerInvite(row.id, people.member, true));
			expect((await period()).status).toBe('INVITED');
			expect(await decisions(row.id)).toEqual([]);
			expect(await db.domainEvent.count({ where: { actorIds: { has: bandId } } })).toBe(0);
			expect(await db.notification.count({ where: { recipientActorId: people.owner } })).toBe(
				notifications
			);
		});
		it('rollback : dissolution, départ, invitations et demandes restent ensemble ouverts', async () => {
			await request();
			await failDecisionWrite(() => bands.leaveBand(bandId, people.owner), true);
			expect(
				(await db.organization.findUniqueOrThrow({ where: { actorId: bandId } })).dissolvedAt
			).toBeNull();
			expect((await period('owner')).status).toBe('ACTIVE');
			expect((await period()).status).toBe('REQUESTED');
			expect((await decisions((await period()).id)).map((d) => d.kind)).toEqual(['JOIN_REQUESTED']);
			expect(await decisions((await period('owner')).id)).toEqual([]);
		});
		it.each(['NONE', 'INVITED', 'REQUESTED'] as const)(
			'recrutement depuis %s : acte du gestionnaire, sans inventer un accord d’invitation',
			async (origin) => {
				if (origin === 'INVITED') await invite();
				if (origin === 'REQUESTED') await request();
				const input = { bandId, personId: people.member, managerId: people.owner, title: null };
				await db.$transaction((tx) => bands.joinFromRecruitment(tx, input, at(2)), bands.BAND_TX);
				const row = await period();
				expect(row.status).toBe('ACTIVE');
				expect((await decisions(row.id)).at(-1)).toMatchObject({
					kind: 'RECRUITMENT_ACCEPTED',
					authorId: people.owner,
					occurredAt: row.startedAt
				});
				expect(
					(await decisions(row.id)).some(
						(d) => d.kind === 'ACCEPTED' || d.kind === 'REQUEST_ACCEPTED'
					)
				).toBe(false);
				await expect(
					db.$transaction((tx) => bands.joinFromRecruitment(tx, input), bands.BAND_TX)
				).rejects.toThrow(/déjà partie/);
				expect(
					(await decisions(row.id)).filter((d) => d.kind === 'RECRUITMENT_ACCEPTED')
				).toHaveLength(1);
			}
		);
		it('refuse tiers, mauvais type et groupe supprimé ; les anciens états ne deviennent pas des actes', async () => {
			await invite();
			const row = await period();
			await expect(bands.answerInvite(row.id, people.outsider, true)).rejects.toMatchObject({
				status: 404
			});
			await expect(bands.answerRequest(row.id, people.outsider, true)).rejects.toMatchObject({
				status: 403
			});
			await db.organization.update({ where: { actorId: bandId }, data: { kind: 'SCHOOL' } });
			await expect(bands.withdrawPending(row.id, people.owner)).rejects.toMatchObject({
				status: 404
			});
			await db.organization.update({ where: { actorId: bandId }, data: { kind: 'BAND' } });
			await db.actor.update({ where: { id: bandId }, data: { deletedAt: new Date() } });
			await expect(bands.withdrawPending(row.id, people.owner)).rejects.toMatchObject({
				status: 404
			});
			expect(await myComanagementHistory(people.member)).toEqual([]);
			expect(await decisions(row.id)).toEqual([]);
		});
		it('exporte les actes pour autrui et efface leur auteur sans créer de trace lors de la succession RGPD', async () => {
			await request();
			const row = await period();
			await bands.answerRequest(row.id, people.owner, true, at(2));
			const owner = await db.person.findUniqueOrThrow({ where: { actorId: people.owner } });
			expect((await exportPersonData(owner.userId))?.actes_de_participation).toContainEqual(
				expect.objectContaining({
					role: 'auteur de décision',
					acte: 'Demande acceptée par la gestion',
					auteur: 'owner'
				})
			);
			const count = await db.membershipDecision.count({ where: { membership: { orgId: bandId } } });
			await db.$transaction(await personAnonymizationOps(owner.userId));
			expect(await db.membershipDecision.count({ where: { membership: { orgId: bandId } } })).toBe(
				count
			);
			expect((await decisions(row.id)).at(-1)?.authorId).toBeNull();
			expect((await myComanagementHistory(people.member))[0].activity.at(-1)?.author).toBe(
				'Compte supprimé'
			);
		});
	}
);
