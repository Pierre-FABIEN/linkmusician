/**
 * LINKMUSICIAN (P2-09a) : pastilles de la coquille (cloche et messages),
 * relues à chaque navigation et toutes les 60 s quand l'onglet est visible
 * (conception 03 : polling, pas de connexion permanente). Deux nombres,
 * rien d'autre.
 */
import { json } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { unreadNotifications } from '#lib/server/notifications/service';
import { unreadTotal } from '#lib/server/messaging/service';

export async function GET({ locals }) {
	const headers = { 'cache-control': 'no-store' };
	if (!locals.user) return json({ notifications: 0, messages: 0 }, { status: 401, headers });
	const person = await getPersonByUserId(locals.user.id);
	if (!person) return json({ notifications: 0, messages: 0 }, { headers });
	const [notifications, messages] = await Promise.all([
		unreadNotifications(person.actorId),
		unreadTotal(person.actorId)
	]);
	return json({ notifications, messages }, { headers });
}
