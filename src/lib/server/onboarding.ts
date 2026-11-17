/**
 * Onboarding (P1-10, ONB-02, ONB-12a) côté serveur : état déduit du profil,
 * fin de l'onboarding (au récapitulatif), et « premier résultat » (personnes
 * proches, requête simple : la recherche complète arrive en P2-01).
 */
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { findActorsNear } from '#lib/server/geo/queries';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { adultBirthCutoff } from '#lib/actors/visibility';
import { distanceBand } from '#lib/geo/distance';
import { redirect } from '@sveltejs/kit';
import {
	currentStep,
	stepAfter,
	stepPath,
	type OnboardingState,
	type OnboardingStepId
} from '#lib/onboarding/steps';

export async function onboardingStateOf(actorId: string): Promise<OnboardingState> {
	const [person, instrumentCount, genreCount, zoneCount] = await Promise.all([
		prisma.person.findUniqueOrThrow({
			where: { actorId },
			select: {
				onboardedAt: true,
				tracks: { select: { track: true, isPrimary: true, detailsConfirmedAt: true } }
			}
		}),
		prisma.personInstrument.count({ where: { personId: actorId } }),
		prisma.actorGenre.count({ where: { actorId } }),
		prisma.actorLocation.count({ where: { actorId } })
	]);
	return {
		tracks: person.tracks.map((t) => t.track),
		primary: person.tracks.find((t) => t.isPrimary)?.track ?? null,
		confirmedTracks: person.tracks.filter((t) => t.detailsConfirmedAt).map((t) => t.track),
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

/**
 * Termine l'onboarding depuis le récapitulatif, s'il ne reste que lui :
 * l'état est relu ici, jamais pris du formulaire. Renvoie `true` si
 * l'onboarding est fini (avant ou maintenant).
 */
export async function finishOnboarding(actorId: string): Promise<boolean> {
	const state = await onboardingStateOf(actorId);
	if (state.onboarded) return true;
	if (currentStep(state) !== 'recap') return false;
	await prisma.person.updateMany({
		where: { actorId, onboardedAt: null },
		data: { onboardedAt: new Date() }
	});
	return true;
}

/**
 * Après l'enregistrement d'une étape : redirige vers l'étape suivante, ou
 * vers le récapitulatif quand tout est rempli.
 */
export async function redirectAfterStep(actorId: string, from: OnboardingStepId): Promise<never> {
	redirect(303, stepPath(stepAfter(from, await onboardingStateOf(actorId))));
}

/** Rayon de recherche du premier résultat : celui de la personne, sinon 25 km. */
export const DEFAULT_RADIUS_KM = 25;

/**
 * Musiciens proches pour le premier résultat : personnes inscrites avec une
 * ville, de la plus proche à la plus lointaine, avec les garde-fous des
 * suggestions (`discovery/suggestions`) : profil public (ni masqué, ni
 * supprimé, ni suspendu), aucun blocage entre les deux, et **D5** : un·e
 * mineur·e n'est montré·e à un adulte que s'il ou elle est dans son réseau
 * (une date de naissance inconnue vaut mineur·e). Défaut trouvé en ONB-14.
 * La distance ne sort que par tranche, jamais en mètres (DASH-20a).
 */
export async function nearbyMusicians(actorId: string, radiusKm: number, limit = 12) {
	const near = await findActorsNear(actorId, radiusKm);
	const ids = near.map((n) => n.actorId);
	if (ids.length === 0) return [];
	const now = new Date();
	const cutoff = adultBirthCutoff(now);
	const viewer = await prisma.person.findUnique({
		where: { actorId },
		select: { birthDate: true }
	});
	const viewerIsMinor = viewer?.birthDate != null && viewer.birthDate > cutoff;
	const persons = await prisma.person.findMany({
		where: {
			actorId: { in: ids },
			onboardedAt: { not: null },
			actor: publicActorWhere(now, actorId),
			...(viewerIsMinor
				? {}
				: {
						OR: [
							{ birthDate: { lte: cutoff } },
							{ actor: { networkOf: { some: { ownerId: actorId } } } }
						]
					})
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
				distance: distanceBand(n.meters),
				instrument: primary
					? { name: primary.instrument.name, level: primary.declaredLevel }
					: null,
				genres: p.actor.genres.map((g) => g.genre.name)
			};
		});
}
