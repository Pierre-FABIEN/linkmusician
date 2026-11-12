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

export async function spacePriorities(
	person: { actorId: string; birthDate: Date | null },
	track: TrackKindValue,
	now = new Date()
) {
	if (!TRACKS[track].available) return [];
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
	return priorityActions(track, {
		confirmations: pending.filter((p) => p.conversationId && accepted.has(p.conversationId)).length,
		applications,
		requests: conversations.filter((c) => ids.has(c.id) && c.myState === 'REQUEST').length,
		canReceiveRequests: canReceiveRequest(person.birthDate, now),
		nextDate: safeDates[0]?.at ?? null
	});
}
