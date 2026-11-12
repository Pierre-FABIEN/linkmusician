// LINKMUSICIAN: lien d'invitation d'une école (P5-11). Page publique : un·e
// élève sans compte la voit, crée son compte, et le lien est repris après
// l'inscription (cookie `lm_ecole`, lu par la garde de l'espace). Seul le
// nom de l'école s'affiche ; rien sur ses élèves.
import { error, fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import {
	joinSchoolWithInvite,
	previewSchoolInvite,
	SchoolError
} from '#lib/server/schools/service';
import { INVITE_TOKEN } from '#lib/schools/rules';
import { SCHOOL_INVITE_COOKIE } from '#lib/server/schools/cookie';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, cookies, url }) => {
	if (!INVITE_TOKEN.test(params.token)) error(404, 'Lien introuvable');
	const person = locals.user ? await getPersonByUserId(locals.user.id) : null;
	const ready = Boolean(person?.onboardedAt && person.tracks.length > 0);
	const preview = await previewSchoolInvite(params.token, ready ? person!.actorId : null);
	if (!preview) error(404, 'Lien introuvable');
	if (preview.member) redirect(303, `/ecoles/${preview.handle}`);
	if (!ready && !preview.error) {
		// Repris après la connexion ou l'inscription, une seule fois.
		cookies.set(SCHOOL_INVITE_COOKIE, params.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24
		});
	}
	return {
		name: preview.name,
		error: preview.error,
		signedIn: Boolean(locals.user),
		ready
	};
};

export const actions: Actions = {
	default: async ({ locals, params, cookies }) => {
		const person = locals.user ? await getPersonByUserId(locals.user.id) : null;
		if (!person?.onboardedAt || person.tracks.length === 0) redirect(303, '/auth/login');
		let handle: string;
		try {
			handle = await joinSchoolWithInvite(params.token, person.actorId);
		} catch (err) {
			if (err instanceof SchoolError) return fail(err.status, { error: err.message });
			throw err;
		}
		cookies.delete(SCHOOL_INVITE_COOKIE, { path: '/' });
		redirect(303, `/ecoles/${handle}?bienvenue=1`);
	}
};
