// LINKMUSICIAN: monter un groupe (P3-01). Ne rapporte rien tant que le groupe
// n'a pas de 2ᵉ membre (rien d'unilatéral).
import { fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { BandError, createBand } from '#lib/server/bands/service';
import { bandSchema } from '#lib/bands/rules';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const person = (await getPersonByUserId(locals.user!.id))!;
		const raw = Object.fromEntries(await request.formData()) as Record<string, string>;
		const parsed = bandSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, {
				values: raw,
				error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.'
			});
		}
		let handle: string;
		try {
			({ handle } = await createBand(person.actorId, parsed.data));
		} catch (err) {
			if (err instanceof BandError) return fail(err.status, { values: raw, error: err.message });
			throw err;
		}
		redirect(303, `/groupes/${handle}?cree=1`);
	}
};
