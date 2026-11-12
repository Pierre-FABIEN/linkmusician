/**
 * Fiche de chaque métier (ONB-12b, D61) : complétude pour la personne,
 * fiche publique filtrée par lecteur pour `/@handle`. Les blocs qu'un
 * lecteur ne peut pas voir ne quittent jamais le serveur.
 */
import { prisma } from '#lib/server';
import { getTrackAnswers, getTrackDetails } from '#lib/prisma/actors/specializations';
import { getMusicianStep } from '#lib/prisma/musician/musicianProfile';
import { TRACK_SETTINGS_SELECT } from '#lib/prisma/actors/trackSettings';
import { recapInputOf } from '#lib/server/onboarding-recap';
import { profileCompleteness } from '#lib/actors/completeness';
import { trackSheet, type Audience, type TrackSheet } from '#lib/actors/trackSheet';
import type { TrackKindValue } from '#lib/actors/tracks';
import { TRACK_ROLES } from '#lib/actors/roles';

/** Complétude de chaque métier de la personne connectée. */
export async function completenessOf(actorId: string) {
	const [input, tracks] = await Promise.all([
		recapInputOf(actorId),
		prisma.personTrack.findMany({
			where: { personId: actorId },
			select: { track: true, openToRequests: true }
		})
	]);
	const openToRequests: Partial<Record<TrackKindValue, boolean | null>> = Object.fromEntries(
		tracks.map((t) => [t.track, t.openToRequests])
	);
	return profileCompleteness({ ...input, openToRequests });
}

/** Fiches des métiers d'une personne, telles que `audience` peut les voir. */
export async function publicTrackSheets(
	actorId: string,
	audience: Audience
): Promise<TrackSheet[]> {
	const [tracks, details] = await Promise.all([
		prisma.personTrack.findMany({
			where: { personId: actorId },
			orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
			select: { track: true, isPrimary: true, ...TRACK_SETTINGS_SELECT }
		}),
		getTrackDetails(actorId)
	]);
	return Promise.all(
		tracks.map(async ({ track, isPrimary, ...settings }) => {
			const d = details.find((x) => x.track === track);
			const base = {
				track,
				isPrimary,
				settings,
				specializations: d?.specializations ?? [],
				offers: d?.offers ?? [],
				needs: d?.needs ?? []
			};
			if (track === 'MUSICIAN') {
				const m = await getMusicianStep(actorId);
				return trackSheet(
					{
						...base,
						answers: m.details,
						musician: { practiceExperience: m.practiceExperience, commitment: m.commitment }
					},
					audience
				);
			}
			return trackSheet({ ...base, answers: await getTrackAnswers(actorId, track) }, audience);
		})
	);
}

/**
 * Complétude et réglages d'un métier détenu, pour sa page (`/profil/metier/…`
 * ou « Ma pratique »). `saved` : retour de l'enregistrement des réglages.
 */
export async function trackPageExtras(actorId: string, track: TrackKindValue, url: URL) {
	const [completeness, settings] = await Promise.all([
		completenessOf(actorId),
		prisma.personTrack.findUniqueOrThrow({
			where: { personId_track: { personId: actorId, track } },
			select: TRACK_SETTINGS_SELECT
		})
	]);
	return {
		completeness: completeness.tracks.find((t) => t.track === track)!,
		commonMissing: completeness.common,
		settings,
		settingsSlug: TRACK_ROLES[track].slug,
		settingsSaved: url.searchParams.has('reglages')
	};
}
