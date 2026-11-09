// LINKMUSICIAN: choisir son ambition (P3-12, conception 07 §4.1) :
// modifiable à tout moment, jamais d'échec.
import { fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { CareerError, setAmbition } from '#lib/server/career/service';
import { AMBITIONS, AMBITION_INFO } from '#lib/career/ambition';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	return {
		ambition: person.ambition,
		choices: AMBITIONS.map((value) => ({ value, ...AMBITION_INFO[value] }))
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const person = (await getPersonByUserId(locals.user!.id))!;
		const raw = String((await request.formData()).get('ambition') ?? '');
		try {
			const ambition = await setAmbition(person.actorId, raw);
			return {
				message: ambition
					? `C’est noté : « ${AMBITION_INFO[ambition].label} ». Tes objectifs suivent.`
					: 'Ambition retirée : tes objectifs reprennent l’ordre habituel.'
			};
		} catch (err) {
			if (err instanceof CareerError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
