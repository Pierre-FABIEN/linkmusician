/**
 * LINKMUSICIAN: rafraîchissement léger d'une discussion de groupe (P3-16c,
 * D8). Une seule lecture en base, aucune écriture : la page ne recharge le
 * fil que s'il y a du neuf.
 */
import { error, json } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { hasNewInDiscussionSince } from '#lib/server/discussions/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.user) error(401, 'Non connecté');
	const person = await getPersonByUserId(locals.user.id);
	if (!person) error(403, 'Pas de profil');
	const raw = url.searchParams.get('apres');
	const since = raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw) : null;
	const fresh = await hasNewInDiscussionSince(person.actorId, params.id, since);
	if (fresh === null) error(404, 'Discussion introuvable');
	return json({ fresh }, { headers: { 'Cache-Control': 'no-store' } });
};
