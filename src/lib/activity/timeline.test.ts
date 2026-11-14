import { describe, expect, it } from 'vitest';
import {
	delegationTimeline,
	representationTimeline,
	membershipInvitationTimeline
} from './timeline';

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

describe('faits de mandat et d’invitation', () => {
	it('distingue le titulaire, la personne qui confirme et celle qui termine', () => {
		const entries = representationTimeline({
			id: 'mandat',
			createdAt: at(10),
			agent: facts.proposedBy,
			confirmedAt: at(11),
			confirmedBy: facts.approvedBy,
			endedAt: at(13),
			endedBy: facts.delegate
		});
		expect(entries.map((e) => [e.action, e.author])).toEqual([
			['Accompagnement proposé', 'Agent'],
			['Accompagnement confirmé', 'Gestionnaire du groupe'],
			['Accompagnement terminé', 'Collaboratrice']
		]);
	});
	it('ne fabrique aucune confirmation, fin ou auteur', () => {
		const input = {
			id: 'mandat',
			createdAt: at(10),
			agent: facts.proposedBy,
			confirmedAt: at(11),
			confirmedBy: null,
			endedAt: null,
			endedBy: null
		};
		expect(representationTimeline(input).map((e) => e.author)).toEqual([
			'Agent',
			'Compte supprimé'
		]);
		expect(representationTimeline({ ...input, confirmedAt: null })).toHaveLength(1);
	});
	it('projette seulement l’invitation connue, sans déduire une acceptation du statut actuel', () => {
		expect(
			membershipInvitationTimeline({
				id: 'participation',
				createdAt: at(10),
				invitedById: 'invitant',
				invitedBy: facts.proposedBy
			})
		).toEqual([
			{
				id: 'participation:invited',
				action: 'Invitation à la structure',
				author: 'Agent',
				occurredAt: at(10)
			}
		]);
		expect(
			membershipInvitationTimeline({
				id: 'participation',
				createdAt: at(10),
				invitedById: null,
				invitedBy: null
			})
		).toEqual([]);
	});
	it('masque l’auteur supprimé de l’invitation lorsque sa référence est encore conservée', () => {
		expect(
			membershipInvitationTimeline({
				id: 'participation',
				createdAt: at(10),
				invitedById: 'invitant',
				invitedBy: { displayName: 'Ancien nom', deletedAt: at(12) }
			})[0].author
		).toBe('Compte supprimé');
	});
});

it.each([
	['DECLINED', 'Proposition déclinée'],
	['WITHDRAWN', 'Proposition retirée']
] as const)('projette %s sans inventer de confirmation', (status, action) => {
	const entries = representationTimeline({
		id: 'proposition',
		status,
		createdAt: at(10),
		agent: facts.proposedBy,
		confirmedAt: null,
		confirmedBy: null,
		endedAt: at(12),
		endedBy: null
	});
	expect(entries).toHaveLength(2);
	expect(entries[1]).toMatchObject({ action, author: 'Compte supprimé', occurredAt: at(12) });
});
