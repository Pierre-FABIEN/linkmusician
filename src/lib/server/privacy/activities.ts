/**
 * Confidentialité des activités (D81, conception 23) : **point unique** pour
 * lire la participation d'une autre personne à une jam (« Je viens »,
 * formation, « J'y étais », carnet, contacts). La règle est pure
 * (`#lib/privacy/activities`) ; ce module rassemble les faits par lots
 * (six requêtes au plus, quelle que soit la taille de la liste) et gère les
 * réglages, autorisations, exclusions et la découverte sur place.
 *
 * Ni le carnet, ni une conversation, ni un rôle d'administration ne donnent
 * accès aux activités d'autrui. La gestion d'une jam (hôte, lead) garde ses
 * seuls besoins opérationnels, lus ailleurs (formation, invitations, nombre
 * exact d'inscrit·es).
 */
import { prisma } from '#lib/server';
import { isIndexable } from '#lib/actors/visibility';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { RefillingTokenBucket } from '#lib/server/rate-limit';
import {
	decideActivityVisibility,
	type ActivityScope,
	type ActivityShareValue,
	type PrivacyModesForm
} from '#lib/privacy/activities';

export class PrivacyError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

type Options = { scope: ActivityScope; jamId?: string; now?: Date };

/**
 * Parmi `ownerIds`, les personnes dont `viewerId` peut voir l'activité
 * (`scope`). Avec `jamId`, la découverte sur place réciproque compte aussi.
 * `viewerId` lui-même est toujours inclus s'il figure dans la liste.
 */
export async function visibleOwnerIds(
	viewerId: string,
	ownerIds: string[],
	{ scope, jamId, now = new Date() }: Options
): Promise<Set<string>> {
	const others = [...new Set(ownerIds)].filter((id) => id !== viewerId);
	const visible = new Set(ownerIds.includes(viewerId) ? [viewerId] : []);
	if (others.length === 0) return visible;
	const [blocks, exclusions, prefs, grants, persons, sessions] = await Promise.all([
		prisma.block.findMany({
			where: {
				OR: [
					{ blockerActorId: viewerId, blockedActorId: { in: others } },
					{ blockerActorId: { in: others }, blockedActorId: viewerId }
				]
			},
			select: { blockerActorId: true, blockedActorId: true }
		}),
		prisma.activityVisibilityExclusion.findMany({
			where: { ownerId: { in: others }, excludedId: viewerId },
			select: { ownerId: true }
		}),
		prisma.activityVisibilityPreference.findMany({
			where: { actorId: { in: others } },
			select: { actorId: true, past: true, future: true }
		}),
		prisma.activityVisibilityGrant.findMany({
			where: { ownerId: { in: others }, viewerId },
			select: { ownerId: true }
		}),
		prisma.person.findMany({
			where: { actorId: { in: [...others, viewerId] } },
			select: { actorId: true, birthDate: true }
		}),
		jamId
			? prisma.jamDiscoverySession.findMany({
					where: {
						opportunityId: jamId,
						actorId: { in: [...others, viewerId] },
						expiresAt: { gt: now }
					},
					select: { actorId: true }
				})
			: Promise.resolve([])
	]);
	const blocked = new Set(
		blocks.map((b) => (b.blockerActorId === viewerId ? b.blockedActorId : b.blockerActorId))
	);
	const excluded = new Set(exclusions.map((e) => e.ownerId));
	const modeOf = new Map(prefs.map((p) => [p.actorId, p[scope] as ActivityShareValue]));
	const granted = new Set(grants.map((g) => g.ownerId));
	const minor = new Set(
		persons.filter((p) => !isIndexable(p.birthDate, now)).map((p) => p.actorId)
	);
	// Les organisations n'ont pas d'activité personnelle à montrer : majeures par défaut.
	const discoverable = new Set(sessions.map((s) => s.actorId));
	for (const ownerId of others) {
		const ok = decideActivityVisibility({
			self: false,
			blocked: blocked.has(ownerId),
			excluded: excluded.has(ownerId),
			ownerMinor: minor.has(ownerId),
			viewerMinor: minor.has(viewerId),
			mode: modeOf.get(ownerId) ?? 'PRIVATE',
			granted: granted.has(ownerId),
			bothDiscoverable: discoverable.has(ownerId) && discoverable.has(viewerId)
		});
		if (ok) visible.add(ownerId);
	}
	return visible;
}

