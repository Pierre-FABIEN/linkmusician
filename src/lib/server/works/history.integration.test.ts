/** DASH-05m : mutations réelles et conservation indépendante, schéma e2e. */
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
const works = await import('./service');
const bands = await import('../bands/service');
const collabs = await import('../collaborations/service');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');
const prefix = `credit-history-${Date.now()}-`;
const ids: Record<string, string> = {};
const users: Record<string, string> = {};
const role = { kind: 'COMPOSITION' as const, instrumentSlug: null };
const mixing = { kind: 'MIXING' as const, instrumentSlug: null };
const at = (day: number) => new Date(`2026-11-${String(day).padStart(2, '0')}T12:00:00Z`);
const create = () =>
	works.createWork(
		ids.owner,
		{ title: 'Titre strictement privé', band: null, genreIds: [], roles: [role] },
		at(1)
	);
const assign = (id: string, name = 'member') =>
	works.creditPerson(id, ids.owner, { handle: prefix + name, roles: [role] }, at(2));
const acts = (workId: string) =>
	db.workCreditAct.findMany({ where: { workId }, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] });
const credit = (workId: string, personId = ids.member) =>
	db.workContributor.findUniqueOrThrow({ where: { workId_personId: { workId, personId } } });

async function failWrite(action: () => Promise<unknown>) {
	const transaction = db.$transaction.bind(db);
	const spy = vi.spyOn(db, '$transaction');
	spy.mockImplementationOnce((async (
		callback: (tx: Prisma.TransactionClient) => Promise<unknown>
	) =>
		transaction(
			async (tx) => {
				const write = vi
					.spyOn(tx.workCreditAct, 'create')
					.mockRejectedValueOnce(new Error('trace refusée'));
				try {
					return await callback(tx);
				} finally {
					write.mockRestore();
				}
			},
			{ timeout: 30000 }
		)) as unknown as typeof db.$transaction);
	try {
		await expect(action()).rejects.toThrow('trace refusée');
	} finally {
		spy.mockRestore();
	}
}

