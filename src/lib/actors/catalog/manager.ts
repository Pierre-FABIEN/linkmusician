/**
 * Manager (ONB-06) : offres, besoins et champs propres. Aucun artiste
 * n'apparaît « accompagné » sans sa confirmation (représentation, P5-07) ;
 * une agence se lie à une organisation dans un parcours séparé.
 */
import { intent, opt } from './helpers';
import { territoryField, type TrackCatalog, availabilityFields } from './types';

const ARTIST_NEEDS = ['FIND_EMERGING_ARTISTS', 'FIND_ESTABLISHED_ARTISTS', 'FIND_BANDS'];

export const managerCatalog: TrackCatalog = {
	offers: [
		intent('GLOBAL_MANAGEMENT', 'Management global', 'Porter la carrière au quotidien.'),
		intent('DEVELOPMENT', 'Développement', 'Structurer un projet, ses étapes, son équipe.'),
		intent('RELEASE_COORDINATION', 'Coordonner une sortie', 'Planning, partenaires, promotion.'),
		intent('TOUR_SUPPORT', 'Accompagner une tournée', 'Organisation et suivi sur la route.'),
		intent('ADVICE', 'Conseil', 'Un regard ponctuel sur une stratégie.')
	],
	needs: [
		intent('FIND_EMERGING_ARTISTS', 'Des artistes émergent·es', 'Des projets qui démarrent.'),
		intent(
			'FIND_ESTABLISHED_ARTISTS',
			'Des artistes confirmé·es',
			'Des projets qui tournent déjà.'
		),
		intent('FIND_BANDS', 'Des groupes', 'Des groupes à accompagner.'),
		intent('FIND_PARTNERS', 'Des partenaires', 'Des professionnel·les avec qui travailler.'),
		intent('FIND_BOOKERS', 'Des bookers', 'Pour trouver des dates à tes artistes.'),
		intent('FIND_LABELS', 'Des labels', 'Pour sortir les projets que tu accompagnes.')
	],
	fields: [
		{
			id: 'status',
			label: 'Ton statut',
			kind: 'single',
			required: true,
			options: [
				opt('INDEPENDENT', 'Indépendant·e'),
				opt('AGENCY_TEAM', 'Dans une agence'),
				opt('OTHER', 'Autre')
			]
		},
		territoryField(),
		{
			id: 'accepts_projects',
			label: 'Tu acceptes de nouveaux projets ?',
			kind: 'single',
			required: true,
			options: [opt('YES', 'Oui'), opt('NO', 'Pas pour l’instant')]
		},
		{
			id: 'target_stage',
			label: 'Stade des artistes que tu cherches',
			kind: 'multi',
			required: true,
			when: { needs: ARTIST_NEEDS },
			options: [
				opt('BEGINNER', 'Débutant'),
				opt('EMERGING', 'Émergent'),
				opt('RELEASING', 'Premières sorties et concerts'),
				opt('ESTABLISHED', 'Établi')
			]
		},
		{
			id: 'artist_capacity',
			block: 'conditions',
			label: 'Combien d’artistes tu peux accompagner',
			kind: 'single',
			when: { specializations: ['ARTIST_MANAGEMENT'] },
			options: [opt('ONE_TWO', '1 ou 2'), opt('THREE_FIVE', '3 à 5'), opt('MORE', 'Plus de 5')]
		},
		{
			id: 'engagement_form',
			label: 'Forme d’accompagnement',
			kind: 'multi',
			when: { specializations: ['ARTIST_MANAGEMENT', 'ARTIST_DEVELOPMENT'] },
			options: [opt('PROJECT', 'Le temps d’un projet'), opt('LONG_TERM', 'Sur la durée')]
		},
		{
			id: 'tour_scope',
			label: 'Tournée : ce que tu prends en charge',
			kind: 'multi',
			when: { specializations: ['TOUR_MANAGEMENT'] },
			options: [
				opt('LOGISTICS', 'Logistique'),
				opt('TRANSPORT', 'Transport'),
				opt('TECH_COORDINATION', 'Coordination technique'),
				opt('ACCOMMODATION', 'Hébergement')
			]
		},
		{
			id: 'tour_zones',
			label: 'Tournée : zones',
			kind: 'multi',
			when: { specializations: ['TOUR_MANAGEMENT'] },
			options: [opt('FRANCE', 'France'), opt('EUROPE', 'Europe'), opt('WORLD', 'Monde')]
		},
		{
			id: 'agency_services',
			label: 'Agence : ce qu’elle propose',
			hint: 'Le nom et la fiche de l’agence se déclarent à part, comme organisation.',
			kind: 'multi',
			when: { specializations: ['AGENCY'] },
			options: [
				opt('MANAGEMENT', 'Management'),
				opt('BOOKING', 'Booking'),
				opt('PR', 'Relations presse'),
				opt('DEVELOPMENT', 'Développement')
			]
		},
		...availabilityFields()
	]
};
