import { describe, expect, it } from 'vitest';
import { collaborationTimeline } from './timeline';
const at = new Date('2026-11-15T12:00:00Z');
const participant = {
	actorId: 'secret-actor',
	actor: { displayName: 'Sam', deletedAt: null },
	acceptedAt: at,
	confirmedCompletionAt: at,
	declinedAt: null,
	cancelledAt: null
};
describe('validations de collaboration', () => {
	it('projette les deux actes implicites à date égale sans exposer l’identité technique', () => {
		const entries = collaborationTimeline({ id: 'c', participants: [participant] });
		expect(entries.map((e) => [e.action, e.author, e.occurredAt])).toEqual([
			['Collaboration acceptée', 'Sam', at],
			['Achèvement confirmé', 'Sam', at]
		]);
		expect(JSON.stringify(entries)).not.toContain('secret-actor');
	});
	it('ne déduit rien d’une absence de dates', () => {
		expect(
			collaborationTimeline({
				id: 'c',
				participants: [{ ...participant, acceptedAt: null, confirmedCompletionAt: null }]
			})
		).toEqual([]);
	});
	it('projette refus et annulation avec leur auteur, sans changer les accords antérieurs', () => {
		const entries = collaborationTimeline({
			id: 'c',
			participants: [
				{ ...participant, confirmedCompletionAt: null, declinedAt: at },
				{
					...participant,
					actorId: 'autre',
					acceptedAt: null,
					confirmedCompletionAt: null,
					cancelledAt: at,
					actor: { displayName: 'Effacé', deletedAt: at }
				}
			]
		});
		expect(entries).toHaveLength(3);
		expect(entries).toContainEqual(
			expect.objectContaining({
				action: 'Proposition de collaboration refusée',
				author: 'Sam',
				occurredAt: at
			})
		);
		expect(entries).toContainEqual(
			expect.objectContaining({
				action: 'Collaboration annulée',
				author: 'Compte supprimé',
				occurredAt: at
			})
		);
	});
	it('garde un ordre stable indépendant de l’ordre des participants et anonymise les auteurs', () => {
		const other = {
			...participant,
			actorId: 'a',
			actor: { displayName: 'Ancien nom', deletedAt: at }
		};
		const facts = { id: 'c', participants: [participant, other] };
		const entries = collaborationTimeline(facts);
		expect(entries).toEqual(
			collaborationTimeline({ ...facts, participants: [...facts.participants].reverse() })
		);
		expect(entries[0].author).toBe('Compte supprimé');
		expect(JSON.stringify(entries)).not.toContain('Ancien nom');
	});
	it('projette uniquement les nouveaux actes répétables, sans contenu ni identité technique', () => {
		const facts = {
			id: 'c',
			participants: [],
			appreciationActs: [
				{ id: 'act-b', kind: 'REVOKED' as const, occurredAt: at, author: participant.actor },
				{
					id: 'act-a',
					kind: 'GIVEN' as const,
					occurredAt: at,
					author: { displayName: 'Secret', deletedAt: at }
				},
				{ id: 'act-c', kind: 'GIVEN' as const, occurredAt: at, author: participant.actor }
			]
		};
		const entries = collaborationTimeline(facts);
		expect(entries.map((e) => e.action)).toEqual([
			'Appréciation de collaboration attribuée',
			'Appréciation de collaboration reprise',
			'Appréciation de collaboration attribuée'
		]);
		expect(entries[0].author).toBe('Compte supprimé');
		expect(
			collaborationTimeline({ ...facts, appreciationActs: facts.appreciationActs.reverse() })
		).toEqual(entries);
		expect(JSON.stringify(entries)).not.toMatch(/Secret|secret-actor|quality|instrument/);
	});
});
