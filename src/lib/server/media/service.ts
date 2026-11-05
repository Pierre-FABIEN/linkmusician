/**
 * Médias d'un acteur (P1-08) : ajout, publication, suppression, lecture
 * publique. Seul point d'écriture de la table `media`.
 *
 * Publier émet `media.published` dans la même transaction : la première démo
 * rapporte de l'XP (moteur de progression). Le quota de médias dépend de la
 * confiance (P1-09).
 */
import { prisma } from '#lib/server';
import { emitAndProcess } from '#lib/server/progression/processor';
import { summarize, type ProgressSummary } from '#lib/server/progression/profile';
import { checkStockQuota } from '#lib/server/trust/quotas';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { parseExternalMedia, EXTERNAL_MESSAGES } from '#lib/media/external';
import { normalizeTitle, publishedEventKind, QUOTA_STATUSES, readyStatus } from '#lib/media/rules';
import { fetchExternalTitle } from './oembed';
import { checkDeclaredFile, DECLARED_FILE_MESSAGES, type UploadKind } from '#lib/media/upload';
import { checkUpload, UPLOAD_MESSAGES } from '#lib/media/rules';
import { getTrustLevel } from '#lib/server/trust/quotas';
import { destroyAsset, fetchAsset, isCloudinaryConfigured, signUpload } from './cloudinary';

export class MediaError extends Error {
	constructor(message: string) {
		super(message);
	}
}

export async function countQuotaMedia(actorId: string) {
	return prisma.media.count({ where: { actorId, status: { in: [...QUOTA_STATUSES] } } });
}

/** Refuse un ajout au-delà du quota de médias du palier de confiance. */
export async function assertMediaQuota(actorId: string) {
	const quota = await checkStockQuota(actorId, 'mediaItems', await countQuotaMedia(actorId));
	if (!quota.allowed) {
		throw new MediaError(
			`Tu as atteint ta limite de ${quota.limit} médias pour l'instant. Elle augmente avec ta confiance (voir Réglages).`
		);
	}
	return quota;
}

/**
 * Publie un média prêt : statut, date, puis événement de progression, en une
 * transaction. Sans effet s'il est déjà publié.
 */
export async function publishMedia(mediaId: string): Promise<ProgressSummary | null> {
	return prisma.$transaction(async (tx) => {
		const media = await tx.media.findUniqueOrThrow({ where: { id: mediaId } });
		if (media.status === 'PUBLISHED') return null;
		await tx.media.update({
			where: { id: mediaId },
			data: { status: 'PUBLISHED', publishedAt: new Date() }
		});
		const result = await emitAndProcess(tx, {
			type: 'media.published',
			actorId: media.actorId,
			mediaId: media.id,
			kind: publishedEventKind(media)
		});
		return summarize(media.actorId, [result]);
	});
}

/** Ajoute un lien YouTube, SoundCloud ou Bandcamp. */
export async function addExternalMedia(
	actorId: string,
	input: { url: string; title?: string; isDemo: boolean; instrumentId?: string | null }
) {
	const parsed = parseExternalMedia(input.url);
	if (!parsed.ok) throw new MediaError(EXTERNAL_MESSAGES[parsed.reason]);
	const quota = await assertMediaQuota(actorId);

	const title =
		normalizeTitle(input.title ?? '') ||
		normalizeTitle((await fetchExternalTitle(parsed.media)) ?? '') ||
		parsed.media.url;
	const status = readyStatus(quota.level);
	const media = await prisma.media.create({
		data: {
			actorId,
			kind: 'EXTERNAL_LINK',
			provider: parsed.media.provider,
			externalUrl: parsed.media.url,
			title,
			isDemo: input.isDemo,
			instrumentId: input.instrumentId || null,
			status: status === 'PUBLISHED' ? 'PROCESSING' : 'PENDING_REVIEW'
		}
	});
	const progress = status === 'PUBLISHED' ? await publishMedia(media.id) : null;
	return { media: { ...media, status }, progress };
}

/** Supprime un média de l'acteur (jamais celui d'un autre), fichier compris. */
export async function deleteOwnMedia(actorId: string, mediaId: string) {
	const media = await prisma.media.findFirst({ where: { id: mediaId, actorId } });
	if (!media) throw new MediaError('Média introuvable.');
	await prisma.media.delete({ where: { id: media.id } });
	if (media.provider === 'CLOUDINARY' && media.providerId) {
		await destroyAsset(media.providerId, media.kind as UploadKind);
	}
}

/* -------------------------------------------------------------------------- */
/*  Envoi de fichiers (P1-08b)                                                */
/* -------------------------------------------------------------------------- */

/**
 * Prépare un envoi direct : contrôle du fichier déclaré et du quota, création
 * du média « envoi en cours », paramètres signés pour Cloudinary.
 */
