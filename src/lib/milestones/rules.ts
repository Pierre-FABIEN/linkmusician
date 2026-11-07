/**
 * Étapes de groupe (P3-04, D41) : catalogue et règles pures, partagés par le
 * serveur et le navigateur. Le service (`#lib/server/milestones/service`)
 * les applique sous verrou ; ici, rien ne lit la base.
 *
 * - Les étapes sont des « premières fois » : une seule par groupe et par
 *   étape. Le barème (XP par niveau de preuve) vit dans le moteur
 *   (`progression/core/bareme.ts`), pas ici.
 * - Au lancement, les étapes 1 à 6 sont ouvertes : « Formation » est
 *   automatique (2ᵉ adhésion), « Première composition » suit les morceaux
 *   du groupe (P3-11), les quatre autres se **déclarent** par la gestion du
 *   groupe. Les étapes 7 à 10 attendent des preuves externes (P3-07, labels).
 * - Une étape ne se déclare que pour un groupe formé : seul·e, rien ne
 *   rapporte (D40).
 */
import { z } from 'zod';

export const MILESTONE_KEYS = [
	'FORMATION',
	'FIRST_REHEARSAL',
	'FIRST_COMPOSITION',
	'FIRST_RECORDING',
	'FIRST_PUBLIC_DEMO',
	'FIRST_GIG',
	'FIRST_TOUR',
	'FIRST_EP',
	'FIRST_ALBUM',
	'SIGNING'
] as const;
export type MilestoneKey = (typeof MILESTONE_KEYS)[number];

/** Niveau de preuve (conception 02 §4), du plus faible au plus fort. */
export const MILESTONE_PROOFS = ['DECLARED', 'CORROBORATED', 'VERIFIED'] as const;
export type MilestoneProof = (typeof MILESTONE_PROOFS)[number];

/**
 * Comment l'étape arrive : `formation` à la 2ᵉ adhésion, `work` avec le
 * premier morceau composé, `declare` par la gestion, `later` pas encore.
 */
export type MilestoneMode = 'formation' | 'work' | 'declare' | 'later';

export type MilestoneDef = {
	key: MilestoneKey;
	ordinal: number;
	label: string;
	/** Une phrase pour la gestion du groupe. */
	hint: string;
	mode: MilestoneMode;
};

export const MILESTONE_CATALOG: readonly MilestoneDef[] = [
	{
		key: 'FORMATION',
		ordinal: 1,
		label: 'Formation',
		hint: 'Automatique : le groupe est formé dès qu’un premier membre le rejoint.',
		mode: 'formation'
	},
	{
		key: 'FIRST_REHEARSAL',
		ordinal: 2,
		label: 'Première répétition',
		hint: 'Votre première répétition ensemble.',
		mode: 'declare'
	},
	{
		key: 'FIRST_COMPOSITION',
		ordinal: 3,
		label: 'Première composition',
		hint: 'Arrive avec votre premier morceau composé, et se confirme quand deux personnes y sont créditées.',
		mode: 'work'
	},
	{
		key: 'FIRST_RECORDING',
		ordinal: 4,
		label: 'Premier enregistrement',
		hint: 'Un premier enregistrement, en studio ou en répétition.',
		mode: 'declare'
	},
	{
		key: 'FIRST_PUBLIC_DEMO',
		ordinal: 5,
		label: 'Première démo publique',
		hint: 'Un premier titre en écoute publique (Bandcamp, SoundCloud, Spotify…).',
		mode: 'declare'
	},
	{
		key: 'FIRST_GIG',
		ordinal: 6,
		label: 'Premier concert',
		hint: 'Votre premier concert devant un public.',
		mode: 'declare'
	},
	{
		key: 'FIRST_TOUR',
		ordinal: 7,
		label: 'Première tournée',
		hint: 'Trois concerts dans trois villes en un mois.',
		mode: 'later'
	},
	{
		key: 'FIRST_EP',
		ordinal: 8,
		label: 'Premier EP',
		hint: 'Une sortie identifiée (UPC ou ISRC).',
		mode: 'later'
	},
	{
		key: 'FIRST_ALBUM',
		ordinal: 9,
		label: 'Premier album',
		hint: 'Une sortie identifiée (UPC ou ISRC).',
		mode: 'later'
	},
	{
		key: 'SIGNING',
		ordinal: 10,
		label: 'Signature',
		hint: 'Validée par le label, sur la plateforme.',
		mode: 'later'
	}
];

export const DECLARABLE_KEYS = MILESTONE_CATALOG.filter((d) => d.mode === 'declare').map(
	(d) => d.key
) as readonly MilestoneKey[];

