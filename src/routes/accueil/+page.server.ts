/**
 * LINKMUSICIAN: accueil, servi à l'adresse `/` quand la boutique est en veille
 * (voir `reroute` dans `src/hooks.ts`). Il propose la connexion ; une personne
 * déjà connectée part directement dans son espace.
 *
 * Le formulaire poste sur l'action du boilerplate `/auth/login?/login` (quotas,
 * délais, 2FA inchangés). Elle redirige vers `/` en cas de succès : on revient
 * ici, et ce `load` envoie dans l'espace.
 */
import { redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { loginSchema } from '#lib/schema/auth/loginSchema';
import { APP_HOME } from '#lib/linkmusician/home';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, locals.user.emailVerified ? APP_HOME : '/auth/verify-email');
	return { loginForm: await superValidate(zod(loginSchema)) };
};