/** `viewerId` peut-il voir l'activité de `ownerId` ? */
export async function canViewActivity(
	viewerId: string,
	ownerId: string,
	options: Options
): Promise<boolean> {
	return (await visibleOwnerIds(viewerId, [ownerId], options)).has(ownerId);
}

/** Tranches d'un nombre de participant·es : pas de compte exact, pour ne rien déduire d'un petit groupe. */
export function participantBand(count: number): 'none' | 'few' | 'five' | 'ten' {
	if (count <= 0) return 'none';
	if (count < 5) return 'few';
	if (count < 10) return 'five';
	return 'ten';
}

export const PARTICIPANT_BAND_LABELS = {
	none: 'Personne n’a encore dit venir',
	few: 'Quelques musicien·nes viennent',
	five: 'Plus de 5 musicien·nes viennent',
	ten: 'Plus de 10 musicien·nes viennent'
} as const;

// ── Réglages, autorisations, exclusions ─────────────────────────────────

const MAX_GRANTS = 200;
const MAX_EXCLUSIONS = 500;

async function isMinor(actorId: string, now = new Date()) {
	const person = await prisma.person.findUnique({
		where: { actorId },
		select: { birthDate: true }
	});
	return !isIndexable(person?.birthDate, now);
}

/** Les réglages de confidentialité de la personne, pour sa page de réglages. */
export async function privacySettings(actorId: string, now = new Date()) {
	const [pref, grants, exclusions, minor] = await Promise.all([
		prisma.activityVisibilityPreference.findUnique({ where: { actorId } }),
		prisma.activityVisibilityGrant.findMany({
			where: { ownerId: actorId },
			orderBy: { createdAt: 'desc' },
			select: { viewer: { select: { id: true, handle: true, displayName: true } } }
		}),
		prisma.activityVisibilityExclusion.findMany({
			where: { ownerId: actorId },
			orderBy: { createdAt: 'desc' },
			select: { excluded: { select: { id: true, handle: true, displayName: true } } }
		}),
		isMinor(actorId, now)
	]);
	return {
		past: (pref?.past ?? 'PRIVATE') as ActivityShareValue,
		future: (pref?.future ?? 'PRIVATE') as ActivityShareValue,
		/** Un·e mineur·e ne peut pas partager avec tous les membres. */
		canBePublic: !minor,
		grants: grants.map((g) => g.viewer),
		exclusions: exclusions.map((e) => e.excluded)
	};
}

export async function setPrivacyModes(actorId: string, form: PrivacyModesForm, now = new Date()) {
	if ((form.past === 'PUBLIC' || form.future === 'PUBLIC') && (await isMinor(actorId, now))) {
		throw new PrivacyError('Ce partage n’est pas proposé aux mineur·es.', 403);
	}
	await prisma.activityVisibilityPreference.upsert({
		where: { actorId },
		create: { actorId, past: form.past, future: form.future },
		update: { past: form.past, future: form.future }
	});
}

/** Une personne visible par `ownerId`, par son identifiant public. Même réponse si elle n'existe pas. */
async function findPerson(ownerId: string, handle: string, now: Date) {
	const actor = await prisma.actor.findFirst({
		where: {
			handle: handle.trim().replace(/^@/, '').toLowerCase(),
			person: { isNot: null },
			...publicActorWhere(now, ownerId)
		},
		select: { id: true, displayName: true }
	});
	if (!actor || actor.id === ownerId) {
		throw new PrivacyError('Aucune personne avec cet identifiant.', 404);
	}
	return actor;
}

/** « J'autorise cette personne à voir mes jams » (selon mes modes). */
export async function grantActivityAccess(ownerId: string, handle: string, now = new Date()) {
	const viewer = await findPerson(ownerId, handle, now);
	const count = await prisma.activityVisibilityGrant.count({ where: { ownerId } });
	if (count >= MAX_GRANTS) throw new PrivacyError(`${MAX_GRANTS} personnes autorisées au plus.`);
	await prisma.$transaction([
		prisma.activityVisibilityGrant.upsert({
			where: { ownerId_viewerId: { ownerId, viewerId: viewer.id } },
			create: { ownerId, viewerId: viewer.id },
			update: {}
		}),
		// Autoriser quelqu'un, c'est cesser de le lui masquer.
		prisma.activityVisibilityExclusion.deleteMany({ where: { ownerId, excludedId: viewer.id } })
	]);
	return viewer.displayName;
}