export function milestoneDef(key: MilestoneKey): MilestoneDef {
	return MILESTONE_CATALOG.find((d) => d.key === key)!;
}

/** Libellé public d'un niveau de preuve (une étape : féminin). */
export const PROOF_LABELS: Readonly<Record<MilestoneProof, string>> = {
	DECLARED: 'Déclarée',
	CORROBORATED: 'Corroborée',
	VERIFIED: 'Vérifiée'
};

const RANK: Readonly<Record<MilestoneProof, number>> = {
	DECLARED: 0,
	CORROBORATED: 1,
	VERIFIED: 2
};

/** Le passage `from` → `to` renforce-t-il la preuve ? (jamais de recul) */
export function isUpgrade(from: MilestoneProof | null, to: MilestoneProof): boolean {
	return from === null || RANK[to] > RANK[from];
}

/**
 * Preuve de « Première composition » d'après les morceaux composés du
 * groupe : corroborée si l'un l'est, déclarée sinon, rien sans morceau.
 */
export function compositionProof(
	works: readonly { proof: 'DECLARED' | 'CORROBORATED' | null }[]
): MilestoneProof | null {
	if (works.some((w) => w.proof === 'CORROBORATED')) return 'CORROBORATED';
	if (works.length > 0) return 'DECLARED';
	return null;
}

/**
 * Date à laquelle on cherche les membres présents. Une étape antérieure à la
 * formation sur la plateforme (un groupe qui existait avant) est créditée
 * à l'effectif de la formation : l'historique d'avant est inconnu.
 */
export function creditDate(occurredAt: Date, formedAt: Date): Date {
	return occurredAt < formedAt ? formedAt : occurredAt;
}

/** Membres dont une période couvre la date (début inclus, fin exclue). */
export function membersAt(
	periods: readonly { personId: string; startedAt: Date | null; endedAt: Date | null }[],
	at: Date
): string[] {
	const ids = periods
		.filter((p) => p.startedAt !== null && p.startedAt <= at && (!p.endedAt || p.endedAt > at))
		.map((p) => p.personId);
	return [...new Set(ids)];
}

/** Raison d'un refus de déclaration, ou `null` si c'est possible. */
export function declareBlocker(input: {
	key: MilestoneKey;
	formed: boolean;
	dissolved: boolean;
	already: boolean;
}): string | null {
	if (input.dissolved) return 'Ce groupe est dissous.';
	if (milestoneDef(input.key).mode !== 'declare') return 'Cette étape ne se déclare pas.';
	if (!input.formed) return 'Les étapes s’ouvrent quand le groupe est formé.';
	if (input.already) return 'Cette étape est déjà dans votre parcours.';
	return null;
}

export const MAX_MILESTONE_NOTE = 80;
/** Plus ancienne date acceptée : au-delà, c'est une faute de frappe. */
export const MIN_MILESTONE_DATE = '1950-01-01';

/** Aujourd'hui à Paris, au format `AAAA-MM-JJ`. */
export function todayInParis(now = new Date()): string {
	return now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
}

/** Jour saisi → instant stocké (midi UTC : le même jour partout en Europe). */
export function dayToDate(day: string): Date {
	return new Date(`${day}T12:00:00.000Z`);
}

function oneLine(raw: string): string {
	return (
		raw
			// eslint-disable-next-line no-control-regex
			.replace(/[\u0000-\u001f\u007f]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	);
}

/** Date de l'étape et précision facultative (« Au Bikini »). */
export function milestoneDetailsSchema(now = new Date()) {
	return z.object({
		day: z
			.string({ required_error: 'Indique la date.' })
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Indique la date.')
			.refine((d) => {
				const date = dayToDate(d);
				return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === d;
			}, 'Cette date n’existe pas.')
			.refine((d) => d >= MIN_MILESTONE_DATE, 'Cette date est trop ancienne.')
			.refine((d) => d <= todayInParis(now), 'Une étape se déclare une fois passée.'),
		note: z
			.string()
			.optional()
			.transform((v) => (v ? oneLine(v) : ''))
			.refine((v) => [...v].length <= MAX_MILESTONE_NOTE, {
				message: `La précision tient en ${MAX_MILESTONE_NOTE} caractères.`
			})
			.transform((v) => v || null)
	});
}

export function declareSchema(now = new Date()) {
	return milestoneDetailsSchema(now).extend({
		key: z.enum(MILESTONE_KEYS, { message: 'Choisis une étape.' })
	});
}
export type DeclareInput = z.infer<ReturnType<typeof declareSchema>>;
export type MilestoneDetails = z.infer<ReturnType<typeof milestoneDetailsSchema>>;
