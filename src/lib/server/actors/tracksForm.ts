/**
 * Formulaire des métiers, partagé par l'écran d'arrivée `/qui-es-tu` et les
 * réglages `(app)/reglages/metiers`.
 */
import { redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { tracksSchema } from '#lib/schema/actors/tracksSchema';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import type { TrackKindValue } from '#lib/actors/tracks';

/** Compte connecté, vérifié, avec une personne LinkMusician (sinon redirection). */
export async function requirePerson(locals: App.Locals) {
	const user = locals.user;
	if (!user) redirect(302, '/auth/login');
	if (!user.emailVerified) redirect(302, '/auth/verify-email');
	const person = await getPersonByUserId(user.id);
	if (!person) redirect(302, '/bienvenue');
	return person;
}

/** Formulaire prérempli avec les métiers actuels de la personne. */
export function tracksFormFor(tracks: readonly { track: TrackKindValue; isPrimary: boolean }[]) {
	return superValidate(
		{
			tracks: tracks.map((t) => t.track),
			primary: tracks.find((t) => t.isPrimary)?.track
		},
		zod(tracksSchema),
		{ errors: false }
	);
}
