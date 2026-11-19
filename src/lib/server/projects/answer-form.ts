/**
 * Répondre à une invitation de projet depuis un formulaire (U3) : action
 * partagée par « Mes projets » et « À traiter ». La personne vient de la
 * session ; l'invitation est relue sous verrou par `answerInvitation`.
 * Rejoindre ouvre la fiche (héros « Bienvenue ») ; refuser reste sur la page,
 * sans prévenir personne (Q80).
 */
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { answerSchema } from '#lib/schema/projects/project';
import { answerInvitation } from './participants';
import { ProjectError } from './service';

export async function answerInvitationForm({ locals, request }: RequestEvent) {
	const person = await requirePerson(locals);
	const parsed = answerSchema.safeParse(Object.fromEntries(await request.formData()));
	if (!parsed.success) return fail(400, { action: 'repondre', error: 'Réponse invalide.' });
	const accept = parsed.data.answer === 'accept';
	let projectId: string;
	try {
		({ projectId } = await answerInvitation(person.actorId, parsed.data.participantId, accept));
	} catch (err) {
		if (err instanceof ProjectError) {
			// §8.3 : une invitation retirée ou un projet clos entre-temps.
			const gone = err.status === 404 || err.status === 409;
			return fail(err.status, {
				action: 'repondre',
				error: gone ? 'Cette invitation n’est plus valable.' : err.message
			});
		}
		throw err;
	}
	if (accept) redirect(303, `/projets/${projectId}?rejoint`);
	return { action: 'repondre', ok: 'Invitation refusée. Personne d’autre n’en est prévenu.' };
}
