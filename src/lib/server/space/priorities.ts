/** DASH-03 : projection privée en lecture seule, services existants + visibilité. */
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { canReceiveRequest } from '#lib/messaging/rules';
import { pendingForMe } from '#lib/server/collaborations/service';
import { listConversations } from '#lib/server/messaging/service';
import { listMine } from '#lib/server/opportunities/service';
import { pendingVisibleApplications } from '#lib/server/opportunities/applications';
import { visibleJamIds } from '#lib/server/jam/publicJams';
import { agenda } from '#lib/server/career/service';
import { priorityActions } from '#lib/linkmusician/priorityActions';
import { TRACKS, type TrackKindValue } from '#lib/actors/tracks';
import { requestMemo, type RequestScope } from '#lib/server/request-memo';

type PriorityPerson = { actorId: string; birthDate: Date | null };

/**
 * Faits des priorités, communs à tous les métiers : ce qui attend la
 * personne, déjà filtré par la visibilité (conversation acceptée des deux
 * côtés, aucun refus, blocage ni profil masqué, suspendu ou supprimé).
 * Lue une fois par requête HTTP (`scope`), partagée par les tuiles
 * prioritaires et les prochaines actions (N3).
 */
export function spacePriorityFacts(person: PriorityPerson, now = new Date(), scope?: RequestScope) {
	return requestMemo(scope, `space:priorities:${person.actorId}`, () =>
		readPriorityFacts(person, now)
	);
}

async function readPriorityFacts(person: PriorityPerson, now: Date) {
	const actorId = person.actorId;
	const visible = publicActorWhere(now, actorId);
	const [conversations, pending, dates, mine, allowed] = await Promise.all([
		listConversations(actorId),
		pendingForMe(actorId, now),
		agenda(actorId, now),
		listMine(actorId, now),
		// Aucun aperçu d'un refus, blocage, profil masqué/suspendu/supprimé.
		prisma.conversation.findMany({
			where: {
				participants: {
					some: { actorId, state: { not: 'DECLINED' } },
					none: {
						actorId: { not: actorId },
						OR: [{ state: 'DECLINED' }, { actor: { NOT: visible } }]
					}
				}
			},
			select: { id: true }
		})
	]);
	const ids = new Set(allowed.map((c) => c.id));
	const accepted = new Set(
		conversations
			.filter((c) => ids.has(c.id) && c.myState === 'ACCEPTED' && c.otherState === 'ACCEPTED')
			.map((c) => c.id)
	);
	const jamIds = dates.filter((d) => d.kind === 'JAM').map((d) => d.href.split('/').pop()!);
	const [applications, jams] = await Promise.all([
		pendingVisibleApplications(
			actorId,
			mine.filter((o) => o.status === 'OPEN').map((o) => o.id),
			now
		),
		visibleJamIds(jamIds, actorId, now)
	]);
	const safeJams = new Set(jams.map((id) => `/jams/${id}`));
	const safeDates = dates.filter((d) =>
		d.kind === 'JAM' ? safeJams.has(d.href) : accepted.has(d.href.split('/').pop()!)
	);
	const canReceiveRequests = canReceiveRequest(person.birthDate, now);
	return {
		/** Collaborations à répondre ou confirmer, dans une conversation visible et acceptée. */
		collaborations: pending.filter((p) => p.conversationId && accepted.has(p.conversationId)),
		applications,
		requests: conversations.filter((c) => ids.has(c.id) && c.myState === 'REQUEST').length,
		canReceiveRequests,
		nextDate: safeDates[0]?.at ?? null
	};
}

export async function spacePriorities(
	person: PriorityPerson,
	track: TrackKindValue,
	now = new Date(),
	scope?: RequestScope
) {
	if (!TRACKS[track].available) return [];
	const facts = await spacePriorityFacts(person, now, scope);
	return priorityActions(track, {
		confirmations: facts.collaborations.length,
		applications: facts.applications,
		requests: facts.requests,
		canReceiveRequests: facts.canReceiveRequests,
		nextDate: facts.nextDate
	});
}