/** Révoquer une autorisation : effet immédiat. */
export async function revokeActivityAccess(ownerId: string, viewerId: string) {
	await prisma.activityVisibilityGrant.deleteMany({ where: { ownerId, viewerId } });
}

/** « Masquer mes jams à cette personne » : privé, sans notification, l'emporte sur tout partage. */
export async function excludeFromActivities(ownerId: string, handle: string, now = new Date()) {
	const target = await findPerson(ownerId, handle, now);
	const count = await prisma.activityVisibilityExclusion.count({ where: { ownerId } });
	if (count >= MAX_EXCLUSIONS) throw new PrivacyError(`${MAX_EXCLUSIONS} personnes au plus.`);
	await prisma.$transaction([
		prisma.activityVisibilityExclusion.upsert({
			where: { ownerId_excludedId: { ownerId, excludedId: target.id } },
			create: { ownerId, excludedId: target.id },
			update: {}
		}),
		prisma.activityVisibilityGrant.deleteMany({ where: { ownerId, viewerId: target.id } })
	]);
	return target.displayName;
}

export async function includeAgain(ownerId: string, excludedId: string) {
	await prisma.activityVisibilityExclusion.deleteMany({ where: { ownerId, excludedId } });
}

/** Ce que `ownerId` a décidé pour `otherId` : autorisé·e, masqué·e, ou rien. */
export async function jamSharingWith(ownerId: string, otherId: string) {
	const [grant, exclusion] = await Promise.all([
		prisma.activityVisibilityGrant.count({ where: { ownerId, viewerId: otherId } }),
		prisma.activityVisibilityExclusion.count({ where: { ownerId, excludedId: otherId } })
	]);
	return { granted: grant > 0, excluded: exclusion > 0 };
}

// ── Découverte volontaire sur place ─────────────────────────────────────

/** Trois activations par période de 12 h : un compte ne s'active pas à toutes les jams. */
const discoveryBucket = new RefillingTokenBucket<string>(3, 12 * 60 * 60, 'jam-discovery');

/** Les sessions échues sont effacées : aucun historique de lieux. */
export async function purgeExpiredDiscovery(now = new Date()) {
	const { count } = await prisma.jamDiscoverySession.deleteMany({
		where: { expiresAt: { lte: now } }
	});
	return count;
}

/** Ma session de découverte sur cette jam, si elle est active. */
export async function myDiscovery(jamId: string, actorId: string, now = new Date()) {
	const session = await prisma.jamDiscoverySession.findUnique({
		where: { opportunityId_actorId: { opportunityId: jamId, actorId } },
		select: { expiresAt: true }
	});
	return session && session.expiresAt > now ? session.expiresAt : null;
}

/**
 * « Me rendre visible pour rencontrer des musicien·nes ici » : jam en cours,
 * personne majeure qui a dit « J'y étais ». Jusqu'à la fin de la jam au plus.
 * Ne rapporte rien, ne prouve rien.
 */
export async function startDiscovery(
	jam: { id: string; startsAt: Date; endsAt: Date },
	actorId: string,
	now = new Date()
) {
	if (now < jam.startsAt || now >= jam.endsAt) {
		throw new PrivacyError('La visibilité sur place s’active pendant la jam seulement.');
	}
	if (await isMinor(actorId, now)) {
		throw new PrivacyError('La visibilité sur place n’est pas proposée aux mineur·es.', 403);
	}
	const attendance = await prisma.jamAttendance.findUnique({
		where: { opportunityId_actorId: { opportunityId: jam.id, actorId } },
		select: { attendedAt: true }
	});
	if (!attendance?.attendedAt) throw new PrivacyError('Dis d’abord que tu y es.');
	if (await myDiscovery(jam.id, actorId, now)) return jam.endsAt;
	if (!(await discoveryBucket.consume(actorId, 1))) {
		throw new PrivacyError('Tu as activé la visibilité plusieurs fois : réessaie plus tard.', 429);
	}
	await purgeExpiredDiscovery(now);
	await prisma.jamDiscoverySession.upsert({
		where: { opportunityId_actorId: { opportunityId: jam.id, actorId } },
		create: { opportunityId: jam.id, actorId, expiresAt: jam.endsAt },
		update: { expiresAt: jam.endsAt, createdAt: now }
	});
	return jam.endsAt;
}

/** Se masquer : effet immédiat. */
export async function stopDiscovery(jamId: string, actorId: string) {
	await prisma.jamDiscoverySession.deleteMany({ where: { opportunityId: jamId, actorId } });
}
