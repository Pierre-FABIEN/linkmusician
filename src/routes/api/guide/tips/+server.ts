/**
 * LINKMUSICIAN (P2-17) : « J'ai compris » sur un conseil en contexte. Le
 * corps ne porte que l'identifiant du conseil (vérifié dans le catalogue).
 */
import { error, json } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { dismissTip } from '#lib/server/guide/service';

export async function POST({ request, locals }) {
	if (!locals.user) error(401, 'Non connecté');
	const person = await getPersonByUserId(locals.user.id);
	if (!person) error(403, 'Profil introuvable');
	const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
	if (!(await dismissTip(person.actorId, body?.id))) error(400, 'Conseil inconnu');
	return json({ ok: true });
}
