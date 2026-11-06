/**
 * Calibrage du barème par personas simulés (conception 02 §2.3). Chaque
 * persona rejoue un trimestre d'activité typique. Si une modification du
 * barème fait sortir un persona de sa cible, ce test échoue : c'est le
 * garde-fou contre l'inflation de points.
 */
import { describe, expect, it } from 'vitest';
import { MemoryLedger } from './memory';
import { musicianTier, bandTier } from './tiers';
import type { TrustLevel } from './trust';

const start = new Date('2026-01-05T10:00:00Z');
const day = (n: number) => new Date(start.getTime() + n * 86_400_000);
let seq = 0;
const ev = (o: Record<string, unknown>, at: Date) => ({ id: `e${++seq}`, occurredAt: at, ...o });

function curieux(l: MemoryLedger, me = 'curieux') {
	l.apply(ev({ type: 'profile.completed', actorId: me }, day(1)));
	l.apply(ev({ type: 'media.published', actorId: me, mediaId: 'd1', kind: 'DEMO' }, day(3)));
	for (const [i, other] of ['a', 'b'].entries())
		l.apply(
			ev(
				{
					type: 'conversation.reciprocated',
					actorId: me,
					counterpartId: other,
					fromOpportunity: true
				},
				day(10 + i)
			)
		);
}

