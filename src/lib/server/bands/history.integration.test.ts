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
