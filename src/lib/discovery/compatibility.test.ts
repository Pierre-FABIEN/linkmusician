import { describe, expect, it } from 'vitest';
import {
	compatibility,
	rankSuggestions,
	reasonOf,
	roleOf,
	type MusicalSide,
	type SuggestionCandidate
} from './compatibility';

const rock = { id: 'rock', name: 'Rock', parentId: null };
const punk = { id: 'punk', name: 'Punk', parentId: 'rock' };
const jazz = { id: 'jazz', name: 'Jazz', parentId: null };

const guitarist: MusicalSide = {
	instruments: [
		{
			slug: 'guitare-electrique',
			name: 'Guitare électrique',
			family: 'PLUCKED_STRINGS',
			level: 3,
			primary: true
		}
	],
	genres: [rock]
};
const drummer = (level: number, genres: MusicalSide['genres'] = [rock]): MusicalSide => ({
	instruments: [
		{ slug: 'batterie', name: 'Batterie', family: 'DRUMS_PERCUSSION', level, primary: true }
	],
	genres
});

describe('rôles', () => {
	it('la basse complète la guitare, même famille d’instruments', () => {
		expect(roleOf({ slug: 'basse', family: 'PLUCKED_STRINGS' })).toBe('BASS');
		expect(roleOf({ slug: 'guitare-electrique', family: 'PLUCKED_STRINGS' })).toBe('HARMONY');
		expect(roleOf({ slug: 'batterie', family: 'DRUMS_PERCUSSION' })).toBe('RHYTHM');
	});
});

describe('compatibilité', () => {
	it('une batteuse rock de mon niveau : très compatible', () => {
		const c = compatibility(guitarist, drummer(3));
		expect(c).toMatchObject({ sharedGenres: ['Rock'], complement: 'Batterie', closeLevel: true });
		expect(c.score).toBe(6);
		expect(reasonOf(c)).toBe('Rock en commun · batterie · niveau proche');
	});

	it('niveau déclaré proche avant niveau éloigné', () => {
		expect(compatibility(guitarist, drummer(3)).score).toBeGreaterThan(
			compatibility(guitarist, drummer(5)).score
		);
	});

	it('un sous-genre rapproche, moins qu’un genre en commun', () => {
		const sub = compatibility(guitarist, drummer(3, [punk])).score;
		expect(sub).toBeGreaterThan(compatibility(guitarist, drummer(3, [jazz])).score);
		expect(sub).toBeLessThan(compatibility(guitarist, drummer(3)).score);
	});

	it('même rôle et aucun genre en commun : rien à suggérer', () => {
		const other: MusicalSide = {
			instruments: [{ slug: 'piano', name: 'Piano', family: 'KEYBOARDS', level: 3, primary: true }],
			genres: [jazz]
		};
		expect(compatibility(guitarist, other).score).toBe(0);
	});
});

describe('ordre des suggestions', () => {
	const cand = (actorId: string, over: Partial<SuggestionCandidate>): SuggestionCandidate => ({
		actorId,
		inNetwork: false,
		bandRank: 1,
		meters: 8000,
		compatibility: compatibility(guitarist, drummer(3)),
		...over
	});

	it('réseau d’abord, puis compatibilité, puis tranche de distance', () => {
		const ranked = rankSuggestions([
			cand('loin', { bandRank: 3, meters: 40_000 }),
			cand('proche', { bandRank: 0, meters: 2000 }),
			cand('reseau', { inNetwork: true, compatibility: compatibility(guitarist, drummer(5)) }),
			cand('moins', { bandRank: 0, compatibility: compatibility(guitarist, drummer(5)) }),
			cand('rien', {
				compatibility: { score: 0, sharedGenres: [], complement: null, closeLevel: false }
			})
		]);
		expect(ranked.map((c) => c.actorId)).toEqual(['reseau', 'proche', 'loin', 'moins']);
	});

	it('aucune donnée de progression dans les entrées', () => {
		const keys = Object.keys(cand('x', {}));
		expect(keys.some((k) => /xp|level|trust|tier/i.test(k))).toBe(false);
		expect(Object.keys(guitarist).some((k) => /xp|trust|tier/i.test(k))).toBe(false);
	});
});
