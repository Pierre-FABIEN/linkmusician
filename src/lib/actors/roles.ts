/**
 * Fiche de chaque métier (ONB-02, D57) : ce que l'application doit savoir
 * d'un métier pour l'inscription, les profils et la recherche, en un seul
 * endroit. Module pur, partagé par le serveur et le navigateur.
 *
 * Ajouter ou ouvrir un métier, c'est compléter sa fiche ici (et `TRACKS`
 * pour le libellé et l'ouverture, D15). Les listes qui existaient avant
 * (recherche `SEARCH_TRACKS`, fil d'Ariane, profils historiques) restent
 * où elles sont ; `roles.test.ts` vérifie qu'elles s'accordent avec ces
 * fiches, pour qu'un métier ne soit jamais à moitié déclaré.
 */
import { TRACK_KINDS, TRACKS, type TrackKindValue } from './tracks';

/** Où vivent les spécialités historiques d'un métier (avant ONB-01). */
export type LegacyProfile = 'sound' | 'producer' | 'promoter';

export type TrackRole = {
	track: TrackKindValue;
	/** Adresse lisible : étape d'onboarding (`/demarrer/metier/<slug>`), recherche (`?metier=`). */
	slug: string;
	/** Page du profil détaillé du métier dans l'espace ; `null` tant qu'il n'y en a pas. */
	profilePath: string | null;
	/** Profil dont une colonne porte les spécialités historiques. */
	legacyProfile: LegacyProfile | null;
	onboarding: {
		/** Demande instruments et niveaux (étape « Instruments »). */
		instruments: boolean;
		/** Demande l'intention de musicien·ne (étape « Intention », qui finit l'onboarding). */
		intention: boolean;
		/** A sa propre étape (spécialités, « Je propose », « Je recherche »). */
		ownStep: boolean;
	};
};

const plain = { instruments: false, intention: false, ownStep: true };

export const TRACK_ROLES: Readonly<Record<TrackKindValue, TrackRole>> = {
	MUSICIAN: {
		track: 'MUSICIAN',
		slug: 'musicien',
		profilePath: '/profil/musical',
		legacyProfile: null,
		// Ses écrans sont instruments et intention ; ses spécialités ne sont
		// jamais exigées (Q54), donc pas d'étape à lui.
		onboarding: { instruments: true, intention: true, ownStep: false }
	},
	PRODUCER: {
		track: 'PRODUCER',
		slug: 'producteur',
		profilePath: '/profil/production',
		legacyProfile: 'producer',
		onboarding: plain
	},
	SOUND_ENGINEER: {
		track: 'SOUND_ENGINEER',
		slug: 'inge-son',
		profilePath: '/profil/son',
		legacyProfile: 'sound',
		onboarding: plain
	},
	MANAGER: {
		track: 'MANAGER',
		slug: 'manager',
		profilePath: '/profil/accompagnement',
		legacyProfile: null,
		onboarding: plain
	},
	BOOKER: {
		track: 'BOOKER',
		slug: 'booker',
		profilePath: '/profil/accompagnement',
		legacyProfile: null,
		onboarding: plain
	},
	PROMOTER: {
		track: 'PROMOTER',
		slug: 'organisateur',
		profilePath: '/profil/organisateur',
		legacyProfile: 'promoter',
		onboarding: plain
	},
	LABEL_PRO: {
		track: 'LABEL_PRO',
		slug: 'label',
		profilePath: null,
		legacyProfile: null,
		onboarding: plain
	},
	PUBLISHER: {
		track: 'PUBLISHER',
		slug: 'edition',
		profilePath: null,
		legacyProfile: null,
		onboarding: plain
	},
	MUSIC_COMMS: {
		track: 'MUSIC_COMMS',
		slug: 'communication',
		profilePath: null,
		legacyProfile: null,
		onboarding: plain
	}
};

export function trackOfSlug(slug: string): TrackKindValue | null {
	return TRACK_KINDS.find((t) => TRACK_ROLES[t].slug === slug) ?? null;
}

/**
 * Spécialités exigées à l'étape d'un métier : une pour un métier ouvert ;
 * aucune pour un métier « bientôt » (D15), dont l'étape se passe en un clic
 * et sert seulement à mesurer la demande. Ouvrir un métier (`available`)
 * rend donc sa spécialité obligatoire, sans autre changement.
 */
export function minSpecializations(track: TrackKindValue): number {
	return TRACKS[track].available ? 1 : 0;
}
