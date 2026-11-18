/**
 * Prochaines actions (N3, conception 21 §8–§9) : projection serveur.
 *
 * Lit les faits **du lecteur lui-même**, applique les prédicats de droits
 * existants, puis passe des faits déjà autorisés à la règle pure
 * (`#lib/career/next`). Aucune permission n'est décidée dans le navigateur ;
 * rien n'est écrit, rien n'est notifié, aucune XP n'est lue.
 *
 * Sources réutilisées (aucune règle réimplémentée) :
 * - rangs 1–2 : `spacePriorityFacts` (`pendingForMe` filtré par la
 *   visibilité des conversations, candidatures, demandes de contact), crédits
 *   en attente (`teamWhere`), invitations de groupe, `representationsForMe` ;
 * - rang 3 : étapes prises en charge sur un morceau que je gère
 *   (`manageableOwnerWhere`, comme `applyWorkStep`), idées récentes ;
 * - rang 4 : `workNetworkFacts` (réseau réel `MusicalTie`, `nextProductionNeed`,
 *   places libres), limité aux morceaux que je gère ;
 * - rang 5 : épreuves à portée de la carte N2, objectif fourni par l'appelant.
 *
 * Les jams, disponibilités et Super Jams n'en font jamais partie (Rencontre).
 * Avec `request` (`event.locals`), les lectures communes à la page sont faites
 * une seule fois par requête HTTP (`#lib/server/request-memo`).
 */
import { prisma } from '#lib/server';
import { canReceiveRequest } from '#lib/messaging/rules';
import { parisDay } from '#lib/metrics/indicators';
import type { AmbitionValue } from '#lib/career/ambition';
import {
	candidatesFrom,
	canDecline,
	canPostpone,
	NO_CHOICES,
	rankSuggestions,
	type ChoiceState,
	type NextFacts,
	type RankOptions,
	type Suggestion
} from '#lib/career/next';
import { OPEN_WORK_STEP_KINDS, WORK_STEP_KIND_LABELS } from '#lib/works/steps';
import { spacePriorityFacts } from '#lib/server/space/priorities';
import { representationsForMe } from '#lib/server/representation/service';
import { teamWhere } from '#lib/server/works/service';
import { manageableOwnerWhere } from '#lib/server/works/access';
import type { GeoTarget } from '#lib/server/geo/queries';
import { requestMemo, type RequestScope } from '#lib/server/request-memo';
import { careerMapFor } from './map';
import { workNetworkFacts } from './nudges';

/** Une idée de morceau compte comme « travail en cours » si on y a touché depuis ce nombre de jours. */
export const IDEA_RECENT_DAYS = 30;
/** Demandes nominatives lues au plus par famille (les rangs 1–2 tiennent déjà l'écran). */
const PENDING_TAKE = 5;
const DAY = 86_400_000;

export type NextReader = {
	actorId: string;
	birthDate: Date | null;
	ambition: AmbitionValue | null;
};

export type NextOptions = RankOptions & {
	now?: Date;
	/** Portée de la requête HTTP (`event.locals`), pour les lectures partagées. */
	request?: RequestScope;
	geo?: GeoTarget;
	/**
	 * Objectif à proposer au rang 5. L'accueil musicien ne le passe pas : son
	 * héros (`NextStep`) montre déjà le premier objectif.
	 */
	objective?: { id: string; label: string; href: string | null } | null;
	/**
	 * N4 : ne pas appliquer les choix du lecteur (validation d'un report : la
	 * suggestion doit être proposée, qu'elle soit déjà reportée ou non).
	 */
	ignoreChoices?: boolean;
};

/** Ni le lecteur n'a bloqué, ni il n'a été bloqué par cet acteur. */
const notBlocked = (viewerId: string) => ({
	blocksMade: { none: { blockedActorId: viewerId } },
	blocksReceived: { none: { blockerActorId: viewerId } }
});

/** Propositions et accompagnements, une lecture par requête (partagée avec l'accueil). */
export function myRepresentations(actorId: string, scope?: RequestScope) {
	return requestMemo(scope, `representation:me:${actorId}`, () => representationsForMe(actorId));
}

