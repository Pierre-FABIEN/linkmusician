/**
 * Webhook Cloudinary (fiche P1-08) : signature valide et invalide. La
 * signature est calculée par le SDK Cloudinary avec un secret de test ; la
 * base et la finalisation sont simulées.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'cle';
process.env.CLOUDINARY_API_SECRET = 'secret-de-test';

const findFirst = vi.fn();
const finalizeUpload = vi.fn();
vi.mock('#lib/server', () => ({ prisma: { media: { findFirst } } }));
vi.mock('./service', () => ({ finalizeUpload }));

const { handleMediaWebhook } = await import('./webhook');
const { default: cloudinary } = await import('#lib/server/cloudinary');
cloudinary.config({ api_secret: 'secret-de-test' });

function signed(body: string, timestamp = Math.floor(Date.now() / 1000)) {
	const signature = cloudinary.utils.webhook_signature(body, timestamp, {
		api_secret: 'secret-de-test'
	});
	return { timestamp: String(timestamp), signature };
}

const upload = JSON.stringify({
	notification_type: 'upload',
	public_id: 'linkmusician/actors/a1/m1'
});

describe('webhook des médias', () => {
	beforeEach(() => {
		findFirst.mockReset();
		finalizeUpload.mockReset();
	});

	it('finalise le média quand la signature est valide', async () => {
		findFirst.mockResolvedValue({ id: 'm1' });
		const { timestamp, signature } = signed(upload);
		expect(await handleMediaWebhook(upload, timestamp, signature)).toBe('finalized');
		expect(finalizeUpload).toHaveBeenCalledWith('m1');
	});

	it.each([
		['signature fausse', () => ({ ...signed(upload), signature: 'abc' })],
		['corps modifié', () => signed(upload.replace('m1', 'm2'))],
		['signature trop ancienne', () => signed(upload, Math.floor(Date.now() / 1000) - 3 * 3600)],
		['en-têtes absents', () => ({ timestamp: null, signature: null })]
	])('refuse : %s', async (_, make) => {
		const { timestamp, signature } = make();
		expect(await handleMediaWebhook(upload, timestamp, signature)).toBe('invalid_signature');
		expect(finalizeUpload).not.toHaveBeenCalled();
	});

	it('ignore une notification d’un autre type ou un média inconnu', async () => {
		const other = JSON.stringify({ notification_type: 'delete', public_id: 'x' });
		const o = signed(other);
		expect(await handleMediaWebhook(other, o.timestamp, o.signature)).toBe('ignored');
		findFirst.mockResolvedValue(null);
		const u = signed(upload);
		expect(await handleMediaWebhook(upload, u.timestamp, u.signature)).toBe('unknown_media');
		expect(finalizeUpload).not.toHaveBeenCalled();
	});
});
