import { describe, expect, it } from 'vitest';
import { collaborationTimeline } from './timeline';
const at = new Date('2026-11-15T12:00:00Z');
const participant = {
	actorId: 'secret-actor',
	actor: { displayName: 'Sam', deletedAt: null },
	acceptedAt: at,
	confirmedCompletionAt: at
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
});
