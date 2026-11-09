/**
 * Journal de modération (P3-09) : lecture de `AdminAuditLog` pour les
 * actions `moderation.*`, la plus récente d'abord, par pages (curseur sur la
 * date). Chaque ligne dit qui a décidé, quoi, sur quelle cible, et le motif
 * quand il y en a un.
 */
import { prisma } from '#lib/server';
import { MODERATION_PREFIX, actionsOf, auditLabel, type AuditFamily } from '#lib/moderation/audit';

export const JOURNAL_PAGE = 50;

/** Lien vers la cible, quand elle a une page. */
async function targetLinks(rows: { targetType: string; targetId: string }[]) {
	const ids = (type: string) => rows.filter((r) => r.targetType === type).map((r) => r.targetId);
	const [actors, opportunities, venues] = await Promise.all([
		prisma.actor.findMany({
			where: { id: { in: [...ids('Actor'), ...ids('Organization')] } },
			select: { id: true, handle: true, displayName: true }
		}),
		prisma.opportunity.findMany({
			where: { id: { in: ids('Opportunity') } },
			select: { id: true, title: true }
		}),
		prisma.venue.findMany({ where: { id: { in: ids('Venue') } }, select: { id: true, name: true } })
	]);
	const map = new Map<string, { label: string; href: string | null }>();
	for (const a of actors) map.set(a.id, { label: a.displayName, href: `/@${a.handle}` });
	for (const o of opportunities) map.set(o.id, { label: o.title, href: `/annonces/${o.id}` });
	for (const v of venues) map.set(v.id, { label: v.name, href: `/lieux/${v.id}` });
	return map;
}

export async function moderationJournal(input: { family?: AuditFamily; before?: Date }) {
	const rows = await prisma.adminAuditLog.findMany({
		where: {
			...(input.family
				? { action: { in: actionsOf(input.family) } }
				: { action: { startsWith: MODERATION_PREFIX } }),
			...(input.before ? { createdAt: { lt: input.before } } : {})
		},
		orderBy: { createdAt: 'desc' },
		take: JOURNAL_PAGE + 1,
		select: {
			id: true,
			actorId: true,
			action: true,
			targetType: true,
			targetId: true,
			metadata: true,
			createdAt: true
		}
	});
	const page = rows.slice(0, JOURNAL_PAGE);
	const [users, targets] = await Promise.all([
		prisma.user.findMany({
			where: { id: { in: [...new Set(page.map((r) => r.actorId))] } },
			select: { id: true, email: true, username: true }
		}),
		targetLinks(page)
	]);
	const who = new Map(users.map((u) => [u.id, u.username ?? u.email]));
	return {
		entries: page.map((r) => {
			const meta = (r.metadata ?? {}) as Record<string, unknown>;
			const note = [meta.reason, meta.note].find((v) => typeof v === 'string' && v.trim());
			return {
				id: r.id,
				at: r.createdAt,
				by: who.get(r.actorId) ?? 'Compte supprimé',
				action: r.action,
				label: auditLabel(r.action),
				targetType: r.targetType,
				target: targets.get(r.targetId) ?? null,
				note: (note as string | undefined) ?? null
			};
		}),
		/** Curseur de la page suivante, ou `null`. */
		next: rows.length > JOURNAL_PAGE ? page[page.length - 1].createdAt.toISOString() : null
	};
}
