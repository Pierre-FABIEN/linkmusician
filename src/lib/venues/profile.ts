/**
 * Fiche d'un lieu revendiqué (P5-03b, conception 08 §14) : référentiels,
 * formulaire, conditions de publication et quêtes. Module pur, partagé par
 * le serveur et le navigateur.
 *
 * La fiche publiée donne le rang « Lieu ouvert » ; les rangs suivants
 * viennent des dates tenues et confirmées (`gig.held`, P5-06), jamais de
 * l'XP. Le lieu ne gagne pas d'XP (Q24).
 */
import { z } from 'zod';
import { MAX_CAPACITY, MAX_PROMOTER_GENRES } from '#lib/crafts/promoter';

export const VENUE_CONDITIONS = ['FEE', 'HAT', 'EXPENSES'] as const;
export type VenueConditionValue = (typeof VENUE_CONDITIONS)[number];

export const VENUE_CONDITION_LABELS: Readonly<Record<VenueConditionValue, string>> = {
	FEE: 'Cachet',
	HAT: 'Chapeau',
	EXPENSES: 'Défraiement (repas, trajet)'
};

export const VENUE_AGE_RULES = ['ALL_AGES', 'DAYTIME_MINORS', 'ADULTS'] as const;
export type VenueAgeRuleValue = (typeof VENUE_AGE_RULES)[number];

export const VENUE_AGE_RULE_INFO: Readonly<
	Record<VenueAgeRuleValue, { label: string; hint: string }>
> = {
	ALL_AGES: { label: 'Tous publics', hint: 'Les mineur·es sont les bienvenu·es.' },
	DAYTIME_MINORS: {
		label: 'Mineur·es en journée',
		hint: 'Les mineur·es viennent aux dates finies avant 22 h.'
	},
	ADULTS: { label: 'Majeur·es seulement', hint: 'Bar de nuit, licence IV…' }
};

export const VENUE_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const VENUE_WEEKDAY_LABELS: Readonly<Record<number, string>> = {
	1: 'Lundi',
	2: 'Mardi',
	3: 'Mercredi',
	4: 'Jeudi',
	5: 'Vendredi',
	6: 'Samedi',
	7: 'Dimanche'
};

export const MAX_VENUE_STAGE = 400;
export const MAX_VENUE_GENRES = MAX_PROMOTER_GENRES;

/** Texte brut : contrôles retirés (sauf retours à la ligne), espaces resserrés. */
function cleanText(raw: string): string {
	return (
		raw
			// eslint-disable-next-line no-control-regex
			.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
			.split('\n')
			.map((line) => line.trim().replace(/\s+/g, ' '))
			.filter(Boolean)
			.join('\n')
	);
}

/** Fiche, envoyée en formulaire classique (cases à cocher répétées). */
export const venueProfileSchema = z.object({
	capacity: z
		.string()
		.optional()
		.transform((v) => v?.trim() ?? '')
		.refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= MAX_CAPACITY), {
			message: `Une jauge en nombre de personnes, de 1 à ${MAX_CAPACITY.toLocaleString('fr-FR')}.`
		})
		.transform((v) => (v === '' ? null : Number(v))),
	stage: z
		.string()
		.optional()
		.transform((v) => cleanText(v ?? ''))
		.refine((v) => [...v].length <= MAX_VENUE_STAGE, {
			message: `La scène et le son tiennent en ${MAX_VENUE_STAGE} caractères.`
		}),
	conditions: z
		.array(z.enum(VENUE_CONDITIONS))
		.transform((list) => VENUE_CONDITIONS.filter((c) => list.includes(c))),
	days: z
		.array(z.coerce.number().int().min(1).max(7))
		.transform((list) => [...new Set(list)].sort((a, b) => a - b)),
	ageRule: z.enum(VENUE_AGE_RULES),
	genreIds: z
		.array(z.string().min(1).max(60))
		.transform((list) => [...new Set(list)])
		.refine((list) => list.length <= MAX_VENUE_GENRES, {
			message: `${MAX_VENUE_GENRES} genres au plus.`
		})
});
export type VenueProfileForm = z.infer<typeof venueProfileSchema>;

export type VenueFiche = {
	capacity: number | null;
	stage: string;
	conditions: readonly unknown[];
	genres: number;
};

/** Ce qui manque pour publier (08 §14 : jauge, scène, genres, conditions). */
export function publicationGaps(f: VenueFiche): string[] {
	const gaps: string[] = [];
	if (!f.capacity) gaps.push('la jauge');
	if (!f.stage.trim()) gaps.push('la scène et le son');
	if (f.genres === 0) gaps.push('un genre au moins');
	if (f.conditions.length === 0) gaps.push('les conditions faites aux artistes');
	return gaps;
}

/** Jours en mots (« Jeudi, Vendredi »). */
export const daysLabel = (days: readonly number[]) =>
	days.map((d) => VENUE_WEEKDAY_LABELS[d]).join(', ');

export type VenueQuestState = {
	published: boolean;
	/** Plateaux publiés au lieu, candidatures acceptées, jams publiques au lieu. */
	gigSlots: number;
	bandsProgrammed: number;
	publicJams: number;
	/** Groupes programmés pour leur toute première date (`gig.held`, P5-06). */
	firstDates: number;
};

export type VenueQuest = { id: string; label: string; href: string; done: boolean };

/** Quêtes principales du lieu (08 §14), dans l'ordre du parcours. */
export function venueQuests(s: VenueQuestState, venueId: string): VenueQuest[] {
	return [
		{
			id: 'venue.fiche',
			label: 'Complète et publie ta fiche',
			href: '#fiche',
			done: s.published
		},
		{
			id: 'venue.date',
			label: 'Publie une première date',
			href: `/plateaux/nouveau?lieu=${venueId}`,
			done: s.gigSlots >= 1
		},
		{
			id: 'venue.band',
			label: 'Programme un premier groupe (accepte sa candidature)',
			href: '#dates',
			done: s.bandsProgrammed >= 1
		},
		{
			id: 'venue.jam',
			label: 'Accueille ta première jam publique',
			href: `/jams/nouvelle?lieu=${venueId}`,
			done: s.publicJams >= 1
		},
		{
			id: 'venue.newcomer',
			label: 'Programme un groupe pour sa toute première date',
			href: '#dates',
			done: s.firstDates >= 1
		}
	];
}

/**
 * Apprendre le métier (08 §14) : la plateforme guide, elle ne gère jamais.
 * Des liens vers les fiches démarches et les sources officielles.
 */
export const VENUE_LEARNING = [
	{
		id: 'venue.learn.licence',
		label: 'La licence d’entrepreneur de spectacles, au-delà de 6 représentations par an',
		href: 'https://www.culture.gouv.fr/Media/Medias-creation-rapide/Vos-demarches-et-responsabilites-en-tant-qu-organisateur-occasionnel-de-spectacles-vivants',
		external: true
	},
	{
		id: 'venue.learn.guso',
		label: 'Payer les artistes par le GUSO',
		href: '/demarches/etre-paye-pour-jouer',
		external: false
	},
	{
		id: 'venue.learn.sacem',
		label: 'Déclarer tes soirées à la SACEM (programme des œuvres)',
		href: '/demarches/premier-concert',
		external: false
	}
] as const;
