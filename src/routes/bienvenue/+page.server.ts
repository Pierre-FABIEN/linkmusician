/**
 * LINKMUSICIAN: complétion de la personne (Actor + Person).
 *
 * Passage obligé, avant l'espace LinkMusician `(app)`, pour tout compte
 * sans personne : connexion Google (pas de date de naissance fournie),
 * comptes créés avant LinkMusician ou par les tests du boilerplate.
 */
import { fail, redirect } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { welcomeSchema } from '#lib/schema/actors/welcomeSchema';
import { suggestHandle } from '#lib/actors/handle';
import { createPersonForUser, hasPerson, isHandleTaken } from '#lib/prisma/actors/person';
import type { Actions, PageServerLoad } from './$types';

/** Étape suivante : le choix des métiers (elle renvoie vers `/espace` s'ils sont déjà choisis). */
const APP_HOME = '/qui-es-tu';

function requireVerifiedUser(locals: App.Locals) {
	const user = locals.user;
	if (!user) redirect(302, '/auth/login');
	if (!user.emailVerified) redirect(302, '/auth/verify-email');
	return user;
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireVerifiedUser(locals);
	if (await hasPerson(user.id)) redirect(302, APP_HOME);

	// Suggestion déjà libre et valide (ni réservée, ni prise), que la personne peut modifier.
	const handle = await suggestHandle(user.username ?? user.name ?? '', isHandleTaken);
	const form = await superValidate(
		{ handle, birthDate: '', acceptTerms: false },
		zod(welcomeSchema),
		{ errors: false }
	);
	return { form };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireVerifiedUser(locals);
		if (await hasPerson(user.id)) redirect(303, APP_HOME);

		const form = await superValidate(request, zod(welcomeSchema));
		if (!form.valid) return fail(400, { form });

		if (await isHandleTaken(form.data.handle)) {
			return setError(form, 'handle', 'Cet identifiant est déjà pris.');
		}

		await createPersonForUser({
			userId: user.id,
			displayName: user.name ?? user.username ?? form.data.handle,
			handleSource: form.data.handle,
			birthDate: form.data.birthDate
		});

		redirect(303, APP_HOME);
	}
};
