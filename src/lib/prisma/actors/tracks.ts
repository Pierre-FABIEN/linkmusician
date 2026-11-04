/**
 * Métiers d'une personne (`PersonTrack`). Règles pures dans
 * `#lib/actors/tracks` (D15).
 */
import type { TrackKind } from '@prisma/client';
import { prisma } from '#lib/server';
import { checkTrackSelection, type TrackKindValue, type TrackSelection } from '#lib/actors/tracks';

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/** Échoue à la compilation si le référentiel pur et l'enum Prisma divergent. */
export const TRACK_KINDS_MATCH_PRISMA: Equals<TrackKind, TrackKindValue> = true;

/**
 * Remplace les métiers d'une personne, en une transaction.
 *
 * La sélection est revérifiée ici : quel que soit l'appelant, une personne a
 * au moins un métier et **exactement un** principal. Il n'y a pas d'index
 * unique partiel en base (Prisma 5 ne sait pas le décrire, et un index absent
 * du schéma serait supprimé par la prochaine `migrate dev`) : cette fonction
 * est donc la seule à écrire dans `person_tracks`, hors anonymisation. Les
 * métiers déjà présents sont conservés (leur `createdAt` mesure la demande).
 */
export async function setPersonTracks(personId: string, selection: TrackSelection) {
	const result = checkTrackSelection(selection.tracks, selection.primary);
	if (!result.ok) throw new Error(`Sélection de métiers invalide (${result.reason})`);
	const { tracks, primary } = result.selection;

	await prisma.$transaction(
		[
			prisma.personTrack.deleteMany({ where: { personId, track: { notIn: tracks } } }),
			prisma.personTrack.updateMany({ where: { personId }, data: { isPrimary: false } }),
			...tracks.map((track) =>
				prisma.personTrack.upsert({
					where: { personId_track: { personId, track } },
					create: { personId, track, isPrimary: track === primary },
					update: { isPrimary: track === primary }
				})
			)
		],
		{ isolationLevel: 'Serializable' }
	); // deux enregistrements simultanés ne laissent pas deux principaux
	return result.selection;
}
