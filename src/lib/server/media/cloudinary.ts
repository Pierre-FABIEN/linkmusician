/**
 * Cloudinary pour les médias (P1-08b) : signature des envois directs,
 * relecture d'un fichier envoyé, suppression, vérification des webhooks.
 *
 * L'envoi part du navigateur directement vers Cloudinary : notre serveur ne
 * reçoit jamais le fichier. Il signe des paramètres qui limitent l'envoi au
 * dossier de l'acteur, à un identifiant fixé et aux formats autorisés.
 */
import cloudinary from '#lib/server/cloudinary';
import { resolveAppUrl } from '#lib/server/app-url';
import { folderOf, resourceTypeOf, UPLOAD_TYPES, type UploadKind } from '#lib/media/upload';

export function isCloudinaryConfigured() {
	return Boolean(
		process.env.CLOUDINARY_CLOUD_NAME &&
		process.env.CLOUDINARY_API_KEY &&
		process.env.CLOUDINARY_API_SECRET
	);
}

/** Adresse du webhook, seulement si le site est joignable (jamais localhost). */
export function webhookUrl(): string | null {
	const base = resolveAppUrl();
	return base?.startsWith('https://') ? `${base}/api/media/webhook` : null;
}

/** Paramètres signés d'un envoi direct (à poster avec le fichier). */
export function signUpload(args: {
	actorId: string;
	mediaId: string;
	kind: UploadKind;
	now?: Date;
}) {
	const resourceType = resourceTypeOf(args.kind);
	const notificationUrl = webhookUrl();
	const params: Record<string, string | number> = {
		timestamp: Math.floor((args.now ?? new Date()).getTime() / 1000),
		folder: folderOf(args.actorId),
		public_id: args.mediaId,
		allowed_formats: UPLOAD_TYPES[args.kind].formats.join(','),
		...(notificationUrl ? { notification_url: notificationUrl } : {})
	};
	const signature = cloudinary.utils.api_sign_request(
		params,
		process.env.CLOUDINARY_API_SECRET ?? ''
	);
	return {
		uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
		fields: { ...params, api_key: process.env.CLOUDINARY_API_KEY ?? '', signature },
		publicId: `${params.folder}/${args.mediaId}`
	};
}

export type UploadedAsset = {
	bytes: number;
	durationSec: number | null;
	format: string;
	url: string;
};

/** Relit un fichier envoyé ; `null` s'il n'existe pas (encore). */
export async function fetchAsset(
	publicId: string,
	kind: UploadKind
): Promise<UploadedAsset | null> {
	try {
		// `media_metadata` : sans cette option, Cloudinary ne renvoie pas la durée
		// d'un son ou d'une vidéo (vérifié le 04/11/2026), et la limite de durée
		// ne pourrait pas être contrôlée.
		const r = await cloudinary.api.resource(publicId, {
			resource_type: resourceTypeOf(kind),
			media_metadata: kind !== 'IMAGE'
		});
		return {
			bytes: Number(r.bytes),
			durationSec: typeof r.duration === 'number' ? Math.round(r.duration) : null,
			format: String(r.format),
			url: String(r.secure_url)
		};
	} catch (err) {
		const status = (err as { error?: { http_code?: number } }).error?.http_code;
		if (status === 404) return null;
		throw err;
	}
}

/** Supprime un fichier, sans jamais bloquer l'appelant. */
export async function destroyAsset(publicId: string, kind: UploadKind) {
	try {
		await cloudinary.uploader.destroy(publicId, {
			resource_type: resourceTypeOf(kind),
			invalidate: true
		});
	} catch (err) {
		console.error('[media] suppression Cloudinary impossible', publicId, err);
	}
}

/** Vérifie la signature d'une notification (en-têtes `X-Cld-Timestamp` et `X-Cld-Signature`). */
export function verifyWebhook(
	body: string,
	timestamp: string | null,
	signature: string | null
): boolean {
	if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
	return cloudinary.utils.verifyNotificationSignature(body, Number(timestamp), signature);
}
