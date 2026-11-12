/**
 * La fiche de chaque métier (`TRACK_ROLES`) et les listes plus anciennes
 * doivent s'accorder : un métier ouvert ou ajouté à moitié échoue ici.
 */
import { describe, expect, it } from 'vitest';
import { minSpecializations, TRACK_ROLES, trackOfSlug } from './roles';
import { TRACK_KINDS, TRACKS } from './tracks';
import { SPECIALIZATIONS } from './specializations';
import { SEARCH_TRACKS } from '#lib/search/filters';
import { BREADCRUMB_ROUTES } from '#lib/linkmusician/breadcrumbs';

describe('fiche de chaque métier', () => {
	it('existe pour chaque métier, avec une adresse unique et relisible', () => {
		for (const track of TRACK_KINDS) {
			expect(TRACK_ROLES[track].track).toBe(track);
			expect(TRACK_ROLES[track].slug).toMatch(/^[a-z][a-z-]*$/);
			expect(trackOfSlug(TRACK_ROLES[track].slug)).toBe(track);
		}
		const slugs = TRACK_KINDS.map((t) => TRACK_ROLES[t].slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it('utilise la même adresse que la recherche, qui couvre exactement les métiers ouverts', () => {
		const searchable = TRACK_KINDS.filter((t) => TRACKS[t].available);
		expect(Object.values(SEARCH_TRACKS).sort()).toEqual([...searchable].sort());
		for (const [slug, track] of Object.entries(SEARCH_TRACKS))
			expect(TRACK_ROLES[track].slug).toBe(slug);
	});

	it('pointe vers une page de profil déclarée au fil d’Ariane (D52)', () => {
		for (const track of TRACK_KINDS) {
			const path = TRACK_ROLES[track].profilePath;
			if (path) expect(BREADCRUMB_ROUTES).toContain(path);
		}
	});

	it('a une page de profil pour chaque métier ouvert', () => {
		for (const track of TRACK_KINDS.filter((t) => TRACKS[t].available))
			expect(TRACK_ROLES[track].profilePath).not.toBeNull();
	});

	it('déclare son profil historique comme le référentiel des spécialités', () => {
		for (const track of TRACK_KINDS) {
			const hasLegacy = SPECIALIZATIONS[track].some((s) => s.legacy);
			expect(TRACK_ROLES[track].legacyProfile !== null).toBe(hasLegacy);
		}
	});

	it('ne demande instruments et intention qu’aux musicien·nes ; une étape à tous les autres', () => {
		for (const track of TRACK_KINDS) {
			const { instruments, intention, ownStep } = TRACK_ROLES[track].onboarding;
			const musician = track === 'MUSICIAN';
			expect([instruments, intention, ownStep]).toEqual([musician, musician, !musician]);
		}
	});

	it('exige une spécialité pour un métier ouvert seulement, et en propose toujours', () => {
		for (const track of TRACK_KINDS) {
			expect(minSpecializations(track)).toBe(TRACKS[track].available ? 1 : 0);
			if (TRACK_ROLES[track].onboarding.ownStep)
				expect(SPECIALIZATIONS[track].length).toBeGreaterThan(0);
		}
	});
});
