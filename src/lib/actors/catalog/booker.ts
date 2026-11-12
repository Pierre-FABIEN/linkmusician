/**
 * Booker / programmateur·rice (ONB-07) : un booker d'artistes et un·e
 * programmateur·rice ne répondent pas aux mêmes questions ; les deux peuvent
 * coexister. Nommer une salle ou un artiste ne revendique rien.
 */
import { intent, opt } from './helpers';
import { territoryField, type TrackCatalog } from './types';

const PROGRAMMING = { specializations: ['PROGRAMMING', 'SHOWCASES'] };
const BOOKING = { specializations: ['ARTIST_BOOKING', 'TOUR_BOOKING', 'DIFFUSION'] };

export const bookerCatalog: TrackCatalog = {
	offers: [
		intent(
			'FIND_DATES',
			'Trouver des dates',
			'Placer des artistes dans des salles, des festivals.'
		),
		intent('PROGRAM_ARTISTS', 'Programmer des artistes', 'Leur ouvrir ta salle, ton festival.'),
		intent('TOUR_DIFFUSION', 'Diffuser une tournée', 'Vendre un spectacle à des lieux.'),
		intent('HOST_SHOWCASES', 'Accueillir des showcases', 'Présenter des artistes à des pros.')
	],
	needs: [
		intent('FIND_ARTISTS', 'Des artistes, des groupes', 'À programmer ou à représenter.'),
		intent('FIND_VENUES_DATES', 'Des lieux, des dates', 'Où faire jouer tes artistes.'),
		intent('FIND_OPENING_ACTS', 'Des premières parties', 'Pour compléter un plateau.'),
		intent(
			'FIND_PROMOTERS',
			'Des organisateurs, des partenaires',
			'Pour monter des dates ensemble.'
		)
	],
	fields: [
		{
			id: 'structure',
			label: 'Ta structure',
			kind: 'single',
			required: true,
			options: [
				opt('INDEPENDENT', 'Indépendant·e'),
				opt('AGENCY', 'Agence'),
				opt('VENUE', 'Salle'),
				opt('FESTIVAL', 'Festival'),
				opt('COLLECTIVE', 'Collectif')
			]
		},
		territoryField(),
		{
			id: 'programming_capacity',
			label: 'Programmation : jauge',
			kind: 'single',
			required: true,
			when: PROGRAMMING,
			options: [
				opt('UNDER_100', 'Moins de 100'),
				opt('UP_TO_300', '100 à 300'),
				opt('UP_TO_1000', '300 à 1 000'),
				opt('OVER_1000', 'Plus de 1 000')
			]
		},
		{
			id: 'programming_formations',
			label: 'Programmation : formations accueillies',
			kind: 'multi',
			required: true,
			when: PROGRAMMING,
			options: [
				opt('SOLO', 'Solo'),
				opt('DUO', 'Duo'),
				opt('BAND', 'Groupe'),
				opt('LARGE', 'Grande formation'),
				opt('DJ', 'DJ')
			]
		},
		{
			id: 'programming_events',
			label: 'Programmation : types d’événements',
			kind: 'multi',
			required: true,
			when: PROGRAMMING,
			options: [
				opt('CONCERT', 'Concerts'),
				opt('CLUB_NIGHT', 'Soirées'),
				opt('FESTIVAL', 'Festival'),
				opt('SHOWCASE', 'Showcases'),
				opt('JAM', 'Jams')
			]
		},
		{
			id: 'artist_categories',
			label: 'Booking : artistes représentés ou recherchés',
			kind: 'multi',
			required: true,
			when: BOOKING,
			options: [
				opt('EMERGING', 'Émergents'),
				opt('CONFIRMED', 'Confirmés'),
				opt('ESTABLISHED', 'Têtes d’affiche'),
				opt('YOUNG_AUDIENCE', 'Jeune public')
			]
		},
		{
			id: 'season',
			label: 'Programmation : calendrier',
			kind: 'multi',
			when: PROGRAMMING,
			options: [
				opt('YEAR_ROUND', 'Toute l’année'),
				opt('SEASON', 'En saison'),
				opt('SUMMER', 'L’été')
			]
		},
		{
			id: 'hosting',
			block: 'conditions',
			label: 'Programmation : ce que tu fournis',
			kind: 'multi',
			when: PROGRAMMING,
			options: [
				opt('BACKLINE', 'Backline'),
				opt('TECH', 'Technique son et lumière'),
				opt('ACCOMMODATION', 'Hébergement'),
				opt('CATERING', 'Repas')
			]
		}
	]
};
