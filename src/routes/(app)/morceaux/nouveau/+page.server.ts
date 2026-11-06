// LINKMUSICIAN: noter une idée de morceau (P3-11), à moi ou au nom d'un
// groupe que je gère (`?groupe=` présélectionne). Ne rapporte rien.
import { fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { managedBands } from '#lib/server/bands/service';
import { instrumentFamilies, rolesOf } from '#lib/server/works/forms';
import { WorkError, createWork } from '#lib/server/works/service';
import { newWorkSchema } from '#lib/works/rules';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const [bands, families] = await Promise.all([managedBands(person.actorId), instrumentFamilies()]);
	const groupe = url.searchParams.get('groupe');
	return {
		bands: bands.map(({ handle, name }) => ({ handle, name })),
		defaultBand: bands.some((b) => b.handle === groupe) ? groupe : '',
		families
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const person = (await getPersonByUserId(locals.user!.id))!;
		const form = await request.formData();
		const values = { title: String(form.get('title') ?? ''), band: String(form.get('band') ?? '') };
		const parsed = newWorkSchema.safeParse({ ...values, genreIds: [], roles: rolesOf(form) });
		if (!parsed.success) {
			return fail(400, {
				values,
				error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.'
			});
		}
		let id: string;
		try {
			({ id } = await createWork(person.actorId, parsed.data));
		} catch (err) {
			if (err instanceof WorkError) return fail(err.status, { values, error: err.message });
			throw err;
		}
		redirect(303, `/morceaux/${id}?cree`);
	}
};
