/**
 * Critère d'acceptation de la phase 3 (conception 05 §3) : un compte
 * supprimé laisse intactes les collaborations de ses contreparties, qui
 * l'affichent « Compte supprimé ».
 * Base de `.env`, schéma `e2e`. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/collaborations
 */
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

vi.mock('#lib/server', () => ({ prisma: db }));

const { listForConversation, validationHistoryForConversation } = await import('./service');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const PREFIX = 'canon-test-';
const CONVERSATION = `${PREFIX}conversation`;
const YEAR = 365.25 * 86_400_000;

describe.skipIf(!enabled)('collaborations après une suppression de compte (schéma e2e)', () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};
	let collabId = '';

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
			await db.actor.deleteMany({ where: { id: { in: list } } });
			await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
		}
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	beforeAll(async () => {
		await cleanup();
		for (const name of ['lea', 'malik']) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			users[name] = user.id;
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Canon Test ${name}`,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								birthDate: new Date(Date.now() - 30 * YEAR)
							}
						}
					}
				})
			).id;
		}
		// Malik propose (c'est lui qui part), Léa garde l'historique.
		collabId = (
			await db.collaboration.create({
				data: {
					kind: 'REHEARSAL',
					status: 'COMPLETED',
					title: 'Répète du mardi',
					happenedOn: new Date('2026-10-01'),
					proposedById: ids.malik,
					conversationId: CONVERSATION,
					completedAt: new Date(),
					participants: {
						create: [
							{ actorId: ids.lea, acceptedAt: new Date(), confirmedCompletionAt: new Date() },
							{ actorId: ids.malik, acceptedAt: new Date(), confirmedCompletionAt: new Date() }
						]
					}
				},
				select: { id: true }
			})
		).id;
	}, 60_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('la collaboration reste chez Léa, terminée, avec « Compte supprimé »', async () => {
		const { endorseCollaborator } = await import('./endorse');
		await db.actor.updateMany({
			where: { id: { in: Object.values(ids) } },
			data: { trustLevel: 1 }
		});
		await endorseCollaborator(ids.malik, {
			collaborationId: collabId,
			to: PREFIX + 'lea',
			quality: 'RELIABLE'
		});
		await db.actor.updateMany({
			where: { id: { in: Object.values(ids) } },
			data: { trustLevel: 1 }
		});
		await endorseCollaborator(ids.lea, {
			collaborationId: collabId,
			to: PREFIX + 'malik',
			quality: 'ON_TIME'
		});
		const exported = await exportPersonData(users.malik);
		expect(
			exported?.collaborations
				.flatMap((c) => c.validations)
				.filter((v) => v.acte === 'Appréciation de collaboration attribuée')
		).toHaveLength(2);
		await db.$transaction(await personAnonymizationOps(users.malik));
		const [history] = await validationHistoryForConversation(ids.lea, CONVERSATION);
		expect(
			history.entries.filter((e) => e.action === 'Appréciation de collaboration attribuée')
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ author: 'Compte supprimé' }),
				expect.objectContaining({ author: 'Canon Test lea' })
			])
		);
		expect(await db.collabEndorsement.count({ where: { toActorId: ids.malik } })).toBe(0);
		expect(
			await db.collaborationAppreciationAct.count({ where: { collaborationId: collabId } })
		).toBe(2);
		expect(await validationHistoryForConversation(ids.malik, CONVERSATION)).toEqual([]);
		const after = await exportPersonData(users.lea);
		expect(after?.collaborations.flatMap((c) => c.validations)).toContainEqual(
			expect.objectContaining({
				acte: 'Appréciation de collaboration attribuée',
				auteur: 'Compte supprimé'
			})
		);

		const [seen] = await listForConversation(ids.lea, CONVERSATION);
		expect(seen).toMatchObject({ id: collabId, status: 'COMPLETED', with: 'Compte supprimé' });

		const kept = await db.collaborationParticipant.count({ where: { collaborationId: collabId } });
		expect(kept).toBe(2);
	}, 60_000);
});