/** Les faits autorisés du lecteur, entrée de la règle pure. */
export async function nextFactsFor(
	reader: NextReader,
	options: NextOptions = {}
): Promise<NextFacts> {
	const now = options.now ?? new Date();
	const me = reader.actorId;
	const adult = canReceiveRequest(reader.birthDate, now);
	const [priority, credits, invitations, representations, steps, works, map] = await Promise.all([
		spacePriorityFacts(reader, now, options.request),
		// Crédits à confirmer sur un morceau de mon équipe ; porteur ni bloqué ni bloquant.
		prisma.workContributor.findMany({
			where: {
				personId: me,
				confirmedAt: null,
				work: { AND: [teamWhere(me), { owner: notBlocked(me) }] }
			},
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
			take: PENDING_TAKE,
			select: { createdAt: true, workId: true }
		}),
		// Invitations de groupe vivant, ni bloqué ni bloquant (comme `bandCounts`).
		prisma.membership.findMany({
			where: {
				personId: me,
				status: 'INVITED',
				org: {
					kind: 'BAND',
					dissolvedAt: null,
					actor: { deletedAt: null, ...notBlocked(me) }
				}
			},
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
			take: PENDING_TAKE,
			select: { createdAt: true, orgId: true }
		}),
		myRepresentations(me, options.request),
		// Mes étapes prises en charge, sur un morceau que je gère encore (droit d'`applyWorkStep`).
		prisma.workStep.findMany({
			where: {
				assigneeId: me,
				status: { in: ['TODO', 'IN_PROGRESS'] },
				kind: { in: [...OPEN_WORK_STEP_KINDS] },
				work: { owner: manageableOwnerWhere(me) }
			},
			orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
			take: PENDING_TAKE,
			select: { kind: true, status: true, updatedAt: true, workId: true }
		}),
		workNetworkFacts(me, { now, geo: options.geo }),
		careerMapFor(me, reader.ambition, now, options.request)
	]);

	// Titres et noms, seulement s'il y a des lignes (une requête par relation sinon, même vide).
	const titleIds = [...new Set([...credits, ...steps].map((r) => r.workId))];
	const bandIds = invitations.map((m) => m.orgId);
	const [titleRows, bandRows] = await Promise.all([
		titleIds.length
			? prisma.work.findMany({
					where: { id: { in: titleIds } },
					select: { id: true, title: true }
				})
			: [],
		bandIds.length
			? prisma.actor.findMany({
					where: { id: { in: bandIds } },
					select: { id: true, displayName: true }
				})
			: []
	]);
	const titleOf = new Map(titleRows.map((w) => [w.id, w.title]));
	const bandName = new Map(bandRows.map((b) => [b.id, b.displayName]));

	// Gestion relue avec le prédicat des mutations (`manageableOwnerWhere`).
	const ownerIds = [...new Set(works.map((w) => w.ownerId))];
	const managed = new Set(
		ownerIds.length
			? (
					await prisma.actor.findMany({
						where: { id: { in: ownerIds }, ...manageableOwnerWhere(me) },
						select: { id: true }
					})
				).map((a) => a.id)
			: []
	);
	const mine = works.filter((w) => managed.has(w.ownerId));
	// Une place libre sans personne du réseau : rien si une annonce ouverte recrute déjà.
	const recruiting = mine.filter((w) => w.openRoles.length > 0).map((w) => w.id);
	const opened = new Set(
		recruiting.length
			? (
					await prisma.opportunity.findMany({
						where: { workId: { in: recruiting }, status: 'OPEN', expiresAt: { gt: now } },
						select: { workId: true }
					})
				).map((o) => o.workId)
			: []
	);
	const today = parisDay(now);
	const visibleCollabs = new Set(priority.collaborations.map((c) => c.id));
	const recentSince = now.getTime() - IDEA_RECENT_DAYS * DAY;
	const adultOnly = <T extends { adult: boolean }>(people: readonly T[]) =>
		people.filter((p) => p.adult).map(({ adult: _adult, ...p }) => p);

	return {
		reader: { adult, ambition: reader.ambition },
		collaborations: priority.collaborations.flatMap((c) =>
			(c.step === 'respond' || c.step === 'confirm') && c.conversationId
				? [
						{
							id: c.id,
							kind: c.kind,
							title: c.title,
							with: c.with,
							conversationId: c.conversationId,
							step: c.step,
							asProvider: c.provider === 'me',
							happenedOn: c.happenedOn,
							upcoming: c.happenedOn > today,
							proposedAt: c.proposedAt,
							othersConfirmedAt: c.othersConfirmedAt
						}
					]
				: []
		),
		credits: credits.flatMap((c) => {
			const title = titleOf.get(c.workId);
			return title ? [{ workId: c.workId, title, since: c.createdAt }] : [];
		}),
		bandInvitations: invitations.flatMap((m) => {
			const name = bandName.get(m.orgId);
			return name ? [{ bandId: m.orgId, name, since: m.createdAt }] : [];
		}),
		representations: representations
			.filter((r) => r.status === 'PROPOSED')
			.map((r) => ({ id: r.id })),
		applications: priority.applications,
		contactRequests: priority.canReceiveRequests ? priority.requests : 0,
		steps: steps.flatMap((s) => {
			const title = titleOf.get(s.workId);
			if (!title) return [];
			return [
				{
					workId: s.workId,
					title,
					label: WORK_STEP_KIND_LABELS[s.kind],
					status: s.status === 'IN_PROGRESS' ? ('IN_PROGRESS' as const) : ('TODO' as const),
					since: s.updatedAt
				}
			];
		}),
		ideas: mine
			.filter((w) => w.state === 'IDEA' && w.updatedAt.getTime() >= recentSince)
			.map((w) => ({ workId: w.id, title: w.title, hasDemo: w.hasDemo, updatedAt: w.updatedAt })),
		works: mine.map((w) => ({
			workId: w.id,
			title: w.title,
			need: w.need,
			// Nommer seulement des adultes du réseau réel, visibles, hors équipe (§8.8).
			pros: adultOnly(w.pros),
			openRoles: w.openRoles.map((r) => ({
				instrument: r.instrument,
				candidates: adultOnly(r.candidates)
			})),
			hasOpenOpportunity: opened.has(w.id)
		})),
		// Une épreuve qui vise une collaboration ne passe que si cette collaboration a
		// passé le filtre de visibilité des priorités (blocage, conversation refusée…) :
		// la carte N2 lit ses déclencheurs sans ce filtre.
		withinReach: map.withinReach.flatMap((a) =>
			a.reach &&
			!(a.reach.subject?.type === 'COLLABORATION' && !visibleCollabs.has(a.reach.subject.id))
				? [
						{
							number: a.number,
							name: a.name,
							branch: a.branch,
							reason: a.reach.reason,
							action: a.reach.action,
							subject: a.reach.subject
						}
					]
				: []
		),
		objective:
			options.objective && options.objective.href
				? { id: options.objective.id, label: options.objective.label, href: options.objective.href }
				: null
	};
}

