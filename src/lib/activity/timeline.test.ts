import { describe, expect, it } from 'vitest';
import {
	delegationTimeline,
	representationTimeline,
	membershipInvitationTimeline,
	membershipTimeline
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

describe('actes personnels de participation', () => {
	it('conserve les actes explicites et leur auteur, sans déduire les anciennes transitions', () => {
		expect(
			membershipTimeline({
				id: 'm',
				createdAt: at(10),
				invitedById: null,
				invitedBy: null,
				decisions: []
			})
		).toEqual([]);
		const entries = membershipTimeline({
			id: 'm',
			createdAt: at(10),
			invitedById: 'agent',
			invitedBy: facts.proposedBy,
			decisions: [
				{ id: 'b', kind: 'LEFT', occurredAt: at(13), author: null },
				{ id: 'a', kind: 'ACCEPTED', occurredAt: at(11), author: facts.delegate }
			]
		});
		expect(entries.map((e) => [e.action, e.author])).toEqual([
			['Invitation à la structure', 'Agent'],
			['Invitation acceptée', 'Collaboratrice'],
			['Participation quittée', 'Compte supprimé']
		]);
	});
	it('distingue refus personnel, annulation et retrait par la gestion', () => {
		const entries = membershipTimeline({
			id: 'm',
			createdAt: at(10),
			invitedById: null,
			invitedBy: null,
			decisions: (['DECLINED', 'WITHDRAWN', 'REMOVED', 'RESPONSIBILITY_RECEIVED'] as const).map(
				(kind, i) => ({
					id: String(i),
					kind,
					occurredAt: at(11),
					author: { displayName: 'Ancien nom', deletedAt: at(12) }
				})
			)
		});
		expect(new Set(entries.map((e) => e.action)).size).toBe(4);
		expect(entries.every((e) => e.author === 'Compte supprimé')).toBe(true);
	});
});

it('distingue les demandes et le recrutement sans inventer une invitation ni son acceptation', () => {
	const entries = membershipTimeline({
		id: 'demande',
		createdAt: at(10),
		invitedById: null,
		invitedBy: null,
		decisions: (
			[
				'JOIN_REQUESTED',
				'REQUEST_ACCEPTED',
				'REQUEST_DECLINED',
				'REQUEST_WITHDRAWN',
				'REQUEST_CLOSED',
				'RECRUITMENT_ACCEPTED'
			] as const
		).map((kind, i) => ({
			id: String(i),
			kind,
			occurredAt: at(11),
			author: i === 0 ? facts.delegate : null
		}))
	});
	expect(entries.map((e) => e.action)).toEqual([
		'Demande pour rejoindre le groupe',
		'Demande acceptée par la gestion',
		'Demande déclinée par la gestion',
		'Demande retirée par son auteur',
		'Demande close par dissolution du groupe',
		'Entrée dans le groupe par recrutement'
	]);
	expect(entries[0].author).toBe('Collaboratrice');
	expect(entries.slice(1).every((e) => e.author === 'Compte supprimé')).toBe(true);
});

it('conserve les rôles et transmissions répétés, avec ordre stable à date égale', () => {
	const kinds = [
		'BAND_ADMIN_GRANTED',
		'BAND_MEMBER_SET',
		'BAND_ADMIN_GRANTED',
		'BAND_OWNERSHIP_RECEIVED',
		'BAND_OWNERSHIP_GIVEN',
		'BAND_OWNERSHIP_RECEIVED'
	] as const;
	const entries = membershipTimeline({
		id: 'periode',
		createdAt: at(10),
		invitedById: null,
		invitedBy: null,
		decisions: kinds
			.map((kind, i) => ({
				id: String(i),
				kind,
				occurredAt: at(11),
				author: i === 0 ? facts.delegate : null
			}))
			.reverse()
	});
	expect(entries.map((e) => e.id)).toEqual(['0', '1', '2', '3', '4', '5']);
	expect(entries[0].action).toBe(entries[2].action);
	expect(entries[3].action).toBe(entries[5].action);
	expect(entries[4].action).toBe('Responsabilité du groupe transmise ; co-gestion conservée');
	expect(entries[0].author).toBe('Collaboratrice');
	expect(entries.slice(1).every((e) => e.author === 'Compte supprimé')).toBe(true);
});
