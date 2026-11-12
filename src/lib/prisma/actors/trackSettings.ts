/**
 * Réglages par métier (ONB-12b, D61) : visibilité des trois blocs et
 * « ouvert aux sollicitations ». Colonnes de `person_tracks` : retirer un
 * métier les efface avec lui, l'anonymisation aussi.
 */
import { prisma } from '#lib/server';
import type { TrackKindValue } from '#lib/actors/tracks';
import type { TrackSettings } from '#lib/actors/trackSheet';
import { TrackNotHeldError } from './specializations';

export const TRACK_SETTINGS_SELECT = {
	offersVisibility: true,
	detailsVisibility: true,
	conditionsVisibility: true,
	openToRequests: true
} as const;

/** Réglages de chaque métier de la personne. */
export async function getTrackSettings(
	personId: string
): Promise<Partial<Record<TrackKindValue, TrackSettings>>> {
	const rows = await prisma.personTrack.findMany({
		where: { personId },
		select: { track: true, ...TRACK_SETTINGS_SELECT }
	});
	return Object.fromEntries(rows.map(({ track, ...settings }) => [track, settings]));
}

/** Enregistre les réglages d'un métier détenu ; sinon `TrackNotHeldError`. */
export async function setTrackSettings(
	personId: string,
	track: TrackKindValue,
	settings: TrackSettings
) {
	const { count } = await prisma.personTrack.updateMany({
		where: { personId, track },
		data: settings
	});
	if (count === 0) throw new TrackNotHeldError(track);
}

/** A-t-elle coché au moins une offre dans l'un de ces métiers (D62 : condition de la recherche) ? */
export async function hasOfferIn(personId: string, tracks: readonly TrackKindValue[]) {
	const count = await prisma.personTrackIntent.count({
		where: { personId, track: { in: [...tracks] }, direction: 'OFFER' }
	});
	return count > 0;
}