/** Les prochaines actions du lecteur, triées et tronquées (3 sur l'accueil). */
export async function nextActionsFor(
	reader: NextReader,
	options: NextOptions = {}
): Promise<Suggestion[]> {
	const now = options.now ?? new Date();
	const [facts, choices] = await Promise.all([
		nextFactsFor(reader, { ...options, now }),
		options.ignoreChoices ? NO_CHOICES : readChoices(reader.actorId, options.request)
	]);
	return rankSuggestions(candidatesFrom(facts), { ...options, now, choices });
}

/**
 * Choix « Plus tard » et « Pas pour moi » du lecteur (N4) : une seule
 * lecture, quelle que soit la quantité, mémorisée le temps de la requête.
 */
export function readChoices(ownerId: string, scope?: RequestScope): Promise<ChoiceState> {
	return requestMemo(scope, `career:choices:${ownerId}`, async () => {
		const rows = await prisma.suggestionChoice.findMany({
			where: { ownerId },
			select: { kind: true, target: true, version: true, until: true }
		});
		return {
			later: rows
				.filter((r) => r.kind === 'LATER')
				.map((r) => ({ target: r.target, version: r.version, until: r.until })),
			notForMe: rows.filter((r) => r.kind === 'NOT_FOR_ME').map((r) => r.target)
		};
	});
}

/** Ce que reçoit le navigateur : la phrase et le geste, sans dates ni objet. */
export function suggestionView(s: Suggestion) {
	return {
		key: s.key,
		rank: s.rank,
		branch: s.branch,
		title: s.title,
		why: s.why,
		href: s.href,
		cta: s.cta,
		/** N4 : gestes permis par le rang (jamais aux rangs 1 et 2). */
		postpone: canPostpone(s),
		decline: canDecline(s)
	};
}
export type SuggestionView = ReturnType<typeof suggestionView>;
