/**
 * Éditeur·rice (ONB-10) : déclarer un domaine ne vaut jamais mandat ni
 * autorisation légale ; les briefs de placement vont dans une annonce.
 */
import { intent, opt } from './helpers';
import { territoryField, type TrackCatalog } from './types';

const SYNC = { specializations: ['SYNC', 'MUSIC_SUPERVISION'] };

export const publisherCatalog: TrackCatalog = {
	offers: [
		intent('PUBLISHING_SERVICE', 'Éditer des œuvres', 'Signer et exploiter des catalogues.'),
		intent('ADMINISTRATION_SERVICE', 'Administrer des œuvres', 'Déclarations, répartitions.'),
		intent('PLACEMENT_SEARCH', 'Chercher des placements', 'Proposer des titres à des interprètes.'),
		intent('SYNC_SERVICE', 'Synchroniser', 'Placer des œuvres à l’image.'),
		intent('ADVICE', 'Conseiller', 'Éclairer auteur·rices et compositeur·rices sur leurs droits.')
	],
	needs: [
		intent('FIND_AUTHORS', 'Des auteur·rices', 'À éditer.'),
		intent('FIND_COMPOSERS', 'Des compositeur·rices', 'À éditer.'),
		intent('FIND_WORKS', 'Des œuvres', 'Des titres à placer ou à éditer.'),
		intent('FIND_SYNC', 'Des projets de synchro', 'Films, séries, publicités, jeux.'),
		intent('FIND_PARTNERS', 'Des partenaires', 'Sous-éditeurs, superviseurs, labels.')
	],
	fields: [
		territoryField(),
		{
			id: 'submissions',
			label: 'Soumissions d’œuvres',
			kind: 'single',
			required: true,
			when: { needs: ['FIND_AUTHORS', 'FIND_COMPOSERS', 'FIND_WORKS'] },
			options: [
				opt('OPEN', 'Ouvertes'),
				opt('CLOSED', 'Fermées'),
				opt('INVITATION', 'Sur invitation')
			]
		},
		{
			id: 'sync_media',
			label: 'Synchro : supports',
			kind: 'multi',
			when: SYNC,
			options: [
				opt('FILM_SERIES', 'Cinéma, séries'),
				opt('ADVERTISING', 'Publicité'),
				opt('VIDEO_GAMES', 'Jeux vidéo'),
				opt('DOCUMENTARY', 'Documentaire'),
				opt('WEB', 'Web')
			]
		},
		{
			id: 'sync_formats',
			label: 'Synchro : ce que tu places',
			kind: 'multi',
			when: SYNC,
			options: [
				opt('INSTRUMENTALS', 'Instrumentaux'),
				opt('SONGS', 'Chansons'),
				opt('SCORE', 'Musique à l’image')
			]
		},
		{
			id: 'admin_societies',
			label: 'Administration : sociétés de gestion',
			hint: 'Déclaratif : aucun mandat n’est supposé.',
			kind: 'multi',
			when: { specializations: ['ADMINISTRATION'] },
			options: [
				opt('SACEM', 'Sacem'),
				opt('PRS', 'PRS (Royaume-Uni)'),
				opt('GEMA', 'GEMA (Allemagne)'),
				opt('US_PROS', 'ASCAP, BMI (États-Unis)'),
				opt('OTHER', 'Autres')
			]
		}
	]
};
