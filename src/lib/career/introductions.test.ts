import { describe, expect, it } from 'vitest';
import {
	MAX_INTRODUCTIONS,
	MAX_INTRO_NOTE,
	canSponsor,
	introductionBlocker,
	normalizeNote,
	pairOf,
	succeededBy,
	type IntroductionCheck
} from './introductions';

const ok: IntroductionCheck = {
	sponsor: true,
	same: false,
	bothInNetwork: true,
	minor: false,
	blocked: false,
	alreadyPlayed: false,
	alreadyIntroduced: false,
	recent: 0,
	noteLength: 0
};

describe('canSponsor', () => {
	it('Pilier local et Référence parrainent, pas les paliers d’avant', () => {
		expect(canSponsor(['FIRST_STEPS', 'LOCAL_PILLAR'])).toBe(true);
		expect(canSponsor(['REFERENCE'])).toBe(true);
		expect(canSponsor(['FIRST_STEPS', 'NETWORKED', 'COLLABORATOR', 'STAGE'])).toBe(false);
		expect(canSponsor([])).toBe(false);
	});
});

describe('pairOf', () => {
	it('range la paire, dans les deux sens', () => {
		expect(pairOf('b', 'a')).toEqual(['a', 'b']);
		expect(pairOf('a', 'b')).toEqual(['a', 'b']);
	});
});

describe('normalizeNote', () => {
	it('resserre les espaces et retire les lignes vides', () => {
		expect(normalizeNote('  Vous jouez   funk \n\n tous les deux ')).toBe(
			'Vous jouez funk\ntous les deux'
		);
	});
});

describe('introductionBlocker', () => {
	it('laisse passer une présentation valable', () => {
		expect(introductionBlocker(ok)).toBeNull();
	});

	it('dit ce qui manque, dans l’ordre', () => {
		expect(introductionBlocker({ ...ok, sponsor: false })).toMatch(/Pilier local/);
		expect(introductionBlocker({ ...ok, same: true })).toMatch(/différentes/);
		expect(introductionBlocker({ ...ok, bothInNetwork: false })).toMatch(/réseau musical/);
		expect(introductionBlocker({ ...ok, alreadyPlayed: true })).toMatch(/déjà joué/);
		expect(introductionBlocker({ ...ok, alreadyIntroduced: true })).toMatch(/déjà présentées/);
		expect(introductionBlocker({ ...ok, recent: MAX_INTRODUCTIONS })).toMatch(/par mois/);
		expect(introductionBlocker({ ...ok, noteLength: MAX_INTRO_NOTE + 1 })).toMatch(/caractères/);
	});

	it('une mineure ou un blocage : même réponse, sans dire pourquoi', () => {
		const minor = introductionBlocker({ ...ok, minor: true });
		expect(minor).toBe(introductionBlocker({ ...ok, blocked: true }));
		expect(minor).not.toMatch(/mineur|bloqu/i);
	});
});

describe('succeededBy', () => {
	const at = (d: string) => new Date(`2026-11-${d}T12:00:00Z`);
	const intro = { firstId: 'a', secondId: 'b', createdAt: at('01') };

	it('les deux présentées collaborent après : réussie', () => {
		expect(succeededBy([intro], ['a', 'b'], at('05'))).toEqual([intro]);
		expect(succeededBy([intro], ['b', 'x', 'a'], at('05'))).toEqual([intro]);
	});

	it('une seule des deux, ou une collaboration d’avant : rien', () => {
		expect(succeededBy([intro], ['a', 'x'], at('05'))).toEqual([]);
		expect(succeededBy([intro], ['a', 'b'], new Date('2026-10-30T12:00:00Z'))).toEqual([]);
	});
});
