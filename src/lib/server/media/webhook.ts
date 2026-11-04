/**
 * Traitement d'une notification Cloudinary (P1-08b), séparé de la route pour
 * être testé : signature, puis finalisation du média concerné.
 */
import { prisma } from '#lib/server';
import { verifyWebhook } from './cloudinary';
import { finalizeUpload } from './service';

export type WebhookResult = 'invalid_signature' | 'ignored' | 'unknown_media' | 'finalized';

export async function handleMediaWebhook(
	body: string,
	timestamp: string | null,
	signature: string | null
): Promise<WebhookResult> {
	if (!verifyWebhook(body, timestamp, signature)) return 'invalid_signature';
	let payload: { notification_type?: unknown; public_id?: unknown };
	try {
		payload = JSON.parse(body);
	} catch {
		return 'ignored';
	}
	if (payload.notification_type !== 'upload' || typeof payload.public_id !== 'string')
		return 'ignored';
	const media = await prisma.media.findFirst({
		where: { providerId: payload.public_id, provider: 'CLOUDINARY' },
		select: { id: true }
	});
	if (!media) return 'unknown_media';
	await finalizeUpload(media.id);
	return 'finalized';
}
