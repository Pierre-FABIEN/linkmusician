/**
 * Métiers d'une personne (`PersonTrack`). Règles pures dans
 * `#lib/actors/tracks` (D15).
 */
import type { TrackKind } from '@prisma/client';
import { prisma } from '#lib/server';
// Conflit sérialisable : P2034 en Prisma 5, `DriverAdapterError` en Prisma 7.
import { isWriteConflict } from '#lib/server/db-errors';
import { checkTrackSelection, type TrackKindValue, type TrackSelection } from '#lib/actors/tracks';
import { syncLegacySpecializations } from './specializations';

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/** Échoue à la compilation si le référentiel pur et l'enum Prisma divergent. */
export const TRACK_KINDS_MATCH_PRISMA: Equals<TrackKind, TrackKindValue> = true;

const MAX_ATTEMPTS = 3;

/**
 * Remplace les métiers d'une personne, en une transaction.
 *
 * La sélection est revérifiée ici : quel que soit l'appelant, une personne a
 * au moins un métier et **exactement un** principal. Il n'y a pas d'index
 * unique partiel en base (Prisma 5 ne sait pas le décrire, et un index absent
 * du schéma serait supprimé par la prochaine `migrate dev`) : cette fonction
 * est donc la seule à écrire dans `person_tracks`, hors anonymisation. Les
 * métiers déjà présents sont conservés (leur `createdAt` mesure la demande),
 * avec leurs spécialités et intentions (ONB-01).
 */
export async function setPersonTracks(personId: string, selection: TrackSelection) {
	const result = checkTrackSelection(selection.tracks, selection.primary);
	if (!result.ok) throw new Error(`Sélection de métiers invalide (${result.reason})`);
	const { tracks, primary } = result.selection;

	const ops = () => [
		prisma.personTrack.deleteMany({ where: { personId, track: { notIn: tracks } } }),
		prisma.personTrack.updateMany({ where: { personId }, data: { isPrimary: false } }),
		...tracks.map((track) =>
			prisma.personTrack.upsert({
				where: { personId_track: { personId, track } },
				create: { personId, track, isPrimary: track === primary },
				// `detailsConfirmedAt` (ONB-02) et les spécialités restent.
				update: { isPrimary: track === primary }
			})
		)
	];
	// Deux enregistrements simultanés ne laissent pas deux principaux
	// (sérialisable). Une transaction sérialisable peut échouer par conflit
	// avec celle d'une autre personne (verrous de prédicat) : on la rejoue.
	for (let attempt = 1; ; attempt++) {
		try {
			await prisma.$transaction(ops(), { isolationLevel: 'Serializable' });
			break;
		} catch (err) {
			if (attempt < MAX_ATTEMPTS && isWriteConflict(err)) continue;
			throw err;
		}
	}
	// ONB-01 : retirer un métier efface ses spécialités (cascade) mais pas son
	// profil ; s'il est repris, on recopie les spécialités du profil.
	await syncLegacySpecializations(personId);
	return result.selection;
}
