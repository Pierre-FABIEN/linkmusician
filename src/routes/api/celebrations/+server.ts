/**
 * LINKMUSICIAN: accusé de lecture des célébrations (P2-11). Le corps ne porte
 * que le repère `upTo` fourni par le serveur au chargement de l'espace.
 */
import { error, json } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { markCelebrationsSeen } from '#lib/server/progression/celebrations';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) error(401, 'Non connecté');
	const person = await getPersonByUserId(locals.user.id);
	if (!person) error(403, 'Pas de profil');
	const body = (await request.json().catch(() => null)) as { upTo?: unknown } | null;
	const ok = await markCelebrationsSeen(person.actorId, body?.upTo, prisma);
	if (!ok) error(400, 'Repère invalide');
	return json({ ok: true });
};
