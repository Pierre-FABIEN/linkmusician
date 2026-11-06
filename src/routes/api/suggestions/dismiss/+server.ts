/**
 * LINKMUSICIAN (P2-18) : « Pas intéressé·e » sur une suggestion. La personne
 * n'est plus suggérée ; elle reste trouvable par la recherche.
 */
import { error, json } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { dismissSuggestion } from '#lib/server/discovery/suggestions';

export async function POST({ request, locals }) {
	if (!locals.user) error(401, 'Non connecté');
	const person = await getPersonByUserId(locals.user.id);
	if (!person) error(403, 'Profil introuvable');
	const body = (await request.json().catch(() => null)) as { handle?: unknown } | null;
	const handle = typeof body?.handle === 'string' ? body.handle : '';
	if (!(await dismissSuggestion(prisma, person.actorId, handle))) error(400, 'Profil inconnu');
	return json({ ok: true });
}
