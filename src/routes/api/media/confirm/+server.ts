/**
 * LINKMUSICIAN: le navigateur signale la fin d'un envoi (P1-08b). Le serveur
 * relit le fichier chez Cloudinary : rien de ce que dit le navigateur sur le
 * fichier n'est cru. Indispensable en local, où le webhook ne peut pas nous
 * joindre ; en production, le webhook fait la même chose (idempotent).
 */
import { error, json } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { requirePerson } from '#server/actors/tracksForm';
import { finalizeUpload } from '#lib/server/media/service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Connexion requise');
	const person = await requirePerson(locals);
	const body = (await request.json().catch(() => null)) as { mediaId?: unknown } | null;
	const mediaId = typeof body?.mediaId === 'string' ? body.mediaId : '';
	const own = await prisma.media.findFirst({
		where: { id: mediaId, actorId: person.actorId },
		select: { id: true }
	});
	if (!own) error(404, 'Média introuvable');

	const result = await finalizeUpload(own.id);
	if (!result) error(404, 'Média introuvable');
	const base =
		result.status === 'PUBLISHED'
			? 'Ton fichier est publié.'
			: result.status === 'PENDING_REVIEW'
				? 'Ton fichier est enregistré : il sera visible après validation.'
				: result.status === 'REJECTED'
					? (result.reason ?? 'Fichier refusé.')
					: 'Ton fichier est encore en cours de traitement.';
	return json({
		status: result.status,
		// Les gains sont fêtés par les célébrations de l'espace (P2-11), plus dans ce message.
		message: base
	});
};
