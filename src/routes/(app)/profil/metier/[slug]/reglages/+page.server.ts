/**
 * LINKMUSICIAN: réglages d'un métier (ONB-12b, D61) : visibilité des blocs et
 * « ouvert aux sollicitations ». Pas de page : le formulaire est sur la page
 * du métier (ou « Ma pratique ») et revient à elle. Seul un métier détenu par
 * la personne connectée se règle.
 */
import { error, fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { trackOfSlug } from '#lib/actors/roles';
import { trackProfileHref } from '#lib/actors/completeness';
import { trackSettingsSchema } from '#lib/schema/actors/trackSettingsSchema';
import { setTrackSettings } from '#lib/prisma/actors/trackSettings';
import { TrackNotHeldError } from '#lib/prisma/actors/specializations';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const track = trackOfSlug(params.slug);
	if (!track) error(404, 'Métier inconnu');
	redirect(303, trackProfileHref(track));
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const person = await requirePerson(locals);
		const track = trackOfSlug(params.slug);
		if (!track) return fail(404, { settingsError: 'Métier inconnu.' });
		const parsed = trackSettingsSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { settingsError: 'Choix invalide.' });
		try {
			await setTrackSettings(person.actorId, track, parsed.data);
		} catch (err) {
			if (err instanceof TrackNotHeldError)
				return fail(403, { settingsError: 'Ce métier n’est pas le tien.' });
			throw err;
		}
		redirect(303, `${trackProfileHref(track)}?reglages=1`);
	}
};
