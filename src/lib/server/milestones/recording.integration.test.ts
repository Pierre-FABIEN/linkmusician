/**
 * Étapes vérifiées par les pros (P4-09) sur la base de `.env`, schéma `e2e` :
 * un enregistrement terminé avec Sam, ingé son extérieur au groupe, sur un
 * morceau des Volts, vérifie leur « Premier enregistrement » ; une étape
 * déclarée est renforcée ; un·e ingé son du groupe ne vérifie rien ; un
 * morceau d'une personne ne touche aucun groupe. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/milestones
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

const collabs = await import('#lib/server/collaborations/service');
const { workJourney } = await import('#lib/server/works/journey');
const { careerFacts } = await import('#lib/server/career/map');

const PREFIX = 'recording-test-';
const YEAR = 365.25 * 86_400_000;

describe.skipIf(!enabled)(
	'« Premier enregistrement » vérifié par un·e pro (schéma e2e)',
	{ timeout: 90_000 },
	() => {
		const ids: Record<string, string> = {};

		async function cleanup() {
			const actors = await db.actor.findMany({
				where: {
					OR: [
						{ handle: { startsWith: PREFIX } },
						{ person: { user: { email: { startsWith: PREFIX } } } }
					]
				},
				select: { id: true }
			});
			const list = actors.map((a) => a.id);
			if (list.length > 0) {
				await db.collaboration.deleteMany({ where: { proposedById: { in: list } } });
				await db.conversation.deleteMany({
					where: { participants: { some: { actorId: { in: list } } } }
				});
				await db.work.deleteMany({ where: { ownerId: { in: list } } });
			}
			await db.actor.deleteMany({ where: { id: { in: list } } });
			await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
			if (list.length > 0)
				await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
		}

		async function person(name: string, track: 'MUSICIAN' | 'SOUND_ENGINEER' | 'PRODUCER') {
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

		/** Un groupe formé (Léa responsable, Bob membre) et un morceau composé. */
		async function band(name: string, extraMember?: string) {
			const formedAt = new Date(Date.now() - 60 * 86_400_000);
			const actor = await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: PREFIX + name,
					displayName: name,
					organization: { create: { kind: 'BAND', formedAt } }
				}
			});
			const members = [
				{ personId: ids.lea, role: 'OWNER' as const },
				{ personId: ids.bob, role: 'MEMBER' as const },
				...(extraMember ? [{ personId: ids[extraMember], role: 'MEMBER' as const }] : [])
			];
			for (const m of members) {
				await db.membership.create({
					data: { orgId: actor.id, ...m, status: 'ACTIVE', startedAt: formedAt }
				});
			}
			const work = await db.work.create({
				data: {
					title: `Morceau de ${name}`,
					ownerId: actor.id,
					createdById: ids.lea,
					state: 'COMPOSED',
					composedAt: new Date()
				},
				select: { id: true }
			});
			return { bandId: actor.id, workId: work.id };
		}

		const conversations = new Map<string, string>();
		async function conversation(a: string, b: string) {
			const key = [ids[a], ids[b]].sort().join(':');
			if (!conversations.has(key)) {
				const { id } = await db.conversation.create({
					data: {
						pairKey: key,
						initiatorId: ids[a],
						participants: {
							create: [
								{ actorId: ids[a], state: 'ACCEPTED' },
								{ actorId: ids[b], state: 'ACCEPTED' }
							]
						}
					},
					select: { id: true }
				});
				conversations.set(key, id);
			}
			return conversations.get(key)!;
		}

		// Une collaboration par jour et par conversation : chaque prise a son jour.
		let daysAgo = 20;
		/** Léa propose un enregistrement assuré par l'autre ; il accepte (c'est passé). */
		async function recordWith(
			other: string,
			workId: string,
			kind: 'RECORDING' | 'PRODUCTION' = 'RECORDING'
		) {
			const { id } = await collabs.proposeCollaboration(ids.lea, await conversation('lea', other), {
				kind,
				title: 'Prise de la batterie',
				happenedOn: new Date(Date.now() - --daysAgo * 86_400_000).toISOString().slice(0, 10),
				provider: 'other',
				work: workId
			});
			await collabs.respondToCollaboration(ids[other], id, true);
			return db.collaboration.findUniqueOrThrow({ where: { id }, select: { status: true } });
		}

		const recording = (bandId: string) =>
			db.milestone.findUnique({
				where: { bandId_definitionId: { bandId, definitionId: 'FIRST_RECORDING' } },
				select: { proof: true, workId: true }
			});

		beforeAll(async () => {
			await cleanup();
			await person('lea', 'MUSICIAN');
			await person('bob', 'MUSICIAN');
			await person('sam', 'SOUND_ENGINEER');
			await person('ines', 'SOUND_ENGINEER');
			await person('nora', 'PRODUCER');
		});

		afterAll(async () => {
			await cleanup();
			await db.$disconnect();
		});

		it('crée l’étape vérifiée, créditée au groupe et à ses membres', async () => {
			const volts = await band('volts');
			expect(await recordWith('sam', volts.workId)).toEqual({ status: 'COMPLETED' });
			expect(await recording(volts.bandId)).toEqual({ proof: 'VERIFIED', workId: volts.workId });
			const event = await db.domainEvent.findFirst({
				where: { type: 'milestone.attested', actorIds: { has: volts.bandId } },
				select: { payload: true }
			});
			expect(event?.payload).toMatchObject({
				milestone: 'FIRST_RECORDING',
				from: null,
				to: 'VERIFIED'
			});
		});

		it('renforce une étape déclarée ; une ingé son du groupe ne vérifie rien', async () => {
			const echo = await band('echo', 'ines');
			await db.milestone.create({
				data: {
					definitionId: 'FIRST_RECORDING',
					bandId: echo.bandId,
					proof: 'DECLARED',
					occurredAt: new Date('2026-09-01T12:00:00Z'),
					declaredById: ids.lea,
					definitionVersion: 1
				}
			});
			// Inès est membre du groupe : sa prestation ne vérifie pas l'étape.
			await recordWith('ines', echo.workId);
			expect((await recording(echo.bandId))?.proof).toBe('DECLARED');
			// Sam est extérieur : l'étape devient vérifiée, à sa date d'origine.
			await recordWith('sam', echo.workId);
			const row = await db.milestone.findUniqueOrThrow({
				where: { bandId_definitionId: { bandId: echo.bandId, definitionId: 'FIRST_RECORDING' } },
				select: { proof: true, occurredAt: true }
			});
			expect(row).toEqual({ proof: 'VERIFIED', occurredAt: new Date('2026-09-01T12:00:00Z') });
		});

		it('campagne : de l’idée à la production, récap et acte IV (P4-10)', async () => {
			const nova = await band('nova');
			expect((await careerFacts(ids.bob)).productions).toBe(0);
			await recordWith('sam', nova.workId);
			const halfway = await workJourney(nova.workId);
			expect(halfway?.done).toBe(false);
			expect(halfway?.steps.map((s) => s.kind)).toEqual(['IDEA', 'COMPOSED', 'RECORDING']);
			expect(halfway?.steps[2]).toMatchObject({
				pro: { name: 'sam' },
				verified: true
			});

			await recordWith('nora', nova.workId, 'PRODUCTION');
			const journey = await workJourney(nova.workId);
			expect(journey?.done).toBe(true);
			expect(journey?.steps.at(-1)).toMatchObject({ kind: 'PRODUCTION', pro: { name: 'nora' } });
			// Bob, membre du groupe, franchit l'acte IV ; Nora, qui a produit, non.
			expect((await careerFacts(ids.bob)).productions).toBe(1);
			expect((await careerFacts(ids.nora)).productions).toBe(0);
		});

		it('un morceau personnel ne touche aucun groupe', async () => {
			const solo = await db.work.create({
				data: {
					title: 'Solo',
					ownerId: ids.lea,
					createdById: ids.lea,
					state: 'COMPOSED',
					composedAt: new Date()
				},
				select: { id: true }
			});
			await recordWith('sam', solo.id);
			expect(await db.milestone.count({ where: { workId: solo.id } })).toBe(0);
		});
	}
);
