/**
 * LINKMUSICIAN: prépare un envoi direct vers Cloudinary (P1-08b) : contrôle
 * du type, de la taille déclarée et du quota de confiance, puis paramètres
 * signés limités au dossier de l'acteur. Réservé à une personne connectée.
 * `forHandle` : photo envoyée au nom d'un studio qu'elle gère (P4-03b).
 */
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requirePerson } from '#server/actors/tracksForm';
import { MediaError, startUpload } from '#lib/server/media/service';
import { StudioError, studioForPhotoUpload } from '#lib/server/studios/service';
import type { RequestHandler } from './$types';

const bodySchema = z.object({
	mimeType: z.string().max(100),
	bytes: z.number().int().positive(),
	title: z.string().max(500).default(''),
	isDemo: z.boolean().default(false),
	instrumentId: z.string().max(40).nullable().optional(),
	forHandle: z.string().max(60).optional()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Connexion requise');
	const person = await requirePerson(locals);
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, 'Requête invalide');
	const { forHandle, ...input } = parsed.data;
	try {
		if (forHandle) {
			const studioId = await studioForPhotoUpload(forHandle, person.actorId);
			return json(
				await startUpload(
					studioId,
					{ ...input, isDemo: false, instrumentId: null },
					{ uploaderId: person.actorId, onlyImages: true }
				)
			);
		}
		return json(await startUpload(person.actorId, input));
	} catch (err) {
		if (err instanceof StudioError) return json({ error: err.message }, { status: err.status });
		if (err instanceof MediaError) return json({ error: err.message }, { status: 400 });
		throw err;
	}
};
