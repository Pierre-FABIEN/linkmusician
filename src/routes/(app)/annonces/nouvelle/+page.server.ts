// LINKMUSICIAN: publier une annonce (P2-02). Aucune XP à la publication.
import { fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { listGenreTree, listInstrumentsByFamily } from '#lib/prisma/skills/referentials';
import {
	OpportunityError,
	TIER_OPTIONS,
	createOpportunity
} from '#lib/server/opportunities/service';
import { opportunitySchema } from '#lib/opportunities/rules';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const [location, instruments, genres] = await Promise.all([
		getActorLocation(person.actorId),
		listInstrumentsByFamily(),
		listGenreTree()
	]);
	return {
		commune: location?.communeName ?? null,
		instruments: instruments.map((f) => ({
			family: f.family,
			instruments: f.instruments.map((i) => ({ slug: i.slug, name: i.name }))
		})),
		genres: genres.map((g) => ({
			slug: g.slug,
			name: g.name,
			children: g.children.map((c) => ({ slug: c.slug, name: c.name }))
		})),
		tiers: TIER_OPTIONS
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const person = (await getPersonByUserId(locals.user!.id))!;
		const raw = Object.fromEntries(await request.formData());
		const parsed = opportunitySchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, {
				values: raw as Record<string, string>,
				error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.'
			});
		}
		let id: string;
		try {
			({ id } = await createOpportunity(person.actorId, parsed.data));
		} catch (err) {
			if (err instanceof OpportunityError) {
				return fail(err.status, { values: raw as Record<string, string>, error: err.message });
			}
			throw err;
		}
		redirect(303, `/annonces/${id}?publiee=1`);
	}
};
