/**
 * LINKMUSICIAN (P3-15a) : « J'ai compris » sur une démarche en contexte. Le
 * corps ne porte que l'identifiant du déclencheur (vérifié dans le catalogue).
 */
import { error, json } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { dismissDemarche } from '#lib/server/demarches/service';

export async function POST({ request, locals }) {
	if (!locals.user) error(401, 'Non connecté');
	const person = await getPersonByUserId(locals.user.id);
	if (!person) error(403, 'Profil introuvable');
	const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
	if (!(await dismissDemarche(person.actorId, body?.id))) error(400, 'Démarche inconnue');
	return json({ ok: true });
}
