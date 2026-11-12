/**
 * Écran musicien·ne (ONB-03) côté serveur, partagé par le dernier écran de
 * l'onboarding (`/demarrer/intention`) et « Ma pratique »
 * (`/profil/pratique`) : données du formulaire, puis enregistrement revérifié.
 */
import { fail } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { CODES_MESSAGES, INTENTS, selectableSpecializations } from '#lib/actors/specializations';
import { detailGroupsFor } from '#lib/musician/profile';
import { musicianStepSchema } from '#lib/schema/musician/musicianStepSchema';
import {
	getMusicianStep,
	instrumentRefsOf,
	InvalidDetailError,
	saveMusicianStep
} from '#lib/prisma/musician/musicianProfile';
import { InvalidTrackCodeError } from '#lib/prisma/actors/specializations';

export async function musicianStepData(personId: string) {
	const [current, instruments] = await Promise.all([
		getMusicianStep(personId),
		instrumentRefsOf(personId)
	]);
	const form = await superValidate(
		{
			...current,
			practiceExperience: current.practiceExperience ?? undefined,
			commitment: current.commitment ?? undefined
		},
		zod(musicianStepSchema),
		{ errors: false }
	);
	return {
		form,
		offers: INTENTS.MUSICIAN.OFFER,
		needs: INTENTS.MUSICIAN.NEED,
		writing: selectableSpecializations('MUSICIAN').map(({ code, label, description }) => ({
			code,
			label,
			description
		})),
		detailGroupIds: detailGroupsFor(instruments).map((g) => g.id)
	};
}

/**
 * Valide et enregistre. Renvoie `{ form }` en cas d'erreur (à renvoyer tel
 * quel, statut 400 déjà posé), `{ saved }` sinon.
 */
export async function submitMusicianStep(request: Request, personId: string) {
	const form = await superValidate(request, zod(musicianStepSchema));
	if (!form.valid) return { failure: fail(400, { form }) };
	const { practiceExperience, commitment } = form.data;
	if (!practiceExperience || !commitment) return { failure: fail(400, { form }) };
	try {
		const saved = await saveMusicianStep(personId, {
			...form.data,
			practiceExperience,
			commitment
		});
		return { form, saved };
	} catch (err) {
		if (err instanceof InvalidTrackCodeError)
			return { failure: setError(form, `${err.list}._errors`, CODES_MESSAGES[err.reason]) };
		if (err instanceof InvalidDetailError) return { failure: setError(form, '', err.message) };
		throw err;
	}
}
