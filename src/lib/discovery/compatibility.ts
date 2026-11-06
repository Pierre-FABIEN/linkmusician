/**
 * Suggestions de musicien·nes (P2-18, conception 07 §7.1) : compatibilité
 * entre deux profils musicaux. Genres en commun, **niveau déclaré proche**,
 * instrument complémentaire (une guitariste se voit proposer basse,
 * batterie, voix), distance par tranches, réseau musical en premier.
 *
 * **Jamais l'XP ni le palier** : `MusicalSide` n'a aucun champ de
 * progression. Module pur, partagé par le serveur et le navigateur.
 */
import type { InstrumentFamilyValue } from '../skills/instruments';

/** Rôle d'un instrument dans un groupe : c'est lui qui dit « complémentaire ». */
export type BandRole = 'VOICE' | 'HARMONY' | 'BASS' | 'RHYTHM' | 'MELODY' | 'ELECTRONIC';

const BASS_SLUGS = new Set(['basse', 'contrebasse', 'tuba']);

export function roleOf(instrument: { slug: string; family: InstrumentFamilyValue }): BandRole {
	if (BASS_SLUGS.has(instrument.slug)) return 'BASS';
	switch (instrument.family) {
		case 'VOICE':
			return 'VOICE';
		case 'PLUCKED_STRINGS':
		case 'KEYBOARDS':
			return 'HARMONY';
		case 'DRUMS_PERCUSSION':
			return 'RHYTHM';
		case 'ELECTRONIC':
			return 'ELECTRONIC';
		case 'BOWED_STRINGS':
		case 'BRASS':
		case 'WOODWINDS':
		case 'WORLD':
			return 'MELODY';
	}
}

export type MusicalSide = {
	instruments: {
		slug: string;
		name: string;
		family: InstrumentFamilyValue;
		/** Niveau déclaré, 1 à 5. */
		level: number;
		primary: boolean;
	}[];
	/** Genres, avec leur genre parent (un sous-genre rapproche à moitié). */
	genres: { id: string; name: string; parentId: string | null }[];
};

export type Compatibility = {
	score: number;
	/** Genres en commun (noms), pour dire pourquoi. */
	sharedGenres: string[];
	/** Instrument de l'autre qui complète le mien, s'il y en a un. */
	complement: string | null;
	/** Niveaux déclarés proches (au plus un cran d'écart). */
	closeLevel: boolean;
};

/** Instrument de référence : le principal, sinon le mieux maîtrisé. */
function mainInstrument(side: MusicalSide) {
	return (
		side.instruments.find((i) => i.primary) ??
		[...side.instruments].sort((a, b) => b.level - a.level)[0] ??
		null
	);
}

/**
 * Compatibilité de `other` pour `me`. Score nul : rien à suggérer (ni genre
 * proche, ni instrument complémentaire).
 */
export function compatibility(me: MusicalSide, other: MusicalSide): Compatibility {
	const myGenreIds = new Set(me.genres.map((g) => g.id));
	const myFamilies = new Set(me.genres.map((g) => g.parentId ?? g.id));
	const shared = other.genres.filter((g) => myGenreIds.has(g.id));
	const sameFamily = other.genres.filter(
		(g) => !myGenreIds.has(g.id) && myFamilies.has(g.parentId ?? g.id)
	);
	const genreScore = Math.min(3, shared.length * 2 + sameFamily.length);

	const myRoles = new Set(me.instruments.map(roleOf));
	const complement =
		[...other.instruments]
			.sort((a, b) => Number(b.primary) - Number(a.primary) || b.level - a.level)
			.find((i) => !myRoles.has(roleOf(i))) ?? null;

	const mine = mainInstrument(me);
	const theirs = mainInstrument(other);
	const gap = mine && theirs ? Math.abs(mine.level - theirs.level) : null;
	const levelScore = gap === null ? 0 : gap === 0 ? 2 : gap === 1 ? 1 : gap >= 3 ? -1 : 0;

	const relevant = genreScore > 0 || complement !== null;
	const score = relevant ? genreScore + (complement ? 2 : 0) + levelScore : 0;
	return {
		score: Math.max(0, score),
		sharedGenres: [...shared, ...sameFamily].map((g) => g.name),
		complement: complement?.name ?? null,
		closeLevel: gap !== null && gap <= 1
	};
}

export type SuggestionCandidate = {
	actorId: string;
	inNetwork: boolean;
	/** Rang de la tranche de distance (0 = la plus proche). */
	bandRank: number;
	/** Distance en mètres, pour départager à égalité seulement. */
	meters: number;
	compatibility: Compatibility;
};

/**
 * Ordre des suggestions : son réseau musical d'abord, puis la compatibilité,
 * puis la tranche de distance, puis la distance. Les candidats sans
 * compatibilité sont écartés.
 */
export function rankSuggestions<T extends SuggestionCandidate>(candidates: readonly T[]): T[] {
	return candidates
		.filter((c) => c.compatibility.score > 0)
		.sort(
			(a, b) =>
				Number(b.inNetwork) - Number(a.inNetwork) ||
				b.compatibility.score - a.compatibility.score ||
				a.bandRank - b.bandRank ||
				a.meters - b.meters ||
				a.actorId.localeCompare(b.actorId)
		);
}

/** Pourquoi cette suggestion, en quelques mots (« Rock en commun · batterie »). */
export function reasonOf(c: Compatibility): string {
	const parts: string[] = [];
	if (c.sharedGenres.length > 0) parts.push(`${c.sharedGenres.slice(0, 2).join(', ')} en commun`);
	if (c.complement) parts.push(c.complement.toLowerCase());
	if (c.closeLevel) parts.push('niveau proche');
	const text = parts.join(' · ');
	return text.charAt(0).toUpperCase() + text.slice(1);
}
