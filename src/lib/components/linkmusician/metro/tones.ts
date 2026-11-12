/**
 * LINKMUSICIAN: tons et tailles Metro (D55, `docs/design` §4.2). La couleur dit
 * **de quoi il s'agit**, pas sur quelle page on est : le même sujet a le même
 * ton partout. Trois tons vifs au plus par écran, en plus de `paper` et `ink`.
 */
export const TONES = [
	'violet',
	'rose',
	'blue',
	'orange',
	'amber',
	'lime',
	'cyan',
	'ink',
	'paper'
] as const;
export type Tone = (typeof TONES)[number];

/** Tailles de la mosaïque (4 colonnes) : `sm` 2×1, `md` 2×2, `wide` 4×2, `band` 4×1, `tall` 2×3, `big` 4×3. */
export const SIZES = ['sm', 'md', 'wide', 'band', 'tall', 'big'] as const;
export type Size = (typeof SIZES)[number];

/** Un ton par sens (Q39 : table proposée, avec les corrections des maquettes). */
export const TONE_OF = {
	/** Le mode Carrière et la progression : héros Carrière, carte des actes, niveau, rangs. */
	career: 'violet',
	progress: 'violet',
	/** Le mode Jam, jouer bientôt : héros Jam, prochaine jam, « Lancer une jam ». */
	jam: 'orange',
	/** Ta prochaine étape et ce qui se gagne : objectifs, succès, quêtes. */
	nextStep: 'amber',
	goals: 'amber',
	/** Le temps : dates, agenda, disponibilités, plateaux à venir, échéances. */
	agenda: 'cyan',
	availability: 'cyan',
	stages: 'cyan',
	/** Les gens : réseau, appréciations, carnet, contacts, suggestions, recrutement. */
	people: 'rose',
	contacts: 'rose',
	appreciations: 'rose',
	announcements: 'rose',
	/** Le travail : sessions, studio, morceaux, son, collaborations. */
	work: 'blue',
	works: 'blue',
	studio: 'blue',
	/** C'est confirmé : réussite, présence, accord, étape vérifiée. */
	confirmed: 'lime',
	/** Repères neutres : chiffres, journal, témoignage. */
	figures: 'ink',
	/** Le reste : secondaire, formulaires, listes, notifications, réglages. */
	neutral: 'paper'
} as const satisfies Record<string, Tone>;

/** Le ton du mode de jeu : il colore le héros et la pastille du mode. */
export function toneOfMode(mode: 'JAM' | 'CAREER'): Tone {
	return mode === 'JAM' ? TONE_OF.jam : TONE_OF.career;
}
