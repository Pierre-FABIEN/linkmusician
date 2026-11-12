// LINKMUSICIAN: publier un atelier jam au nom de l'école (P5-11) : dans un
// lieu de l'annuaire, réservé aux élèves, lead = la personne qui publie.
// Réservé à la gestion de l'école. Aucune XP (D27).
import { error, fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { listGenreTree, listInstrumentsByFamily } from '#lib/prisma/skills/referentials';
import { getActorLocation } from '#lib/server/geo/queries';
import { venuesNear } from '#lib/server/venues/service';
import { createWorkshop, SchoolError, schoolForMember } from '#lib/server/schools/service';
import { jamSchema } from '#lib/jam/publicJam';
import { parisDay } from '#lib/metrics/indicators';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const person = await requirePerson(locals);
	const school = await schoolForMember(params.handle, person.actorId);
	if (!school?.manager) error(404, 'École introuvable');
	const location = await getActorLocation(person.actorId);
	const [venues, instruments, genres] = await Promise.all([
		location ? venuesNear(person.actorId, { limit: 50 }) : Promise.resolve([]),
		listInstrumentsByFamily(),
		listGenreTree()
	]);
	return {
		school: { name: school.name, handle: school.handle },
		venues: venues.map((v) => ({
			id: v.id,
			label: `${v.name} · ${v.kindLabel} · ${v.communeName}`
		})),
		today: parisDay(new Date()),
		instruments: instruments.flatMap((f) =>
			f.instruments.map((i) => ({ slug: i.slug, name: i.name }))
		),
		genres: genres.flatMap((g) => [
			{ slug: g.slug, name: g.name },
			...g.children.map((c) => ({ slug: c.slug, name: `— ${c.name}` }))
		])
	};
};

export const actions: Actions = {
	default: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const data = await request.formData();
		const raw = Object.fromEntries(
			[...data.entries()].filter(([k]) => !k.startsWith('spot-'))
		) as Record<string, string>;
		const spots = [...data.entries()]
			.filter(([k, v]) => k.startsWith('spot-') && Number(v) > 0)
			.map(([k, v]) => ({ instrument: k.slice(5), count: v }));
		const parsed = jamSchema.safeParse({ ...raw, spots });
		if (!parsed.success) {
			return fail(400, {
				values: raw,
				error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.'
			});
		}
		let id: string;
		try {
			({ id } = await createWorkshop(params.handle, person.actorId, parsed.data));
		} catch (err) {
			if (err instanceof SchoolError) return fail(err.status, { values: raw, error: err.message });
			throw err;
		}
		redirect(303, `/jams/${id}?publiee=1`);
	}
};
