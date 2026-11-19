/**
 * « À traiter » (U0, conception 20 §6.3) : ce qui attend **ma** réponse,
 * déjà filtré par les droits et les blocages, en une lecture par requête
 * HTTP. Partagé par la page `/espace/a-confirmer`, la tuile de l'accueil et
 * le moteur des prochaines actions (N3), qui ne relisent rien.
 *
 * - Collaborations : `spacePriorityFacts` (conversation acceptée des deux
 *   côtés, ni refus, ni blocage, ni profil masqué, suspendu ou supprimé).
 * - Crédits sur un morceau de mon équipe : porteur ni bloqué ni bloquant.
 * - Invitations de groupe vivant : groupe ni bloqué ni bloquant.
 * - Accompagnement : propositions qu'une personne majeure peut trancher
 *   (`representationsForMe`, lue une fois avec la tuile de l'accueil), sans
 *   blocage avec l'agent : le filtre est dans la requête même (#85).
 * - Candidatures et demandes de contact : les compteurs des priorités.
 *
 * - Projets (U3) : invitations en attente (`myInvitations`, le minimum de
 *   §9.3 : nom, type, porteur, qui invite, rôle, ce qui est proposé) et
 *   coordinations proposées dans un projet où je suis déjà.
 *
 * Les catégories à venir (tâches, livrables, éléments proposés) s'y
 * ajouteront avec leurs services ; rien n'est affiché avant.
 */
import { prisma } from '#lib/server';
import { notBlockedWith } from '#lib/server/actors/visibility';
import { teamWhere } from '#lib/server/works/service';
import { representationsForMe } from '#lib/server/representation/service';
import { canReceiveRequest } from '#lib/messaging/rules';
import { requestMemo, type RequestScope } from '#lib/server/request-memo';
import { spacePriorityFacts } from './priorities';
import { myCapabilityOffers, myInvitations } from '#lib/server/projects/participants';
import { priorityActions } from '#lib/linkmusician/priorityActions';
import { TRACKS, type TrackKindValue } from '#lib/actors/tracks';

/** Demandes lues au plus par famille ; au-delà, l'écran de la famille prend le relais. */
export const INBOX_TAKE = 20;

type InboxPerson = { actorId: string; birthDate: Date | null };

/**
 * Propositions et accompagnements qui me concernent (moi, ou un groupe que je
 * gère), une lecture par requête : la tuile « Accompagnement » de l'accueil et
 * « À traiter » la partagent.
 */
export function representationsForMeOnce(actorId: string, scope?: RequestScope) {
	return requestMemo(scope, `representation:me:${actorId}`, () => representationsForMe(actorId));
}

export function inboxFor(person: InboxPerson, now = new Date(), scope?: RequestScope) {
	return requestMemo(scope, `space:inbox:${person.actorId}`, () => readInbox(person, now, scope));
}

async function readInbox(person: InboxPerson, now: Date, scope?: RequestScope) {
	const me = person.actorId;
	const [priority, credits, invitations, representations, projectInvitations, offers] =
		await Promise.all([
			spacePriorityFacts(person, now, scope),
			prisma.workContributor.findMany({
				where: {
					personId: me,
					confirmedAt: null,
					work: { AND: [teamWhere(me), { owner: notBlockedWith(me) }] }
				},
				orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
				take: INBOX_TAKE,
				select: { createdAt: true, workId: true }
			}),
			prisma.membership.findMany({
				where: {
					personId: me,
					status: 'INVITED',
					org: {
						kind: 'BAND',
						dissolvedAt: null,
						actor: { deletedAt: null, ...notBlockedWith(me) }
					}
				},
				orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
				take: INBOX_TAKE,
				select: { createdAt: true, orgId: true }
			}),
			// Une proposition attend une réponse majeure (Q48), comme `pendingRepresentationCount`.
			canReceiveRequest(person.birthDate, now) ? representationsForMeOnce(me, scope) : [],
			myInvitations(me),
			myCapabilityOffers(me, now)
		]);
	const proposed = representations.filter((r) => r.status === 'PROPOSED');
	// Titres et noms seulement s'il y a des lignes (Prisma lirait sinon chaque relation, même vide).
	const workIds = credits.map((c) => c.workId);
	const bandIds = invitations.map((m) => m.orgId);
	const [works, bands] = await Promise.all([
		workIds.length
			? prisma.work.findMany({ where: { id: { in: workIds } }, select: { id: true, title: true } })
			: [],
		bandIds.length
			? prisma.actor.findMany({
					where: { id: { in: bandIds } },
					select: { id: true, handle: true, displayName: true }
				})
			: []
	]);
	const title = new Map(works.map((w) => [w.id, w.title]));
	const band = new Map(bands.map((b) => [b.id, b]));
	const inbox = {
		collaborations: priority.collaborations,
		credits: credits.flatMap((c) => {
			const t = title.get(c.workId);
			return t ? [{ workId: c.workId, title: t, since: c.createdAt }] : [];
		}),
		bandInvitations: invitations.flatMap((m) => {
			const b = band.get(m.orgId);
			return b ? [{ bandId: b.id, handle: b.handle, name: b.displayName, since: m.createdAt }] : [];
		}),
		// Blocages déjà écartés à la source (#85) : `representationsForMe` applique
		// `notBlockedWith(me)` aux propositions, comme `pendingRepresentations`.
		representations: proposed.map((r) => ({ id: r.id })),
		projectInvitations: projectInvitations.slice(0, INBOX_TAKE),
		capabilityOffers: offers,
		applications: priority.applications,
		contactRequests: priority.canReceiveRequests ? priority.requests : 0
	};
	return {
		...inbox,
		/** Ce qui attend une réponse dans « À traiter » même (candidatures et contacts ont leur tuile). */
		answers:
			inbox.collaborations.length +
			inbox.credits.length +
			inbox.bandInvitations.length +
			inbox.representations.length +
			inbox.projectInvitations.length +
			inbox.capabilityOffers.length
	};
}
export type Inbox = Awaited<ReturnType<typeof inboxFor>>;

/**
 * Tuiles des priorités (DASH-03), ordonnées par métier. U0 : la première est
 * « À traiter », qui compte toutes les demandes autorisées (`answers`).
 */
export async function spacePriorities(
	person: InboxPerson,
	track: TrackKindValue,
	now = new Date(),
	scope?: RequestScope
) {
	if (!TRACKS[track].available) return [];
	const [inbox, facts] = await Promise.all([
		inboxFor(person, now, scope),
		spacePriorityFacts(person, now, scope)
	]);
	return priorityActions(track, {
		confirmations: inbox.answers,
		applications: inbox.applications,
		requests: facts.requests,
		canReceiveRequests: facts.canReceiveRequests,
		nextDate: facts.nextDate
	});
}