describe.skipIf(!enabled)('actes des crédits manuels', { timeout: 60000 }, () => {
	beforeAll(async () => {
		for (const name of ['owner', 'member', 'outsider', 'minor', 'erased']) {
			const user = await db.user.create({
				data: { email: `${prefix}${name}@example.test`, referralCode: prefix + name }
			});
			users[name] = user.id;
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: prefix + name,
						displayName: name,
						trustLevel: 2,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: at(1),
								onboardedAt: at(1),
								birthDate: new Date(name === 'minor' ? '2010-01-01' : '1990-01-01'),
								tracks: { create: { track: 'SOUND_ENGINEER', isPrimary: true } }
							}
						}
					}
				})
			).id;
		}
	});
	afterAll(async () => {
		const list = Object.values(ids);
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { id: { in: Object.values(users) } } });
		await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
		await db.$disconnect();
	});

	it('création consentie, attribution sans consentement, confirmation personnelle et rejeux', async () => {
		const w = await create();
		await assign(w.id);
		expect((await credit(w.id)).confirmedAt).toBeNull();
		expect((await acts(w.id)).map((a) => [a.kind, a.authorId, a.occurredAt])).toEqual([
			['CREATOR_CREDITED', ids.owner, at(1)],
			['ASSIGNED', ids.owner, at(2)]
		]);
		await expect(assign(w.id)).rejects.toThrow(/déjà/);
		await expect(works.confirmCredit(w.id, ids.owner)).rejects.toThrow(/Rien/);
		await works.confirmCredit(w.id, ids.member, at(3));
		await expect(works.confirmCredit(w.id, ids.member)).rejects.toThrow(/Rien/);
		expect((await acts(w.id)).map((a) => a.kind)).toEqual([
			'CREATOR_CREDITED',
			'ASSIGNED',
			'CONFIRMED'
		]);
		const mine = await works.creditHistoryForMe(ids.owner);
		expect(mine.some((a) => a.action === 'Crédit confirmé personnellement')).toBe(false);
	});

	it('refus, nouvelle attribution, retrait et auto-attribution ouvrent des périodes distinctes', async () => {
		const w = await create();
		await assign(w.id);
		const first = await credit(w.id);
		await works.leaveCredit(w.id, ids.member, at(3));
		expect(await db.workRole.count({ where: { workId: w.id, contributorId: null } })).toBe(1);
		await expect(works.leaveCredit(w.id, ids.member)).rejects.toThrow(/pas de crédit/);
		await assign(w.id);
		const second = await credit(w.id);
		expect(second.id).not.toBe(first.id);
		await works.confirmCredit(w.id, ids.member, at(4));
		await works.leaveCredit(w.id, ids.member, at(5));
		expect(await db.workRole.count({ where: { contributorId: second.id } })).toBe(0);
		expect((await acts(w.id)).map((a) => a.kind)).toContain('DECLINED');
		expect((await acts(w.id)).find((a) => a.kind === 'LEFT')?.periodId).toBe(second.id);
		const group = await bands.createBand(ids.owner, { name: prefix + 'band', title: null });
		const groupWork = await works.createWork(ids.owner, {
			title: 'Groupe',
			band: group.handle,
			genreIds: [],
			roles: [role]
		});
		await works.leaveCredit(groupWork.id, ids.owner);
		await works.creditPerson(groupWork.id, ids.owner, { handle: prefix + 'owner', roles: [role] });
		expect((await credit(groupWork.id, ids.owner)).confirmedAt).not.toBeNull();
		expect((await acts(groupWork.id)).map((a) => a.kind)).toContain('SELF_ASSIGNED');
		await db.actor.delete({ where: { id: group.id } });
	});

	it('la gestion ne retire que les crédits en attente et le retrait conserve son auteur', async () => {
		const w = await create();
		await assign(w.id);
		const c = await credit(w.id);
		await expect(works.withdrawCredit(w.id, ids.outsider, c.id)).rejects.toThrow(/portent/);
		await works.withdrawCredit(w.id, ids.owner, c.id, at(3));
		await expect(works.withdrawCredit(w.id, ids.owner, c.id)).rejects.toThrow(/confirmé/);
		expect((await acts(w.id)).find((a) => a.kind === 'WITHDRAWN')).toMatchObject({
			periodId: c.id,
			authorId: ids.owner,
			personId: ids.member
		});
		await assign(w.id);
		await works.confirmCredit(w.id, ids.member);
		await expect(works.withdrawCredit(w.id, ids.owner, (await credit(w.id)).id)).rejects.toThrow(
			/confirmé/
		);
	});

	it('deux attributions et deux confirmations concurrentes ne doublent ni actes ni notifications', async () => {
		const w = await create();
		const before = await db.notification.count({
			where: { recipientActorId: ids.member, type: 'WORK_CREDIT' }
		});
		const assigned = await Promise.allSettled([assign(w.id), assign(w.id)]);
		expect(assigned.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(
			await db.notification.count({ where: { recipientActorId: ids.member, type: 'WORK_CREDIT' } })
		).toBe(before + 1);
		const confirmed = await Promise.allSettled([
			works.confirmCredit(w.id, ids.member),
			works.confirmCredit(w.id, ids.member)
		]);
		expect(confirmed.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect((await acts(w.id)).filter((a) => a.kind === 'CONFIRMED')).toHaveLength(1);
	});

	it('confirmation contre retrait de gestion : une seule transition gagne', async () => {
		const w = await create();
		await assign(w.id);
		const c = await credit(w.id);
		const results = await Promise.allSettled([
			works.confirmCredit(w.id, ids.member),
			works.withdrawCredit(w.id, ids.owner, c.id)
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(
			(await acts(w.id)).filter((a) => ['WITHDRAWN', 'CONFIRMED'].includes(a.kind))
		).toHaveLength(1);
	});

	it('crédit automatique concurrent : aucune attribution manuelle inventée, attente préservée', async () => {
		const w = await create();
		await assign(w.id);
		await Promise.all([
			db.$transaction(
				(tx) =>
					works.creditFromCollaboration(tx, { workId: w.id, personId: ids.member, kind: 'MIXING' }),
				{ timeout: 30000 }
			),
			works.confirmCredit(w.id, ids.member)
		]);
		expect((await acts(w.id)).map((a) => a.kind).sort()).toEqual([
			'ASSIGNED',
			'CONFIRMED',
			'CREATOR_CREDITED'
		]);
		const pending = await create();
		await assign(pending.id);
		await db.$transaction((tx) =>
			works.creditFromCollaboration(tx, {
				workId: pending.id,
				personId: ids.member,
				kind: 'MIXING'
			})
		);
		expect((await credit(pending.id)).confirmedAt).toBeNull();
		const automatic = await create();
		await db.$transaction((tx) =>
			works.creditFromCollaboration(tx, {
				workId: automatic.id,
				personId: ids.member,
				kind: 'MIXING'
			})
		);
		await expect(works.confirmCredit(automatic.id, ids.member)).rejects.toThrow(/Rien/);
		await works.leaveCredit(automatic.id, ids.member);
		expect((await acts(automatic.id)).map((a) => a.kind)).toEqual(['CREATOR_CREDITED', 'LEFT']);
	});

	it('retrait personnel contre crédit automatique : seul le retrait humain est journalisé', async () => {
		const w = await create();
		await assign(w.id);
		await works.confirmCredit(w.id, ids.member);
		const old = await credit(w.id);
		const results = await Promise.allSettled([
			works.leaveCredit(w.id, ids.member),
			db.$transaction(
				(tx) =>
					works.creditFromCollaboration(tx, { workId: w.id, personId: ids.member, kind: 'MIXING' }),
				{ timeout: 30000 }
			)
		]);
		expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
		const stored = await acts(w.id);
		expect(stored.filter((a) => a.kind === 'LEFT')).toHaveLength(1);
		expect(stored.find((a) => a.kind === 'LEFT')?.periodId).toBe(old.id);
		expect(stored.filter((a) => a.kind === 'ASSIGNED')).toHaveLength(1);
		const current = await db.workContributor.findUnique({
			where: { workId_personId: { workId: w.id, personId: ids.member } }
		});
		if (current) expect(current.id).not.toBe(old.id);
	});

	it('finalisation réelle de collaboration contre confirmation manuelle puis suppression du morceau', async () => {
		const conversation = await db.conversation.create({
			data: {
				pairKey: [ids.owner, ids.member].sort().join(':'),
				initiatorId: ids.owner,
				participants: {
					create: [
						{ actorId: ids.owner, state: 'ACCEPTED' },
						{ actorId: ids.member, state: 'ACCEPTED' }
					]
				}
			}
		});
		try {
			for (const remove of [false, true]) {
				const w = await create();
				await assign(w.id);
				const c = await collabs.proposeCollaboration(ids.owner, conversation.id, {
					title: 'Prestation liée',
					kind: 'MIXING',
					happenedOn: remove ? '2026-11-02' : '2026-11-01',
					provider: 'other',
					work: w.id
				});
				const results = await Promise.allSettled([
					collabs.respondToCollaboration(ids.member, c.id, true),
					remove ? works.deleteWork(w.id, ids.owner) : works.confirmCredit(w.id, ids.member)
				]);
				expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
				expect((await db.collaboration.findUniqueOrThrow({ where: { id: c.id } })).status).toBe(
					'COMPLETED'
				);
				if (remove) expect(await acts(w.id)).toHaveLength(0);
				else {
					expect((await credit(w.id)).confirmedAt).not.toBeNull();
					expect((await acts(w.id)).map((a) => a.kind).sort()).toEqual([
						'ASSIGNED',
						'CONFIRMED',
						'CREATOR_CREDITED'
					]);
				}
			}
		} finally {
			await db.conversation.delete({ where: { id: conversation.id } });
		}
	});

	it('plafonds des attentes et des rôles : aucune attribution ou notification partielle', async () => {
		const w = await create();
		const fixtures = await db.actor.createManyAndReturn({
			data: Array.from({ length: 8 }, (_, i) => ({
				kind: 'PERSON' as const,
				handle: prefix + 'quota-' + i,
				displayName: 'Quota test'
			})),
			select: { id: true }
		});
		try {
			await db.workContributor.createMany({
				data: fixtures.map((f) => ({ workId: w.id, personId: f.id }))
			});
			await expect(assign(w.id)).rejects.toThrow(/attendent déjà/);
			expect(await acts(w.id)).toHaveLength(1);
		} finally {
			await db.actor.deleteMany({ where: { id: { in: fixtures.map((f) => f.id) } } });
		}
		await db.workRole.createMany({
			data: Array.from({ length: 23 }, () => ({ workId: w.id, kind: 'MIXING' as const }))
		});
		await expect(assign(w.id)).rejects.toThrow(/rôles au maximum/);
		expect(await acts(w.id)).toHaveLength(1);
		expect(await db.workContributor.count({ where: { workId: w.id } })).toBe(1);
	});

	it('attribution manuelle contre crédit automatique : la période gagnante reste unique', async () => {
		const w = await create();
		const results = await Promise.allSettled([
			assign(w.id),
			db.$transaction(
				(tx) =>
					works.creditFromCollaboration(tx, { workId: w.id, personId: ids.member, kind: 'MIXING' }),
				{ timeout: 30000 }
			)
		]);
		expect(results[1].status).toBe('fulfilled');
		expect(await db.workContributor.count({ where: { workId: w.id, personId: ids.member } })).toBe(
			1
		);
		expect((await acts(w.id)).filter((a) => a.kind === 'ASSIGNED')).toHaveLength(
			results[0].status === 'fulfilled' ? 1 : 0
		);
		expect((await acts(w.id)).some((a) => a.kind === 'CONFIRMED')).toBe(false);
	});

	it('blocage, profil masqué et mineur inconnu restent des refus sans acte', async () => {
		const w = await create();
		await expect(assign(w.id, 'minor')).rejects.toThrow(/ne peut pas recevoir/);
		await db.actor.update({ where: { id: ids.outsider }, data: { hidden: true } });
		await expect(assign(w.id, 'outsider')).rejects.toThrow(/identifiant/);
		await db.actor.update({ where: { id: ids.outsider }, data: { hidden: false } });
		await db.block.create({ data: { blockerActorId: ids.owner, blockedActorId: ids.member } });
		await expect(assign(w.id)).rejects.toThrow();
		await db.block.deleteMany({ where: { blockerActorId: ids.owner } });
		expect(await acts(w.id)).toHaveLength(1);
	});

	it('après retrait : journal minimal personnel sans titre, lien, rôles ni actes des collègues', async () => {
		const w = await create();
		await assign(w.id);
		await works.leaveCredit(w.id, ids.member);
		expect(await works.workPage(w.id, ids.member)).toBeNull();
		const history = await works.creditHistoryForMe(ids.member);
		const visibleIds = new Set(history.map((a) => a.id));
		const stored = await acts(w.id);
		expect(visibleIds.has(stored.find((a) => a.kind === 'CREATOR_CREDITED')!.id)).toBe(false);
		expect(visibleIds.has(stored.find((a) => a.kind === 'DECLINED')!.id)).toBe(true);
		expect(JSON.stringify(history)).not.toContain(w.id);
		expect(JSON.stringify(history)).not.toContain('Titre strictement privé');
		expect(await works.creditHistoryForMe(ids.outsider)).toEqual([]);
	});

	it('écriture refusée : rollback de création, attribution, rôles, notification, confirmation et succès', async () => {
		const count = await db.work.count({ where: { ownerId: ids.owner } });
		await failWrite(create);
		expect(await db.work.count({ where: { ownerId: ids.owner } })).toBe(count);
		const w = await create();
		const notifications = await db.notification.count({ where: { recipientActorId: ids.member } });
		await failWrite(() => assign(w.id));
		expect(await db.workContributor.count({ where: { workId: w.id } })).toBe(1);
		expect(await db.workRole.count({ where: { workId: w.id } })).toBe(1);
		expect(await db.notification.count({ where: { recipientActorId: ids.member } })).toBe(
			notifications
		);
		await works.creditPerson(w.id, ids.owner, { handle: prefix + 'member', roles: [mixing] });
		const events = await db.domainEvent.count({ where: { actorIds: { has: ids.member } } });
		const achievements = await db.actorAchievement.count({ where: { actorId: ids.member } });
		await failWrite(() => works.confirmCredit(w.id, ids.member));
		expect((await credit(w.id)).confirmedAt).toBeNull();
		expect(await db.domainEvent.count({ where: { actorIds: { has: ids.member } } })).toBe(events);
		expect(await db.actorAchievement.count({ where: { actorId: ids.member } })).toBe(achievements);
		await failWrite(() => works.leaveCredit(w.id, ids.member));
		await failWrite(async () => works.withdrawCredit(w.id, ids.owner, (await credit(w.id)).id));
		expect((await credit(w.id)).confirmedAt).toBeNull();
		await works.confirmCredit(w.id, ids.member);
		await failWrite(() => works.leaveCredit(w.id, ids.member));
		expect(await db.workRole.count({ where: { contributorId: (await credit(w.id)).id } })).toBe(1);
	});

	it('échec du registre après corroboration : preuve, XP et événements reviennent à leur état initial', async () => {
		const w = await create();
		await assign(w.id);
		const media = await db.media.create({
			data: {
				actorId: ids.owner,
				kind: 'EXTERNAL_LINK',
				provider: 'YOUTUBE',
				externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				title: 'Maquette test',
				status: 'PUBLISHED'
			}
		});
		await works.setDemo(w.id, ids.owner, { mediaId: media.id });
		await works.markComposed(w.id, ids.owner);
		const snapshot = async () => ({
			xp: await db.xpTransaction.count({ where: { actorId: { in: [ids.owner, ids.member] } } }),
			events: await db.domainEvent.count({
				where: { actorIds: { hasSome: [ids.owner, ids.member] } }
			}),
			achievements: await db.actorAchievement.count({
				where: { actorId: { in: [ids.owner, ids.member] } }
			})
		});
		const before = await snapshot();
		await failWrite(() => works.confirmCredit(w.id, ids.member));
		expect(await snapshot()).toEqual(before);
		expect((await db.work.findUniqueOrThrow({ where: { id: w.id } })).proof).toBe('DECLARED');
		expect((await credit(w.id)).confirmedAt).toBeNull();
		await works.confirmCredit(w.id, ids.member);
		expect((await snapshot()).xp).toBeGreaterThan(before.xp);
		const paid = await snapshot();
		await works.leaveCredit(w.id, ids.member);
		await assign(w.id);
		await works.confirmCredit(w.id, ids.member);
		expect((await snapshot()).xp).toBe(paid.xp);
	});

	it('perte de gestion : ses propres actes restent lisibles, les décisions des tiers restent privées', async () => {
		const group = await bands.createBand(ids.owner, { name: prefix + 'rights', title: null });
		try {
			await bands.inviteToBand(group.id, ids.owner, { handle: prefix + 'member', title: null });
			const membership = await db.membership.findFirstOrThrow({
				where: { orgId: group.id, personId: ids.member }
			});
			await bands.answerInvite(membership.id, ids.member, true);
			await bands.setRole(membership.id, ids.owner, 'ADMIN');
			const w = await works.createWork(ids.owner, {
				title: 'Gestion perdue',
				band: group.handle,
				genreIds: [],
				roles: [role]
			});
			await works.creditPerson(w.id, ids.member, { handle: prefix + 'outsider', roles: [role] });
			await works.leaveCredit(w.id, ids.outsider);
			await bands.setRole(membership.id, ids.owner, 'MEMBER');
			await bands.leaveBand(group.id, ids.member);
			expect(await works.workPage(w.id, ids.member)).toBeNull();
			const history = await works.creditHistoryForMe(ids.member);
			const stored = await acts(w.id);
			expect(history.some((e) => e.id === stored.find((a) => a.kind === 'ASSIGNED')!.id)).toBe(
				true
			);
			expect(history.some((e) => e.id === stored.find((a) => a.kind === 'DECLINED')!.id)).toBe(
				false
			);
		} finally {
			await db.actor.delete({ where: { id: group.id } });
		}
	});

	it('limite de lecture explicite, export non tronqué et unicité par période', async () => {
		const w = await create();
		// Fixtures d'actes explicites, aucune déduction depuis des crédits existants.
		await db.workCreditAct.createMany({
			data: Array.from({ length: 105 }, (_, i) => ({
				workId: w.id,
				periodId: `${w.id}-fixture-${i}`,
				personId: ids.minor,
				authorId: ids.owner,
				kind: 'ASSIGNED' as const,
				occurredAt: at(2)
			}))
		});
		expect(await works.creditHistoryForMe(ids.minor)).toHaveLength(100);
		expect((await works.worksExport(ids.minor)).acts).toHaveLength(105);
		await expect(
			db.workCreditAct.create({
				data: {
					workId: w.id,
					periodId: `${w.id}-fixture-0`,
					personId: ids.minor,
					authorId: ids.owner,
					kind: 'ASSIGNED',
					occurredAt: at(3)
				}
			})
		).rejects.toThrow();
		await works.deleteWork(w.id, ids.owner);
		expect(await works.creditHistoryForMe(ids.minor)).toHaveLength(0);
	});

	it('anciens crédits sans acte : aucune reconstruction depuis confirmedAt', async () => {
		const w = await create();
		await db.workContributor.create({
			data: { workId: w.id, personId: ids.outsider, confirmedAt: at(1) }
		});
		expect(await works.creditHistoryForMe(ids.outsider)).toEqual([]);
		await works.leaveCredit(w.id, ids.outsider, at(5));
		expect(
			(await works.worksExport(ids.outsider)).acts.filter((a) => a.periodId !== '')
		).toHaveLength(1);
	});

	it('export complet après refus, anonymisation auteur et cascades compte/morceau', async () => {
		const group = await bands.createBand(ids.erased, { name: prefix + 'erasure', title: null });
		const w = await works.createWork(ids.erased, {
			title: 'Effacement',
			band: group.handle,
			genreIds: [],
			roles: [role]
		});
		await works.creditPerson(w.id, ids.erased, { handle: prefix + 'member', roles: [role] });
		await works.leaveCredit(w.id, ids.member);
		const data = await exportPersonData(users.member);
		expect(data?.morceaux.actes_de_credits.some((a) => a.type === 'DECLINED')).toBe(true);
		const before = await acts(w.id);
		await db.$transaction(await personAnonymizationOps(users.erased));
		expect(await acts(w.id)).toHaveLength(before.length);
		const assigned = (await acts(w.id)).find((a) => a.kind === 'ASSIGNED')!;
		expect(assigned.authorId).toBeNull();
		expect(
			(await works.creditHistoryForMe(ids.member)).find((a) => a.id === assigned.id)?.author
		).toBe('Compte supprimé');
		expect(await works.creditHistoryForMe(ids.erased)).toEqual([]);
		await db.actor.delete({ where: { id: ids.erased } });
		expect((await acts(w.id)).some((a) => a.id === assigned.id)).toBe(true);
		await db.actor.delete({ where: { id: group.id } });
		expect(await acts(w.id)).toHaveLength(0);
		await db.actor.delete({ where: { id: ids.outsider } });
		expect(await db.workCreditAct.count({ where: { personId: ids.outsider } })).toBe(0);
		const other = await create();
		await works.deleteWork(other.id, ids.owner);
		expect(await acts(other.id)).toHaveLength(0);
	});
});
