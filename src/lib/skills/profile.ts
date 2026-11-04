/**
 * Profil musical (P1-06) : règles de saisie et détection du profil complété.
 *
 * Module pur, partagé par le serveur et le navigateur.
 */
import { isInstrumentLevel, type InstrumentLevel } from './levels';

export const MAX_INSTRUMENTS = 5;
export const MAX_GENRES = 5;
export const MAX_INFLUENCES = 10;
export const MAX_INFLUENCE_LENGTH = 80;

export type PlayedInstrument = { instrumentId: string; level: InstrumentLevel };

export type MusicalProfileInput = {
	instruments: readonly { instrumentId: string; level: number }[];
	primaryInstrumentId?: string | null;
	genreIds: readonly string[];
	influences: string;
};

export type MusicalProfile = {
	instruments: PlayedInstrument[];
	primaryInstrumentId: string;
	genreIds: string[];
	influences: string[];
};

export type MusicalProfileProblem =
	| 'instruments_empty'
	| 'instruments_too_many'
	| 'instruments_duplicate'
	| 'level'
	| 'primary'
	| 'genres_empty'
	| 'genres_too_many'
	| 'influences_too_many'
	| 'influence_too_long';

export const MUSICAL_PROFILE_MESSAGES: Record<MusicalProfileProblem, string> = {
	instruments_empty: 'Ajoute au moins un instrument (la voix compte).',
	instruments_too_many: `${MAX_INSTRUMENTS} instruments au maximum.`,
	instruments_duplicate: 'Chaque instrument ne figure qu’une fois.',
	level: 'Choisis un niveau pour chaque instrument.',
	primary: 'Choisis ton instrument principal parmi tes instruments.',
	genres_empty: 'Choisis au moins un genre.',
	genres_too_many: `${MAX_GENRES} genres au maximum.`,
	influences_too_many: `${MAX_INFLUENCES} influences au maximum.`,
	influence_too_long: `Une influence fait au plus ${MAX_INFLUENCE_LENGTH} caractères.`
};

/**
 * Influences saisies une par ligne : texte brut, espaces et caractères de
 * contrôle normalisés, lignes vides et doublons (sans tenir compte de la
 * casse) retirés. Jamais de HTML : l'affichage échappe le texte.
 */
export function parseInfluences(text: string): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const line of text.split(/\r?\n/)) {
		const clean = line
			// eslint-disable-next-line no-control-regex -- on retire justement ces caractères
			.replace(/[\u0000-\u001f\u007f]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
		const key = clean.toLocaleLowerCase('fr');
		if (clean === '' || seen.has(key)) continue;
		seen.add(key);
		result.push(clean);
	}
	return result;
}

/** Vérifie et normalise une saisie. Un seul instrument devient principal d'office. */
export function checkMusicalProfile(
	input: MusicalProfileInput
): { ok: true; profile: MusicalProfile } | { ok: false; problems: MusicalProfileProblem[] } {
	const problems: MusicalProfileProblem[] = [];
	const ids = input.instruments.map((i) => i.instrumentId);

	if (ids.length === 0) problems.push('instruments_empty');
	if (ids.length > MAX_INSTRUMENTS) problems.push('instruments_too_many');
	if (new Set(ids).size !== ids.length) problems.push('instruments_duplicate');
	if (!input.instruments.every((i) => isInstrumentLevel(i.level))) problems.push('level');

	const primary = ids.length === 1 ? ids[0] : input.primaryInstrumentId;
	if (ids.length > 1 && (!primary || !ids.includes(primary))) problems.push('primary');

	const genreIds = [...new Set(input.genreIds)];
	if (genreIds.length === 0) problems.push('genres_empty');
	if (genreIds.length > MAX_GENRES) problems.push('genres_too_many');

	const influences = parseInfluences(input.influences);
	if (influences.length > MAX_INFLUENCES) problems.push('influences_too_many');
	if (influences.some((i) => i.length > MAX_INFLUENCE_LENGTH)) problems.push('influence_too_long');

	if (problems.length > 0) return { ok: false, problems };
	return {
		ok: true,
		profile: {
			instruments: input.instruments.map((i) => ({
				instrumentId: i.instrumentId,
				level: i.level as InstrumentLevel
			})),
			primaryInstrumentId: primary as string,
			genreIds,
			influences
		}
	};
}

/**
 * « Profil complété » (conception 02 §3, D18) : au moins un instrument, au
 * moins un genre, une zone et une bio. Sert à émettre `profile.completed` la
 * première fois que la condition est remplie (P1-07). Le statut pro, les liens
 * et le reste du profil complet (P1-06b) n'en font pas partie.
 */
export function isProfileComplete(profile: {
	instrumentCount: number;
	genreCount: number;
	hasZone: boolean;
	bio: string | null | undefined;
}): boolean {
	return (
		profile.instrumentCount >= 1 &&
		profile.genreCount >= 1 &&
		profile.hasZone &&
		(profile.bio ?? '').trim().length > 0
	);
}

/**
 * Validation des seuls instruments (onboarding, écran dédié). Mêmes règles
 * que `checkMusicalProfile`.
 */
export function checkInstrumentsInput(
	instruments: MusicalProfileInput['instruments'],
	primaryInstrumentId?: string | null
):
	| { ok: true; instruments: PlayedInstrument[]; primaryInstrumentId: string }
	| { ok: false; problems: MusicalProfileProblem[] } {
	const result = checkMusicalProfile({
		instruments,
		primaryInstrumentId,
		genreIds: ['_'],
		influences: ''
	});
	if (!result.ok) return result;
	return {
		ok: true,
		instruments: result.profile.instruments,
		primaryInstrumentId: result.profile.primaryInstrumentId
	};
}

/** Validation des seuls genres et influences (onboarding, écran dédié). */
export function checkGenresInput(
	genreIds: readonly string[],
	influences = ''
):
	| { ok: true; genreIds: string[]; influences: string[] }
	| { ok: false; problems: MusicalProfileProblem[] } {
	const result = checkMusicalProfile({
		instruments: [{ instrumentId: '_', level: 1 }],
		genreIds,
		influences
	});
	if (!result.ok) return result;
	return { ok: true, genreIds: result.profile.genreIds, influences: result.profile.influences };
}
