/**
 * Musicien·ne (ONB-03, D58) : offres et besoins. Ses champs propres
 * (expérience, engagement, précisions selon l'instrument) vivent dans
 * `#lib/musician/profile`, car ils dépendent des instruments.
 */
import { intent } from './helpers';
import type { TrackCatalog } from './types';

export const musicianCatalog: TrackCatalog = {
	offers: [
		intent('PLAY_JAMS', 'Jouer en jam', 'Venir faire le bœuf, animer, tenir une place.'),
		intent('JOIN_BAND', 'Rejoindre un groupe', 'Tenir ta place dans un groupe qui cherche.'),
		intent(
			'DO_REPLACEMENTS',
			'Faire des remplacements',
			'Dépanner un groupe pour une date ou une tournée.'
		),
		intent(
			'WRITING',
			'Composer ou arranger',
			'Apporter des morceaux, des parties, des arrangements.'
		),
		intent('SESSIONS', 'Jouer en session', 'Enregistrer ou jouer pour d’autres artistes.'),
		intent('GIVE_LESSONS', 'Donner des cours', 'Transmettre ton instrument ou ta voix.')
	],
	needs: [
		intent('FIND_JAMS', 'Des jams', 'Des bœufs et des scènes ouvertes près de toi.'),
		intent('FIND_PARTNERS', 'Des partenaires', 'Des musicien·nes avec qui jouer régulièrement.'),
		intent(
			'FIND_BAND',
			'Rejoindre ou monter un groupe',
			'Un projet à plusieurs, à rejoindre ou à créer.'
		),
		intent(
			'FIND_REPLACEMENT',
			'Un·e remplaçant·e',
			'Quelqu’un pour tenir une place le temps d’une date.'
		),
		intent(
			'CO_WRITING',
			'Composer à plusieurs',
			'Écrire avec d’autres : morceaux, paroles, featuring.'
		),
		intent('FIND_STUDIO', 'Des sessions studio', 'Enregistrer, en studio ou chez quelqu’un.'),
		intent('TAKE_LESSONS', 'Prendre des cours', 'Progresser avec un·e prof.')
	],
	fields: []
};
