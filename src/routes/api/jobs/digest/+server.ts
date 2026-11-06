import { json, error } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { runDigestJob } from '#lib/server/jobs/digest';
import { sendMail } from '#lib/server/smtp-mail';
import { resolveAppUrlOrDefault } from '#lib/server/app-url';
import { log } from '#lib/server/log';
import { getQStashReceiver } from '#lib/server/qstash';
import { matchesCronSecret } from '#lib/server/cronAuth';

/**
 * LINKMUSICIAN (P2-09b) : digest email quotidien
 * (`#lib/server/jobs/digest.ts`). Mêmes déclencheurs que `/api/jobs/cleanup` :
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
			console.error('⚠️ Signature QStash invalide pour /api/jobs/digest.', err);
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

function run() {
	return runDigestJob({
		db: prisma,
		send: (mail) => sendMail(mail),
		baseUrl: resolveAppUrlOrDefault(),
		log: (message, data) => log('WARN', 'digest', message, data)
	});
}

export async function POST({ request }) {
	await assertAuthorized(request);
	return json({ ok: true, ...(await run()) });
}

export async function GET({ request }) {
	await assertAuthorized(request);
	return json({ ok: true, ...(await run()) });
}
