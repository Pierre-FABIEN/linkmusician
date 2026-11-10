/**
 * LINKMUSICIAN (P3-17, D47) : analyse d'une description libre en
 * propositions pour l'onboarding. Le corps porte le texte et l'accord
 * explicite ; rien n'est enregistré hormis le nombre d'analyses.
 */
import { error, json } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { AssistantError, runAssistant } from '#lib/server/onboarding-assistant';

export async function POST({ request, locals }) {
	if (!locals.user) error(401, 'Non connecté');
	const person = await getPersonByUserId(locals.user.id);
	if (!person) error(403, 'Profil introuvable');
	const body = (await request.json().catch(() => null)) as {
		text?: unknown;
		consent?: unknown;
	} | null;
	if (body?.consent !== true) {
		return json({ message: 'Coche d’abord la case d’accord.' }, { status: 400 });
	}
	try {
		return json(await runAssistant(person.actorId, body.text));
	} catch (err) {
		if (err instanceof AssistantError) {
			return json({ message: err.message, code: err.code }, { status: err.status });
		}
		throw err;
	}
}
