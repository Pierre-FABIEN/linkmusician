/**
 * LINKMUSICIAN: rafraîchissement léger d'une conversation (P2-04, D8). Une
 * seule lecture en base, aucune écriture : le fil complet n'est rechargé
 * par la page que s'il y a du neuf. Le temps réel viendra avec P4-12.
 */
import { error, json } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { hasNewSince } from '#lib/server/messaging/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.user) error(401, 'Non connecté');
	const person = await getPersonByUserId(locals.user.id);
	if (!person) error(403, 'Pas de profil');
	const raw = url.searchParams.get('apres');
	const since = raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw) : null;
	const fresh = await hasNewSince(person.actorId, params.id, since);
	if (fresh === null) error(404, 'Conversation introuvable');
	return json({ fresh }, { headers: { 'Cache-Control': 'no-store' } });
};
