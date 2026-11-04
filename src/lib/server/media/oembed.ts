/**
 * Titre d'un lien externe via oEmbed (YouTube, SoundCloud). On n'utilise que
 * le **titre** (texte), jamais le HTML renvoyé. Pas d'appel réseau en e2e
 * (`SECRET_ADDRESS_SEARCH_MODE` factice), ni d'échec bloquant : sans titre,
 * la personne garde le sien ou l'adresse.
 */
import { SECRET_ADDRESS_SEARCH_MODE } from '$app/env/private';
import { isDummySecret } from '#lib/server/dummy-secrets';
import type { ExternalMedia } from '#lib/media/external';

const ENDPOINTS: Partial<Record<ExternalMedia['provider'], string>> = {
	YOUTUBE: 'https://www.youtube.com/oembed?format=json&url=',
	SOUNDCLOUD: 'https://soundcloud.com/oembed?format=json&url='
};

export async function fetchExternalTitle(media: ExternalMedia): Promise<string | null> {
	const endpoint = ENDPOINTS[media.provider];
	if (!endpoint || isDummySecret(SECRET_ADDRESS_SEARCH_MODE)) return null;
	try {
		const response = await fetch(endpoint + encodeURIComponent(media.url), {
			signal: AbortSignal.timeout(4000)
		});
		if (!response.ok) return null;
		const data = (await response.json()) as { title?: unknown };
		return typeof data.title === 'string' ? data.title : null;
	} catch {
		return null;
	}
}
