// LINKMUSICIAN: ajouter un lieu à l'annuaire (P2-14a, D27). Aucune XP : un
// lieu ajouté ne rapporte rien, ce sont les appréciations après une jam qui
// rapportent (P2-15).
import { fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { VenueError, createVenue } from '#lib/server/venues/service';
import { VENUE_KINDS, VENUE_KIND_LABELS, venueSchema } from '#lib/venues/rules';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const location = await getActorLocation(person.actorId);
	return {
		kinds: VENUE_KINDS.map((k) => ({ value: k, label: VENUE_KIND_LABELS[k] })),
		// Par défaut, la commune de la personne : le lieu est souvent tout près.
		commune: location
			? {
					code: location.communeCode,
					nom: location.communeName,
					codeDepartement: location.departmentCode
				}
			: null,
		name: (url.searchParams.get('nom') ?? '').slice(0, 80)
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const person = (await getPersonByUserId(locals.user!.id))!;
		const raw = Object.fromEntries(await request.formData()) as Record<string, string>;
		const parsed = venueSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, {
				values: raw,
				error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.',
				existingId: null
			});
		}
		let id: string;
		try {
			({ id } = await createVenue(person.actorId, parsed.data));
		} catch (err) {
			if (err instanceof VenueError) {
				return fail(err.status, { values: raw, error: err.message, existingId: err.existingId });
			}
			throw err;
		}
		redirect(303, `/lieux/${id}?ajoute=1`);
	}
};
