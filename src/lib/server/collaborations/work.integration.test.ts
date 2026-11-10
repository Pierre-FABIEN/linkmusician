/**
 * Collaborations liées au morceau (P4-06) sur la base de `.env`, schéma
 * `e2e` : une session d'enregistrement confirmée fait passer le morceau de
 * Léa « enregistré » et crédite la piste ingé son de Sam et la piste
 * musicien de Léa ; un mixage ne rapporte rien à Léa (Q1) ; la prestation
 * exige le métier ; le morceau doit être à l'un des deux.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/collaborations
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
if (enabled) process.env.DATABASE_URL = url.toString();
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

vi.mock('#lib/server', () => ({ prisma: db }));

const service = await import('./service');
const { getSoundEngineerProgress } = await import('../progression/crafts');

const PREFIX = 'collab-work-test-';
const YEAR = 365.25 * 86_400_000;

describe.skipIf(!enabled)(
	'collaborations liées au morceau (schéma e2e)',
	{ timeout: 60_000 },
	() => {
		const ids: Record<string, string> = {};
		let conversationId = '';
		let workId = '';
		let foreignWorkId = '';

		async function cleanup() {
			const actors = await db.actor.findMany({
				where: { person: { user: { email: { startsWith: PREFIX } } } },
				select: { id: true }
			});
			const list = actors.map((a) => a.id);
			if (list.length > 0) {
				await db.collaboration.deleteMany({ where: { proposedById: { in: list } } });
				await db.conversation.deleteMany({
					where: { participants: { some: { actorId: { in: list } } } }
				});
			}
			await db.actor.deleteMany({ where: { id: { in: list } } });
			await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
			if (list.length > 0)
				await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
		}

		const xp = async (actor: string, track: string) =>
			(
				await db.xpTransaction.aggregate({
					where: { actorId: ids[actor], track, ruleId: 'collaboration.completed' },
					_sum: { amount: true }
				})
			)._sum.amount ?? 0;

		// La confiance est recalculée après chaque événement : on la remet (TL2).
		const trusted = () =>
			db.actor.updateMany({ where: { id: { in: Object.values(ids) } }, data: { trustLevel: 2 } });

		beforeAll(async () => {
			await cleanup();
			for (const [name, track] of [
				['lea', 'MUSICIAN'],
				['sam', 'SOUND_ENGINEER'],
				['zoe', 'MUSICIAN']
			] as const) {
				const user = await db.user.create({
					data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
				});
				ids[name] = (
					await db.actor.create({
						data: {
							kind: 'PERSON',
							handle: PREFIX + name,
							displayName: name,
							trustLevel: 2,
							person: {
								create: {
									userId: user.id,
									termsAcceptedAt: new Date(),
									onboardedAt: new Date(),
									birthDate: new Date(Date.now() - 30 * YEAR),
									tracks: { create: { track, isPrimary: true } }
								}
							}
						}
					})
				).id;
			}
			conversationId = (
				await db.conversation.create({
					data: {
						pairKey: [ids.lea, ids.sam].sort().join(':'),
						initiatorId: ids.lea,
						participants: {
							create: [
								{ actorId: ids.lea, state: 'ACCEPTED' },
								{ actorId: ids.sam, state: 'ACCEPTED' }
							]
						}
					},
					select: { id: true }
				})
			).id;
			workId = (
				await db.work.create({
					data: {
						title: 'Nuit blanche',
						ownerId: ids.lea,
						createdById: ids.lea,
						state: 'COMPOSED',
						composedAt: new Date()
					},
					select: { id: true }
				})
			).id;
			foreignWorkId = (
				await db.work.create({
					data: { title: 'Pas à nous', ownerId: ids.zoe, createdById: ids.zoe },
					select: { id: true }
				})
			).id;
		});

		afterAll(async () => {
			await cleanup();
			await db.$disconnect();
		});

		const day = (offset: number) =>
			new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

		it('la prestation exige le métier, et le morceau doit être à l’un des deux', async () => {
			await expect(
				service.proposeCollaboration(ids.lea, conversationId, {
					kind: 'MIXING',
					title: 'Mixage',
					happenedOn: day(-1),
					provider: 'me'
				})
			).rejects.toThrow(/métier ingé son/);
			await expect(
				service.proposeCollaboration(ids.lea, conversationId, {
					kind: 'MIXING',
					title: 'Mixage',
					happenedOn: day(-1)
				})
			).rejects.toThrow(/qui assure/);
			await expect(
				service.proposeCollaboration(ids.sam, conversationId, {
					kind: 'RECORDING',
					title: 'Prise',
					happenedOn: day(-1),
					provider: 'me',
					work: foreignWorkId
				})
			).rejects.toThrow(/morceau/);
		});

		it('Sam propose la session sur le morceau de Léa : une idée de Zoé n’est pas proposée', async () => {
			const form = await service.collabFormContext(ids.sam, conversationId);
			expect(form?.tracks).toEqual({ me: ['SOUND_ENGINEER'], other: ['MUSICIAN'] });
			expect(form?.works.map((w) => [w.title, w.mine])).toEqual([['Nuit blanche', false]]);
		});

		it('une session confirmée : morceau « enregistré », XP ingé son pour Sam, musicien pour Léa', async () => {
			await trusted();
			const { id } = await service.proposeCollaboration(ids.sam, conversationId, {
				kind: 'RECORDING',
				title: 'Prise voix et guitare',
				happenedOn: day(-2),
				provider: 'me',
				work: workId
			});
			await trusted();
			await service.respondToCollaboration(ids.lea, id, true);

			const work = await db.work.findUniqueOrThrow({ where: { id: workId } });
			expect(work.recordedAt).not.toBeNull();
			expect(work.mixedAt).toBeNull();
			expect(await xp('sam', 'SOUND_ENGINEER')).toBe(300);
			expect(await xp('sam', 'MUSICIAN')).toBe(0);
			expect(await xp('lea', 'MUSICIAN')).toBe(400);

			const [seen] = await service.listForConversation(ids.lea, conversationId);
			expect(seen).toMatchObject({
				provider: 'other',
				work: { id: workId, title: 'Nuit blanche' }
			});

			const sam = await getSoundEngineerProgress(ids.sam, db);
			expect(sam.tier?.id).toBe('FIRST_PROJECTS');
		});

		it('un mixage confirmé : morceau « mixé », rien pour Léa qui n’y joue pas (Q1)', async () => {
			await trusted();
			const { id } = await service.proposeCollaboration(ids.lea, conversationId, {
				kind: 'MIXING',
				title: 'Mixage de Nuit blanche',
				happenedOn: day(-1),
				provider: 'other',
				work: workId
			});
			await trusted();
			await service.respondToCollaboration(ids.sam, id, true);

			const work = await db.work.findUniqueOrThrow({ where: { id: workId } });
			expect(work.mixedAt).not.toBeNull();
			// Deuxième prestation pour la même artiste : rendement décroissant.
			expect(await xp('sam', 'SOUND_ENGINEER')).toBe(300 + 150);
			expect(await xp('lea', 'MUSICIAN')).toBe(400);
		});

		it('P4-07 : Sam est crédité, confirmé, prise de son et mixage, sans XP de morceau', async () => {
			const credit = await db.workContributor.findUniqueOrThrow({
				where: { workId_personId: { workId, personId: ids.sam } },
				select: { confirmedAt: true, roles: { select: { kind: true } } }
			});
			expect(credit.confirmedAt).not.toBeNull();
			expect(credit.roles.map((r) => r.kind).sort()).toEqual(['MIXING', 'RECORDING']);
			// Un crédit du son n'est pas une part d'auteur : pas d'XP de morceau.
			const workXp = await db.xpTransaction.count({
				where: { actorId: ids.sam, ruleId: { startsWith: 'work.' } }
			});
			expect(workXp).toBe(0);
			// Mais des succès, un par rôle (P4-07b).
			const badges = await db.actorAchievement.findMany({
				where: { actorId: ids.sam, achievementId: { endsWith: '-credit' } },
				select: { achievementId: true }
			});
			expect(badges.map((b) => b.achievementId).sort()).toEqual([
				'first-mixing-credit',
				'first-recording-credit'
			]);
			const work = await db.work.findUniqueOrThrow({ where: { id: workId } });
			expect(work.proof).not.toBe('CORROBORATED');
		});
	}
);
