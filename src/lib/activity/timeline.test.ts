import { describe, expect, it } from 'vitest';
import { delegationTimeline } from './timeline';

const at = (day: number) => new Date(`2026-11-${day}T12:00:00Z`);
const facts = {
	id: 'affectation',
	createdAt: at(10),
	proposedBy: { displayName: 'Agent' },
	acceptedAt: at(12),
	delegate: { displayName: 'Collaboratrice' },
	approvedAt: at(11),
	approvedBy: { displayName: 'Gestionnaire du groupe' },
	endedAt: at(13),
	endedBy: { displayName: 'Artiste' }
};

describe('historique des affectations', () => {
	it('ordonne les faits datés et conserve la personne qui a réellement agi', () => {
		const entries = delegationTimeline(facts);
		expect(entries.map((e) => [e.action, e.author])).toEqual([
			['Affectation proposée', 'Agent'],
			['Accord pour l’artiste', 'Gestionnaire du groupe'],
			['Accord du collaborateur', 'Collaboratrice'],
			['Affectation close', 'Artiste']
		]);
		expect(entries.map((e) => e.occurredAt)).toEqual([at(10), at(11), at(12), at(13)]);
	});
	it('ne fabrique aucun accord, refus ou expiration à partir d’un état', () => {
		expect(
			delegationTimeline({ ...facts, acceptedAt: null, approvedAt: null, endedAt: null })
		).toEqual([
			{
				id: 'affectation:proposed',
				action: 'Affectation proposée',
				author: 'Agent',
				occurredAt: at(10)
			}
		]);
	});
	it('n’attribue pas un acte à un tiers lorsque son auteur est effacé', () => {
		const entries = delegationTimeline({
			...facts,
			proposedBy: null,
			approvedBy: null,
			endedBy: null,
			delegate: { displayName: 'Ancien nom', deletedAt: at(13) }
		});
		expect(entries.every((e) => e.author === 'Compte supprimé')).toBe(true);
	});
	it('garde des clés uniques et un ordre stable pour des dates égales', () => {
		const entries = delegationTimeline({ ...facts, acceptedAt: at(11) });
		expect(entries.map((e) => e.id)).toEqual([
			'affectation:proposed',
			'affectation:accepted',
			'affectation:approved',
			'affectation:ended'
		]);
	});
});
