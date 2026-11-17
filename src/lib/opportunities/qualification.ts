/**
 * Annonce qualifiée (ONB-13b, #27, D63) : les conditions d'une collaboration
 * se fixent sur l'**annonce**, pas sur le profil. Règles pures, partagées par
 * le serveur et le navigateur.
 *
 * Toutes facultatives (`null` : non précisé). Une condition n'écarte une
 * personne ou un groupe **que si son profil dit explicitement le contraire**
 * (`no`) ; une information absente du profil s'affiche « non précisé »
 * (`unknown`) et n'exclut jamais. Jamais l'XP.
 *
 * - Rémunération et fourchette : informatives (aucun champ de profil ne s'y
 *   oppose) ; une fourchette n'existe que pour « rémunéré » ou « défrayé ».
 * - Engagement (annonce de musicien·nes) : face à `MusicCommitment`.
 * - Présence (métier du son visé) : face à `CraftMobility`.
 * - Formation et répertoire (plateau) : face à la fiche du groupe (D64).
 */
import { z } from 'zod';
import {
	BAND_FORMATIONS,
	BAND_FORMATION_INFO,
	BAND_REPERTOIRES,
	BAND_REPERTOIRE_INFO,
	formationMatch,
	repertoireMatch,
	type BandFormationValue,
	type BandRepertoireValue,
	type LineupMatch
} from '#lib/bands/lineup';

export type { LineupMatch };

/** Alignées sur l'enum Prisma `OpportunityPay`. */
export const OPPORTUNITY_PAYS = [
	'PAID',
	'EXPENSES',
	'HAT',
	'VOLUNTEER',
	'EXCHANGE',
	'TO_DISCUSS'
] as const;
export type OpportunityPayValue = (typeof OPPORTUNITY_PAYS)[number];
export const OPPORTUNITY_PAY_LABELS: Readonly<Record<OpportunityPayValue, string>> = {
	PAID: 'Rémunéré',
	EXPENSES: 'Défrayé',
	HAT: 'Au chapeau',
	VOLUNTEER: 'Bénévole',
	EXCHANGE: 'Échange de services',
	TO_DISCUSS: 'À discuter'
};
/** Une fourchette n'a de sens que pour ces rémunérations. */
export const PAY_WITH_RANGE: readonly OpportunityPayValue[] = ['PAID', 'EXPENSES'];
export const MAX_PAY_EUROS = 100_000;

/** Alignées sur l'enum Prisma `OpportunityCommitment`. */
export const OPPORTUNITY_COMMITMENTS = ['ONE_OFF', 'REGULAR'] as const;
export type OpportunityCommitmentValue = (typeof OPPORTUNITY_COMMITMENTS)[number];
export const OPPORTUNITY_COMMITMENT_LABELS: Readonly<Record<OpportunityCommitmentValue, string>> = {
	ONE_OFF: 'Ponctuel',
	REGULAR: 'Régulier'
};

/** Alignées sur l'enum Prisma `OpportunityPresence`. */
export const OPPORTUNITY_PRESENCES = ['ON_SITE', 'REMOTE'] as const;
export type OpportunityPresenceValue = (typeof OPPORTUNITY_PRESENCES)[number];
export const OPPORTUNITY_PRESENCE_LABELS: Readonly<Record<OpportunityPresenceValue, string>> = {
	ON_SITE: 'Sur place',
	REMOTE: 'À distance'
};

export { BAND_FORMATIONS, BAND_FORMATION_INFO, BAND_REPERTOIRES, BAND_REPERTOIRE_INFO };

/** Champ de formulaire facultatif : vide → `null` (« non précisé »). */
const choice = <T extends readonly [string, ...string[]]>(values: T) =>
	z
		.union([z.enum(values), z.literal('')])
		.optional()
		.transform((v) => (v ? (v as T[number]) : null));
const euros = z
	.union([z.literal(''), z.coerce.number().int().min(0).max(MAX_PAY_EUROS)])
	.optional()
	.transform((v) => (v === '' || v === undefined ? null : v));

/** Champs de qualification d'un formulaire d'annonce ou de plateau. */
export const qualificationFields = {
	pay: choice(OPPORTUNITY_PAYS),
	payMin: euros,
	payMax: euros,
	formation: choice(BAND_FORMATIONS),
	repertoire: choice(BAND_REPERTOIRES),
	commitment: choice(OPPORTUNITY_COMMITMENTS),
	presence: choice(OPPORTUNITY_PRESENCES)
};

export type Qualification = {
	pay: OpportunityPayValue | null;
	payMinEuros: number | null;
	payMaxEuros: number | null;
	formation: BandFormationValue | null;
	repertoire: BandRepertoireValue | null;
	commitment: OpportunityCommitmentValue | null;
	presence: OpportunityPresenceValue | null;
};

export const EMPTY_QUALIFICATION: Qualification = {
	pay: null,
	payMinEuros: null,
	payMaxEuros: null,
	formation: null,
	repertoire: null,
	commitment: null,
	presence: null
};

type Raw = {
	pay?: OpportunityPayValue | null;
	payMin?: number | null;
	payMax?: number | null;
	formation?: BandFormationValue | null;
	repertoire?: BandRepertoireValue | null;
	commitment?: OpportunityCommitmentValue | null;
	presence?: OpportunityPresenceValue | null;
};

