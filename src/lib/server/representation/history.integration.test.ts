import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import dotenv from 'dotenv';
import type { Prisma } from '@prisma/client';
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
const { representationActivityForMe, representationHistoryForMe } = await import('./history');
const {
	answerRepresentation,
	endRepresentation,
	proposeRepresentation,
	myRepresentations,
	pendingRepresentationCount
} = await import('./service');
const { getAgentProgress } = await import('#lib/server/progression/crafts');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');
const prefix = `history-${Date.now()}-`;
const people: Record<string, string> = {};
let bandId = '',
	id = '';
const at = (day: number) => new Date(`2026-11-${day}T12:00:00Z`);

describe.skipIf(!enabled)('historique privé des mandats', { timeout: 60000 }, () => {
	beforeAll(async () => {
		for (const name of ['agent', 'artist', 'admin', 'member', 'outsider', 'minor']) {
			const user = await db.user.create({
				data: { email: `${prefix}${name}@example.test`, referralCode: prefix + name }
			});
			const actor = await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: prefix + name,
					displayName: name,
					person: {
						create: {
							userId: user.id,
							birthDate: new Date(name === 'minor' ? '2010-01-01' : '1990-01-01'),
							termsAcceptedAt: at(10)
						}
					}
				}
			});
			people[name] = actor.id;
		}
		await db.personTrack.create({ data: { personId: people.agent, track: 'MANAGER' } });
		bandId = (
			await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: prefix + 'band',
					displayName: 'Groupe privé',
					hidden: true,
					organization: {
						create: {
							kind: 'BAND',
							memberships: {
								create: [
									{ personId: people.artist, status: 'ACTIVE', role: 'OWNER' },
									{ personId: people.admin, status: 'ACTIVE', role: 'ADMIN' },
									{ personId: people.member, status: 'ACTIVE', role: 'MEMBER' }
								]
							}
						}
					}
				}
			})
		).id;
	});
	beforeEach(async () => {
		id = (
			await db.representation.create({
				data: {
					agentId: people.agent,
					artistId: bandId,
					kind: 'MANAGER',
					status: 'ENDED',
					createdAt: at(10),
					confirmedAt: at(11),
					confirmedById: people.admin,
					endedAt: at(12),
					endedById: people.artist,
					message: 'MESSAGE SECRET',
					departmentCodes: ['31'],
					allowedActions: ['CAREER_SUPPORT']
				}
			})
		).id;
	});
	afterEach(async () => {
		await db.representation.deleteMany({ where: { id } });
	});
	afterAll(async () => {
		await db.actor.deleteMany({ where: { id: { in: [...Object.values(people), bandId] } } });
		await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
		await db.$disconnect();
	});
	async function proposal() {
		await db.representation.update({
			where: { id },
			data: {
				status: 'PROPOSED',
				confirmedAt: null,
				confirmedById: null,
				endedAt: null,
				endedById: null,
				startsAt: at(10),
				expiresAt: at(20)
			}
		});
	}
	it.each(['DECLINED', 'WITHDRAWN'] as const)(
		'conserve %s et ses auteurs sans termes privés ni doublon',
		async (status) => {
			await proposal();
			expect(
				(await getAgentProgress(people.agent, 'MANAGER', db)).objectives.map((o) => o.id)
			).not.toContain('agent.proposal');
			const notifications = await db.notification.count({
				where: { recipientActorId: { in: Object.values(people) } }
			});
			const by = status === 'DECLINED' ? people.admin : people.agent;
			const act = () =>
				status === 'DECLINED'
					? answerRepresentation(id, by, false, at(14))
					: endRepresentation(id, by, at(14));
			const results = await Promise.allSettled([act(), act()]);
			expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			await expect(act()).rejects.toMatchObject({ status: 404 });
			expect(await db.representation.findUnique({ where: { id } })).toMatchObject({
				status,
				endedAt: at(14),
				endedById: by,
				message: null,
				startsAt: null,
				expiresAt: null,
				departmentCodes: [],
				allowedActions: [],
				confirmedAt: null
			});
			const detail = await representationActivityForMe(id, people.artist);
			expect(detail?.activity.map((e) => e.author)).toEqual([
				'agent',
				status === 'DECLINED' ? 'admin' : 'agent'
			]);
			expect(detail?.activity[1].action).toBe(
				status === 'DECLINED' ? 'Proposition déclinée' : 'Proposition retirée'
			);
			expect(await myRepresentations(people.agent)).toEqual([]);
			expect(
				(await getAgentProgress(people.agent, 'MANAGER', db)).objectives.map((o) => o.id)
			).toContain('agent.proposal');
			expect(await pendingRepresentationCount(people.artist)).toBe(0);
			for (const key of ['outsider', 'member', 'minor'])
				expect(await representationActivityForMe(id, people[key])).toBeNull();
			await db.membership.updateMany({
				where: { orgId: bandId, personId: people.admin },
				data: { status: 'REMOVED' }
			});
			try {
				expect(await representationActivityForMe(id, people.admin)).toBeNull();
			} finally {
				await db.membership.updateMany({
					where: { orgId: bandId, personId: people.admin },
					data: { status: 'ACTIVE' }
				});
			}
			expect(
				await db.notification.count({ where: { recipientActorId: { in: Object.values(people) } } })
			).toBe(notifications);
		}
	);
	it('arbitre un refus et un retrait concurrents sans écraser la décision gagnante', async () => {
		await proposal();
		const results = await Promise.allSettled([
			answerRepresentation(id, people.admin, false, at(14)),
			endRepresentation(id, people.agent, at(15))
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const row = await db.representation.findUniqueOrThrow({ where: { id } });
		expect(['DECLINED', 'WITHDRAWN']).toContain(row.status);
		expect([row.endedById, row.endedAt]).toEqual(
			row.status === 'DECLINED' ? [people.admin, at(14)] : [people.agent, at(15)]
		);
		expect((await representationActivityForMe(id, people.agent))?.activity).toHaveLength(2);
	});
	it('refuse les mutations des tiers et des simples membres sans changer la proposition', async () => {
		await proposal();
		await expect(answerRepresentation(id, people.member, false)).rejects.toMatchObject({
			status: 403
		});
		await expect(endRepresentation(id, people.admin)).rejects.toMatchObject({ status: 403 });
		await expect(endRepresentation(id, people.outsider)).rejects.toMatchObject({ status: 403 });
		expect(await db.representation.findUnique({ where: { id } })).toMatchObject({
			status: 'PROPOSED',
			endedAt: null,
			endedById: null,
			message: 'MESSAGE SECRET'
		});
	});
	it('autorise une nouvelle proposition après refus, sans modifier la trace précédente', async () => {
		await proposal();
		await answerRepresentation(id, people.admin, false, at(14));
		await proposeRepresentation(people.agent, { artist: prefix + 'band', kind: 'MANAGER' }, at(15));
		try {
			expect(
				await db.representation.count({ where: { agentId: people.agent, artistId: bandId } })
			).toBe(2);
			expect(await db.representation.findUnique({ where: { id } })).toMatchObject({
				status: 'DECLINED',
				endedById: people.admin
			});
		} finally {
			await db.representation.deleteMany({ where: { agentId: people.agent, id: { not: id } } });
		}
	});
	it('conserve le mandat terminé pour les deux parties et la gestion actuelle sans ses conditions', async () => {
		const before = await db.notification.count({
			where: { recipientActorId: { in: Object.values(people) } }
		});
		for (const key of ['agent', 'artist', 'admin']) {
			const list = await representationHistoryForMe(people[key]);
			expect(list.map((r) => r.id)).toEqual([id]);
			const detail = await representationActivityForMe(id, people[key]);
			expect(detail?.activity.map((e) => e.author)).toEqual(['agent', 'admin', 'artist']);
			expect(JSON.stringify(detail)).not.toMatch(
				/MESSAGE SECRET|departmentCodes|CAREER_SUPPORT|birthDate|userId/
			);
		}
		expect(
			await db.notification.count({ where: { recipientActorId: { in: Object.values(people) } } })
		).toBe(before);
	});
	it('refuse tiers, simple membre, mineur et identifiant inconnu', async () => {
		for (const key of ['outsider', 'member', 'minor']) {
			expect(await representationHistoryForMe(people[key])).toEqual([]);
			expect(await representationActivityForMe(id, people[key])).toBeNull();
		}
		expect(await representationActivityForMe('absent', people.agent)).toBeNull();
		await db.representation.update({ where: { id }, data: { agentId: people.minor } });
		expect(await representationActivityForMe(id, people.minor)).toBeNull();
	});
	it('retire immédiatement l’accès de la gestion révoquée, même pour une ancienne décision', async () => {
		await db.membership.updateMany({
			where: { orgId: bandId, personId: people.admin },
			data: { status: 'REMOVED' }
		});
		try {
			expect(await representationActivityForMe(id, people.admin)).toBeNull();
			expect(await representationHistoryForMe(people.admin)).toEqual([]);
		} finally {
			await db.membership.updateMany({
				where: { orgId: bandId, personId: people.admin },
				data: { status: 'ACTIVE' }
			});
		}
	});
	it('ne publie pas les auteurs effacés et exclut les groupes dissous', async () => {
		await db.representation.update({ where: { id }, data: { confirmedById: null } });
		expect((await representationActivityForMe(id, people.agent))?.activity[1].author).toBe(
			'Compte supprimé'
		);
		await db.actor.update({ where: { id: people.artist }, data: { deletedAt: at(13) } });
		try {
			expect((await representationActivityForMe(id, people.agent))?.activity[2].author).toBe(
				'Compte supprimé'
			);
		} finally {
			await db.actor.update({ where: { id: people.artist }, data: { deletedAt: null } });
		}
		await db.organization.update({ where: { actorId: bandId }, data: { dissolvedAt: at(13) } });
		try {
			expect(await representationActivityForMe(id, people.agent)).toBeNull();
		} finally {
			await db.organization.update({ where: { actorId: bandId }, data: { dissolvedAt: null } });
		}
	});
	it('annule ensemble décision et effacement si la transaction échoue', async () => {
		await proposal();
		const transaction = db.$transaction.bind(db);
		const spy = vi.spyOn(db, '$transaction');
		// Le service utilise seulement la surcharge callback de Prisma ;
		// Vitest attend aussi la surcharge tableau dans le type de son mock.
		spy.mockImplementationOnce((async (
			callback: (tx: Prisma.TransactionClient) => Promise<unknown>
		) =>
			transaction(async (tx) => {
				await callback(tx);
				throw new Error('échec transactionnel simulé');
			})) as unknown as typeof db.$transaction);
		try {
			await expect(answerRepresentation(id, people.admin, false, at(14))).rejects.toThrow(
				'échec transactionnel simulé'
			);
		} finally {
			spy.mockRestore();
		}
		expect(await db.representation.findUnique({ where: { id } })).toMatchObject({
			status: 'PROPOSED',
			endedAt: null,
			endedById: null,
			message: 'MESSAGE SECRET',
			allowedActions: ['CAREER_SUPPORT']
		});
	});
	it('ne donne aucun accès à la gestion de l’agence du titulaire', async () => {
		await proposal();
		await answerRepresentation(id, people.admin, false, at(14));
		const agency = await db.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle: prefix + 'agency',
				displayName: 'Agence privée',
				organization: {
					create: {
						kind: 'AGENCY',
						memberships: {
							create: [
								{ personId: people.outsider, role: 'OWNER', status: 'ACTIVE' },
								{ personId: people.agent, role: 'MEMBER', status: 'ACTIVE' }
							]
						}
					}
				}
			}
		});
		try {
			expect(await representationActivityForMe(id, people.outsider)).toBeNull();
			expect(await representationHistoryForMe(people.outsider)).toEqual([]);
		} finally {
			await db.actor.delete({ where: { id: agency.id } });
		}
	});
	it('exporte la décision de gestion et efface son auteur sans inventer une autre attribution', async () => {
		await proposal();
		await answerRepresentation(id, people.admin, false, at(14));
		const { userId } = await db.person.findUniqueOrThrow({ where: { actorId: people.admin } });
		const exported = await exportPersonData(userId);
		expect(exported?.accompagnements).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					role: 'auteur de décision',
					statut: 'DECLINED',
					termine_le: at(14),
					auteur_fin_refus_retrait: 'admin',
					mot: null
				})
			])
		);
		await db.$transaction(await personAnonymizationOps(userId));
		expect(await db.representation.findUnique({ where: { id } })).toMatchObject({
			status: 'DECLINED',
			endedAt: at(14),
			endedById: null
		});
		expect((await representationActivityForMe(id, people.agent))?.activity[1].author).toBe(
			'Compte supprimé'
		);
	});
});
