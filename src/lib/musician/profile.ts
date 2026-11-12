/**
 * Profil de musicien·ne (ONB-03, D58) : référentiel et règles. Module pur,
 * partagé par le serveur et le navigateur. Tout est déclaratif : rien n'est
 * jamais « vérifié » sur déclaration, le niveau reste « (déclaré) » (D11).
 *
 * - **Expérience** et **engagement** : demandés à l'inscription.
 *   L'engagement (ce que je veux) n'est pas le statut (`proStatus`, ce que
 *   je suis).
 * - **Précisions selon l'instrument** : facultatives, en codes. Seules les
 *   réponses cochées sont gardées ; une absence vaut « inconnu », jamais
 *   « non ». Le référentiel des instruments distingue déjà guitare
 *   électrique, acoustique ou classique, chant, chœurs ou rap, batterie
 *   acoustique ou électronique, piano ou synthé : on ne le redemande pas.
 * - **`lookingFor`** (P1-06b) : chacune de ses valeurs correspond à un seul
 *   choix « Je propose » ou « Je recherche ». Il devient une copie tenue à
 *   jour de ces choix, pour la recherche (`?recherche=`), le profil public et
 *   l'assistant d'inscription (D47).
 */
import { LOOKING_FOR, type LookingForValue } from '#lib/actors/profile';
import type { IntentDirection } from '#lib/actors/specializations';

// ─── Expérience et engagement ────────────────────────────────────────────────

/** Alignées sur l'enum Prisma `PracticeExperience`. */
export const PRACTICE_EXPERIENCES = ['SOLO', 'WITH_OTHERS', 'STAGE'] as const;
export type PracticeExperienceValue = (typeof PRACTICE_EXPERIENCES)[number];

export const PRACTICE_EXPERIENCE_INFO: Readonly<
	Record<PracticeExperienceValue, { label: string; hint: string }>
> = {
	SOLO: { label: 'Surtout seul·e', hint: 'Je joue chez moi, à mon rythme.' },
	WITH_OTHERS: { label: 'Avec d’autres', hint: 'J’ai déjà joué en groupe, en jam, en atelier.' },
	STAGE: { label: 'Sur scène', hint: 'J’ai déjà joué devant un public.' }
};

/** Alignées sur l'enum Prisma `MusicCommitment`. */
export const COMMITMENTS = ['OCCASIONAL', 'REGULAR', 'PROFESSIONAL_PROJECT'] as const;
export type CommitmentValue = (typeof COMMITMENTS)[number];

export const COMMITMENT_INFO: Readonly<Record<CommitmentValue, { label: string; hint: string }>> = {
	OCCASIONAL: { label: 'Occasionnel', hint: 'Quand j’ai le temps, sans obligation.' },
	REGULAR: { label: 'Régulier', hint: 'Des rendez-vous réguliers, une répétition par semaine.' },
	PROFESSIONAL_PROJECT: {
		label: 'Projet professionnel',
		hint: 'Un projet qui vise la scène, l’enregistrement, la diffusion.'
	}
};

// ─── Précisions selon l'instrument ───────────────────────────────────────────

export type DetailOption = { code: string; label: string };

export type DetailField = {
	/** Identifiant stable, stocké tel quel (`PersonTrackAttribute.field`). */
	id: string;
	label: string;
	kind: 'single' | 'multi';
	options: readonly DetailOption[];
};

/** Un instrument tel que le voit cette règle. */
export type InstrumentRef = { slug: string; family: string };

export type DetailGroup = {
	id: 'voice' | 'guitar' | 'drums' | 'keys';
	label: string;
	appliesTo: (instrument: InstrumentRef) => boolean;
	fields: readonly DetailField[];
};

const GUITARS = ['guitare-electrique', 'guitare-acoustique', 'guitare-classique'];
const DRUM_KITS = ['batterie', 'batterie-electronique'];

export const DETAIL_GROUPS: readonly DetailGroup[] = [
	{
		id: 'voice',
		label: 'Ta voix',
		appliesTo: (i) => i.family === 'VOICE',
		fields: [
			{
				id: 'voice.languages',
				label: 'Langues chantées',
				kind: 'multi',
				options: [
					{ code: 'FR', label: 'Français' },
					{ code: 'EN', label: 'Anglais' },
					{ code: 'ES', label: 'Espagnol' },
					{ code: 'IT', label: 'Italien' },
					{ code: 'PT', label: 'Portugais' },
					{ code: 'DE', label: 'Allemand' },
					{ code: 'AR', label: 'Arabe' },
					{ code: 'OC', label: 'Occitan' },
					{ code: 'CREOLE', label: 'Créole' },
					{ code: 'OTHER', label: 'Autre langue' }
				]
			},
			{
				id: 'voice.range',
				label: 'Tessiture',
				kind: 'single',
				options: [
					{ code: 'SOPRANO', label: 'Soprano' },
					{ code: 'MEZZO', label: 'Mezzo' },
					{ code: 'ALTO', label: 'Alto' },
					{ code: 'TENOR', label: 'Ténor' },
					{ code: 'BARITONE', label: 'Baryton' },
					{ code: 'BASS', label: 'Basse' },
					{ code: 'UNKNOWN', label: 'Je ne sais pas' }
				]
			}
		]
	},
	{
		id: 'guitar',
		label: 'Ta guitare',
		appliesTo: (i) => GUITARS.includes(i.slug),
		fields: [
			{
				id: 'guitar.role',
				label: 'Ton rôle',
				kind: 'multi',
				options: [
					{ code: 'RHYTHM', label: 'Rythmique' },
					{ code: 'LEAD', label: 'Solo' }
				]
			},
			{
				id: 'guitar.skills',
				label: 'Tu sais',
				kind: 'multi',
				options: [{ code: 'IMPROVISATION', label: 'Improviser' }]
			}
		]
	},
	{
		id: 'drums',
		label: 'Ta batterie',
		appliesTo: (i) => DRUM_KITS.includes(i.slug),
		fields: [
			{
				id: 'drums.options',
				label: 'Tu peux',
				kind: 'multi',
				options: [
					{ code: 'CLICK', label: 'Jouer au clic' },
					{ code: 'DOUBLE_PEDAL', label: 'Jouer à la double pédale' },
					{ code: 'PORTABLE_KIT', label: 'Venir avec un kit transportable' }
				]
			}
		]
	},
	{
		id: 'keys',
		label: 'Tes claviers',
		appliesTo: (i) => i.family === 'KEYBOARDS',
		fields: [
			{
				id: 'keys.options',
				label: 'Tu peux',
				kind: 'multi',
				options: [
					{ code: 'MIDI', label: 'Jouer en MIDI (contrôleur, ordinateur)' },
					{ code: 'TRANSPORT', label: 'Transporter ton clavier' }
				]
			}
		]
	}
];

