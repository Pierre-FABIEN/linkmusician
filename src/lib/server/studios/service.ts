/**
 * Studio (P4-03a), seul point d'écriture de `StudioProfile`, `StudioRoom` et
 * `StudioHours`. Règles pures dans `#lib/studios/rules`.
 *
 * - Créer un studio est réservé aux personnes qui ont le métier d'ingé son
 *   ou de producteur·rice (conception 06 §3.3). La personne en devient
 *   responsable (OWNER, `Membership` comme pour un groupe).
 * - La fiche reste privée jusqu'à sa publication ; publiée, elle donne le
 *   rang « Ouvert ». Les rangs suivants viendront des sessions confirmées
 *   (P4-03c) : aucun n'est atteint ici.
 * - Rien ne rapporte d'XP : le rang va au studio, les points iront aux
 *   personnes qui ont travaillé (08 §6), avec les sessions.
 * - Aucune adresse : seulement le centre de la commune, comme un groupe.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { suggestHandle } from '#lib/actors/handle';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { clearActorLocation, getActorLocation, setActorLocation } from '#lib/server/geo/queries';
import type { Commune } from '#lib/geo/fuzz';
import { studioTier, STUDIO_TIERS } from '#lib/server/progression/core/tiers';
import { isManager } from '#lib/bands/rules';
import {
	MAX_MANAGED_STUDIOS,
	publicationGaps,
	STUDIO_TRACKS,
	type StudioForm,
	type StudioProfileData
} from '#lib/studios/rules';

export class StudioError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

type Tx = Prisma.TransactionClient;
const TX = { timeout: 20_000 } as const;

async function lockStudio(tx: Tx, studioId: string) {
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`studio:${studioId}`}))`;
}

const liveStudio = { kind: 'STUDIO', dissolvedAt: null, actor: { deletedAt: null } } as const;

async function requireManager(tx: Tx, studioId: string, personId: string) {
	const mine = await tx.membership.findFirst({
		where: { orgId: studioId, personId, status: 'ACTIVE', org: liveStudio },
		select: { role: true }
	});
	if (!mine) throw new StudioError('Ce studio n’existe plus.', 404);
	if (!isManager(mine.role))
		throw new StudioError('Seules les personnes qui gèrent le studio modifient sa fiche.', 403);
}

/** La personne a-t-elle un métier qui lui permet d'ouvrir un studio ? */
export async function canOpenStudio(personId: string) {
	const tracks = await prisma.personTrack.count({
		where: { personId, track: { in: [...STUDIO_TRACKS] } }
	});
	return tracks > 0;
}

/** Ouvrir la fiche d'un studio : la personne en est responsable. */
export async function createStudio(personId: string, form: StudioForm) {
	if (!(await canOpenStudio(personId))) {
		throw new StudioError(
			'Un studio se gère avec le métier d’ingé son ou de producteur·rice : ajoute-le dans Réglages, Mes métiers.',
			403
		);
	}
	const managed = await prisma.membership.count({
		where: { personId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, org: liveStudio }
	});
	if (managed >= MAX_MANAGED_STUDIOS) {
		throw new StudioError(`Tu gères déjà ${MAX_MANAGED_STUDIOS} studios.`);
	}
	const handle = await suggestHandle(form.name, async (candidate) =>
		Boolean(await prisma.actor.findUnique({ where: { handle: candidate }, select: { id: true } }))
	);
	return prisma.$transaction(async (tx) => {
		const actor = await tx.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle,
				displayName: form.name,
				organization: { create: { kind: 'STUDIO', studio: { create: {} } } }
			},
			select: { id: true, handle: true }
		});
		await tx.membership.create({
			data: {
				orgId: actor.id,
				personId,
				role: 'OWNER',
				status: 'ACTIVE',
				startedAt: new Date()
			}
		});
		return actor;
	}, TX);
}

/**
 * Enregistre la fiche. Une fiche publiée qui ne remplit plus les conditions
 * repasse en brouillon : la page publique ne montre jamais une fiche vide.
 */
