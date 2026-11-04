/**
 * Liens externes (P1-08) : YouTube, SoundCloud, Bandcamp. Module pur.
 *
 * Le lecteur intégré est construit ici à partir d'un identifiant contrôlé,
 * jamais à partir du HTML renvoyé par les plateformes (oEmbed), qui pourrait
 * injecter n'importe quoi dans la page.
 */

export type ExternalProvider = 'YOUTUBE' | 'SOUNDCLOUD' | 'BANDCAMP';

export type ExternalMedia = {
	provider: ExternalProvider;
	/** Adresse normalisée (https, sans paramètres de suivi). */
	url: string;
	/** Adresse du lecteur intégré, ou `null` si la plateforme n'en permet pas ici. */
	embedUrl: string | null;
};

export type ExternalCheck =
	{ ok: true; media: ExternalMedia } | { ok: false; reason: 'format' | 'provider' | 'not_media' };

export const EXTERNAL_MESSAGES: Record<Exclude<ExternalCheck, { ok: true }>['reason'], string> = {
	format: 'Adresse invalide.',
	provider: 'Seuls les liens YouTube, SoundCloud et Bandcamp sont acceptés.',
	not_media: 'Ce lien ne pointe pas vers une vidéo, un titre ou un album.'
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function youtube(url: URL): ExternalCheck {
	const host = url.hostname.replace(/^(www|m|music)\./, '');
	let id: string | null = null;
	if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
	else if (url.pathname === '/watch') id = url.searchParams.get('v');
	else {
		const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/);
		id = match?.[1] ?? null;
	}
	if (!id || !YOUTUBE_ID.test(id)) return { ok: false, reason: 'not_media' };
	return {
		ok: true,
		media: {
			provider: 'YOUTUBE',
			url: `https://www.youtube.com/watch?v=${id}`,
			embedUrl: `https://www.youtube-nocookie.com/embed/${id}`
		}
	};
}

function soundcloud(url: URL): ExternalCheck {
	const host = url.hostname.replace(/^(www|m)\./, '');
	const parts = url.pathname.split('/').filter(Boolean);
	if (host === 'on.soundcloud.com') {
		// Lien court : on ne connaît pas la page cible, pas de lecteur intégré.
		if (parts.length !== 1) return { ok: false, reason: 'not_media' };
		return {
			ok: true,
			media: {
				provider: 'SOUNDCLOUD',
				url: `https://on.soundcloud.com/${parts[0]}`,
				embedUrl: null
			}
		};
	}
	// Un titre (`/artiste/titre`) ou une playlist (`/artiste/sets/nom`).
	const isTrack = parts.length === 2;
	const isSet = parts.length === 3 && parts[1] === 'sets';
	if (!isTrack && !isSet) return { ok: false, reason: 'not_media' };
	const canonical = `https://soundcloud.com/${parts.join('/')}`;
	return {
		ok: true,
		media: {
			provider: 'SOUNDCLOUD',
			url: canonical,
			embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(canonical)}&visual=false`
		}
	};
}

function bandcamp(url: URL): ExternalCheck {
	const parts = url.pathname.split('/').filter(Boolean);
	if (parts.length !== 2 || !['track', 'album'].includes(parts[0])) {
		return { ok: false, reason: 'not_media' };
	}
	// Le lecteur Bandcamp exige un identifiant numérique interne : lien simple.
	return {
		ok: true,
		media: {
			provider: 'BANDCAMP',
			url: `https://${url.hostname}/${parts.join('/')}`,
			embedUrl: null
		}
	};
}

/** Reconnaît un lien de média externe (https ajouté s'il manque). */
export function parseExternalMedia(input: string): ExternalCheck {
	const raw = input.trim();
	if (raw.length === 0 || raw.length > 300) return { ok: false, reason: 'format' };
	let url: URL;
	try {
		url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
	} catch {
		return { ok: false, reason: 'format' };
	}
	if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
		return { ok: false, reason: 'format' };
	}
	const host = url.hostname.toLowerCase();
	if (/(^|\.)youtube\.com$/.test(host) || host === 'youtu.be') return youtube(url);
	if (/(^|\.)soundcloud\.com$/.test(host)) return soundcloud(url);
	if (host === 'bandcamp.com' || /^[a-z0-9-]+\.bandcamp\.com$/.test(host)) return bandcamp(url);
	return { ok: false, reason: 'provider' };
}
