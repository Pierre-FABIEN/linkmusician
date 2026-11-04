/**
 * Échelle de niveau d'instrument (D11) : cinq niveaux décrits par ce que la
 * personne sait faire, pour que deux personnes du même niveau se comprennent.
 * Le niveau est toujours affiché comme **déclaré** (voir `levelLabel`).
 *
 * Module pur, partagé par le serveur et le navigateur.
 */

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

export type InstrumentLevel = 1 | 2 | 3 | 4 | 5;

export const INSTRUMENT_LEVELS: readonly {
	level: InstrumentLevel;
	label: string;
	/** Complète « Je peux… ». */
	descriptor: string;
}[] = [
	{
		level: 1,
		label: 'Découverte',
		descriptor: 'jouer quelques morceaux ou accords seul·e, je débute'
	},
	{
		level: 2,
		label: 'Amateur',
		descriptor: "jouer des morceaux complets, j'ai déjà joué avec d'autres"
	},
	{
		level: 3,
		label: 'Confirmé',
		descriptor: 'tenir un set de 45 min en groupe, suivre une grille, improviser un peu'
	},
	{
		level: 4,
		label: 'Avancé',
		descriptor: 'jouer régulièrement sur scène, enregistrer en studio sans difficulté'
	},
	{
		level: 5,
		label: 'Professionnel',
		descriptor: 'vivre en partie de mon instrument (sessions, scène, enseignement)'
	}
];

export function isInstrumentLevel(value: unknown): value is InstrumentLevel {
	return (
		Number.isInteger(value) && (value as number) >= MIN_LEVEL && (value as number) <= MAX_LEVEL
	);
}

/** Libellé public, avec la mention obligatoire « (déclaré) ». */
export function levelLabel(level: InstrumentLevel): string {
	return `${INSTRUMENT_LEVELS[level - 1].label} (déclaré)`;
}
