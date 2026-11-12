import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TRACK_KINDS, TRACKS } from '#lib/actors/tracks';
import { activeTrack, contextDestination, navigationContext, roleMenu } from './navigation';

const tracks = [
	{ track: 'MUSICIAN' as const, isPrimary: true },
	{ track: 'SOUND_ENGINEER' as const, isPrimary: false }
];

describe('navigation multirôle', () => {
	it('préfère le contexte détenu, puis le principal ; un métier retiré ne reste pas actif', () => {
		expect(activeTrack(tracks, 'SOUND_ENGINEER')).toBe('SOUND_ENGINEER');
		expect(activeTrack(tracks, 'MANAGER')).toBe('MUSICIAN');
		expect(activeTrack([], 'SOUND_ENGINEER')).toBeNull();
		expect(navigationContext(tracks, 'SOUND_ENGINEER')?.profileHref).toBe(
			'/profil/metier/inge-son'
		);
		expect(tracks[0].isPrimary).toBe(true);
	});

	it('garde les filtres et le fragment de la page, adapte la fiche métier', () => {
		expect(
			contextDestination(
				'/decouvrir?metier=producteur&genre=funk&page=2#resultats',
				'SOUND_ENGINEER'
			)
		).toBe('/decouvrir?metier=producteur&genre=funk&page=2#resultats');
		expect(contextDestination('/profil/pratique', 'SOUND_ENGINEER')).toBe(
			'/profil/metier/inge-son'
		);
		expect(contextDestination('/profil/metier/inge-son', 'MUSICIAN')).toBe('/profil/pratique');
	});

	it.each([
		'https://example.org',
		'//example.org',
		'/\\example.org',
		'/espace/../../admin',
		'/auth',
		'/%2f%2fexample.org',
		'/espace\n'
	])('refuse un retour externe ou hors espace : %s', (target) => {
		expect(contextDestination(target, 'MUSICIAN')).toBe('/espace');
	});

	it('toutes les destinations de chaque métier existent ; les métiers bientôt ne promettent que leur fiche', () => {
		for (const track of TRACK_KINDS) {
			const menu = roleMenu(track);
			if (!TRACKS[track].available) expect(menu).toHaveLength(1);
			for (const { href } of menu) {
				const route = href.startsWith('/profil/metier/') ? '/profil/metier/[slug]' : href;
				expect(existsSync(`src/routes/(app)${route}/+page.svelte`), `${track} → ${href}`).toBe(
					true
				);
			}
		}
	});
});
