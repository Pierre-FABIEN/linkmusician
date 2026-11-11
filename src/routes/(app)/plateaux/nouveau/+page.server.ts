// LINKMUSICIAN: publier un plateau (P5-05a, conception 08 §8) : une date dans
// un lieu de l'annuaire, des groupes cherchés, des conditions sur des faits
// prouvés (rang, genre, zone), jamais l'XP. Aucune XP à la publication.
import { fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { listGenreTree } from '#lib/prisma/skills/referentials';
import { getActorLocation } from '#lib/server/geo/queries';
import { getVenue, venuesNear } from '#lib/server/venues/service';
import { OpportunityError } from '#lib/server/opportunities/service';
import { createGigSlot, isPromoter } from '#lib/server/opportunities/gigSlots';
import { GIG_TIER_OPTIONS, gigSlotSchema } from '#lib/opportunities/gigSlot';
import { parisDay } from '#lib/metrics/indicators';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const promoter = await isPromoter(person.actorId);
	if (!promoter) return { promoter: false as const };
	const location = await getActorLocation(person.actorId);
	const chosenId = url.searchParams.get('lieu');
	const [venues, chosen, genres] = await Promise.all([
		location ? venuesNear(person.actorId, { limit: 50 }) : Promise.resolve([]),
		// Un lieu en attente de validation n'accueille rien (D26).
		chosenId
			? getVenue(chosenId, person.actorId).then((v) => (v?.validated ? v : null))
			: Promise.resolve(null),
		listGenreTree()
	]);
	const options = chosen && !venues.some((v) => v.id === chosen.id) ? [chosen, ...venues] : venues;
	return {
		promoter: true as const,
		commune: location?.communeName ?? null,
		venues: options.map((v) => ({
			id: v.id,
			label: `${v.name} · ${v.kindLabel} · ${v.communeName}`
		})),
		venueId: chosen?.id ?? '',
		today: parisDay(new Date()),
		tiers: GIG_TIER_OPTIONS,
		genres: genres.map((g) => ({
			slug: g.slug,
			name: g.name,
			children: g.children.map((c) => ({ slug: c.slug, name: c.name }))
		}))
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const person = (await getPersonByUserId(locals.user!.id))!;
		const raw = Object.fromEntries(await request.formData()) as Record<string, string>;
		const parsed = gigSlotSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, {
				values: raw,
				error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.'
			});
		}
		let id: string;
		try {
			({ id } = await createGigSlot(person.actorId, parsed.data));
		} catch (err) {
			if (err instanceof OpportunityError)
				return fail(err.status, { values: raw, error: err.message });
			throw err;
		}
		redirect(303, `/annonces/${id}?publiee=1`);
	}
};
