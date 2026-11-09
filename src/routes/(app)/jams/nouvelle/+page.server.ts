// LINKMUSICIAN: publier une jam (P2-14b, D26) : toujours dans un lieu de
// l'annuaire. Aucune XP à la publication (D27).
import { fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { listGenreTree, listInstrumentsByFamily } from '#lib/prisma/skills/referentials';
import { getActorLocation } from '#lib/server/geo/queries';
import { getVenue, venuesNear } from '#lib/server/venues/service';
import { JamError, createJam, isJamOrganizer } from '#lib/server/jam/publicJams';
import { replayDraft } from '#lib/server/jam/afterJam';
import { jamSchema } from '#lib/jam/publicJam';
import { parisDay } from '#lib/metrics/indicators';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	// Réservé aux personnes « prêtes à organiser des jams » (D51).
	if (!(await isJamOrganizer(person.actorId))) redirect(303, '/profil?organiser=1#organiser');
	const location = await getActorLocation(person.actorId);
	// « Rejouer ensemble » (P2-15b) : reprend une jam où l'on était.
	const againId = url.searchParams.get('rejouer');
	const again = againId ? await replayDraft(againId, person.actorId) : null;
	const chosenId = url.searchParams.get('lieu') ?? again?.venueId ?? null;
	const [venues, chosen, instruments, genres] = await Promise.all([
		location ? venuesNear(person.actorId, { limit: 50 }) : Promise.resolve([]),
		// Un lieu en attente de validation n'accueille pas de jam (P2-14c, D26).
		chosenId
			? getVenue(chosenId, person.actorId).then((v) => (v?.validated ? v : null))
			: Promise.resolve(null),
		listInstrumentsByFamily(),
		listGenreTree()
	]);
	const options = chosen && !venues.some((v) => v.id === chosen.id) ? [chosen, ...venues] : venues;
	return {
		venues: options.map((v) => ({
			id: v.id,
			label: `${v.name} · ${v.kindLabel} · ${v.communeName}`
		})),
		venueId: chosen?.id ?? '',
		again,
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
	default: async ({ locals, request }) => {
		const person = (await getPersonByUserId(locals.user!.id))!;
		const data = await request.formData();
		const raw = Object.fromEntries(
			[...data.entries()].filter(([k]) => !k.startsWith('spot-'))
		) as Record<string, string>;
		// Places : une case « spot-<instrument> » par instrument, avec un nombre.
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
			({ id } = await createJam(person.actorId, parsed.data));
		} catch (err) {
			if (err instanceof JamError) return fail(err.status, { values: raw, error: err.message });
			throw err;
		}
		redirect(303, `/jams/${id}?publiee=1`);
	}
};
