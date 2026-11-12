/**
 * Catalogues des métiers (ONB-03 à 11, D59) : un fichier par métier, ses
 * offres, ses besoins et ses champs propres. Ajouter un métier, c'est
 * ajouter son fichier ici (et sa fiche `TRACK_ROLES`, ses spécialités).
 */
import type { TrackKindValue } from '../tracks';
import type { TrackCatalog } from './types';
import { musicianCatalog } from './musician';
import { soundCatalog } from './sound';
import { producerCatalog } from './producer';
import { managerCatalog } from './manager';
import { bookerCatalog } from './booker';
import { promoterCatalog } from './promoter';
import { labelCatalog } from './label';
import { publisherCatalog } from './publisher';
import { commsCatalog } from './comms';

export const TRACK_CATALOGS: Readonly<Record<TrackKindValue, TrackCatalog>> = {
	MUSICIAN: musicianCatalog,
	PRODUCER: producerCatalog,
	SOUND_ENGINEER: soundCatalog,
	MANAGER: managerCatalog,
	BOOKER: bookerCatalog,
	PROMOTER: promoterCatalog,
	LABEL_PRO: labelCatalog,
	PUBLISHER: publisherCatalog,
	MUSIC_COMMS: commsCatalog
};