/** Groupes de précisions qui concernent ces instruments (aucun : rien à préciser). */
export function detailGroupsFor(instruments: readonly InstrumentRef[]): DetailGroup[] {
	return DETAIL_GROUPS.filter((g) => instruments.some((i) => g.appliesTo(i)));
}

export const DETAIL_FIELDS: readonly DetailField[] = DETAIL_GROUPS.flatMap((g) => g.fields);

export type Details = Record<string, string[]>;

export type DetailsCheck =
	{ ok: true; details: Details } | { ok: false; field: string; message: string };

/**
 * Vérifie et normalise des précisions : champs et codes connus, une seule
 * valeur pour un choix unique, ordre du référentiel, champs vides retirés.
 * Les champs d'un instrument que la personne n'a plus sont ignorés
 * (pas une erreur) : ils ne s'appliquent plus.
 */
export function checkDetails(input: Details, instruments: readonly InstrumentRef[]): DetailsCheck {
	const applicable = new Set(
		detailGroupsFor(instruments).flatMap((g) => g.fields.map((f) => f.id))
	);
	const details: Details = {};
	for (const [id, codes] of Object.entries(input)) {
		const field = DETAIL_FIELDS.find((f) => f.id === id);
		if (!field) return { ok: false, field: id, message: 'Précision inconnue.' };
		if (!applicable.has(id)) continue;
		const known = field.options.map((o) => o.code);
		if (codes.some((c) => !known.includes(c)))
			return { ok: false, field: id, message: 'Ce choix n’existe pas.' };
		const kept = known.filter((c) => codes.includes(c));
		if (field.kind === 'single' && kept.length > 1)
			return { ok: false, field: id, message: 'Un seul choix possible.' };
		if (kept.length > 0) details[id] = kept;
	}
	return { ok: true, details };
}

// ─── Correspondance avec `lookingFor` ────────────────────────────────────────

export type IntentRef = { direction: IntentDirection; code: string };

/** Chaque valeur de `lookingFor` correspond à un seul choix, et inversement. */
export const LOOKING_FOR_INTENTS: Readonly<Record<LookingForValue, IntentRef>> = {
	BAND: { direction: 'NEED', code: 'FIND_BAND' },
	REPLACEMENTS: { direction: 'OFFER', code: 'DO_REPLACEMENTS' },
	JAMS: { direction: 'NEED', code: 'FIND_JAMS' },
	STUDIO_SESSIONS: { direction: 'NEED', code: 'FIND_STUDIO' },
	LESSONS_GIVE: { direction: 'OFFER', code: 'GIVE_LESSONS' },
	LESSONS_TAKE: { direction: 'NEED', code: 'TAKE_LESSONS' },
	COLLABORATION: { direction: 'NEED', code: 'CO_WRITING' }
};

/** `lookingFor` déduit des choix « Je propose » et « Je recherche ». */
export function lookingForOf(intents: {
	offers: readonly string[];
	needs: readonly string[];
}): LookingForValue[] {
	return LOOKING_FOR.filter((value) => {
		const { direction, code } = LOOKING_FOR_INTENTS[value];
		return (direction === 'OFFER' ? intents.offers : intents.needs).includes(code);
	});
}

/** Choix « Je propose » et « Je recherche » correspondant à `lookingFor`. */
export function intentsOfLookingFor(values: readonly LookingForValue[]): {
	offers: string[];
	needs: string[];
} {
	const refs = LOOKING_FOR.filter((v) => values.includes(v)).map((v) => LOOKING_FOR_INTENTS[v]);
	return {
		offers: refs.filter((r) => r.direction === 'OFFER').map((r) => r.code),
		needs: refs.filter((r) => r.direction === 'NEED').map((r) => r.code)
	};
}

/** Codes « Je propose » / « Je recherche » qui ont un équivalent dans `lookingFor`. */
export const LOOKING_FOR_CODES: Readonly<Record<'offers' | 'needs', readonly string[]>> = {
	offers: Object.values(LOOKING_FOR_INTENTS)
		.filter((r) => r.direction === 'OFFER')
		.map((r) => r.code),
	needs: Object.values(LOOKING_FOR_INTENTS)
		.filter((r) => r.direction === 'NEED')
		.map((r) => r.code)
};
