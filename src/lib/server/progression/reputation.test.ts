/**
 * Réputation (P2-08), sans base : une transaction factice qui lève une erreur
 * dès qu'on touche à l'XP (registre, projections, succès). Le calcul doit
 * aboutir sans jamais y passer (règle d'étanchéité, conception 02 §1).
 */
import { describe, expect, it } from 'vitest';
import type { Tx } from './events';
import { recomputeReputation, reputationFactsFor } from './reputation';

const NOW = new Date('2026-11-06T12:00:00Z');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ME = 'me';

const FORBIDDEN = new Set(['xpTransaction', 'actorProgress', 'actorAchievement']);

function fakeTx() {
	const upserts: Record<string, unknown>[] = [];
	const tables: Record<string, Record<string, (...args: never[]) => unknown>> = {
		domainEvent: {
			findMany: async () => [
				{
					id: 'e1',
					type: 'collaboration.completed',
					payload: { collaborationId: 'c1', participantIds: [ME, 'ana'] },
					occurredAt: NOW
				},
				{
					id: 'e2',
					type: 'collaboration.completed',
					payload: { collaborationId: 'c2', participantIds: [ME, 'ana'] },
					occurredAt: NOW
				},
				{
					id: 'e3',
					type: 'endorsement.received',
					payload: { actorId: ME, endorserId: 'ana', skill: 'fiable', collaborationId: 'c1' },
					occurredAt: NOW
				}
			]
		},
		jamEndorsement: { findMany: async () => [{ quality: 'GROOVE', instrument: null }] },
		collabEndorsement: {
			findMany: async () => [
				{ quality: 'RELIABLE', instrument: null },
				{ quality: null, instrument: { name: 'Batterie' } }
			]
		},
		conversation: {
			findMany: async () => [
				{
					createdAt: new Date(NOW.getTime() - 10 * DAY),
					reciprocatedAt: new Date(NOW.getTime() - 10 * DAY + 3 * HOUR)
				},
				{
					createdAt: new Date(NOW.getTime() - 9 * DAY),
					reciprocatedAt: new Date(NOW.getTime() - 9 * DAY + 5 * HOUR)
				},
				{ createdAt: new Date(NOW.getTime() - 8 * DAY), reciprocatedAt: null },
				// Trop récente pour compter.
				{ createdAt: new Date(NOW.getTime() - 1 * DAY), reciprocatedAt: null }
			]
		},
		actor: { findMany: async () => [{ id: ME }] },
		reputationSnapshot: {
			upsert: async (args: never) => {
				upserts.push(args as Record<string, unknown>);
				return args;
			}
		}
	};
	const tx = new Proxy(
		{},
		{
			get(_, table: string) {
				if (FORBIDDEN.has(table)) throw new Error(`Lecture interdite : ${table}`);
				const t = tables[table];
				if (!t) throw new Error(`Table inattendue : ${table}`);
				return t;
			}
		}
	) as unknown as Tx;
	return { tx, upserts };
}

describe('réputation, côté serveur', () => {
	it('calcule les faits sans jamais lire l’XP', async () => {
		const { tx } = fakeTx();
		const facts = await reputationFactsFor(tx, ME, NOW);
		expect(facts).toMatchObject({
			confirmedCollabs: 2,
			distinctCounterparts: 1,
			distinctEndorsers: 1,
			responseBucket: 'FAST'
		});
		expect(facts.endorsementsByKind.map((e) => e.label).sort()).toEqual([
			'batterie',
			'bon groove',
			'fiable'
		]);
	});

	it('enregistre la carte et un score, sans lire l’XP', async () => {
		const { tx, upserts } = fakeTx();
		expect(await recomputeReputation(tx, [ME, ME], NOW)).toBe(1);
		expect(upserts).toHaveLength(1);
		const create = (upserts[0] as { create: Record<string, unknown> }).create;
		expect(create.actorId).toBe(ME);
		expect(create.internalScore).toBeGreaterThan(0);
		expect(create.computedAt).toBe(NOW);
	});
});
