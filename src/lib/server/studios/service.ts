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
import { isManager, successorOf } from '#lib/bands/rules';
import { notify } from '#lib/server/notifications/service';
import { deleteOwnMedia, MediaError } from '#lib/server/media/service';
import {
	MAX_MANAGED_STUDIOS,
	MAX_PENDING_STUDIO_INVITES,
	MAX_STUDIO_PHOTOS,
	publicationGaps,
	studioQuests,
	type StudioSessionStats,
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

// ─── Co-gestion (P4-03b) ─────────────────────────────────────────────────

/**
 * Inviter une personne à gérer le studio (rôle ADMIN). Elle doit avoir un
 * métier du son (comme pour ouvrir un studio) ; ni blocage entre les deux,
 * ni adhésion déjà ouverte. Les deux rôles de gestion peuvent inviter.
 */
export async function inviteStudioManager(studioId: string, managerId: string, handle: string) {
	const invitee = await prisma.actor.findFirst({
		where: {
			handle: handle.trim().replace(/^@/, '').toLowerCase(),
			kind: 'PERSON',
			deletedAt: null
		},
		select: { id: true, displayName: true }
	});
	if (!invitee || !(await canOpenStudio(invitee.id))) {
		throw new StudioError('Aucun·e ingé son ou producteur·rice n’a ce nom d’utilisateur.', 404);
	}
	if (invitee.id === managerId) throw new StudioError('Tu gères déjà ce studio.');
	if (await isBlockedBetween(managerId, invitee.id)) {
		throw new StudioError('Impossible d’inviter cette personne.', 403);
	}
	await prisma.$transaction(async (tx) => {
		await lockStudio(tx, studioId);
		await requireManager(tx, studioId, managerId);
		const open = await tx.membership.findFirst({
			where: {
				orgId: studioId,
				personId: invitee.id,
				status: { in: ['INVITED', 'REQUESTED', 'ACTIVE'] }
			},
			select: { status: true }
		});
		if (open) {
			throw new StudioError(
				open.status === 'ACTIVE'
					? `${invitee.displayName} gère déjà ce studio.`
					: `${invitee.displayName} est déjà invité·e.`
			);
		}
		const pending = await tx.membership.count({ where: { orgId: studioId, status: 'INVITED' } });
		if (pending >= MAX_PENDING_STUDIO_INVITES) {
			throw new StudioError(`${MAX_PENDING_STUDIO_INVITES} invitations en attente au plus.`);
		}
		await tx.membership.create({
			data: {
				orgId: studioId,
				personId: invitee.id,
				role: 'ADMIN',
				status: 'INVITED',
				invitedById: managerId
			}
		});
		const studio = await tx.actor.findUniqueOrThrow({
			where: { id: studioId },
			select: { displayName: true }
		});
		await notify(tx, {
			recipientId: invitee.id,
			type: 'STUDIO_INVITE',
			fromActorId: managerId,
			href: '/studios',
			title: studio.displayName
		});
	}, TX);
	return invitee.displayName;
}

/** Accepter ou décliner une invitation à gérer un studio. */
export async function answerStudioInvite(membershipId: string, personId: string, accept: boolean) {
	await prisma.$transaction(async (tx) => {
		const invite = await tx.membership.findFirst({
			where: { id: membershipId, personId, status: 'INVITED', org: liveStudio },
			select: { orgId: true }
		});
		if (!invite) throw new StudioError('Cette invitation n’est plus valable.', 404);
		await lockStudio(tx, invite.orgId);
		if (accept) {
			const managed = await tx.membership.count({
				where: { personId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, org: liveStudio }
			});
			if (managed >= MAX_MANAGED_STUDIOS) {
				throw new StudioError(`Tu gères déjà ${MAX_MANAGED_STUDIOS} studios.`);
			}
		}
		await tx.membership.update({
			where: { id: membershipId },
			data: accept
				? { status: 'ACTIVE', startedAt: new Date() }
				: { status: 'DECLINED', endedAt: new Date() }
		});
	}, TX);
}

/**
 * Retirer une personne de la gestion, annuler une invitation, ou partir
 * soi-même. Seul·e la ou le responsable retire quelqu'un d'autre. Qui part
 * en étant responsable transmet le studio (`successorOf`) ; seul·e, on ne
 * part pas : on retire d'abord la fiche.
 */
export async function leaveOrRemoveStudioManager(
	studioId: string,
	byId: string,
	membershipId: string
) {
	await prisma.$transaction(async (tx) => {
		await lockStudio(tx, studioId);
		const target = await tx.membership.findFirst({
			where: { id: membershipId, orgId: studioId, status: { in: ['INVITED', 'ACTIVE'] } },
			select: { id: true, personId: true, role: true, status: true }
		});
		if (!target) throw new StudioError('Cette personne ne fait plus partie de la gestion.', 404);
		const self = target.personId === byId;
		if (!self) {
			const me = await tx.membership.findFirst({
				where: { orgId: studioId, personId: byId, status: 'ACTIVE', org: liveStudio },
				select: { role: true }
			});
			const allowed = me?.role === 'OWNER' || (isManager(me?.role) && target.status === 'INVITED');
			if (!allowed) throw new StudioError('Seul·e la ou le responsable retire quelqu’un.', 403);
		}
		const now = new Date();
		if (target.status === 'INVITED') {
			await tx.membership.update({
				where: { id: target.id },
				data: { status: 'DECLINED', endedAt: now }
			});
			return;
		}
		if (target.role === 'OWNER') {
			const active = await tx.membership.findMany({
				where: { orgId: studioId, status: 'ACTIVE' },
				select: { id: true, personId: true, role: true, startedAt: true }
			});
			const next = successorOf(target.personId, active);
			if (!next) {
				throw new StudioError(
					'Tu es seul·e à gérer ce studio : invite quelqu’un pour te passer le relais.'
				);
			}
			await tx.membership.update({ where: { id: next.id }, data: { role: 'OWNER' } });
		}
		await tx.membership.update({
			where: { id: target.id },
			data: { status: self ? 'LEFT' : 'REMOVED', endedAt: now }
		});
	}, TX);
}

// ─── Photos (P4-03b) ─────────────────────────────────────────────────────

/** Photos qui comptent dans la limite : en ligne, en cours ou en attente. */
const LIVE_PHOTO = { kind: 'IMAGE', status: { not: 'REJECTED' } } as const;

/**
 * Avant un envoi de photo au nom du studio : la personne le gère, et il
 * reste de la place. Renvoie l'identifiant du studio, qui porte la photo.
 */
export async function studioForPhotoUpload(handle: string, personId: string) {
	const studio = await prisma.actor.findFirst({
		where: { handle, kind: 'ORGANIZATION', deletedAt: null, organization: liveStudio },
		select: { id: true }
	});
	if (!studio) throw new StudioError('Ce studio n’existe plus.', 404);
	await prisma.$transaction((tx) => requireManager(tx, studio.id, personId));
	const photos = await prisma.media.count({ where: { actorId: studio.id, ...LIVE_PHOTO } });
	if (photos >= MAX_STUDIO_PHOTOS) {
		throw new StudioError(`${MAX_STUDIO_PHOTOS} photos au plus : retires-en une d’abord.`);
	}
	return studio.id;
}

export async function deleteStudioPhoto(studioId: string, managerId: string, mediaId: string) {
	await prisma.$transaction((tx) => requireManager(tx, studioId, managerId));
	try {
		await deleteOwnMedia(studioId, mediaId);
	} catch (err) {
		if (err instanceof MediaError) throw new StudioError(err.message, 404);
		throw err;
	}
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
 * Sessions du studio (P4-03c) : collaborations terminées qui s'y sont
 * tenues, confirmées par au moins un·e client·e, c'est-à-dire une personne
 * qui ne gère pas le studio. Sans cela, une équipe pourrait gonfler le rang
 * de son propre studio. Lu dans les faits, jamais dans l'XP.
 */
export async function studioSessionStats(studioId: string): Promise<StudioSessionStats> {
	const [collabs, managers] = await Promise.all([
		prisma.collaboration.findMany({
			where: { studioId, status: 'COMPLETED' },
			select: {
				kind: true,
				workId: true,
				participants: { select: { actorId: true, confirmedCompletionAt: true } }
			}
		}),
		prisma.membership.findMany({
			where: { orgId: studioId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } },
			select: { personId: true }
		})
	]);
	const team = new Set(managers.map((m) => m.personId));
	const clients = new Set<string>();
	const stats: StudioSessionStats = {
		sessions: 0,
		distinctClients: 0,
		rehearsals: 0,
		creditedRecordings: 0
	};
	for (const c of collabs) {
		const confirmedBy = c.participants.filter(
			(p) => !team.has(p.actorId) && p.confirmedCompletionAt !== null
		);
		if (confirmedBy.length === 0) continue;
		stats.sessions += 1;
		for (const p of confirmedBy) clients.add(p.actorId);
		if (c.kind === 'REHEARSAL') stats.rehearsals += 1;
		if (c.kind === 'RECORDING' && c.workId) stats.creditedRecordings += 1;
	}
	stats.distinctClients = clients.size;
	return stats;
}

/**
 * Rang du studio. Les sorties vérifiées enregistrées sur place
 * (Incontournable) attendent les sorties créditées (P4-09) : 0 d'ici là.
 */
function rankOf(publishedAt: Date | null, stats: StudioSessionStats) {
	const summary = {
		published: publishedAt !== null,
		sessions: stats.sessions,
		distinctClients: stats.distinctClients,
		verifiedReleases: 0
	};
	const { tier } = studioTier(summary);
	const next = STUDIO_TIERS.find((t) => !t.reached(summary));
	return { tier, next: next ? { id: next.id, label: next.label } : null };
}

/** `/studios` : les studios que je gère, et les invitations à en gérer. */
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

export async function myStudioInvites(personId: string) {
	const rows = await prisma.membership.findMany({
		where: { personId, status: 'INVITED', org: liveStudio },
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			org: { select: { actor: { select: { handle: true, displayName: true } } } },
			invitedBy: { select: { displayName: true, deletedAt: true } }
		}
	});
	return rows.map((r) => ({
		membershipId: r.id,
		name: r.org.actor.displayName,
		invitedBy: r.invitedBy && !r.invitedBy.deletedAt ? r.invitedBy.displayName : null
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
						where: { status: { in: ['ACTIVE', 'INVITED'] } },
						orderBy: { createdAt: 'asc' },
						select: {
							id: true,
							role: true,
							status: true,
							startedAt: true,
							person: { select: { id: true, handle: true, displayName: true } }
						}
					},
					studio: { select: ficheSelect }
				}
			}
		}
	});
	const team = actor?.organization?.memberships ?? [];
	const role = team.find((m) => m.person.id === personId && m.status === 'ACTIVE')?.role;
	const studio = actor?.organization?.studio;
	if (!actor || !studio || !isManager(role)) return null;
	const [location, stats, photos] = await Promise.all([
		getActorLocation(actor.id),
		studioSessionStats(actor.id),
		prisma.media.findMany({
			where: { actorId: actor.id, kind: 'IMAGE', status: { not: 'UPLOADING' } },
			orderBy: { createdAt: 'asc' },
			select: { id: true, title: true, status: true, fileUrl: true, rejectionReason: true }
		})
	]);
	return {
		id: actor.id,
		handle: actor.handle,
		name: actor.displayName,
		bio: actor.bio,
		role: role!,
		team: team.map((m) => ({
			membershipId: m.id,
			handle: m.person.handle,
			displayName: m.person.displayName,
			role: m.role,
			status: m.status,
			isMe: m.person.id === personId
		})),
		photos,
		commune: location
			? {
					code: location.communeCode,
					nom: location.communeName,
					codeDepartement: location.departmentCode
				}
			: null,
		...studio,
		gaps: publicationGaps({ ...studio, hasCommune: location !== null }),
		stats,
		quests: studioQuests({
			published: studio.publishedAt !== null,
			hasHours: studio.hours.length > 0 || studio.byAppointment,
			stats
		}),
		rank: rankOf(studio.publishedAt, stats)
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
	const [location, stats, photos] = await Promise.all([
		getActorLocation(actor.id),
		studioSessionStats(actor.id),
		prisma.media.findMany({
			where: { actorId: actor.id, kind: 'IMAGE', status: 'PUBLISHED', fileUrl: { not: null } },
			orderBy: { createdAt: 'asc' },
			select: { id: true, title: true, fileUrl: true }
		})
	]);
	const { publishedAt, ...fiche } = org.studio;
	return {
		id: actor.id,
		handle: actor.handle,
		name: actor.displayName,
		bio: actor.bio,
		verified: org.verifiedAt !== null,
		commune: location?.communeName ?? null,
		...fiche,
		photos: photos.map((p) => ({ id: p.id, title: p.title, url: p.fileUrl! })),
		sessions: stats.sessions,
		rank: rankOf(publishedAt, stats),
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
