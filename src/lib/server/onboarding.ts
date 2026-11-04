/**
 * Onboarding (P1-10) côté serveur : état déduit du profil, et « premier
 * résultat » (musiciens proches, requête simple : la recherche complète
 * arrive en P2-01).
 */
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { findActorsNear } from '#lib/server/geo/queries';
import { currentStep, type OnboardingState } from '#lib/onboarding/steps';

export async function onboardingStateOf(actorId: string): Promise<OnboardingState> {
	const [person, instrumentCount, genreCount, zoneCount] = await Promise.all([
		prisma.person.findUniqueOrThrow({
			where: { actorId },
			select: { onboardedAt: true, _count: { select: { tracks: true } } }
		}),
		prisma.personInstrument.count({ where: { personId: actorId } }),
		prisma.actorGenre.count({ where: { actorId } }),
		prisma.actorLocation.count({ where: { actorId } })
	]);
	return {
		hasTracks: person._count.tracks > 0,
		instrumentCount,
		genreCount,
		hasZone: zoneCount > 0,
		onboarded: person.onboardedAt !== null
	};
}

/** Personne et étape courante pour un compte connecté (ou `null` sans personne). */
export async function onboardingFor(userId: string) {
	const person = await getPersonByUserId(userId);
	if (!person) return null;
	const state = await onboardingStateOf(person.actorId);
	return { person, state, step: currentStep(state) };
}

/** Rayon de recherche du premier résultat : celui de la personne, sinon 25 km. */
export const DEFAULT_RADIUS_KM = 25;

/**
 * Musiciens proches pour le premier résultat : personnes avec une ville, hors
 * comptes supprimés ou suspendus, de la plus proche à la plus lointaine.
 */
export async function nearbyMusicians(actorId: string, radiusKm: number, limit = 12) {
	const near = await findActorsNear(actorId, radiusKm);
	const ids = near.map((n) => n.actorId);
	if (ids.length === 0) return [];
	const now = new Date();
	const persons = await prisma.person.findMany({
		where: {
			actorId: { in: ids },
			actor: {
				deletedAt: null,
				sanctions: {
					none: {
						kind: 'SUSPENSION',
						liftedAt: null,
						OR: [{ until: null }, { until: { gt: now } }]
					}
				}
			}
		},
		select: {
			actorId: true,
			actor: {
				select: {
					handle: true,
					displayName: true,
					genres: { select: { genre: { select: { name: true } } }, take: 3 }
				}
			},
			instruments: {
				where: { isPrimary: true },
				select: { declaredLevel: true, instrument: { select: { name: true } } }
			}
		}
	});
	const byId = new Map(persons.map((p) => [p.actorId, p]));
	return near
		.filter((n) => byId.has(n.actorId))
		.slice(0, limit)
		.map((n) => {
			const p = byId.get(n.actorId)!;
			const primary = p.instruments[0];
			return {
				handle: p.actor.handle,
				displayName: p.actor.displayName,
				commune: n.communeName,
				meters: n.meters,
				instrument: primary
					? { name: primary.instrument.name, level: primary.declaredLevel }
					: null,
				genres: p.actor.genres.map((g) => g.genre.name)
			};
		});
}
