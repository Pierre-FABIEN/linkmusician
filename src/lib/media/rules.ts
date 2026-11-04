/**
 * Médias (P1-08) : limites, statut initial, libellés, correspondance avec
 * l'événement de progression. Module pur.
 */

export type MediaKindValue = 'AUDIO' | 'VIDEO' | 'IMAGE' | 'EXTERNAL_LINK';
export type MediaStatusValue =
	'UPLOADING' | 'PROCESSING' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';

export const MAX_TITLE_LENGTH = 120;

/** Limites v1 (fiche P1-08) : audio ≤ 10 min, vidéo ≤ 3 min et ≤ 200 Mo. */
export const MEDIA_LIMITS = {
	AUDIO: { maxDurationSec: 10 * 60, maxBytes: 100 * 1024 * 1024 },
	VIDEO: { maxDurationSec: 3 * 60, maxBytes: 200 * 1024 * 1024 },
	IMAGE: { maxDurationSec: null, maxBytes: 10 * 1024 * 1024 }
} as const;

export type UploadCheck =
	{ ok: true } | { ok: false; reason: 'too_long' | 'too_big' | 'unreadable' };

export const UPLOAD_MESSAGES: Record<Exclude<UploadCheck, { ok: true }>['reason'], string> = {
	too_long: 'Ce fichier est trop long (audio : 10 min, vidéo : 3 min au plus).',
	too_big: 'Ce fichier est trop lourd (photo : 10 Mo, audio : 100 Mo, vidéo : 200 Mo au plus).',
	unreadable: 'Impossible de lire la durée de ce fichier : essaie un autre format.'
};

/** Vérifie un fichier envoyé, d'après ce que rapporte Cloudinary. */
export function checkUpload(
	kind: 'AUDIO' | 'VIDEO' | 'IMAGE',
	asset: { bytes: number; durationSec?: number | null }
): UploadCheck {
	const limits = MEDIA_LIMITS[kind];
	if (asset.bytes > limits.maxBytes) return { ok: false, reason: 'too_big' };
	if (limits.maxDurationSec !== null) {
		// Une durée illisible est refusée : sinon la limite ne serait pas contrôlée.
		if (asset.durationSec === null || asset.durationSec === undefined) {
			return { ok: false, reason: 'unreadable' };
		}
		if (asset.durationSec > limits.maxDurationSec) return { ok: false, reason: 'too_long' };
	}
	return { ok: true };
}

/**
 * Statut d'un média prêt : publié d'office à partir de la confiance 1
 * (Membre), en attente de modération en dessous (fiche P1-08).
 */
export function readyStatus(trustLevel: number): 'PUBLISHED' | 'PENDING_REVIEW' {
	return trustLevel >= 1 ? 'PUBLISHED' : 'PENDING_REVIEW';
}

/** Les médias qui comptent dans le quota (tout sauf les refusés). */
export const QUOTA_STATUSES: readonly MediaStatusValue[] = [
	'UPLOADING',
	'PROCESSING',
	'PENDING_REVIEW',
	'PUBLISHED'
];

/** Nature du média pour l'événement `media.published` (seule la démo rapporte). */
export function publishedEventKind(media: {
	kind: MediaKindValue;
	isDemo: boolean;
}): 'DEMO' | 'PHOTO' | 'VIDEO' {
	if (media.isDemo && media.kind !== 'IMAGE') return 'DEMO';
	return media.kind === 'IMAGE' ? 'PHOTO' : 'VIDEO';
}

export const MEDIA_STATUS_LABELS: Readonly<Record<MediaStatusValue, string>> = {
	UPLOADING: 'Envoi en cours',
	PROCESSING: 'Traitement en cours',
	PENDING_REVIEW: 'En attente de validation',
	PUBLISHED: 'Publié',
	REJECTED: 'Refusé'
};

export const MEDIA_KIND_LABELS: Readonly<Record<MediaKindValue, string>> = {
	AUDIO: 'Audio',
	VIDEO: 'Vidéo',
	IMAGE: 'Photo',
	EXTERNAL_LINK: 'Lien'
};

/** Titre nettoyé (texte brut, une ligne, longueur bornée). */
export function normalizeTitle(input: string): string {
	return (
		input
			// eslint-disable-next-line no-control-regex -- on retire justement ces caractères
			.replace(/[\u0000-\u001f\u007f]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, MAX_TITLE_LENGTH)
	);
}
