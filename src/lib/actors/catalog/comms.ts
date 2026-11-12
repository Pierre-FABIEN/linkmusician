/**
 * Communication musicale (ONB-11) : le journalisme est une couverture
 * éditoriale indépendante, distincte d'une prestation payée ; aucune
 * audience ni aucun crédit ne se déclare ici.
 */
import { intent, opt } from './helpers';
import { territoryField, type TrackCatalog } from './types';

export const commsCatalog: TrackCatalog = {
	offers: [
		intent('PRESS_SERVICE', 'Relations presse', 'Porter un projet auprès des médias.'),
		intent('INTERVIEWS', 'Des interviews', 'Rencontrer et faire parler des artistes.'),
		intent('LIVE_COVERAGE', 'Couvrir des concerts', 'Chroniques, photos, vidéos de live.'),
		intent('CAMPAIGNS', 'Des campagnes', 'Stratégie et campagnes de sortie.'),
		intent(
			'SOCIAL_MANAGEMENT',
			'Gérer des réseaux',
			'Animer les comptes d’artistes ou de structures.'
		),
		intent('VISUAL_CONTENT', 'Des contenus photo, vidéo', 'Shootings, clips, formats courts.'),
		intent('PROMOTION', 'De la promotion', 'Faire connaître un projet.')
	],
	needs: [
		intent('FIND_RELEASES', 'Des sorties à couvrir', 'Des disques, des clips, des annonces.'),
		intent('FIND_CLIENTS', 'Des artistes, des clients', 'Pour qui travailler.'),
		intent('FIND_CONCERTS', 'Des concerts', 'À couvrir ou à photographier.'),
		intent(
			'FIND_MEDIA_PARTNERS',
			'Des médias, des partenaires',
			'Où publier, avec qui travailler.'
		),
		intent('FIND_STORIES', 'Des sujets', 'Des histoires à raconter.')
	],
	fields: [
		territoryField(),
		{
			id: 'coverage_kind',
			label: 'Ta façon de travailler',
			hint: 'Une couverture éditoriale n’est pas une prestation payée.',
			kind: 'multi',
			when: { specializations: ['JOURNALISM', 'RADIO_PODCAST'] },
			options: [
				opt('EDITORIAL', 'Couverture éditoriale indépendante'),
				opt('COMMERCIAL', 'Prestation rémunérée')
			]
		},
		{
			id: 'journalism_formats',
			label: 'Journalisme : formats',
			kind: 'multi',
			when: { specializations: ['JOURNALISM'] },
			options: [
				opt('ARTICLES', 'Articles'),
				opt('REVIEWS', 'Critiques'),
				opt('INTERVIEWS', 'Interviews'),
				opt('REPORTS', 'Reportages')
			]
		},
		{
			id: 'journalism_pitches',
			label: 'Journalisme : tu reçois des propositions ?',
			kind: 'single',
			when: { specializations: ['JOURNALISM'] },
			options: [opt('YES', 'Oui'), opt('NO', 'Non')]
		},
		{
			id: 'press_campaigns',
			label: 'Relations presse : campagnes',
			kind: 'multi',
			when: { specializations: ['PRESS_RELATIONS'] },
			options: [
				opt('RELEASE', 'Sortie'),
				opt('CONCERT', 'Concert, tournée'),
				opt('DEVELOPMENT', 'Développement d’artiste')
			]
		},
		{
			id: 'platforms',
			label: 'Réseaux maîtrisés',
			kind: 'multi',
			when: { specializations: ['COMMUNITY_MANAGEMENT', 'CONTENT_CREATION', 'MARKETING'] },
			options: [
				opt('TIKTOK', 'TikTok'),
				opt('INSTAGRAM', 'Instagram'),
				opt('YOUTUBE', 'YouTube'),
				opt('FACEBOOK', 'Facebook'),
				opt('OTHER', 'Autres')
			]
		},
		{
			id: 'radio_formats',
			label: 'Radio, podcast : formats',
			kind: 'multi',
			when: { specializations: ['RADIO_PODCAST'] },
			options: [
				opt('SHOW', 'Émission'),
				opt('INTERVIEW', 'Interview'),
				opt('LIVE_SESSION', 'Session live'),
				opt('SUBMISSIONS', 'Écoute de soumissions')
			]
		},
		{
			id: 'visual_formats',
			label: 'Photo, vidéo : formats',
			kind: 'multi',
			when: { specializations: ['PHOTO', 'VIDEO'] },
			options: [
				opt('LIVE', 'Live'),
				opt('PORTRAIT', 'Portraits, presse'),
				opt('CLIP', 'Clips'),
				opt('SHORT', 'Formats courts')
			]
		},
		{
			id: 'graphic_media',
			label: 'Graphisme : supports',
			kind: 'multi',
			when: { specializations: ['GRAPHIC_DESIGN'] },
			options: [
				opt('COVER', 'Pochettes'),
				opt('POSTER', 'Affiches, flyers'),
				opt('IDENTITY', 'Logos, identité visuelle'),
				opt('SOCIAL', 'Visuels pour les réseaux'),
				opt('MERCH', 'Merch')
			]
		},
		{
			id: 'visual_mobility',
			label: 'Photo, vidéo : déplacements',
			kind: 'single',
			when: { specializations: ['PHOTO', 'VIDEO'] },
			options: [opt('LOCAL', 'Local'), opt('REGIONAL', 'Régional'), opt('NATIONAL', 'National')]
		}
	]
};
