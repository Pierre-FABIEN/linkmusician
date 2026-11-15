import type { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';
const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
if (enabled) process.env.DATABASE_URL = url.toString();
const db = createPrismaClient(url.toString());
const faults = vi.hoisted(() => ({ settle: false, notify: false }));
vi.mock('#lib/server', () => ({ prisma: db }));
vi.mock('#lib/server/progression/processor', async (original) => {
	const real = await original<typeof import('#lib/server/progression/processor')>();
	return {
		...real,
		emitAndProcess: (...args: Parameters<typeof real.emitAndProcess>) => {
			if (faults.settle) throw new Error('échec moteur simulé');
			return real.emitAndProcess(...args);
		}
	};
});
vi.mock('#lib/server/notifications/service', async (original) => {
	const real = await original<typeof import('#lib/server/notifications/service')>();
	return {
		...real,
		notify: (...args: Parameters<typeof real.notify>) => {
			if (faults.notify) throw new Error('échec notification simulé');
			return real.notify(...args);
		}
	};
});
const service = await import('./service');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');
const PREFIX = 'collab-history-';
const ids: Record<string, string> = {};
const users: Record<string, string> = {};
let conversationId = '';
const before = new Date('2026-11-01T12:00:00Z');
const after = new Date('2026-11-15T12:00:00Z');
let dayIndex = 1;
const propose = (future = false) =>
	service.proposeCollaboration(
		ids.sam,
		conversationId,
		{
			kind: 'REHEARSAL',
			title: `Privé ${dayIndex}`,
			happenedOn: `2026-${future ? '12' : '10'}-${String(dayIndex++).padStart(2, '0')}`
		},
		before
	);
const history = (who = ids.lea) => service.validationHistoryForConversation(who, conversationId);
async function cleanup() {
	const actors = await db.actor.findMany({
		where: { person: { user: { email: { startsWith: PREFIX } } } },
		select: { id: true }
	});
	const list = actors.map((a) => a.id);
	await db.collaboration.deleteMany({ where: { proposedById: { in: list } } });
	await db.conversation.deleteMany({
		where: { participants: { some: { actorId: { in: list } } } }
	});
	await db.actor.deleteMany({ where: { id: { in: list } } });
	await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
	await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
}
describe.skipIf(!enabled)('journal de collaboration réel (e2e)', { timeout: 60_000 }, () => {
	beforeAll(async () => {
		await cleanup();
		for (const name of ['sam', 'lea', 'tiers']) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: PREFIX + name }
			});
			users[name] = user.id;
			const actor = await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + name,
					displayName: name,
					person: {
						create: { userId: user.id, termsAcceptedAt: before, birthDate: new Date('1990-01-01') }
					}
				}
			});
			ids[name] = actor.id;
		}
		conversationId = (
			await db.conversation.create({
				data: {
					pairKey: [ids.sam, ids.lea].sort().join(':'),
					initiatorId: ids.sam,
					participants: {
						create: [
							{ actorId: ids.sam, state: 'ACCEPTED' },
							{ actorId: ids.lea, state: 'ACCEPTED' }
						]
					}
				}
			})
		).id;
	}, 60_000);
	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});
	it('conserve auteurs et dates, sans effet à la lecture ni exposition des données du projet', async () => {
		const { id } = await propose();
		await service.respondToCollaboration(ids.lea, id, true, after);
		const count = await db.notification.count({
			where: { recipientActorId: { in: Object.values(ids) } }
		});
		const entry = (await history()).find((c) => c.id === id)!;
		expect(entry.entries.map((e) => [e.author, e.occurredAt])).toEqual([
			['sam', before],
			['sam', before],
			['lea', after],
			['lea', after]
		]);
		expect(
			entry.entries.every((e) => Object.keys(e).sort().join() === 'action,author,id,occurredAt')
		).toBe(true);
		expect(JSON.stringify(entry)).not.toContain(ids.sam);
		expect(await history()).toEqual(await history());
		expect(
			await db.notification.count({ where: { recipientActorId: { in: Object.values(ids) } } })
		).toBe(count);
		expect(await history(ids.tiers)).toEqual([]);
		expect(await service.validationHistoryForConversation(ids.lea, 'inconnue')).toEqual([]);
		await expect(service.confirmCollaboration(ids.tiers, id, after)).rejects.toMatchObject({
			status: 404
		});
	});
	it('sérialise les réponses et protège la première date contre le rejeu', async () => {
		const { id } = await propose();
		const results = await Promise.allSettled([
			service.respondToCollaboration(ids.lea, id, true, after),
			service.respondToCollaboration(ids.lea, id, true, new Date('2026-11-16'))
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const kept = await db.collaborationParticipant.findUniqueOrThrow({
			where: { collaborationId_actorId: { collaborationId: id, actorId: ids.lea } }
		});
		await expect(service.respondToCollaboration(ids.lea, id, true)).rejects.toThrow(/déjà/);
		expect(
			(
				await db.collaborationParticipant.findUniqueOrThrow({
					where: { collaborationId_actorId: { collaborationId: id, actorId: ids.lea } }
				})
			).acceptedAt
		).toEqual(kept.acceptedAt);
	});
	it('confirme à deux après la date, y compris simultanément, une seule fois', async () => {
		const { id } = await propose(true);
		await service.respondToCollaboration(ids.lea, id, true, after);
		await expect(service.confirmCollaboration(ids.sam, id, after)).rejects.toThrow(/date passée/);
		expect((await history()).find((c) => c.id === id)!.entries).toHaveLength(2);
		const done = new Date('2027-01-01');
		await Promise.all([
			service.confirmCollaboration(ids.sam, id, done),
			service.confirmCollaboration(ids.lea, id, done)
		]);
		expect((await db.collaboration.findUniqueOrThrow({ where: { id } })).status).toBe('COMPLETED');
		expect((await history()).find((c) => c.id === id)!.entries).toHaveLength(4);
		await expect(service.confirmCollaboration(ids.sam, id, done)).rejects.toThrow(/Rien/);
	});
	it('une annulation concurrente ne peut écraser un achèvement réalisé', async () => {
		const { id } = await propose();
		const results = await Promise.allSettled([
			service.respondToCollaboration(ids.lea, id, true, after),
			service.cancelCollaboration(ids.sam, id)
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const c = await db.collaboration.findUniqueOrThrow({ where: { id } });
		expect(['CANCELLED', 'COMPLETED']).toContain(c.status);
		expect((await history()).find((c) => c.id === id)!.entries).toHaveLength(
			c.status === 'COMPLETED' ? 4 : 3
		);
	});
	it('ne reconstruit aucune validation depuis un ancien état terminé', async () => {
		const c = await db.collaboration.create({
			data: {
				kind: 'REHEARSAL',
				title: 'Ancien état sans actes',
				happenedOn: before,
				status: 'COMPLETED',
				completedAt: after,
				proposedById: ids.sam,
				conversationId,
				participants: { create: [{ actorId: ids.sam }, { actorId: ids.lea }] }
			}
		});
		expect((await history()).find((h) => h.id === c.id)!.entries).toEqual([]);
	});
	it('ne donne aucun droit au propriétaire du projet et ne renvoie pas son contenu privé', async () => {
		const work = await db.work.create({
			data: {
				ownerId: ids.tiers,
				createdById: ids.tiers,
				title: 'Idée confidentielle hors journal'
			}
		});
		const { id } = await propose(true);
		await db.collaboration.update({ where: { id }, data: { workId: work.id } });
		const payload = (await history()).find((c) => c.id === id)!;
		expect(JSON.stringify(payload)).not.toContain(work.title);
		expect(JSON.stringify(payload)).not.toContain(work.id);
		expect(await history(ids.tiers)).toEqual([]);
	});
	it('la suppression du projet conserve les décisions sans exposer son contenu', async () => {
		const work = await db.work.create({
			data: { ownerId: ids.tiers, createdById: ids.tiers, title: 'Projet à supprimer' }
		});
		const { id } = await propose(true);
		await db.collaboration.update({ where: { id }, data: { workId: work.id } });
		await service.cancelCollaboration(ids.lea, id, after);
		const kept = (await history()).find((c) => c.id === id)!;
		await db.work.delete({ where: { id: work.id } });
		expect((await history()).find((c) => c.id === id)).toEqual(kept);
		expect((await db.collaboration.findUniqueOrThrow({ where: { id } })).workId).toBeNull();
		await db.collaboration.delete({ where: { id } });
		expect(await db.collaborationParticipant.count({ where: { collaborationId: id } })).toBe(0);
		expect((await history()).find((c) => c.id === id)).toBeUndefined();
	});
	it('acceptation future contre annulation : conserve exactement les actes effectivement réalisés', async () => {
		const { id } = await propose(true);
		const results = await Promise.allSettled([
			service.respondToCollaboration(ids.lea, id, true, after),
			service.cancelCollaboration(ids.sam, id, after)
		]);
		expect(results[1].status).toBe('fulfilled');
		const c = await db.collaboration.findUniqueOrThrow({
			where: { id },
			include: { participants: true }
		});
		expect(c.status).toBe('CANCELLED');
		expect(c.participants.find((p) => p.actorId === ids.sam)!.cancelledAt).toEqual(after);
		expect(c.participants.find((p) => p.actorId === ids.lea)!.acceptedAt).toEqual(
			results[0].status === 'fulfilled' ? after : null
		);
		expect((await history()).find((c) => c.id === id)!.entries).toHaveLength(
			results[0].status === 'fulfilled' ? 3 : 2
		);
	});
	it('sérialise les confirmations identiques et annule une dernière confirmation en échec', async () => {
		const { id } = await propose(true);
		await service.respondToCollaboration(ids.lea, id, true, after);
		const done = new Date('2027-01-01');
		const results = await Promise.allSettled([
			service.confirmCollaboration(ids.sam, id, done),
			service.confirmCollaboration(ids.sam, id, new Date('2027-01-02'))
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		faults.settle = true;
		try {
			await expect(service.confirmCollaboration(ids.lea, id, done)).rejects.toThrow(/simulé/);
		} finally {
			faults.settle = false;
		}
		const c = await db.collaboration.findUniqueOrThrow({
			where: { id },
			include: { participants: true }
		});
		expect(c.status).toBe('ACCEPTED');
		expect(c.completedAt).toBeNull();
		expect(c.participants.find((p) => p.actorId === ids.lea)!.confirmedCompletionAt).toBeNull();
		expect((await history()).find((c) => c.id === id)!.entries).toHaveLength(3);
	});
	it('annule ensemble la validation et ses effets lorsque le moteur échoue', async () => {
		const { id } = await propose();
		faults.settle = true;
		try {
			await expect(service.respondToCollaboration(ids.lea, id, true, after)).rejects.toThrow(
				/simulé/
			);
		} finally {
			faults.settle = false;
		}
		const c = await db.collaboration.findUniqueOrThrow({
			where: { id },
			include: { participants: true }
		});
		expect(c.status).toBe('PROPOSED');
		expect(c.completedAt).toBeNull();
		expect(c.participants.find((p) => p.actorId === ids.lea)?.acceptedAt).toBeNull();
		expect((await history()).find((c) => c.id === id)!.entries).toHaveLength(2);
	});
	it('annule aussi la création et ses validations si la notification échoue', async () => {
		const count = await db.collaboration.count({ where: { conversationId } });
		faults.notify = true;
		try {
			await expect(propose()).rejects.toThrow(/simulé/);
		} finally {
			faults.notify = false;
		}
		expect(await db.collaboration.count({ where: { conversationId } })).toBe(count);
	});
	it('distingue le refus de l’annulation et conserve les validations antérieures', async () => {
		const { id } = await propose(true);
		await service.cancelCollaboration(ids.sam, id, after);
		const entries = (await history()).find((c) => c.id === id)!.entries;
		expect(entries.map((e) => [e.action, e.author, e.occurredAt])).toEqual([
			['Collaboration acceptée', 'sam', before],
			['Collaboration annulée', 'sam', after]
		]);
		await expect(service.respondToCollaboration(ids.lea, id, true, after)).rejects.toThrow(/déjà/);
		const rejected = await propose();
		await service.respondToCollaboration(ids.lea, rejected.id, false, after);
		expect((await history()).find((c) => c.id === rejected.id)!.entries).toHaveLength(3);
	});
	it('conserve la garde de blocage pour les mutations et la lecture historique privée', async () => {
		const { id } = await propose();
		await db.block.create({ data: { blockerActorId: ids.sam, blockedActorId: ids.lea } });
		try {
			await expect(service.respondToCollaboration(ids.lea, id, true, after)).rejects.toThrow(
				/ne peut plus/
			);
			expect((await history()).find((c) => c.id === id)!.entries).toHaveLength(2);
		} finally {
			await db.block.deleteMany({ where: { blockerActorId: ids.sam } });
		}
	});

	it.each(['acceptation', 'annulation', 'refus'] as const)(
		'arbitre refus contre %s sans écraser le premier acte',
		async (opponent) => {
			const { id } = await propose(true);
			const results = await Promise.allSettled([
				service.respondToCollaboration(ids.lea, id, false, after),
				opponent === 'annulation'
					? service.cancelCollaboration(ids.sam, id, before)
					: service.respondToCollaboration(ids.lea, id, opponent === 'acceptation', before)
			]);
			expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			const kept = await db.collaboration.findUniqueOrThrow({
				where: { id },
				include: { participants: true }
			});
			const acts = kept.participants.filter((p) => p.declinedAt || p.cancelledAt);
			expect(acts).toHaveLength(kept.status === 'CANCELLED' ? 1 : 0);
			await expect(
				service.respondToCollaboration(ids.lea, id, false, new Date('2027-01-01'))
			).rejects.toThrow();
			expect(
				await db.collaboration.findUniqueOrThrow({ where: { id }, include: { participants: true } })
			).toEqual(kept);
		}
	);
	it('sérialise les annulations des deux participants et protège auteur et date', async () => {
		const { id } = await propose(true);
		const results = await Promise.allSettled([
			service.cancelCollaboration(ids.sam, id, before),
			service.cancelCollaboration(ids.lea, id, after)
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const acts = (await history())
			.find((c) => c.id === id)!
			.entries.filter((e) => e.action === 'Collaboration annulée');
		expect(acts).toHaveLength(1);
		expect(acts[0]).toMatchObject(
			results[0].status === 'fulfilled'
				? { author: 'sam', occurredAt: before }
				: { author: 'lea', occurredAt: after }
		);
		await expect(service.cancelCollaboration(ids.sam, id)).rejects.toThrow();
		await expect(service.cancelCollaboration(ids.lea, id)).rejects.toThrow();
		expect(
			(await history())
				.find((c) => c.id === id)!
				.entries.filter((e) => e.action === 'Collaboration annulée')
		).toEqual(acts);
	});
	it('arbitre annulation et dernière confirmation sans acte ni achèvement contradictoire', async () => {
		const { id } = await propose(true);
		await service.respondToCollaboration(ids.lea, id, true, after);
		const done = new Date('2027-01-01');
		await service.confirmCollaboration(ids.sam, id, done);
		await expect(service.respondToCollaboration(ids.lea, id, false, done)).rejects.toThrow(/déjà/);
		const results = await Promise.allSettled([
			service.confirmCollaboration(ids.lea, id, done),
			service.cancelCollaboration(ids.sam, id, done)
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const c = await db.collaboration.findUniqueOrThrow({
			where: { id },
			include: { participants: true }
		});
		expect(['CANCELLED', 'COMPLETED']).toContain(c.status);
		expect(c.participants.find((p) => p.actorId === ids.sam)!.cancelledAt).toEqual(
			c.status === 'CANCELLED' ? done : null
		);
		expect(c.participants.find((p) => p.actorId === ids.lea)!.confirmedCompletionAt).toEqual(
			c.status === 'COMPLETED' ? done : null
		);
	});
	it.each([false, true])(
		'rollback refus/annulation (%s) si la trace ou la mutation échoue',
		async (cancel) => {
			const { id } = await propose(true);
			const kept = await db.collaboration.findUniqueOrThrow({
				where: { id },
				include: { participants: true }
			});
			for (const delegate of ['collaborationParticipant', 'collaboration'] as const) {
				const transaction = db.$transaction.bind(db);
				const spy = vi.spyOn(db, '$transaction');
				spy.mockImplementationOnce((async (
					callback: (tx: Prisma.TransactionClient) => Promise<unknown>
				) =>
					transaction(async (tx) => {
						const broken = new Proxy(tx, {
							get(target, key) {
								if (key !== delegate) return Reflect.get(target, key);
								return new Proxy(target[delegate], {
									get(model, method) {
										if (method === 'update')
											return () => {
												throw new Error('échec écriture simulé');
											};
										return Reflect.get(model, method);
									}
								});
							}
						});
						return callback(broken);
					})) as unknown as typeof db.$transaction);
				try {
					await expect(
						cancel
							? service.cancelCollaboration(ids.lea, id, after)
							: service.respondToCollaboration(ids.lea, id, false, after)
					).rejects.toThrow(/simulé/);
				} finally {
					spy.mockRestore();
				}
				expect(
					await db.collaboration.findUniqueOrThrow({
						where: { id },
						include: { participants: true }
					})
				).toEqual(kept);
			}
		}
	);
	it('ne reconstruit aucun refus/annulation depuis CANCELLED et updatedAt', async () => {
		const { id } = await propose(true);
		await db.collaboration.update({
			where: { id },
			data: { status: 'CANCELLED', updatedAt: after }
		});
		expect((await history()).find((c) => c.id === id)!.entries.map((e) => e.action)).toEqual([
			'Collaboration acceptée'
		]);
	});
	it('garde les droits des participants et le blocage sans notification ni progression ajoutées', async () => {
		const { id } = await propose(true);
		const notifications = await db.notification.count({
			where: { recipientActorId: { in: Object.values(ids) } }
		});
		const events = await db.domainEvent.count({
			where: { actorIds: { hasSome: Object.values(ids) } }
		});
		await expect(service.respondToCollaboration(ids.sam, id, false, after)).rejects.toThrow();
		await expect(service.respondToCollaboration(ids.tiers, id, false, after)).rejects.toMatchObject(
			{ status: 404 }
		);
		await expect(service.cancelCollaboration(ids.tiers, id, after)).rejects.toMatchObject({
			status: 404
		});
		await db.block.create({ data: { blockerActorId: ids.sam, blockedActorId: ids.lea } });
		try {
			await expect(service.respondToCollaboration(ids.lea, id, false, after)).rejects.toThrow(
				/ne peut plus/
			);
			await service.cancelCollaboration(ids.lea, id, after);
			expect((await history()).find((c) => c.id === id)!.entries.at(-1)).toMatchObject({
				action: 'Collaboration annulée',
				author: 'lea'
			});
		} finally {
			await db.block.deleteMany({ where: { blockerActorId: ids.sam } });
		}
		const refused = await propose(true);
		const notificationCount = await db.notification.count({
			where: { recipientActorId: { in: Object.values(ids) } }
		});
		await service.respondToCollaboration(ids.lea, refused.id, false, after);
		expect(notificationCount).toBe(notifications + 1);
		expect(
			await db.notification.count({ where: { recipientActorId: { in: Object.values(ids) } } })
		).toBe(notificationCount);
		expect(
			await db.domainEvent.count({ where: { actorIds: { hasSome: Object.values(ids) } } })
		).toBe(events);
	});
	it('exporte les validations conservées et reflète l’anonymisation des auteurs partout', async () => {
		const rejected = await propose(true);
		await service.respondToCollaboration(ids.lea, rejected.id, false, after);
		const cancelled = await propose(true);
		await service.cancelCollaboration(ids.sam, cancelled.id, after);
		const exported = await exportPersonData(users.lea);
		expect(exported?.collaborations.flatMap((c) => c.validations)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					acte: 'Proposition de collaboration refusée',
					auteur: 'lea',
					le: after
				}),
				expect.objectContaining({ acte: 'Collaboration annulée', auteur: 'sam', le: after })
			])
		);
		expect(
			exported?.collaborations.some((c) => c.validations.some((v) => v.auteur === 'sam'))
		).toBe(true);
		await db.$transaction(await personAnonymizationOps(users.sam));
		const journals = await history();
		expect(JSON.stringify(journals)).not.toContain('"author":"sam"');
		expect(journals.some((c) => c.entries.some((e) => e.author === 'Compte supprimé'))).toBe(true);
		expect(await history(ids.sam)).toEqual([]);
		expect(journals.find((c) => c.id === cancelled.id)!.entries.at(-1)).toMatchObject({
			action: 'Collaboration annulée',
			author: 'Compte supprimé',
			occurredAt: after
		});
		await expect(service.cancelCollaboration(ids.sam, rejected.id)).rejects.toMatchObject({
			status: 404
		});
		const erased = await exportPersonData(users.lea);
		expect(erased?.collaborations.flatMap((c) => c.validations)).toContainEqual(
			expect.objectContaining({
				acte: 'Collaboration annulée',
				auteur: 'Compte supprimé',
				le: after
			})
		);
		expect(erased?.collaborations.some((c) => c.validations.some((v) => v.auteur === 'sam'))).toBe(
			false
		);
	});
});
