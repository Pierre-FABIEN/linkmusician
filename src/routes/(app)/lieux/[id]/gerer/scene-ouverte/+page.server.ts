// LINKMUSICIAN: publier une scène ouverte récurrente (P5-04a) pour un lieu
// que l'on gère : une jam chaque semaine, le même jour, aux mêmes heures. Le
// lieu est l'émetteur ; les jams des 4 semaines à venir sont créées tout de
// suite, puis chaque jour par le job. Aucune XP à la publication.
import { error, fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { listGenreTree, listInstrumentsByFamily } from '#lib/prisma/skills/referentials';
import { venueForManager } from '#lib/server/venues/profile';
import { createJamSeries } from '#lib/server/jam/series';
import { JamError } from '#lib/server/jam/publicJams';
import { seriesSchema } from '#lib/jam/series';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const person = await requirePerson(locals);
	const venue = await venueForManager(params.id, person.actorId);
	if (!venue) error(404, 'Lieu introuvable');
	const [instruments, genres] = await Promise.all([listInstrumentsByFamily(), listGenreTree()]);
	return {
		venue: {
			id: venue.venueId,
			name: venue.name,
			published: venue.publishedAt !== null,
			// Jour habituel de la fiche (jeudi par défaut), pour préremplir.
			firstDay: venue.days[0] ?? 4
		},
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
		// Places : une case « spot-<instrument> » par instrument, avec un nombre.
		const spots = [...data.entries()]
			.filter(([k, v]) => k.startsWith('spot-') && Number(v) > 0)
			.map(([k, v]) => ({ instrument: k.slice(5), count: v }));
		const parsed = seriesSchema.safeParse({ ...raw, spots });
		if (!parsed.success) {
			return fail(400, {
				values: raw,
				error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.'
			});
		}
		try {
			await createJamSeries(person.actorId, params.id, parsed.data);
		} catch (err) {
			if (err instanceof JamError) return fail(err.status, { values: raw, error: err.message });
			throw err;
		}
		redirect(303, `/lieux/${params.id}/gerer?scene=1#scenes`);
	}
};
