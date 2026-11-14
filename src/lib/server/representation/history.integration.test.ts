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
const { representationActivityForMe, representationHistoryForMe } = await import('./history');
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
});
