/**
 * Artiste solo sur scène (P8, D77) : règles pures du concert dont
 * l'interprète est une personne. Écrit le 19/11/2026, **non exécuté** dans la
 * session (recette globale ultérieure).
 *
 *   npm run test:unit -- --run src/lib/collaborations/solo.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
	checkGigParties,
	collaborationSchema,
	gigPerformerHandle,
	gigPlayers,
	gigSplitOk,
	gigWitnesses,
	type GigPerformer
} from './rules';

const camille = 'camille';
const patron = 'patron';
const band: GigPerformer = { kind: 'BAND', id: 'les-rats', players: [camille, 'malik'] };
const solo: GigPerformer = { kind: 'PERSON', id: camille };

describe('interprète d’un concert (P8)', () => {
	it('une personne ou un groupe désigne l’interprète ; `band` reste accepté', () => {
		expect(checkGigParties('GIG', { performer: camille, host: 'le-bar' })).toBeNull();
		expect(checkGigParties('GIG', { band: 'les-rats', host: 'le-bar' })).toBeNull();
		expect(checkGigParties('GIG', { host: 'le-bar' })).toMatch(/qui a joué/);
		expect(checkGigParties('GIG', { performer: camille })).toMatch(/lieu/);
		expect(gigPerformerHandle({ performer: camille, band: undefined })).toBe(camille);
		expect(gigPerformerHandle({ band: 'les-rats' })).toBe('les-rats');
		expect(gigPerformerHandle({})).toBeNull();
	});

	it('jamais les deux à la fois : le groupe ou la personne (DC4)', () => {
		expect(
			checkGigParties('GIG', { performer: camille, band: 'les-rats', host: 'le-bar' })
		).toMatch(/une seule/);
		// Identiques : un ancien formulaire qui envoie les deux champs.
		expect(
			checkGigParties('GIG', { performer: 'les-rats', band: 'les-rats', host: 'le-bar' })
		).toBeNull();
	});

	it('hors concert, aucun interprète', () => {
		expect(checkGigParties('REHEARSAL', { performer: camille })).toMatch(/Seul un concert/);
	});

	it('le formulaire accepte `performer` et rien d’autre de nouveau', () => {
		const parsed = collaborationSchema('2026-11-19').safeParse({
			kind: 'GIG',
			title: 'Concert au bar',
			happenedOn: '2026-11-18',
			performer: camille,
			host: 'le-bar'
		});
		expect(parsed.success).toBe(true);
		expect(parsed.success && parsed.data.performer).toBe(camille);
		// Le client n'envoie aucune valeur de progression : un champ inconnu est ignoré.
		const withXp = collaborationSchema('2026-11-19').safeParse({
			kind: 'GIG',
			title: 'Concert au bar',
			happenedOn: '2026-11-18',
			performer: camille,
			host: 'le-bar',
			xp: 9999,
			proof: 'VERIFIED'
		});
		expect(withXp.success && 'xp' in withXp.data).toBe(false);
		expect(withXp.success && 'proof' in withXp.data).toBe(false);
	});
});

describe('séparation des rôles (P5-06, D75, P8)', () => {
	it('solo : la personne joue, l’autre gère l’hôte', () => {
		expect(gigPlayers(solo, [camille, patron])).toEqual([camille]);
		expect(gigSplitOk(solo, [camille, patron], [patron])).toBe(true);
	});

	it('solo : on ne s’accueille pas soi-même', () => {
		expect(gigSplitOk(solo, [camille, patron], [camille])).toBe(false);
		expect(gigSplitOk(solo, [camille, patron], [camille, patron])).toBe(false);
	});

	it('solo : la personne interprète doit être de la conversation', () => {
		expect(gigSplitOk(solo, ['nina', patron], [patron])).toBe(false);
	});

	it('solo : sans gestion distincte de l’hôte, rien', () => {
		expect(gigSplitOk(solo, [camille, patron], [])).toBe(false);
	});

	it('groupe : règle d’avant P8 inchangée', () => {
		expect(gigSplitOk(band, [camille, patron], [patron])).toBe(true);
		// Deux membres du groupe : personne ne gère l'hôte.
		expect(gigSplitOk(band, [camille, 'malik'], [])).toBe(false);
		// Ni l'un ni l'autre ne joue dans le groupe.
		expect(gigSplitOk(band, ['nina', patron], [patron])).toBe(false);
	});

	it('témoins : qui accueille sans jouer, qui joue sans accueillir', () => {
		expect(gigWitnesses([camille], [patron])).toEqual({ hosts: [patron], confirmers: [camille] });
		expect(gigWitnesses([camille], [camille])).toEqual({ hosts: [], confirmers: [] });
		expect(gigWitnesses([], [patron])).toEqual({ hosts: [patron], confirmers: [] });
	});
});