describe('personas (conception 02 §2.3)', () => {
	it('Curieux : niveau 3-4, palier « En réseau » non atteint', () => {
		const l = new MemoryLedger();
		curieux(l);
		expect(l.level('curieux')).toBeGreaterThanOrEqual(3);
		expect(l.level('curieux')).toBeLessThanOrEqual(4);
		const { reached } = musicianTier({
			profileComplete: true,
			reciprocalConversations: 2,
			bands: 0,
			collaborations: 0,
			distinctCollaborators: 0,
			corroboratedGigs: 0,
			verifiedReleases: 0,
			distinctEndorsers: 0,
			jamAppreciations: 0
		});
		expect(reached).not.toContain('NETWORKED');
	});

	it('Musicien actif : niveau 6-8, palier « Collaborateur »', () => {
		const me = 'actif';
		const l = new MemoryLedger({ alice: 2 as TrustLevel, bob: 2 as TrustLevel });
		l.apply(ev({ type: 'profile.completed', actorId: me }, day(1)));
		l.apply(
			ev(
				{
					type: 'conversation.reciprocated',
					actorId: me,
					counterpartId: 'alice',
					fromOpportunity: true
				},
				day(4)
			)
		);
		l.apply(
			ev(
				{
					type: 'conversation.reciprocated',
					actorId: me,
					counterpartId: 'bob',
					fromOpportunity: true
				},
				day(6)
			)
		);
		l.apply(ev({ type: 'membership.accepted', personId: me, bandId: 'band' }, day(8)));
		l.apply(
			ev(
				{
					type: 'milestone.attested',
					bandId: 'band',
					milestone: 'FORMATION',
					from: null,
					to: 'VERIFIED',
					memberIds: [me, 'alice']
				},
				day(8)
			)
		);
		l.apply(ev({ type: 'media.published', actorId: me, mediaId: 'd1', kind: 'DEMO' }, day(15)));
		l.apply(ev({ type: 'media.published', actorId: me, mediaId: 'd2', kind: 'DEMO' }, day(40)));
		l.apply(
			ev(
				{ type: 'collaboration.completed', collaborationId: 'c1', participantIds: [me, 'alice'] },
				day(20)
			)
		);
		l.apply(
			ev(
				{ type: 'collaboration.completed', collaborationId: 'c2', participantIds: [me, 'alice'] },
				day(50)
			)
		);
		l.apply(
			ev(
				{ type: 'collaboration.completed', collaborationId: 'c3', participantIds: [me, 'bob'] },
				day(70)
			)
		);
		expect(l.level(me)).toBeGreaterThanOrEqual(6);
		expect(l.level(me)).toBeLessThanOrEqual(8);
		const { tier } = musicianTier({
			profileComplete: true,
			reciprocalConversations: 2,
			bands: 1,
			collaborations: 3,
			distinctCollaborators: 2,
			corroboratedGigs: 0,
			verifiedReleases: 0,
			distinctEndorsers: 0,
			jamAppreciations: 0
		});
		expect(tier?.id).toBe('COLLABORATOR');
	});

	it('Groupe qui tourne : palier « Live »', () => {
		expect(
			bandTier({
				FORMATION: 'VERIFIED',
				FIRST_REHEARSAL: 'CORROBORATED',
				FIRST_COMPOSITION: 'CORROBORATED',
				FIRST_RECORDING: 'CORROBORATED',
				FIRST_PUBLIC_DEMO: 'CORROBORATED',
				FIRST_GIG: 'CORROBORATED'
			})?.label
		).toBe('Live');
	});

	it('Élève en mode jam (D29) : niveau 4-5 en 3 mois, plafond sans nouvelles rencontres', () => {
		// Une jam par semaine, deux appréciations à chaque fois, venues d'un
		// cercle de 12 habitué·es ; une conversation réciproque toutes les 3
		// semaines ; aucune collaboration (une jam n'en est pas une, D27).
		const me = 'eleve';
		const l = new MemoryLedger();
		l.apply(ev({ type: 'profile.completed', actorId: me }, day(1)));
		l.apply(ev({ type: 'media.published', actorId: me, mediaId: 'd1', kind: 'DEMO' }, day(3)));
		let endorser = 0;
		const levelAt: Record<number, number> = {};
		for (let week = 0; week < 26; week++) {
			const d = 6 + week * 7;
			if (week % 3 === 1)
				l.apply(
					ev(
						{
							type: 'conversation.reciprocated',
							actorId: me,
							counterpartId: `c${week}`,
							fromOpportunity: true
						},
						day(d)
					)
				);
			for (let k = 0; k < 2; k++)
				l.apply(
					ev(
						{
							type: 'endorsement.received',
							actorId: me,
							endorserId: `p${endorser++ % 12}`,
							skill: 'bon groove',
							jamId: `jam${week}`
						},
						day(d)
					)
				);
			levelAt[week] = l.level(me);
		}
		expect(levelAt[12]).toBeGreaterThanOrEqual(4);
		expect(levelAt[12]).toBeLessThanOrEqual(5);
		// Les rendements décroissants par paire bornent ce qu'un même cercle
		// peut donner (12 × 70 XP) : le niveau 6 demande de nouvelles rencontres.
		expect(levelAt[25]).toBeLessThanOrEqual(5);
		const { tier } = musicianTier({
			profileComplete: true,
			reciprocalConversations: 1,
			bands: 0,
			collaborations: 0,
			distinctCollaborators: 0,
			corroboratedGigs: 0,
			verifiedReleases: 0,
			distinctEndorsers: 12,
			jamAppreciations: 2
		});
		expect(tier?.id).toBe('NETWORKED');
	});

	it('Farmeur : 40 collaborations fictives avec 2 comptes TL0, pas plus qu’un Curieux', () => {
		const farm = new MemoryLedger({ f1: 0, f2: 0 });
		farm.apply(ev({ type: 'profile.completed', actorId: 'farmeur' }, day(1)));
		for (let i = 0; i < 40; i++)
			farm.apply(
				ev(
					{
						type: 'collaboration.completed',
						collaborationId: `f${i}`,
						participantIds: ['farmeur', i % 2 ? 'f1' : 'f2']
					},
					day(2 + i * 2)
				)
			);
		const reference = new MemoryLedger();
		curieux(reference);
		expect(farm.xp('farmeur')).toBeLessThanOrEqual(reference.xp('curieux'));
		expect(farm.level('farmeur')).toBeLessThanOrEqual(reference.level('curieux'));
	});
});
