/**
 * Données du récapitulatif de l'onboarding (ONB-12a), lues pour la seule
 * personne connectée. La mise en forme est dans `#lib/onboarding/recap`.
 */
import { prisma } from '#lib/server';
import { getActorLocation } from '#lib/server/geo/queries';
import { getTrackAnswers, getTrackDetails } from '#lib/prisma/actors/specializations';
import { getMusicianStep } from '#lib/prisma/musician/musicianProfile';
import type { RecapInput, TrackRecapInput } from '#lib/onboarding/recap';
import type { TrackKindValue } from '#lib/actors/tracks';

export async function recapInputOf(actorId: string): Promise<RecapInput> {
	const [person, instruments, genres, location, details, musician] = await Promise.all([
		prisma.person.findUniqueOrThrow({
			where: { actorId },
			select: {
				travelRadiusKm: true,
				tracks: { select: { track: true, isPrimary: true }, orderBy: { createdAt: 'asc' } }
			}
		}),
		prisma.personInstrument.findMany({
			where: { personId: actorId },
			orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
			select: { declaredLevel: true, isPrimary: true, instrument: { select: { name: true } } }
		}),
		prisma.actorGenre.findMany({
			where: { actorId },
			orderBy: { createdAt: 'asc' },
			select: { genre: { select: { name: true } } }
		}),
		getActorLocation(actorId),
		getTrackDetails(actorId),
		getMusicianStep(actorId)
	]);
	const others = details.filter((d) => d.track !== 'MUSICIAN');
	const answers = await Promise.all(others.map((d) => getTrackAnswers(actorId, d.track)));
	const byTrack: Partial<Record<TrackKindValue, TrackRecapInput>> = {};
	others.forEach((d, i) => {
		byTrack[d.track] = {
			specializations: d.specializations,
			offers: d.offers,
			needs: d.needs,
			answers: answers[i]
		};
	});
	return {
		tracks: [...person.tracks].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
		instruments: instruments.map((i) => ({
			name: i.instrument.name,
			level: i.declaredLevel,
			isPrimary: i.isPrimary
		})),
		genres: genres.map((g) => g.genre.name),
		commune: location?.communeName ?? null,
		radiusKm: person.travelRadiusKm,
		musician: { ...musician, answers: musician.details },
		details: byTrack
	};
}
