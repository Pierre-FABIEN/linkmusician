import { describe, expect, it } from 'vitest';
import { parseDomainEvent, type DomainEvent } from './events';
import { EMPTY_MUSICIAN_SUMMARY, musicianSummary } from './summary';
import { musicianTier } from './tiers';

const at = new Date('2026-03-01T12:00:00Z');
let n = 0;
const ev = (o: Record<string, unknown>): DomainEvent =>
	parseDomainEvent({ id: `evt-${++n}`, occurredAt: at, ...o });

const ME = 'me';

describe('résumé musicien (P1-11)', () => {
	it('sans événement : résumé vide, pas de palier', () => {
		expect(musicianSummary(ME, [])).toEqual(EMPTY_MUSICIAN_SUMMARY);
		expect(musicianTier(EMPTY_MUSICIAN_SUMMARY).tier).toBeNull();
	});

	it('profil complété : « Premiers pas »', () => {
		const s = musicianSummary(ME, [ev({ type: 'profile.completed', actorId: ME })]);
		expect(s.profileComplete).toBe(true);
		expect(musicianTier(s).tier?.id).toBe('FIRST_STEPS');
	});

	it('ignore les événements d’un autre acteur', () => {
		const s = musicianSummary(ME, [
			ev({ type: 'profile.completed', actorId: 'other' }),
			ev({ type: 'membership.accepted', personId: 'other', bandId: 'b1' }),
			ev({ type: 'collaboration.completed', collaborationId: 'c1', participantIds: ['a', 'b'] })
		]);
		expect(s).toEqual(EMPTY_MUSICIAN_SUMMARY);
	});

	it('compte les conversations dans les deux sens', () => {
		const s = musicianSummary(ME, [
			ev({
				type: 'conversation.reciprocated',
				actorId: ME,
				counterpartId: 'a',
				fromOpportunity: true
			}),
			ev({
				type: 'conversation.reciprocated',
				actorId: 'b',
				counterpartId: ME,
				fromOpportunity: false
			})
		]);
		expect(s.reciprocalConversations).toBe(2);
	});

	it('groupes, collaborateurs et endosseurs distincts', () => {
		const s = musicianSummary(ME, [
			ev({ type: 'membership.accepted', personId: ME, bandId: 'b1' }),
			ev({ type: 'membership.accepted', personId: ME, bandId: 'b1' }),
			ev({ type: 'collaboration.completed', collaborationId: 'c1', participantIds: [ME, 'a'] }),
			ev({ type: 'collaboration.completed', collaborationId: 'c2', participantIds: [ME, 'a'] }),
			ev({ type: 'collaboration.completed', collaborationId: 'c3', participantIds: [ME, 'b'] }),
			ev({ type: 'endorsement.received', actorId: ME, endorserId: 'a', skill: 'basse' }),
			ev({ type: 'endorsement.received', actorId: ME, endorserId: 'a', skill: 'chant' })
		]);
		expect(s).toMatchObject({
			bands: 1,
			collaborations: 3,
			distinctCollaborators: 2,
			distinctEndorsers: 1
		});
		expect(musicianTier(s).tier?.id).toBe('COLLABORATOR');
	});

	it('une appréciation reprise ne compte plus pour les endosseurs distincts (P2-07)', () => {
		const received = (endorserId: string, id: string) =>
			parseDomainEvent({
				id,
				occurredAt: at,
				type: 'endorsement.received',
				actorId: ME,
				endorserId,
				skill: 'fiable'
			});
		const revoked = (endorserId: string, endorsementEventId: string) =>
			ev({ type: 'endorsement.revoked', actorId: ME, endorserId, endorsementEventId });
		// a : deux appréciations, une reprise ; b : une, reprise ; c : reprise ailleurs.
		const s = musicianSummary(ME, [
			revoked('b', 'b1'), // l'ordre des lignes lues n'a pas d'importance
			received('a', 'a1'),
			received('a', 'a2'),
			revoked('a', 'a1'),
			received('b', 'b1'),
			ev({
				type: 'endorsement.revoked',
				actorId: 'other',
				endorserId: 'c',
				endorsementEventId: 'x'
			})
		]);
		expect(s.distinctEndorsers).toBe(1);
	});

	it('étapes de groupe : concert corroboré, sortie vérifiée', () => {
		const milestone = (milestone: string, to: string, memberIds = [ME]) =>
			ev({ type: 'milestone.attested', bandId: 'b1', milestone, from: null, to, memberIds });
		const s = musicianSummary(ME, [
			milestone('FIRST_GIG', 'DECLARED'),
			milestone('FIRST_EP', 'CORROBORATED'),
			milestone('FIRST_ALBUM', 'VERIFIED', ['other'])
		]);
		expect(s.corroboratedGigs).toBe(0);
		expect(s.verifiedReleases).toBe(0);
		const t = musicianSummary(ME, [
			milestone('FIRST_GIG', 'CORROBORATED'),
			milestone('FIRST_EP', 'VERIFIED')
		]);
		expect(t.corroboratedGigs).toBe(1);
		expect(t.verifiedReleases).toBe(1);
	});
});