export async function updateStudio(
	studioId: string,
	managerId: string,
	input: Omit<StudioProfileData, 'communeCode'> & { commune: Commune | null }
) {
	const unpublished = await prisma.$transaction(async (tx) => {
		await lockStudio(tx, studioId);
		await requireManager(tx, studioId, managerId);
		await tx.actor.update({
			where: { id: studioId },
			data: { displayName: input.name, bio: input.bio }
		});
		const profile = await tx.studioProfile.update({
			where: { orgId: studioId },
			data: {
				services: input.services,
				gear: input.gear,
				pricingNotes: input.pricingNotes,
				byAppointment: input.byAppointment
			},
			select: { publishedAt: true }
		});
		await tx.studioRoom.deleteMany({ where: { studioId } });
		await tx.studioRoom.createMany({
			data: input.rooms.map((r, position) => ({ studioId, position, ...r }))
		});
		await tx.studioHours.deleteMany({ where: { studioId } });
		await tx.studioHours.createMany({
			data: input.hours.map((h) => ({ studioId, ...h }))
		});
		const gaps = publicationGaps({ ...input, hasCommune: input.commune !== null });
		if (profile.publishedAt && gaps.length > 0) {
			await tx.studioProfile.update({ where: { orgId: studioId }, data: { publishedAt: null } });
			return true;
		}
		return false;
	}, TX);
	if (input.commune) await setActorLocation(studioId, input.commune);
	else await clearActorLocation(studioId);
	return { unpublished };
}

/** Publie la fiche (rang « Ouvert ») si elle est complète, ou la retire. */
export async function setStudioPublished(
	studioId: string,
	managerId: string,
	published: boolean,
	now = new Date()
) {
	const hasCommune = (await getActorLocation(studioId)) !== null;
	await prisma.$transaction(async (tx) => {
		await lockStudio(tx, studioId);
		await requireManager(tx, studioId, managerId);
		if (!published) {
			await tx.studioProfile.update({ where: { orgId: studioId }, data: { publishedAt: null } });
			return;
		}
		const fiche = await tx.studioProfile.findUniqueOrThrow({
			where: { orgId: studioId },
			select: {
				publishedAt: true,
				services: true,
				gear: true,
				pricingNotes: true,
				byAppointment: true,
				rooms: { select: { hourlyRate: true } },
				hours: { select: { weekday: true } }
			}
		});
		if (fiche.publishedAt) return;
		if (publicationGaps({ ...fiche, hasCommune }).length > 0) {
			throw new StudioError('Complète la fiche avant de la publier.');
		}
		await tx.studioProfile.update({ where: { orgId: studioId }, data: { publishedAt: now } });
	}, TX);
}

// ─── Lectures ────────────────────────────────────────────────────────────

const ficheSelect = {
	services: true,
	gear: true,
	pricingNotes: true,
	byAppointment: true,
	publishedAt: true,
	rooms: {
		orderBy: { position: 'asc' },
		select: { name: true, description: true, hourlyRate: true }
	},
	hours: {
		orderBy: { weekday: 'asc' },
		select: { weekday: true, opensAt: true, closesAt: true }
	}
} as const satisfies Prisma.StudioProfileSelect;

/**
 * Rang du studio. Les sessions confirmées et les sorties enregistrées sur
 * place arrivent avec P4-03c : en attendant, seul « Ouvert » est atteignable.
 */
function rankOf(publishedAt: Date | null) {
	const summary = {
		published: publishedAt !== null,
		sessions: 0,
		distinctClients: 0,
		verifiedReleases: 0
	};
	const { tier } = studioTier(summary);
	const next = STUDIO_TIERS.find((t) => !t.reached(summary));
	return { tier, next: next ? { id: next.id, label: next.label } : null };
}

/** `/studios` : les studios que je gère. */
export async function myStudios(personId: string) {
	const rows = await prisma.membership.findMany({
		where: { personId, status: 'ACTIVE', org: liveStudio },
		orderBy: { startedAt: 'asc' },
		select: {
			role: true,
			org: {
				select: {
					actor: { select: { handle: true, displayName: true } },
					studio: { select: { publishedAt: true } }
				}
			}
		}
	});
	return rows.map((r) => ({
		handle: r.org.actor.handle,
		name: r.org.actor.displayName,
		role: r.role,
		published: Boolean(r.org.studio?.publishedAt)
	}));
}

