/**
 * Formation et répertoire d'un groupe (ONB-12c1, D64) : règles pures,
 * partagées par le serveur et le navigateur.
 *
 * Un duo ou un groupe de reprises est une organisation `BAND`, jamais une
 * personne : c'est le groupe qui déclare sa formation et son répertoire.
 * Ces valeurs sont **déclaratives** (pas « vérifiées ») et une valeur absente
 * vaut « non précisé » : elle n'exclut jamais (D61, D63).
 */
import { z } from 'zod';

/** Alignées sur l'enum Prisma `BandFormation`. */
export const BAND_FORMATIONS = ['SOLO', 'DUO', 'TRIO', 'BAND'] as const;
export type BandFormationValue = (typeof BAND_FORMATIONS)[number];

export const BAND_FORMATION_INFO: Readonly<
	Record<BandFormationValue, { label: string; hint: string }>
> = {
	SOLO: { label: 'Solo', hint: 'Un projet porté par une seule personne sur scène.' },
	DUO: { label: 'Duo', hint: 'Deux personnes sur scène.' },
	TRIO: { label: 'Trio', hint: 'Trois personnes sur scène.' },
	BAND: { label: 'Groupe', hint: 'Quatre personnes ou plus sur scène.' }
};

/** Alignées sur l'enum Prisma `BandRepertoire`. */
export const BAND_REPERTOIRES = ['COVERS', 'ORIGINALS', 'BOTH'] as const;
export type BandRepertoireValue = (typeof BAND_REPERTOIRES)[number];

export const BAND_REPERTOIRE_INFO: Readonly<
	Record<BandRepertoireValue, { label: string; hint: string }>
> = {
	COVERS: { label: 'Reprises', hint: 'Vous jouez surtout les morceaux d’autres artistes.' },
	ORIGINALS: { label: 'Compositions', hint: 'Vous jouez surtout vos propres morceaux.' },
	BOTH: { label: 'Reprises et compositions', hint: 'Un peu des deux.' }
};

/** Champ de formulaire facultatif : vide → `null` (« non précisé »). */
const optional = <T extends readonly [string, ...string[]]>(values: T) =>
	z
		.union([z.enum(values), z.literal('')])
		.optional()
		.transform((v) => (v ? (v as T[number]) : null));

export const bandLineupSchema = z.object({
	formation: optional(BAND_FORMATIONS),
	repertoire: optional(BAND_REPERTOIRES)
});
export type BandLineup = z.infer<typeof bandLineupSchema>;

/** Résultat d'un rapprochement : jamais « non » quand l'information manque. */
export type LineupMatch = 'yes' | 'no' | 'unknown';

/** La formation déclarée correspond-elle à celle recherchée (ONB-13b) ? */
export function formationMatch(
	wanted: BandFormationValue | null,
	declared: BandFormationValue | null
): LineupMatch {
	if (!wanted) return 'yes';
	if (!declared) return 'unknown';
	return wanted === declared ? 'yes' : 'no';
}

/**
 * Le répertoire déclaré correspond-il à celui recherché ? Un groupe qui joue
 * « les deux » convient à une recherche de reprises comme de compositions.
 */
export function repertoireMatch(
	wanted: BandRepertoireValue | null,
	declared: BandRepertoireValue | null
): LineupMatch {
	if (!wanted) return 'yes';
	if (!declared) return 'unknown';
	if (declared === 'BOTH' || wanted === declared) return 'yes';
	// Chercher « les deux » : un groupe d'un seul répertoire n'y répond qu'à moitié.
	return 'no';
}

/** « Duo · Reprises », ou `null` si rien n'est précisé. */
export function lineupSummary(lineup: {
	formation: BandFormationValue | null;
	repertoire: BandRepertoireValue | null;
}): string | null {
	const parts = [
		lineup.formation ? BAND_FORMATION_INFO[lineup.formation].label : null,
		lineup.repertoire ? BAND_REPERTOIRE_INFO[lineup.repertoire].label : null
	].filter((p): p is string => p !== null);
	return parts.length ? parts.join(' · ') : null;
}

/**
 * Formation déclarée et effectif actif ne racontent pas la même chose :
 * un indice pour la gestion, jamais une correction automatique (un duo
 * peut compter des membres qui ne montent pas sur scène).
 */
export function formationHint(
	formation: BandFormationValue | null,
	activeMembers: number
): string | null {
	if (!formation) return null;
	const expected = { SOLO: 1, DUO: 2, TRIO: 3, BAND: 4 }[formation];
	const mismatch = formation === 'BAND' ? activeMembers < 4 : activeMembers !== expected;
	if (!mismatch) return null;
	return `Le groupe compte ${activeMembers} membre${activeMembers > 1 ? 's' : ''} actif${activeMembers > 1 ? 's' : ''} sur l’application : vérifie que la formation correspond à ce que vous proposez sur scène.`;
}
