/**
 * Réponse de téléchargement d'un document prérempli (P3-15b) : PDF en pièce
 * jointe, jamais mis en cache (données d'équipe).
 */
import { error } from '@sveltejs/kit';
import { DocumentError } from './documents';

export function pdfResponse(filename: string, body: Buffer): Response {
	return new Response(new Uint8Array(body), {
		headers: {
			'content-type': 'application/pdf',
			'content-disposition': `attachment; filename="${filename}"`,
			'cache-control': 'private, no-store'
		}
	});
}

/** Les refus du service deviennent des erreurs HTTP. */
export async function asDownload(build: () => Promise<Response>): Promise<Response> {
	try {
		return await build();
	} catch (err) {
		if (err instanceof DocumentError) error(err.status, err.message);
		throw err;
	}
}
