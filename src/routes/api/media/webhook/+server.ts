/**
 * LINKMUSICIAN: notification Cloudinary de fin d'envoi (P1-08b). Signature
 * vérifiée (`X-Cld-Timestamp`, `X-Cld-Signature`) sur le corps brut ; sans
 * signature valide, rien n'est fait. Même traitement que `/api/media/confirm`
 * (idempotent). Le webhook n'est déclaré qu'en production : Cloudinary ne
 * joint pas localhost.
 */
import { error, json } from '@sveltejs/kit';
import { handleMediaWebhook } from '#lib/server/media/webhook';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const result = await handleMediaWebhook(
		body,
		request.headers.get('x-cld-timestamp'),
		request.headers.get('x-cld-signature')
	);
	if (result === 'invalid_signature') error(401, 'Signature invalide');
	return json({ ok: true, result });
};
