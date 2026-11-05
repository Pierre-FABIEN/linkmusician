import { describe, expect, it } from 'vitest';
import { jamNextStep, type JamState } from './guide';

const base: JamState = {
	hasCity: true,
	canBeDispo: true,
	isDispo: false,
	hasConversation: false,
	knowsVenues: false,
	playedTogether: 0
};

describe('guide du mode jam (P2-12b)', () => {
	it.each([
		[{ hasCity: false }, 1, 'Indique ta ville'],
		[{}, 2, 'Mets-toi dispo'],
		[{ canBeDispo: false }, 2, 'Repère une jam'],
		[{ isDispo: true }, 3, 'Écris à un·e musicien·ne'],
		[{ isDispo: true, hasConversation: true }, 4, 'Trouve un lieu pour jouer'],
		[{ isDispo: true, hasConversation: true, knowsVenues: true }, 4, 'Jouez ensemble'],
		[{ hasConversation: true, playedTogether: 1 }, 5, 'Et maintenant, un projet ?']
	] as const)('%o → étape %i', (patch, index, title) => {
		const step = jamNextStep({ ...base, ...patch });
		expect(step).toMatchObject({ index, total: 5, title });
	});
});
