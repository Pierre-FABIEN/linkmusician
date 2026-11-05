/**
 * Blocage (P2-05) : bloquer, débloquer, lister ; savoir si deux personnes
 * sont séparées par un blocage (dans un sens ou dans l'autre).
 */
import { prisma } from '#lib/server';
import { recomputeTrust } from '#lib/server/progression/trust';

export class BlockingError extends Error {}

export async function blockActor(blockerId: string, blockedId: string) {
	if (blockerId === blockedId) throw new BlockingError('Tu ne peux pas te bloquer toi-même.');
	const target = await prisma.actor.findUnique({ where: { id: blockedId }, select: { id: true } });
	if (!target) throw new BlockingError('Profil introuvable.');
	await prisma.block.upsert({
		where: {
			blockerActorId_blockedActorId: { blockerActorId: blockerId, blockedActorId: blockedId }
		},
		create: { blockerActorId: blockerId, blockedActorId: blockedId },
		update: {}
	});
	// Les blocages reçus pèsent sur la confiance (conception 02 §7) : tout de suite.
	await prisma.$transaction((tx) => recomputeTrust(tx, [blockedId]));
}

export async function unblockActor(blockerId: string, blockedId: string) {
	await prisma.block.deleteMany({
		where: { blockerActorId: blockerId, blockedActorId: blockedId }
	});
	await prisma.$transaction((tx) => recomputeTrust(tx, [blockedId]));
}

/** Un blocage sépare-t-il ces deux personnes, dans un sens ou dans l'autre ? */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
	const count = await prisma.block.count({
		where: {
			OR: [
				{ blockerActorId: a, blockedActorId: b },
				{ blockerActorId: b, blockedActorId: a }
			]
		}
	});
	return count > 0;
}

/** Personnes que j'ai bloquées (pour `/reglages`). */
export async function listBlocked(blockerId: string) {
	const rows = await prisma.block.findMany({
		where: { blockerActorId: blockerId },
		orderBy: { createdAt: 'desc' },
		select: {
			createdAt: true,
			blocked: { select: { id: true, displayName: true, handle: true, deletedAt: true } }
		}
	});
	return rows.map((r) => ({
		actorId: r.blocked.id,
		displayName: r.blocked.displayName,
		handle: r.blocked.deletedAt ? null : r.blocked.handle,
		since: r.createdAt
	}));
}
