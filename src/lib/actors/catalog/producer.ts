/** Producteur·rice (ONB-05) : offres, besoins et champs propres. */
import { intent, opt, STUDIO_ENVIRONMENTS } from './helpers';
import type { TrackCatalog } from './types';

export const producerCatalog: TrackCatalog = {
	offers: [
		intent(
			'FULL_PRODUCTION',
			'Produire un titre',
			'Porter un morceau de la maquette au son final.'
		),
		intent('BEATS', 'Des beats', 'Des instrus prêtes ou faites pour un·e artiste.'),
		intent('ARRANGING', 'Arranger', 'Écrire les parties, la structure, les couleurs.'),
		intent('DIRECTION', 'Diriger artistiquement', 'Guider un projet, ses choix, sa cohérence.'),
		intent('COMPOSING', 'Composer, topline', 'Écrire la musique ou la ligne vocale d’un titre.'),
		intent('COPRODUCTION', 'Coproduire', 'Produire à plusieurs mains.')
	],
	needs: [
		intent('FIND_ARTISTS', 'Des artistes', 'Des artistes à produire.'),
		intent(
			'FIND_TOPLINERS',
			'Des voix, des topliners',
			'Des voix et des mélodistes pour tes instrus.'
		),
		intent(
			'FIND_SESSION_MUSICIANS',
			'Des musicien·nes de session',
			'Des instrumentistes pour enregistrer.'
		),
		intent('FIND_ENGINEERS', 'Des ingés son', 'Pour enregistrer, mixer, masteriser.'),
		intent('FIND_COPRODUCERS', 'Des coproductions', 'D’autres producteur·rices avec qui produire.'),
		intent('FIND_SONGS', 'Des morceaux à produire', 'Des titres qui cherchent leur production.')
	],
	fields: [
		{
			id: 'environment',
			label: 'Comment tu travailles',
			kind: 'multi',
			required: true,
			options: [...STUDIO_ENVIRONMENTS, opt('HYBRID', 'Hybride')]
		},
		{
			id: 'beat_formats',
			label: 'Beatmaking : ce que tu fais',
			kind: 'multi',
			when: { specializations: ['BEATMAKING'] },
			options: [
				opt('FULL_INSTRUMENTAL', 'Instrumentaux complets'),
				opt('ADAPTABLE', 'Beats adaptables à l’artiste'),
				opt('COPRODUCED', 'Beats coproduits')
			]
		},
		{
			id: 'beat_terms',
			label: 'Beatmaking : ce que tu souhaites',
			hint: 'Une indication : aucun contrat ne se crée ici.',
			kind: 'multi',
			when: { specializations: ['BEATMAKING'] },
			options: [opt('LICENSE', 'Une licence'), opt('COLLABORATION', 'Une collaboration')]
		},
		{
			id: 'production_scope',
			label: 'Production : jusqu’où tu vas',
			kind: 'multi',
			when: { specializations: ['PRODUCTION', 'RECORD_PRODUCTION', 'ARTISTIC_DIRECTION'] },
			options: [
				opt('DEMO_TO_MASTER', 'De la démo au master'),
				opt('ONE_OFF', 'Une production ponctuelle'),
				opt('GUIDANCE', 'Une direction artistique')
			]
		},
		{
			id: 'arrangement_colors',
			label: 'Arrangement : ce que tu arranges',
			kind: 'multi',
			when: { specializations: ['ARRANGEMENT'] },
			options: [
				opt('STRINGS', 'Cordes'),
				opt('BRASS', 'Cuivres'),
				opt('ACOUSTIC', 'Acoustique'),
				opt('ELECTRONIC', 'Électronique'),
				opt('ORCHESTRAL', 'Orchestral')
			]
		},
		{
			id: 'topline_languages',
			label: 'Composition, topline : langues',
			kind: 'multi',
			when: { specializations: ['TOPLINE'] },
			options: [
				opt('FR', 'Français'),
				opt('EN', 'Anglais'),
				opt('ES', 'Espagnol'),
				opt('OTHER', 'Autre langue')
			]
		}
	]
};
