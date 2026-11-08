import { describe, expect, it } from 'vitest';
import { nextObjectives, type QuestState } from '#lib/server/progression/core/quests';
import { AMBITIONS, AMBITION_INFO, ambitionPriorities } from './ambition';

/** Profil rempli, rien d'autre : beaucoup d'objectifs ouverts. */
const state: QuestState = {
	profileComplete: true,
	reciprocalConversations: 0,
	bands: 0,
	collaborations: 0,
	distinctCollaborators: 0,
	corroboratedGigs: 0,
	verifiedReleases: 0,
	distinctEndorsers: 0,
	jamAppreciations: 0,
	hasInstrument: true,
	hasGenre: true,
	hasZone: true,
	hasBio: true,
	demos: 0,
	works: 0
};
const ids = (ambition: (typeof AMBITIONS)[number] | null, limit = 3) =>
	nextObjectives(state, limit, ambitionPriorities(ambition)).map((o) => o.id);

describe('ambition (P3-12)', () => {
	it('changer d’ambition change les objectifs mis en avant', () => {
		expect(ids('STAGE')).toEqual(['band.join', 'work.first', 'tier.stage']);
		expect(ids('RECORD')).toEqual(['demo.first', 'work.first', 'collaboration.first']);
		expect(ids('STAGE')).not.toEqual(ids('RECORD'));
	});

	it('sans rien retirer : les mêmes objectifs, dans un autre ordre', () => {
		const all = (ambition: (typeof AMBITIONS)[number] | null) => [...ids(ambition, 99)].sort();
		for (const a of AMBITIONS) expect(all(a)).toEqual(all(null));
	});

	it('les bases du profil passent toujours d’abord', () => {
		const fresh = { ...state, hasInstrument: false, hasZone: false };
		expect(nextObjectives(fresh, 2, ambitionPriorities('PRO')).map((o) => o.id)).toEqual([
			'profile.instrument',
			'profile.zone'
		]);
	});

	it('sans ambition : l’ordre habituel', () => {
		expect(ids(null)).toEqual(['demo.first', 'conversation.first', 'band.join']);
	});

	it('chaque ambition met en avant des objectifs qui existent', () => {
		const known = new Set(ids(null, 99));
		for (const a of AMBITIONS) {
			for (const id of AMBITION_INFO[a].priorities) expect(known).toContain(id);
		}
	});
});
