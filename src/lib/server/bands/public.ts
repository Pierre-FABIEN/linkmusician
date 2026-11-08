/**
 * Page publique d'un groupe `/@handle` (P3-02) : même visibilité que le
 * profil d'une personne (`publicActorWhere`, blocage dans les deux sens),
 * contenu public seulement (D1) : ni XP, ni confiance, ni identifiant
 * interne d'un membre, ni date de naissance.
 *
 * L'effectif se lit comme celui d'un club : membres actuels et passés, avec
 * leurs dates. Un·e mineur·e n'y est nommé·e que pour un membre connecté
 * (`publicMember`).
 */
import { prisma } from '#lib/server';
import { notIdeaDemo } from '#lib/server/works/visibility';
import { publicWorksOf } from '#lib/server/works/service';
import { bandMilestones, bandTierOf } from '#lib/server/milestones/service';
import { isIndexable } from '#lib/actors/visibility';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { getActorLocation } from '#lib/server/geo/queries';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { compareMembers, isManager, OPEN_STATUSES, publicMember } from '#lib/bands/rules';

const PUBLIC_MEDIA_LIMIT = 12;

export async function getPublicBand(handle: string, now = new Date(), viewerId?: string | null) {
	const actor = await prisma.actor.findFirst({
		where: {
			handle,
			kind: 'ORGANIZATION',
			organization: { kind: 'BAND' },
			...publicActorWhere(now, viewerId)
		},
		select: {
			id: true,
			handle: true,
			displayName: true,
			bio: true,
			updatedAt: true,
			organization: {
				select: {
					formedAt: true,
					dissolvedAt: true,
					memberships: {
						where: { status: { in: [...OPEN_STATUSES, 'LEFT', 'REMOVED'] } },
						select: {
							status: true,
							role: true,
							title: true,
							startedAt: true,
							endedAt: true,
							person: {
								select: {
									id: true,
									handle: true,
									displayName: true,
									deletedAt: true,
									person: { select: { birthDate: true } }
								}
							}
						}
					}
				}
			}
		}
	});
	const org = actor?.organization;
	if (!actor || !org) return null;

	// Blocage (P2-05) : la gestion du groupe a bloqué le lecteur, ou l'inverse.
	if (viewerId) {
		for (const m of org.memberships) {
			if (m.status === 'ACTIVE' && isManager(m.role) && m.person.id !== viewerId) {
				if (await isBlockedBetween(viewerId, m.person.id)) return null;
			}
		}
	}

	const [visibleRows, genres, location, media, recruiting, works, milestones] = await Promise.all([
		prisma.actor.findMany({
			where: { id: { in: org.memberships.map((m) => m.person.id) }, ...publicActorWhere(now) },
			select: { id: true }
		}),
		prisma.actorGenre.findMany({
			where: { actorId: actor.id },
			orderBy: { createdAt: 'asc' },
			select: { genre: { select: { name: true } } }
		}),
		getActorLocation(actor.id),
		prisma.media.findMany({
			where: { actorId: actor.id, status: 'PUBLISHED', ...notIdeaDemo },
			orderBy: { createdAt: 'desc' },
			take: PUBLIC_MEDIA_LIMIT,
			select: { id: true, title: true, kind: true, isDemo: true, externalUrl: true, fileUrl: true }
		}),
		// Annonces « cherche un membre » ouvertes (P3-03).
		prisma.opportunity.findMany({
			where: {
				issuerActorId: actor.id,
				kind: 'RECRUIT_MEMBER',
				status: 'OPEN',
				expiresAt: { gt: now }
			},
			orderBy: { createdAt: 'desc' },
			take: 5,
			select: { id: true, title: true, instrument: { select: { name: true } } }
		}),
		// Morceaux composés du groupe (P3-11).
		publicWorksOf(actor.id, now, viewerId),
		// Étapes franchies (P3-04), avec leur niveau de preuve.
		bandMilestones(actor.id)
	]);
	const visible = new Set(visibleRows.map((a) => a.id));
	const signedIn = Boolean(viewerId);

	const card = (m: (typeof org.memberships)[number]) => {
		const adult = isIndexable(m.person.person?.birthDate, now);
		const shown = publicMember(
			{
				deleted: m.person.deletedAt !== null,
				visible: visible.has(m.person.id),
				adult,
				displayName: m.person.displayName,
				handle: m.person.handle
			},
			signedIn
		);
		return {
			...shown,
			role: m.role,
			title: m.title,
			startedAt: m.startedAt,
			endedAt: m.endedAt,
			/** Nommé·e dans les données structurées : adulte et visible seulement. */
			listed: shown.handle !== null && adult
		};
	};

	const active = org.memberships.filter((m) => m.status === 'ACTIVE').sort(compareMembers);
	const past = org.memberships
		.filter((m) => m.status === 'LEFT' || m.status === 'REMOVED')
		.sort((a, b) => (b.endedAt?.getTime() ?? 0) - (a.endedAt?.getTime() ?? 0));
	const mine = viewerId
		? org.memberships.find(
				(m) => m.person.id === viewerId && (OPEN_STATUSES as readonly string[]).includes(m.status)
			)
		: undefined;

	return {
		id: actor.id,
		kind: 'BAND' as const,
		handle: actor.handle,
		displayName: actor.displayName,
		bio: actor.bio,
		updatedAt: actor.updatedAt,
		formedAt: org.formedAt,
		dissolvedAt: org.dissolvedAt,
		// Indexé une fois formé, tant qu'il n'est pas dissous.
		indexable: org.formedAt !== null && org.dissolvedAt === null,
		genres: genres.map((g) => g.genre.name),
		commune: location?.communeName ?? null,
		members: active.map(card),
		past: past.map(card),
		media,
		works,
		/** Rang du groupe (P3-08) : dernière étape corroborée, non gelée. */
		tier: await bandTierOf(actor.id),
		milestones: milestones.map((m) => ({
			key: m.key,
			label: m.label,
			proof: m.proof,
			/** Contestée (P3-06) : « En vérification » à la place du niveau de preuve. */
			frozen: m.frozen,
			occurredAt: m.occurredAt,
			note: m.note
		})),
		recruiting: recruiting.map((r) => ({
			id: r.id,
			title: r.title,
			instrument: r.instrument?.name ?? null
		})),
		viewer: {
			status: mine?.status ?? null,
			manager: mine?.status === 'ACTIVE' && isManager(mine.role)
		}
	};
}

export type PublicBand = NonNullable<Awaited<ReturnType<typeof getPublicBand>>>;

/** Groupes actuels d'une personne, pour son profil public. */
export async function bandsOfPerson(personId: string, now = new Date(), viewerId?: string | null) {
	const rows = await prisma.membership.findMany({
		where: {
			personId,
			status: 'ACTIVE',
			org: { kind: 'BAND', dissolvedAt: null, actor: publicActorWhere(now, viewerId) }
		},
		orderBy: { startedAt: 'asc' },
		select: {
			title: true,
			startedAt: true,
			org: { select: { actor: { select: { handle: true, displayName: true } } } }
		}
	});
	return rows.map((r) => ({
		handle: r.org.actor.handle,
		name: r.org.actor.displayName,
		title: r.title,
		startedAt: r.startedAt
	}));
}

/** Groupes formés et visibles, pour le sitemap. */
export async function indexableBands(now = new Date()) {
	return prisma.actor.findMany({
		where: {
			...publicActorWhere(now),
			organization: { kind: 'BAND', formedAt: { not: null }, dissolvedAt: null }
		},
		select: { handle: true, updatedAt: true },
		orderBy: { handle: 'asc' }
	});
}