export async function startUpload(
	actorId: string,
	input: {
		mimeType: string;
		bytes: number;
		title: string;
		isDemo: boolean;
		instrumentId?: string | null;
	}
) {
	if (!isCloudinaryConfigured())
		throw new MediaError("L'envoi de fichiers n'est pas disponible pour l'instant.");
	const declared = checkDeclaredFile({ mimeType: input.mimeType, bytes: input.bytes });
	if (!declared.ok) throw new MediaError(DECLARED_FILE_MESSAGES[declared.reason]);
	await assertMediaQuota(actorId);

	const media = await prisma.media.create({
		data: {
			actorId,
			kind: declared.kind,
			provider: 'CLOUDINARY',
			status: 'UPLOADING',
			title: normalizeTitle(input.title) || 'Sans titre',
			isDemo: declared.kind !== 'IMAGE' && input.isDemo,
			instrumentId: input.instrumentId || null
		}
	});
	const signed = signUpload({ actorId, mediaId: media.id, kind: declared.kind });
	await prisma.media.update({ where: { id: media.id }, data: { providerId: signed.publicId } });
	return { mediaId: media.id, uploadUrl: signed.uploadUrl, fields: signed.fields };
}

/**
 * Termine un envoi : relit le fichier chez Cloudinary, vérifie taille et durée,
 * puis publie, met en attente de modération ou refuse (et supprime le
 * fichier). Idempotent : appelé par le navigateur après l'envoi et par le
 * webhook, sans double effet. Renvoie l'état final.
 */
export async function finalizeUpload(mediaId: string) {
	const media = await prisma.media.findUnique({ where: { id: mediaId } });
	if (!media || media.provider !== 'CLOUDINARY' || !media.providerId) return null;
	if (media.status !== 'UPLOADING' && media.status !== 'PROCESSING') {
		return { status: media.status, progress: null, reason: media.rejectionReason };
	}
	const kind = media.kind as UploadKind;
	const asset = await fetchAsset(media.providerId, kind);
	if (!asset) return { status: media.status, progress: null, reason: null };

	const check = checkUpload(kind, { bytes: asset.bytes, durationSec: asset.durationSec });
	if (!check.ok) {
		const reason = UPLOAD_MESSAGES[check.reason];
		await prisma.media.update({
			where: { id: mediaId },
			data: { status: 'REJECTED', rejectionReason: reason }
		});
		await destroyAsset(media.providerId, kind);
		return { status: 'REJECTED' as const, progress: null, reason };
	}

	const status = readyStatus(await getTrustLevel(media.actorId));
	// Passage conditionnel : si le webhook et le navigateur arrivent ensemble,
	// un seul des deux poursuit.
	const { count } = await prisma.media.updateMany({
		where: { id: mediaId, status: { in: ['UPLOADING', 'PROCESSING'] } },
		data: {
			status: status === 'PUBLISHED' ? 'PROCESSING' : 'PENDING_REVIEW',
			bytes: asset.bytes,
			durationSec: asset.durationSec,
			format: asset.format,
			fileUrl: asset.url
		}
	});
	if (count === 0) return { status: media.status, progress: null, reason: null };
	const progress = status === 'PUBLISHED' ? await publishMedia(mediaId) : null;
	return { status, progress, reason: null };
}

/** Fichiers Cloudinary d'un compte, pour l'anonymisation. */
export async function mediaAssetsOfUser(userId: string) {
	const rows = await prisma.media.findMany({
		where: { provider: 'CLOUDINARY', providerId: { not: null }, actor: { person: { userId } } },
		select: { providerId: true, kind: true }
	});
	return rows.map((r) => ({ publicId: r.providerId as string, kind: r.kind as UploadKind }));
}

/** Supprime des fichiers Cloudinary, sans jamais bloquer (anonymisation). */
export async function destroyMediaAssets(assets: { publicId: string; kind: UploadKind }[]) {
	for (const a of assets) await destroyAsset(a.publicId, a.kind);
}

export async function listOwnMedia(actorId: string) {
	return prisma.media.findMany({
		where: { actorId },
		orderBy: { createdAt: 'desc' },
		include: { instrument: { select: { name: true } } }
	});
}

/** Média visible publiquement : uniquement `PUBLISHED`, sinon `null`. */
export async function getPublishedMedia(mediaId: string) {
	return prisma.media.findFirst({
		where: {
			id: mediaId,
			status: 'PUBLISHED',
			// Acteur anonymisé, suspendu ou masqué (D19) : ses médias disparaissent.
			actor: publicActorWhere()
		},
		include: {
			actor: { select: { id: true, handle: true, displayName: true } },
			instrument: { select: { name: true } }
		}
	});
}
