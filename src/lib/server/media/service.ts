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
import { parseExternalMedia, EXTERNAL_MESSAGES } from '#lib/media/external';
import { normalizeTitle, publishedEventKind, QUOTA_STATUSES, readyStatus } from '#lib/media/rules';
import { fetchExternalTitle } from './oembed';

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

/** Supprime un média de l'acteur (jamais celui d'un autre). */
export async function deleteOwnMedia(actorId: string, mediaId: string) {
	const { count } = await prisma.media.deleteMany({ where: { id: mediaId, actorId } });
	if (count === 0) throw new MediaError('Média introuvable.');
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
		where: { id: mediaId, status: 'PUBLISHED', actor: { deletedAt: null } },
		include: {
			actor: { select: { handle: true, displayName: true } },
			instrument: { select: { name: true } }
		}
	});
}
