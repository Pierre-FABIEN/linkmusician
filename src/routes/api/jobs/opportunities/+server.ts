import { json, error } from '@sveltejs/kit';
import { expireOpportunities } from '#lib/server/opportunities/service';
import { getQStashReceiver } from '#lib/server/qstash';
import { matchesCronSecret } from '#lib/server/cronAuth';

/**
 * LINKMUSICIAN (P2-02) : expiration quotidienne des annonces
 * (`#lib/server/opportunities/service.ts`). Mêmes déclencheurs que `/api/jobs/cleanup` :
 * QStash (POST signé) ou Vercel Cron (GET avec `Authorization: Bearer
 * $CRON_SECRET`), jamais un client direct.
 */
async function assertAuthorized(request: Request): Promise<void> {
	const signature = request.headers.get('upstash-signature');
	if (signature) {
		const body = await request.text();
		try {
			await getQStashReceiver().verify({ signature, body, url: request.url });
			return;
		} catch (err) {
			console.error('⚠️ Signature QStash invalide pour /api/jobs/opportunities.', err);
			throw error(401, 'Signature invalide');
		}
	}

	const secret = process.env.CRON_SECRET;
	if (!secret) {
		throw error(500, 'CRON_SECRET non configuré');
	}
	if (!matchesCronSecret(request.headers.get('authorization'), secret)) {
		throw error(401, 'Non autorisé');
	}
}

export async function POST({ request }) {
	await assertAuthorized(request);
	const result = await expireOpportunities();
	return json({ ok: true, ...result });
}

export async function GET({ request }) {
	await assertAuthorized(request);
	const result = await expireOpportunities();
	return json({ ok: true, ...result });
}
