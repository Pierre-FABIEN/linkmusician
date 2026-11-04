/**
 * LINKMUSICIAN: prépare un envoi direct vers Cloudinary (P1-08b) : contrôle
 * du type, de la taille déclarée et du quota de confiance, puis paramètres
 * signés limités au dossier de l'acteur. Réservé à une personne connectée.
 */
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requirePerson } from '#server/actors/tracksForm';
import { MediaError, startUpload } from '#lib/server/media/service';
import type { RequestHandler } from './$types';

const bodySchema = z.object({
	mimeType: z.string().max(100),
	bytes: z.number().int().positive(),
	title: z.string().max(500).default(''),
	isDemo: z.boolean().default(false),
	instrumentId: z.string().max(40).nullable().optional()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Connexion requise');
	const person = await requirePerson(locals);
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, 'Requête invalide');
	try {
		return json(await startUpload(person.actorId, parsed.data));
	} catch (err) {
		if (err instanceof MediaError) return json({ error: err.message }, { status: 400 });
		throw err;
	}
};
