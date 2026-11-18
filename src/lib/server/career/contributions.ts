/**
 * « Mes contributions » (U1, #71, conception 20 §10.2) : lecture **personnelle**,
 * pour l'acteur de la session seulement. Elle part de la lecture unifiée N1
 * (`readRealisations`, vue de l'acteur lui-même) et n'ajoute que ce qu'il
 * faut pour afficher une ligne : titre, rôles, personnes liées, lien. Aucun
 * agrégateur concurrent, aucune table nouvelle, aucun point.
 *
 * Un nombre fixe de requêtes, quel que soit le nombre de lignes : la lecture
 * N1, puis, en parallèle, les morceaux crédités et les collaborations
 * terminées (chacune avec ses relations), puis au plus deux compléments
 * (morceaux des seules collaborations, conversations où l'acteur figure).
 *
 * Confidentialité (conception 20 §9.3, U0) :
 * - le serveur ne lit que des objets dont l'acteur est partie : ses crédits
 *   (`WorkContributor`), ses collaborations (`CollaborationParticipant`) ;
 * - une personne bloquée dans un sens ou l'autre n'est pas nommée, et sa
 *   fiche ni la conversation ne sont liées ; le fait reste (il est à moi) ;
 * - un compte anonymisé apparaît « Compte supprimé » ; un morceau dont le
 *   porteur a disparu, ou d'un groupe dissous, n'a plus de lien (sa fiche
 *   répond 404) ;
 * - rien n'est mis en cache entre personnes.
 */
import { prisma } from '#lib/server';
import { readRealisations } from './realisations';
import {
	contributionLines,
	type CollabDetail,
	type ContributionService,
	type WorkDetail
} from '#lib/career/contributions';
import type { WorkRoleKindValue } from '#lib/works/rules';
import type { CollabKindValue } from '#lib/collaborations/rules';

/** Blocages entre un acteur lu et la personne, dans les deux sens (une ligne au plus chacun). */
const blocksWith = (actorId: string) =>
	({
		blocksMade: { where: { blockedActorId: actorId }, select: { createdAt: true }, take: 1 },
		blocksReceived: { where: { blockerActorId: actorId }, select: { createdAt: true }, take: 1 }
	}) as const;

const partySelect = (actorId: string) =>
	({
		id: true,
		displayName: true,
		deletedAt: true,
		...blocksWith(actorId)
	}) as const;

type PartyRow = {
	displayName: string;
	deletedAt: Date | null;
	blocksMade: unknown[];
	blocksReceived: unknown[];
};

const party = (a: PartyRow) => ({
	displayName: a.displayName,
	deleted: a.deletedAt !== null,
	blocked: a.blocksMade.length > 0 || a.blocksReceived.length > 0
});

async function readWorks(actorId: string, ids: string[]) {
	if (ids.length === 0) return [];
	return prisma.work.findMany({
		where: { id: { in: ids } },
		select: {
			id: true,
			title: true,
			state: true,
			ownerId: true,
			owner: {
				select: { ...partySelect(actorId), organization: { select: { dissolvedAt: true } } }
			},
			// Ses propres rôles seulement : ceux des autres ne sont pas lus.
			contributors: {
				where: { personId: actorId },
				select: {
					roles: { select: { id: true, kind: true, instrument: { select: { name: true } } } }
				}
			}
		}
	});
}

function workDetail(actorId: string, w: Awaited<ReturnType<typeof readWorks>>[number]): WorkDetail {
	const self = w.ownerId === actorId;
	const owner = self
		? null
		: { ...party(w.owner), dissolved: w.owner.organization?.dissolvedAt != null };
	const roles: Record<string, WorkDetail['roles'][string]> = {};
	for (const c of w.contributors)
		for (const r of c.roles)
			roles[r.id] = { kind: r.kind as WorkRoleKindValue, instrument: r.instrument?.name ?? null };
	// Même règle que la fiche (`workPage`) : porteur actif et groupe vivant ;
	// l'équipe (porteur ou crédité·e) la voit même à l'état d'idée. Avec un
	// blocage, la fiche nommerait la personne : pas de lien.
	const team = self || w.contributors.length > 0;
	const open = team && !w.owner.deletedAt && !owner?.dissolved && !(owner?.blocked ?? false);
	return { id: w.id, title: w.title, state: w.state, owner, roles, open };
}

async function readCollabs(actorId: string, ids: string[]) {
	if (ids.length === 0) return [];
	return prisma.collaboration.findMany({
		// Garde d'identité : seulement les collaborations terminées où l'acteur figure.
		where: { id: { in: ids }, status: 'COMPLETED', participants: { some: { actorId } } },
		select: {
			id: true,
			title: true,
			kind: true,
			happenedOn: true,
			workId: true,
			conversationId: true,
			participants: {
				select: { actorId: true, service: true, actor: { select: partySelect(actorId) } }
			}
		}
	});
}

/**
 * Contributions de l'acteur de la session, triées de la plus récente à la
 * plus ancienne. Jamais pour un autre lecteur : la fiche publique garde ses
 * comptes (P3-14).
 */
export async function contributionsOf(actorId: string) {
	const { realisations } = await readRealisations(actorId);
	const creditWorks = new Set<string>();
	const collabIds: string[] = [];
	for (const r of realisations) {
		if (r.object.type === 'WORK_ROLE') creditWorks.add(r.object.workId);
		else if (r.kind === 'WORK_COMPOSED' && r.object.type === 'WORK') creditWorks.add(r.object.id);
		else if (r.object.type === 'COLLABORATION') collabIds.push(r.object.id);
	}
	const [works, collabs] = await Promise.all([
		readWorks(actorId, [...creditWorks]),
		readCollabs(actorId, collabIds)
	]);
	// Compléments : les morceaux des seules collaborations, et les conversations
	// d'origine où l'acteur figure encore (la page refuse sinon).
	const missing = [
		...new Set(collabs.flatMap((c) => (c.workId && !creditWorks.has(c.workId) ? [c.workId] : [])))
	];
	const conversationIds = [
		...new Set(collabs.flatMap((c) => (c.conversationId ? [c.conversationId] : [])))
	];
	const [extraWorks, inConversations] = await Promise.all([
		readWorks(actorId, missing),
		conversationIds.length === 0
			? Promise.resolve([])
			: prisma.conversationParticipant.findMany({
					where: { actorId, conversationId: { in: conversationIds } },
					select: { conversationId: true }
				})
	]);
	const joined = new Set(inConversations.map((c) => c.conversationId));

	const workMap = new Map<string, WorkDetail>();
	for (const w of [...works, ...extraWorks]) workMap.set(w.id, workDetail(actorId, w));
	const collabMap = new Map<string, CollabDetail>();
	for (const c of collabs) {
		const others = c.participants.filter((p) => p.actorId !== actorId).map((p) => party(p.actor));
		const mine = c.participants.find((p) => p.actorId === actorId);
		collabMap.set(c.id, {
			id: c.id,
			title: c.title,
			kind: c.kind as CollabKindValue,
			happenedOn: c.happenedOn,
			workId: c.workId,
			service: (mine?.service ?? null) as ContributionService | null,
			others,
			conversationId:
				c.conversationId && joined.has(c.conversationId) && !others.some((o) => o.blocked)
					? c.conversationId
					: null
		});
	}
	return contributionLines(realisations, { works: workMap, collabs: collabMap });
}
