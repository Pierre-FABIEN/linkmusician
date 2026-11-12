/**
 * Organisateur·rice (ONB-08) : offres, besoins et champs propres. Aucune
 * fiche d'événement pendant l'inscription (elle appartient au plateau ou à
 * l'annonce) ; publier une jam reste soumis à D5 et D51, jamais déduit d'ici.
 */
import { intent, opt } from './helpers';
import { territoryField, type TrackCatalog } from './types';

export const promoterCatalog: TrackCatalog = {
	offers: [
		intent('HOST_JAMS', 'Des jams', 'Des bœufs et des scènes ouvertes à rejoindre.'),
		intent('LINEUPS', 'Des plateaux', 'Des dates où jouer, à plusieurs groupes.'),
		intent('CONCERT_DATES', 'Des concerts', 'Des dates pour des artistes.'),
		intent('EVENT_COLLABORATIONS', 'Des collaborations', 'Monter des événements à plusieurs.')
	],
	needs: [
		intent('FIND_ARTISTS', 'Des artistes, des groupes', 'À programmer.'),
		intent('FIND_JAM_HOSTS', 'Des animateur·rices de jam', 'Pour tenir tes scènes ouvertes.'),
		intent('FIND_TECHNICIANS', 'Des techniciens', 'Son, lumière, régie.'),
		intent('FIND_VENUES', 'Des lieux', 'Où organiser.'),
		intent('FIND_PARTNERS', 'Des partenaires', 'Associations, collectifs, sponsors.')
	],
	fields: [
		{
			id: 'structure',
			label: 'Ta situation',
			kind: 'single',
			required: true,
			options: [
				opt('INDEPENDENT', 'Indépendant·e'),
				opt('ASSOCIATION', 'Association'),
				opt('COLLECTIVE', 'Collectif'),
				opt('COMPANY', 'Entreprise')
			]
		},
		territoryField(),
		{
			id: 'jam_format',
			label: 'Jams : format',
			kind: 'multi',
			when: { specializations: ['OPEN_STAGES'] },
			options: [
				opt('FREE_IMPRO', 'Improvisation libre'),
				opt('THEMED', 'Sur un thème, un style'),
				opt('OPEN_STAGE', 'Scène ouverte')
			]
		},
		{
			id: 'jam_backline',
			label: 'Jams : matériel sur place',
			kind: 'multi',
			when: { specializations: ['OPEN_STAGES'] },
			options: [
				opt('DRUMS', 'Batterie'),
				opt('AMPS', 'Amplis'),
				opt('KEYS', 'Clavier'),
				opt('PA', 'Sono et micros')
			]
		},
		{
			id: 'jam_level',
			label: 'Jams : niveau d’accueil',
			kind: 'single',
			when: { specializations: ['OPEN_STAGES'] },
			options: [
				opt('ALL', 'Tous niveaux'),
				opt('INTERMEDIATE', 'À partir d’un niveau confirmé'),
				opt('ADVANCED', 'Musicien·nes aguerri·es')
			]
		},
		{
			id: 'festival_stages',
			label: 'Festival : scènes',
			kind: 'single',
			when: { specializations: ['FESTIVAL'] },
			options: [opt('ONE', 'Une'), opt('TWO_THREE', 'Deux ou trois'), opt('MORE', 'Plus')]
		},
		{
			id: 'festival_capacity',
			label: 'Festival : jauge',
			kind: 'single',
			when: { specializations: ['FESTIVAL'] },
			options: [
				opt('UNDER_500', 'Moins de 500'),
				opt('UP_TO_2000', '500 à 2 000'),
				opt('UP_TO_10000', '2 000 à 10 000'),
				opt('OVER_10000', 'Plus de 10 000')
			]
		},
		{
			id: 'concert_lineup',
			label: 'Concerts : taille du plateau',
			kind: 'single',
			when: { specializations: ['CONCERTS'] },
			options: [opt('ONE', 'Un groupe'), opt('TWO_THREE', 'Deux ou trois'), opt('MORE', 'Plus')]
		},
		{
			id: 'concert_tech',
			label: 'Concerts : régie',
			kind: 'single',
			when: { specializations: ['CONCERTS'] },
			options: [opt('ON_SITE', 'Régie sur place'), opt('TO_BRING', 'À apporter')]
		},
		{
			id: 'concert_pay',
			block: 'conditions',
			label: 'Concerts : rémunération envisagée',
			kind: 'multi',
			when: { specializations: ['CONCERTS'] },
			options: [
				opt('FEE', 'Cachet'),
				opt('EXPENSES', 'Défraiement'),
				opt('DOOR', 'Recette ou chapeau')
			]
		}
	]
};