/** `/studios/[handle]` : la fiche à remplir, pour sa gestion seulement (404 sinon). */
export async function studioForManager(handle: string, personId: string) {
	const actor = await prisma.actor.findFirst({
		where: { handle, kind: 'ORGANIZATION', deletedAt: null, organization: liveStudio },
		select: {
			id: true,
			handle: true,
			displayName: true,
			bio: true,
			organization: {
				select: {
					memberships: {
						where: { personId, status: 'ACTIVE' },
						select: { role: true }
					},
					studio: { select: ficheSelect }
				}
			}
		}
	});
	const role = actor?.organization?.memberships[0]?.role;
	const studio = actor?.organization?.studio;
	if (!actor || !studio || !isManager(role)) return null;
	const location = await getActorLocation(actor.id);
	return {
		id: actor.id,
		handle: actor.handle,
		name: actor.displayName,
		bio: actor.bio,
		role: role!,
		commune: location
			? {
					code: location.communeCode,
					nom: location.communeName,
					codeDepartement: location.departmentCode
				}
			: null,
		...studio,
		gaps: publicationGaps({ ...studio, hasCommune: location !== null }),
		rank: rankOf(studio.publishedAt)
	};
}

/**
 * Page publique `/@handle` d'un studio publié : même visibilité qu'un profil
 * (`publicActorWhere`, blocage dans les deux sens avec sa gestion). Ni XP, ni
 * identifiant interne, ni adresse.
 */
export async function getPublicStudio(handle: string, now = new Date(), viewerId?: string | null) {
	const actor = await prisma.actor.findFirst({
		where: {
			handle,
			kind: 'ORGANIZATION',
			organization: { kind: 'STUDIO', dissolvedAt: null, studio: { publishedAt: { not: null } } },
			...publicActorWhere(now, viewerId)
		},
		select: {
			id: true,
			handle: true,
			displayName: true,
			bio: true,
			organization: {
				select: {
					verifiedAt: true,
					studio: { select: ficheSelect },
					memberships: {
						where: { status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } },
						orderBy: { startedAt: 'asc' },
						select: { person: { select: { id: true, handle: true, displayName: true } } }
					}
				}
			}
		}
	});
	const org = actor?.organization;
	if (!actor || !org?.studio) return null;
	if (viewerId) {
		for (const m of org.memberships) {
			if (m.person.id !== viewerId && (await isBlockedBetween(viewerId, m.person.id))) return null;
		}
	}
	// Gestion affichée : profils visibles seulement (ni masqués, ni suspendus).
	const visible = await prisma.actor.findMany({
		where: { id: { in: org.memberships.map((m) => m.person.id) }, ...publicActorWhere(now) },
		select: { id: true }
	});
	const shown = new Set(visible.map((a) => a.id));
	const location = await getActorLocation(actor.id);
	const { publishedAt, ...fiche } = org.studio;
	return {
		id: actor.id,
		handle: actor.handle,
		name: actor.displayName,
		bio: actor.bio,
		verified: org.verifiedAt !== null,
		commune: location?.communeName ?? null,
		...fiche,
		rank: rankOf(publishedAt),
		managers: org.memberships
			.filter((m) => shown.has(m.person.id))
			.map((m) => ({ handle: m.person.handle, displayName: m.person.displayName })),
		isManager: Boolean(viewerId && org.memberships.some((m) => m.person.id === viewerId))
	};
}

/** Studios publiés que la personne gère, pour son profil public. */
export async function studiosOfPerson(
	personId: string,
	now = new Date(),
	viewerId?: string | null
) {
	const rows = await prisma.membership.findMany({
		where: {
			personId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			org: {
				kind: 'STUDIO',
				dissolvedAt: null,
				studio: { publishedAt: { not: null } },
				actor: publicActorWhere(now, viewerId)
			}
		},
		orderBy: { startedAt: 'asc' },
		select: { org: { select: { actor: { select: { handle: true, displayName: true } } } } }
	});
	return rows.map((r) => ({ handle: r.org.actor.handle, name: r.org.actor.displayName }));
}

export type PublicStudio = NonNullable<Awaited<ReturnType<typeof getPublicStudio>>>;