/**
 * Les conditions qu'un type d'annonce porte, relues côté serveur : un champ
 * qui ne s'applique pas est ignoré (jamais un critère fantôme), une
 * fourchette incohérente est refusée.
 */
export function normalizeQualification(
	scope: 'musicians' | 'craft' | 'gig',
	raw: Raw
): { ok: true; value: Qualification } | { ok: false; message: string } {
	const pay = raw.pay ?? null;
	const ranged = pay !== null && PAY_WITH_RANGE.includes(pay);
	const payMinEuros = ranged ? (raw.payMin ?? null) : null;
	const payMaxEuros = ranged ? (raw.payMax ?? null) : null;
	if (payMinEuros !== null && payMaxEuros !== null && payMinEuros > payMaxEuros) {
		return { ok: false, message: 'La fourchette va du plus petit montant au plus grand.' };
	}
	return {
		ok: true,
		value: {
			pay,
			payMinEuros,
			payMaxEuros,
			formation: scope === 'gig' ? (raw.formation ?? null) : null,
			repertoire: scope === 'gig' ? (raw.repertoire ?? null) : null,
			commitment: scope === 'musicians' ? (raw.commitment ?? null) : null,
			presence: scope === 'craft' ? (raw.presence ?? null) : null
		}
	};
}

const money = new Intl.NumberFormat('fr-FR', {
	style: 'currency',
	currency: 'EUR',
	maximumFractionDigits: 0
});

/** « Rémunéré · 150 € à 300 € », « Défrayé · jusqu'à 50 € », `null` sans précision. */
export function payLabel(q: Pick<Qualification, 'pay' | 'payMinEuros' | 'payMaxEuros'>) {
	if (!q.pay) return null;
	const base = OPPORTUNITY_PAY_LABELS[q.pay];
	const { payMinEuros: min, payMaxEuros: max } = q;
	if (min !== null && max !== null)
		return min === max
			? `${base} · ${money.format(min)}`
			: `${base} · ${money.format(min)} à ${money.format(max)}`;
	if (min !== null) return `${base} · à partir de ${money.format(min)}`;
	if (max !== null) return `${base} · jusqu’à ${money.format(max)}`;
	return base;
}

/** Les conditions précisées par l'annonce, en mots, dans l'ordre d'affichage. */
export function qualificationSummary(q: Qualification): { label: string; value: string }[] {
	const out: { label: string; value: string }[] = [];
	const pay = payLabel(q);
	if (pay) out.push({ label: 'Rémunération', value: pay });
	if (q.formation) out.push({ label: 'Formation', value: BAND_FORMATION_INFO[q.formation].label });
	if (q.repertoire)
		out.push({ label: 'Répertoire', value: BAND_REPERTOIRE_INFO[q.repertoire].label });
	if (q.commitment)
		out.push({ label: 'Engagement', value: OPPORTUNITY_COMMITMENT_LABELS[q.commitment] });
	if (q.presence) out.push({ label: 'Présence', value: OPPORTUNITY_PRESENCE_LABELS[q.presence] });
	return out;
}

/** Engagement du profil musicien (`MusicCommitment`, ONB-03). */
export type DeclaredCommitment = 'OCCASIONAL' | 'REGULAR' | 'PROFESSIONAL_PROJECT';

/**
 * Engagement compatible (scénario #29 n° 1) : une annonce « régulière »
 * écarte qui déclare jouer de temps en temps ; « ponctuel » convient à tous.
 */
export function commitmentMatch(
	wanted: OpportunityCommitmentValue | null,
	declared: DeclaredCommitment | null
): LineupMatch {
	if (!wanted || wanted === 'ONE_OFF') return 'yes';
	if (!declared) return 'unknown';
	return declared === 'OCCASIONAL' ? 'no' : 'yes';
}

/** Où travaille un·e pro du son (`CraftMobility`). */
export type DeclaredMobility = 'OWN_PLACE' | 'ON_SITE' | 'REMOTE';

/**
 * Présence compatible (scénario #29 n° 2) : « à distance » exige qu'elle
 * travaille à distance ; « sur place » qu'elle reçoive ou se déplace.
 * Rien de déclaré : non précisé.
 */
export function presenceMatch(
	wanted: OpportunityPresenceValue | null,
	declared: readonly DeclaredMobility[] | null
): LineupMatch {
	if (!wanted) return 'yes';
	if (!declared || declared.length === 0) return 'unknown';
	if (wanted === 'REMOTE') return declared.includes('REMOTE') ? 'yes' : 'no';
	return declared.some((m) => m === 'ON_SITE' || m === 'OWN_PLACE') ? 'yes' : 'no';
}

export { formationMatch, repertoireMatch };

/** Ce qu'une condition « non précisée » dit à la personne qui regarde. */
export const UNKNOWN_LABELS = {
	commitment: 'ton engagement n’est pas précisé sur ton profil',
	presence: 'ta façon de travailler (sur place, à distance) n’est pas précisée',
	formation: 'la formation du groupe n’est pas précisée',
	repertoire: 'le répertoire du groupe n’est pas précisé'
} as const;
export type QualificationCriterion = keyof typeof UNKNOWN_LABELS;
