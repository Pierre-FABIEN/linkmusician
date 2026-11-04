/**
 * Envoi de fichiers (P1-08b) : types acceptés, ressource Cloudinary, dossier
 * de l'acteur, contrôle de ce que le navigateur déclare. Module pur.
 *
 * Ce que déclare le navigateur (type, taille) n'est qu'un premier filtre : le
 * fichier réel est relu chez Cloudinary après l'envoi (`checkUpload`).
 */
import { MEDIA_LIMITS } from './rules';

export const UPLOAD_KINDS = ['AUDIO', 'VIDEO', 'IMAGE'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const UPLOAD_TYPES: Readonly<
	Record<UploadKind, { mimeTypes: readonly string[]; formats: readonly string[] }>
> = {
	IMAGE: {
		mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
		formats: ['jpg', 'jpeg', 'png', 'webp', 'avif']
	},
	AUDIO: {
		mimeTypes: [
			'audio/mpeg',
			'audio/mp3',
			'audio/wav',
			'audio/x-wav',
			'audio/wave',
			'audio/mp4',
			'audio/x-m4a',
			'audio/aac',
			'audio/ogg',
			'audio/flac',
			'audio/x-flac'
		],
		formats: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']
	},
	VIDEO: {
		mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
		formats: ['mp4', 'mov', 'webm']
	}
};

/** Valeur de l'attribut `accept` d'un champ fichier. */
export const ACCEPT_ATTRIBUTE = UPLOAD_KINDS.flatMap((k) => UPLOAD_TYPES[k].mimeTypes).join(',');

/** Nature d'un fichier d'après son type MIME, ou `null` s'il n'est pas accepté. */
export function uploadKindOf(mimeType: string): UploadKind | null {
	return (
		UPLOAD_KINDS.find((k) => UPLOAD_TYPES[k].mimeTypes.includes(mimeType.toLowerCase())) ?? null
	);
}

/** Cloudinary range l'audio parmi les vidéos. */
export function resourceTypeOf(kind: UploadKind): 'image' | 'video' {
	return kind === 'IMAGE' ? 'image' : 'video';
}

/** Dossier Cloudinary d'un acteur : une signature n'autorise que lui. */
export function folderOf(actorId: string): string {
	if (!/^[a-z0-9]+$/i.test(actorId)) throw new Error(`Identifiant d'acteur invalide : ${actorId}`);
	return `linkmusician/actors/${actorId}`;
}

export type DeclaredFileCheck =
	{ ok: true; kind: UploadKind } | { ok: false; reason: 'type' | 'too_big' };

export const DECLARED_FILE_MESSAGES: Record<
	Exclude<DeclaredFileCheck, { ok: true }>['reason'],
	string
> = {
	type: 'Format non accepté (photo : JPEG, PNG, WebP ; audio : MP3, WAV, M4A, OGG, FLAC ; vidéo : MP4, MOV, WebM).',
	too_big: 'Fichier trop lourd (photo : 10 Mo, audio : 100 Mo, vidéo : 200 Mo au plus).'
};

/** Premier contrôle, sur ce que déclare le navigateur. */
export function checkDeclaredFile(file: { mimeType: string; bytes: number }): DeclaredFileCheck {
	const kind = uploadKindOf(file.mimeType);
	if (!kind) return { ok: false, reason: 'type' };
	if (!Number.isFinite(file.bytes) || file.bytes <= 0 || file.bytes > MEDIA_LIMITS[kind].maxBytes) {
		return { ok: false, reason: 'too_big' };
	}
	return { ok: true, kind };
}
