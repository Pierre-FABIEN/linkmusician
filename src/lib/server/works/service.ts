/**
 * Morceaux (P3-11, D35), seul point d'écriture de `Work`, `WorkContributor`
 * et `WorkRole`. Chaque écriture prend un verrou sur le morceau : deux
 * confirmations simultanées ne corroborent pas le morceau deux fois.
 *
 * Droits : un morceau porté par une personne se gère par elle ; porté par un
 * groupe, par sa gestion (OWNER ou ADMIN actifs, comme `requireManager`).
 * L'équipe (porteur, membres actifs du groupe, personnes créditées, même en
 * attente) voit les idées ; un morceau composé est public.
 *
 * Progression : créer, créditer, joindre une maquette ne rapportent rien.
 * Déclarer le morceau composé avec ≥2 crédits confirmés émet
 * `work.composed` ; une confirmation après coup émet `work.credit_confirmed`.
 * Un morceau de groupe fait aussi avancer l'étape « Première composition »
 * (P3-04, `syncComposition`).
 * Retirer son crédit ne reprend rien (comme un départ de groupe), et le
 * moteur ne paie jamais deux fois une personne pour un même morceau.
 *
 * Mineur·es (D5, D37) : on ne crédite un·e mineur·e que si on le ou la
 * connaît (même règle que les invitations de groupe), sans dire pourquoi.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { isIndexable } from '#lib/actors/visibility';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { notify } from '#lib/server/notifications/service';
import { emitAndProcess, type ProcessResult } from '#lib/server/progression/processor';
import { summarize } from '#lib/server/progression/profile';
import { addExternalMedia, MediaError } from '#lib/server/media/service';
import { canInviteMinor, managedBands } from '#lib/server/bands/service';
import { syncComposition } from '#lib/server/milestones/service';
import { isManager, publicMember } from '#lib/bands/rules';
import {
	MAX_CONTRIBUTORS,
	MAX_PENDING_CREDITS,
	MAX_ROLES,
	composeBlocker,
	onConfirm,
	proofFor,
	openRoleHref,
	roleKey,
	roleLabel,
	hasCreativeRole,
	isSoundRole,
	SOUND_ROLE_KINDS,
	type NewWorkInput,
	type SoundRoleKind,
	type RoleInput
} from '#lib/works/rules';

export class WorkError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

type Tx = Prisma.TransactionClient;
type Db = Tx | typeof prisma;
/** Le traitement d'un événement de progression peut dépasser 5 s (P2-08). */
const TX = { timeout: 20_000 } as const;

async function lockWork(tx: Tx, workId: string) {
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`work:${workId}`}))`;
}

const workHead = {
	id: true,
	title: true,
	state: true,
	proof: true,
	demoMediaId: true,
	ownerId: true,
	owner: {
		select: {
			id: true,
			kind: true,
			handle: true,
			displayName: true,
			deletedAt: true,
			organization: { select: { dissolvedAt: true } }
		}
	},
	demoMedia: { select: { status: true } }
} as const;

async function loadWork(db: Db, workId: string) {
	const work = await db.work.findUnique({ where: { id: workId }, select: workHead });
	if (!work || work.owner.deletedAt || work.owner.organization?.dissolvedAt) {
		throw new WorkError('Ce morceau n’existe plus.', 404);
	}
	return work;
}
type WorkHead = Awaited<ReturnType<typeof loadWork>>;

/** Porteur, ou gestion active du groupe porteur. */
async function canManage(db: Db, work: Pick<WorkHead, 'ownerId' | 'owner'>, personId: string) {
	if (work.owner.kind === 'PERSON') return work.ownerId === personId;
	const mine = await db.membership.findFirst({
		where: { orgId: work.ownerId, personId, status: 'ACTIVE' },
		select: { role: true }
	});
	return isManager(mine?.role);
}

async function requireManage(db: Db, work: WorkHead, personId: string) {
	if (!(await canManage(db, work, personId))) {
		throw new WorkError('Seules les personnes qui portent ce morceau peuvent faire cela.', 403);
	}
}

/** Porteur, membre actif du groupe porteur, ou personne créditée. */
async function isTeam(db: Db, work: Pick<WorkHead, 'id' | 'ownerId' | 'owner'>, personId: string) {
	if (work.ownerId === personId) return true;
	const [credit, member] = await Promise.all([
		db.workContributor.count({ where: { workId: work.id, personId } }),
		work.owner.kind === 'ORGANIZATION'
			? db.membership.count({ where: { orgId: work.ownerId, personId, status: 'ACTIVE' } })
			: 0
	]);
	return credit > 0 || member > 0;
}

/** Rôles saisis → lignes à créer (instrument du référentiel). */
async function resolveRoles(db: Db, roles: RoleInput[]) {
	const slugs = roles.flatMap((r) => (r.instrumentSlug ? [r.instrumentSlug] : []));
	const instruments = await db.instrument.findMany({
		where: { slug: { in: slugs }, active: true },
		select: { id: true, slug: true }
	});
	const bySlug = new Map(instruments.map((i) => [i.slug, i.id]));
	return roles.map((r) => {
		if (!r.instrumentSlug) return { key: roleKey(r), kind: r.kind, instrumentId: null };
		const instrumentId = bySlug.get(r.instrumentSlug);
		if (!instrumentId)
			throw new WorkError('Un instrument choisi n’existe plus : recharge la page.');
		return { key: roleKey(r), kind: r.kind, instrumentId };
	});
}

async function assertGenres(genreIds: string[]) {
	const known = await prisma.genre.count({ where: { id: { in: genreIds }, active: true } });
	if (known !== genreIds.length) {
		throw new WorkError('Un genre choisi n’existe plus : recharge la page.');
	}
}

/** Clé d'une ligne de rôle, pour retrouver un rôle à pourvoir. */
function rowKey(role: { kind: string; instrument: { slug: string } | null }) {
	return role.kind === 'INSTRUMENT' ? `INSTRUMENT:${role.instrument?.slug}` : role.kind;
}

/**
 * Une confirmation vient d'être enregistrée : corrobore le morceau composé à
 * la 2ᵉ, ou verse sa part à la personne si le morceau l'est déjà.
 */
/**
 * Co-auteur·rices confirmé·es : les crédits confirmés qui portent au moins un
 * rôle d'écriture ou d'instrument. Un crédit du son (P4-07) n'entre ni dans
 * la corroboration ni dans le partage de l'XP de composition.
 */
async function confirmedAuthors(db: Db, workId: string): Promise<string[]> {
	const confirmed = await db.workContributor.findMany({
		where: { workId, confirmedAt: { not: null } },
		select: { personId: true, roles: { select: { kind: true } } }
	});
	return confirmed
		.filter((c) => hasCreativeRole(c.roles.map((r) => r.kind)))
		.map((c) => c.personId);
}

/** Part d'auteur·rice quand une personne confirme (corroboration ou part). */
async function authorProgress(tx: Tx, work: WorkHead, personId: string, now: Date) {
	const ids = await confirmedAuthors(tx, work.id);
	// Confirmer un crédit du son seulement : pas de part d'auteur·rice.
	if (!ids.includes(personId)) return null;
	const action = onConfirm({ state: work.state, proof: work.proof, confirmed: ids.length });
	if (action === 'corroborate') {
		await tx.work.update({ where: { id: work.id }, data: { proof: 'CORROBORATED' } });
		const composed = await emitAndProcess(tx, {
			type: 'work.composed',
			workId: work.id,
			contributorIds: ids,
			occurredAt: now
		});
		// Étape « Première composition » du groupe (P3-04) : corroborée.
		if (work.owner.kind === 'ORGANIZATION') await syncComposition(tx, work.ownerId, now);
		return composed;
	}
	if (action === 'share') {
		return emitAndProcess(tx, {
			type: 'work.credit_confirmed',
			workId: work.id,
			personId,
			otherIds: ids.filter((id) => id !== personId),
			occurredAt: now
		});
	}
	return null;
}

/**
 * Rôles du son confirmés (P4-07b) : un événement sans XP, pour les succès
 * (« Premier mixage »…, « Orchestre à soi seul·e » sur son propre morceau
 * composé seul·e).
 */
async function soundCredited(
	tx: Tx,
	work: { id: string; ownerId: string; state: string; proof: string | null },
	personId: string,
	kinds: SoundRoleKind[],
	now: Date
) {
	if (kinds.length === 0) return null;
	return emitAndProcess(tx, {
		type: 'work.sound_credited',
		workId: work.id,
		personId,
		kinds: [...new Set(kinds)],
		ownWork: work.ownerId === personId,
		ownSoloWork:
			work.ownerId === personId && work.state === 'COMPOSED' && work.proof === 'DECLARED',
		occurredAt: now
	});
}

/** Ce que déclenche une confirmation : part d'auteur·rice, crédits du son. */
async function afterConfirm(
	tx: Tx,
	work: WorkHead,
	personId: string,
	now: Date
): Promise<ProcessResult[]> {
	const author = await authorProgress(tx, work, personId, now);
	const fresh = await tx.work.findUniqueOrThrow({
		where: { id: work.id },
		select: { id: true, ownerId: true, state: true, proof: true }
	});
	const roles = await tx.workRole.findMany({
		where: { workId: work.id, contributor: { personId } },
		select: { kind: true }
	});
	const sound = await soundCredited(
		tx,
		fresh,
		personId,
		roles.map((r) => r.kind).filter(isSoundRole),
		now
	);
	return [author, sound].filter((r): r is ProcessResult => r !== null);
}

// ─── Écritures ───────────────────────────────────────────────────────────

/** Nouvelle idée, à moi ou au nom d'un groupe que je gère. Ne rapporte rien. */
export async function createWork(personId: string, input: NewWorkInput, now = new Date()) {
	let ownerId = personId;
	if (input.band) {
		const band = (await managedBands(personId)).find((b) => b.handle === input.band);
		if (!band) throw new WorkError('Tu ne gères pas ce groupe.', 403);
		ownerId = band.id;
	}
	const genreIds = [...new Set(input.genreIds)];
	await assertGenres(genreIds);
	const roles = await resolveRoles(prisma, input.roles);
	return prisma.$transaction(async (tx) => {
		const work = await tx.work.create({
			data: {
				ownerId,
				createdById: personId,
				title: input.title,
				genres: { create: genreIds.map((genreId) => ({ genreId })) }
			},
			select: { id: true }
		});
		// La personne qui crée est créditée d'emblée : elle consent à son rôle.
		const me = await tx.workContributor.create({
			data: { workId: work.id, personId, confirmedAt: now },
			select: { id: true }
		});
		await tx.workRole.createMany({
			data: roles.map((r) => ({
				workId: work.id,
				kind: r.kind,
				instrumentId: r.instrumentId,
				contributorId: me.id
			}))
		});
		return work;
	}, TX);
}

export async function updateWork(
	workId: string,
	managerId: string,
	input: { title: string; genreIds: string[] }
) {
	const genreIds = [...new Set(input.genreIds)];
	await assertGenres(genreIds);
	await prisma.$transaction(async (tx) => {
		await lockWork(tx, workId);
		const work = await loadWork(tx, workId);
		await requireManage(tx, work, managerId);
		await tx.work.update({ where: { id: workId }, data: { title: input.title } });
		await tx.workGenre.deleteMany({ where: { workId } });
		await tx.workGenre.createMany({ data: genreIds.map((genreId) => ({ workId, genreId })) });
	}, TX);
}

/** Supprimer le morceau. L'XP déjà versée reste (registre en ajout seul). */
/**
 * Crédit d'une prestation du son (P4-07), appelé par une collaboration liée au
 * morceau quand elle se termine, **dans sa transaction**. Chacun·e a confirmé
 * la collaboration : le crédit naît confirmé, sans XP (la collaboration en
 * donne déjà) et sans effet sur la composition. Une personne déjà créditée
 * reçoit le rôle en plus ; si son crédit attend encore sa réponse, il reste en
 * attente. Au-delà des plafonds, rien n'est ajouté plutôt que de bloquer la
 * collaboration.
 */
export async function creditFromCollaboration(
	tx: Tx,
	input: { workId: string; personId: string; kind: SoundRoleKind },
	now = new Date()
): Promise<void> {
	const { workId, personId, kind } = input;
	await lockWork(tx, workId);
	const select = { id: true, confirmedAt: true, roles: { select: { kind: true } } } as const;
	let credit = await tx.workContributor.findUnique({
		where: { workId_personId: { workId, personId } },
		select
	});
	if (credit?.roles.some((r) => r.kind === kind)) return;
	if (!credit) {
		if ((await tx.workContributor.count({ where: { workId } })) >= MAX_CONTRIBUTORS) return;
		credit = await tx.workContributor.create({
			data: { workId, personId, confirmedAt: now },
			select
		});
	}
	const open = await tx.workRole.findFirst({
		where: { workId, kind, contributorId: null },
		select: { id: true }
	});
	if (open) {
		await tx.workRole.update({ where: { id: open.id }, data: { contributorId: credit.id } });
	} else {
		if ((await tx.workRole.count({ where: { workId } })) >= MAX_ROLES) return;
		await tx.workRole.create({ data: { workId, kind, contributorId: credit.id } });
	}
	// Succès du son (P4-07b), sans XP ; un crédit encore en attente attendra.
	if (credit.confirmedAt) {
		const work = await tx.work.findUniqueOrThrow({
			where: { id: workId },
			select: { id: true, ownerId: true, state: true, proof: true }
		});
		await soundCredited(tx, work, personId, [kind], now);
	}
}

export async function deleteWork(workId: string, managerId: string) {
	await prisma.$transaction(async (tx) => {
		await lockWork(tx, workId);
		const work = await loadWork(tx, workId);
		await requireManage(tx, work, managerId);
		await tx.work.delete({ where: { id: workId } });
	}, TX);
}

/** Rôle à pourvoir (« on cherche une batterie »). */
export async function addOpenRole(workId: string, managerId: string, input: RoleInput) {
	const [role] = await resolveRoles(prisma, [input]);
	await prisma.$transaction(async (tx) => {
		await lockWork(tx, workId);
		const work = await loadWork(tx, workId);
		await requireManage(tx, work, managerId);
		const existing = await tx.workRole.findMany({
			where: { workId },
			select: { kind: true, contributorId: true, instrument: { select: { slug: true } } }
		});
		if (existing.length >= MAX_ROLES) throw new WorkError(`${MAX_ROLES} rôles au maximum.`);
		if (existing.some((r) => r.contributorId === null && rowKey(r) === role.key)) {
			throw new WorkError('Ce rôle est déjà à pourvoir.');
		}
		await tx.workRole.create({
			data: { workId, kind: role.kind, instrumentId: role.instrumentId }
		});
	}, TX);
}

/** Retirer un rôle à pourvoir (un rôle crédité se retire avec son crédit). */
export async function removeOpenRole(workId: string, managerId: string, roleId: string) {
	await prisma.$transaction(async (tx) => {
		const work = await loadWork(tx, workId);
		await requireManage(tx, work, managerId);
		const { count } = await tx.workRole.deleteMany({
			where: { id: roleId, workId, contributorId: null }
		});
		if (count === 0) throw new WorkError('Ce rôle n’est plus à pourvoir.', 404);
	}, TX);
}

/**
 * Créditer une personne (par son @handle) sur un ou plusieurs rôles. Elle
 * confirme ensuite, ce qui vaut consentement. Un rôle à pourvoir identique
 * est pourvu plutôt que dupliqué. Se créditer soi-même vaut confirmation.
 */
export async function creditPerson(
	workId: string,
	managerId: string,
	input: { handle: string; roles: RoleInput[] },
	now = new Date()
) {
	const person = await prisma.actor.findFirst({
		where: { handle: input.handle, person: { isNot: null }, ...publicActorWhere(now, managerId) },
		select: { id: true, displayName: true, person: { select: { birthDate: true } } }
	});
	if (!person) throw new WorkError('Aucun·e musicien·ne avec cet identifiant.', 404);
	const self = person.id === managerId;
	const unreachable = new WorkError(
		`${person.displayName} ne peut pas recevoir de crédit sur ce morceau pour l’instant.`
	);
	if (!self) {
		if (await isBlockedBetween(managerId, person.id)) throw unreachable;
		if (
			!isIndexable(person.person?.birthDate, now) &&
			!(await canInviteMinor(managerId, person.id))
		) {
			throw unreachable;
		}
	}
	const roles = await resolveRoles(prisma, input.roles);
	const result = await prisma.$transaction(async (tx) => {
		await lockWork(tx, workId);
		const work = await loadWork(tx, workId);
		await requireManage(tx, work, managerId);
		const contributors = await tx.workContributor.findMany({
			where: { workId },
			select: { personId: true, confirmedAt: true }
		});
		if (contributors.some((c) => c.personId === person.id)) {
			throw new WorkError(`${person.displayName} est déjà sur ce morceau.`);
		}
		if (contributors.length >= MAX_CONTRIBUTORS) {
			throw new WorkError(`${MAX_CONTRIBUTORS} personnes au maximum sur un morceau.`);
		}
		if (!self && contributors.filter((c) => !c.confirmedAt).length >= MAX_PENDING_CREDITS) {
			throw new WorkError(
				`${MAX_PENDING_CREDITS} crédits attendent déjà une confirmation : attends des réponses.`
			);
		}
		const credit = await tx.workContributor.create({
			data: {
				workId,
				personId: person.id,
				invitedById: self ? null : managerId,
				confirmedAt: self ? now : null
			},
			select: { id: true }
		});
		const open = await tx.workRole.findMany({
			where: { workId, contributorId: null },
			select: { id: true, kind: true, instrument: { select: { slug: true } } }
		});
		const total = await tx.workRole.count({ where: { workId } });
		let created = 0;
		for (const role of roles) {
			const match = open.find((o) => rowKey(o) === role.key);
			if (match) {
				open.splice(open.indexOf(match), 1);
				await tx.workRole.update({ where: { id: match.id }, data: { contributorId: credit.id } });
			} else {
				if (total + ++created > MAX_ROLES) throw new WorkError(`${MAX_ROLES} rôles au maximum.`);
				await tx.workRole.create({
					data: {
						workId,
						kind: role.kind,
						instrumentId: role.instrumentId,
						contributorId: credit.id
					}
				});
			}
		}
		if (self) return afterConfirm(tx, work, person.id, now);
		await notify(tx, {
			recipientId: person.id,
			type: 'WORK_CREDIT',
			fromActorId: managerId,
			href: `/morceaux/${workId}`,
			title: work.title
		});
		return null;
	}, TX);
	return { person, progress: result && result.length > 0 ? summarize(managerId, result) : null };
}

/** Confirmer son rôle : consentement au crédit, et sa part si le morceau est composé. */
export async function confirmCredit(workId: string, personId: string, now = new Date()) {
	const result = await prisma.$transaction(async (tx) => {
		await lockWork(tx, workId);
		const work = await loadWork(tx, workId);
		const { count } = await tx.workContributor.updateMany({
			where: { workId, personId, confirmedAt: null },
			data: { confirmedAt: now }
		});
		if (count === 0) throw new WorkError('Rien à confirmer sur ce morceau.', 404);
		return afterConfirm(tx, work, personId, now);
	}, TX);
	return result.length > 0 ? summarize(personId, result) : null;
}

/**
 * Refuser un crédit (ses rôles redeviennent à pourvoir), ou retirer le sien
 * après l'avoir confirmé (ses rôles disparaissent). L'XP reçue reste. La
 * personne qui porte le morceau le supprime plutôt.
 */
export async function leaveCredit(workId: string, personId: string) {
	await prisma.$transaction(async (tx) => {
		await lockWork(tx, workId);
		const work = await loadWork(tx, workId);
		if (work.ownerId === personId) {
			throw new WorkError('Ce morceau est le tien : supprime-le plutôt.');
		}
		const credit = await tx.workContributor.findUnique({
			where: { workId_personId: { workId, personId } },
			select: { id: true, confirmedAt: true }
		});
		if (!credit) throw new WorkError('Tu n’as pas de crédit sur ce morceau.', 404);
		if (credit.confirmedAt) await tx.workRole.deleteMany({ where: { contributorId: credit.id } });
		await tx.workContributor.delete({ where: { id: credit.id } });
	}, TX);
}

/** La gestion retire un crédit pas encore confirmé (ses rôles redeviennent à pourvoir). */
export async function withdrawCredit(workId: string, managerId: string, contributorId: string) {
	await prisma.$transaction(async (tx) => {
		await lockWork(tx, workId);
		const work = await loadWork(tx, workId);
		await requireManage(tx, work, managerId);
		const { count } = await tx.workContributor.deleteMany({
			where: { id: contributorId, workId, confirmedAt: null }
		});
		if (count === 0) {
			throw new WorkError(
				'Ce crédit est confirmé : seule la personne concernée peut le retirer.',
				403
			);
		}
	}, TX);
}

/**
 * Maquette : un lien (média du porteur, validé selon la confiance de la
 * personne qui l'ajoute), ou un média déjà publié du porteur. Jamais une
 * « démo » qui rapporte de l'XP.
 */
export async function setDemo(
	workId: string,
	managerId: string,
	input: { mediaId: string } | { url: string; title: string }
) {
	const work = await loadWork(prisma, workId);
	await requireManage(prisma, work, managerId);
	let mediaId: string;
	let fromWork: boolean;
	if ('mediaId' in input) {
		const media = await prisma.media.findFirst({
			where: { id: input.mediaId, actorId: work.ownerId, status: { not: 'REJECTED' } },
			select: { id: true }
		});
		if (!media) throw new WorkError('Ce média n’est plus disponible.', 404);
		mediaId = media.id;
		fromWork = false;
	} else {
		try {
			const { media } = await addExternalMedia(
				work.ownerId,
				{ url: input.url, title: input.title || work.title, isDemo: false, instrumentId: null },
				managerId
			);
			mediaId = media.id;
			fromWork = true;
		} catch (err) {
			if (err instanceof MediaError) throw new WorkError(err.message);
			throw err;
		}
	}
	await prisma.work.update({
		where: { id: workId },
		data: { demoMediaId: mediaId, demoFromWork: fromWork }
	});
}

/**
 * « C'est composé » : maquette jointe exigée. Avec ≥2 crédits confirmés, le
 * morceau est corroboré et chaque contributeur confirmé reçoit sa part ;
 * sinon il est déclaré, et le deviendra à la 2ᵉ confirmation.
 */
export async function markComposed(workId: string, managerId: string, now = new Date()) {
	const result = await prisma.$transaction(async (tx) => {
		await lockWork(tx, workId);
		const work = await loadWork(tx, workId);
		await requireManage(tx, work, managerId);
		const blocker = composeBlocker({
			state: work.state,
			hasDemo: Boolean(work.demoMediaId) && work.demoMedia?.status !== 'REJECTED'
		});
		if (blocker) throw new WorkError(blocker);
		const ids = await confirmedAuthors(tx, workId);
		const proof = proofFor(ids.length);
		await tx.work.update({
			where: { id: workId },
			data: { state: 'COMPOSED', proof, composedAt: now }
		});
		const results: ProcessResult[] = [];
		if (proof === 'CORROBORATED') {
			results.push(
				await emitAndProcess(tx, {
					type: 'work.composed',
					workId,
					contributorIds: ids,
					occurredAt: now
				})
			);
		}
		// Composé seul·e (P4-07b) : déclaré, sans XP, mais « Fait maison ».
		if (
			proof === 'DECLARED' &&
			work.owner.kind === 'PERSON' &&
			ids.every((id) => id === work.ownerId)
		) {
			const soundRoles = await tx.workRole.count({
				where: {
					workId,
					kind: { in: [...SOUND_ROLE_KINDS] },
					contributor: { personId: work.ownerId, confirmedAt: { not: null } }
				}
			});
			results.push(
				await emitAndProcess(tx, {
					type: 'work.composed_solo',
					workId,
					personId: work.ownerId,
					withSoundRole: soundRoles > 0,
					occurredAt: now
				})
			);
		}
		// Étape « Première composition » du groupe (P3-04, D41).
		if (work.owner.kind === 'ORGANIZATION') {
			const step = await syncComposition(tx, work.ownerId, now);
			if (step) results.push(step);
		}
		return results;
	}, TX);
	return { progress: result.length > 0 ? summarize(managerId, result) : null };
}

// ─── Lectures ────────────────────────────────────────────────────────────

/** Morceaux où la personne fait partie de l'équipe. */
function teamWhere(personId: string): Prisma.WorkWhereInput {
	return {
		owner: {
			deletedAt: null,
			OR: [{ organization: null }, { organization: { dissolvedAt: null } }]
		},
		OR: [
			{ ownerId: personId },
			{ contributors: { some: { personId } } },
			{ owner: { organization: { memberships: { some: { personId, status: 'ACTIVE' } } } } }
		]
	};
}

/** `/morceaux` : mes morceaux et les crédits qui attendent ma confirmation. */
export async function myWorks(personId: string) {
	const rows = await prisma.work.findMany({
		where: teamWhere(personId),
		orderBy: { updatedAt: 'desc' },
		select: {
			id: true,
			title: true,
			state: true,
			proof: true,
			ownerId: true,
			owner: { select: { kind: true, handle: true, displayName: true } },
			contributors: {
				select: { personId: true, confirmedAt: true, invitedBy: { select: { displayName: true } } }
			},
			roles: { where: { contributorId: null }, select: { id: true } }
		}
	});
	const works = rows.map((w) => {
		const mine = w.contributors.find((c) => c.personId === personId);
		return {
			id: w.id,
			title: w.title,
			state: w.state,
			proof: w.proof,
			band:
				w.owner.kind === 'ORGANIZATION'
					? { handle: w.owner.handle, name: w.owner.displayName }
					: null,
			credits: w.contributors.filter((c) => c.confirmedAt).length,
			openRoles: w.roles.length,
			toConfirm: Boolean(mine && !mine.confirmedAt),
			invitedBy: mine && !mine.confirmedAt ? (mine.invitedBy?.displayName ?? null) : null
		};
	});
	return {
		toConfirm: works.filter((w) => w.toConfirm),
		works: works.filter((w) => !w.toConfirm)
	};
}

/**
 * Morceaux que je peux relier à une annonce (P4-05) : ceux que je porte, ou
 * que porte un groupe dont je fais partie de la gestion.
 */
export async function manageableWorks(personId: string) {
	const rows = await prisma.work.findMany({
		where: {
			owner: {
				deletedAt: null,
				OR: [
					{ id: personId },
					{
						organization: {
							dissolvedAt: null,
							memberships: {
								some: { personId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } }
							}
						}
					}
				]
			}
		},
		orderBy: { updatedAt: 'desc' },
		take: 50,
		select: { id: true, title: true, owner: { select: { kind: true, displayName: true } } }
	});
	return rows.map((w) => ({
		id: w.id,
		title: w.title,
		band: w.owner.kind === 'ORGANIZATION' ? w.owner.displayName : null
	}));
}

/** Nombre de crédits à confirmer (pastille de `/morceaux`). */
export async function pendingCredits(personId: string) {
	return prisma.workContributor.count({
		where: { personId, confirmedAt: null, work: teamWhere(personId) }
	});
}

/**
 * Fiche d'un morceau. `null` : introuvable, ou une idée hors de son équipe
 * (on ne dit pas qu'elle existe), ou un porteur non visible publiquement.
 */
export async function workPage(workId: string, viewerId: string | null, now = new Date()) {
	const work = await prisma.work.findUnique({
		where: { id: workId },
		select: {
			...workHead,
			composedAt: true,
			// Étapes de production (P4-06).
			recordedAt: true,
			mixedAt: true,
			masteredAt: true,
			producedAt: true,
			createdAt: true,
			demoFromWork: true,
			genres: { select: { genre: { select: { id: true, name: true } } } },
			demoMedia: {
				select: {
					id: true,
					status: true,
					title: true,
					externalUrl: true,
					fileUrl: true,
					kind: true
				}
			},
			contributors: {
				orderBy: { createdAt: 'asc' },
				select: {
					id: true,
					confirmedAt: true,
					person: {
						select: {
							id: true,
							handle: true,
							displayName: true,
							deletedAt: true,
							person: { select: { birthDate: true } }
						}
					},
					roles: {
						orderBy: { createdAt: 'asc' },
						select: {
							kind: true,
							instrument: { select: { name: true, slug: true } }
						}
					}
				}
			},
			roles: {
				where: { contributorId: null },
				orderBy: { createdAt: 'asc' },
				select: { id: true, kind: true, instrument: { select: { name: true, slug: true } } }
			}
		}
	});
	if (!work || work.owner.deletedAt || work.owner.organization?.dissolvedAt) return null;

	const team = viewerId ? await isTeam(prisma, work, viewerId) : false;
	const manage = viewerId ? await canManage(prisma, work, viewerId) : false;
	if (!team) {
		if (work.state !== 'COMPOSED') return null;
		const visible = await prisma.actor.count({
			where: { id: work.ownerId, ...publicActorWhere(now, viewerId) }
		});
		if (!visible) return null;
	}

	const people = work.contributors.map((c) => c.person.id);
	const visibleRows = await prisma.actor.findMany({
		where: { id: { in: people }, ...publicActorWhere(now) },
		select: { id: true }
	});
	const visible = new Set(visibleRows.map((a) => a.id));
	const signedIn = Boolean(viewerId);

	const credits = work.contributors
		.filter((c) => team || c.confirmedAt)
		.map((c) => {
			const shown = team
				? {
						name: c.person.deletedAt ? 'Compte supprimé' : c.person.displayName,
						handle: c.person.deletedAt ? null : c.person.handle
					}
				: publicMember(
						{
							deleted: c.person.deletedAt !== null,
							visible: visible.has(c.person.id),
							adult: isIndexable(c.person.person?.birthDate, now),
							displayName: c.person.displayName,
							handle: c.person.handle
						},
						signedIn
					);
			return {
				id: c.id,
				...shown,
				me: c.person.id === viewerId,
				confirmed: Boolean(c.confirmedAt),
				roles: c.roles.map((r) => roleLabel(r))
			};
		});
	const bandHandle = work.owner.kind === 'ORGANIZATION' ? work.owner.handle : null;
	const openRoles = work.roles.map((r) => {
		const label = roleLabel(r);
		return {
			id: r.id,
			label,
			recruitHref: manage
				? openRoleHref({
						workId: work.id,
						workTitle: work.title,
						bandHandle,
						kind: r.kind,
						instrumentSlug: r.instrument?.slug ?? null,
						roleLabel: label
					})
				: null
		};
	});
	const demo = work.demoMedia;
	const mine = work.contributors.find((c) => c.person.id === viewerId);
	return {
		id: work.id,
		title: work.title,
		state: work.state,
		proof: work.proof,
		composedAt: work.composedAt,
		/** Étapes franchies par des collaborations terminées (P4-06). */
		stages: {
			recordedAt: work.recordedAt,
			mixedAt: work.mixedAt,
			masteredAt: work.masteredAt,
			producedAt: work.producedAt
		},
		owner: {
			kind: work.owner.kind,
			handle: work.owner.handle,
			name: work.owner.displayName
		},
		genres: work.genres.map((g) => g.genre),
		demo:
			demo && (team || demo.status === 'PUBLISHED')
				? {
						id: demo.id,
						title: demo.title,
						status: demo.status,
						kind: demo.kind,
						externalUrl: demo.externalUrl,
						fileUrl: demo.fileUrl
					}
				: null,
		credits,
		openRoles,
		team,
		manage,
		myCredit: mine ? { confirmed: Boolean(mine.confirmedAt) } : null,
		ownedByMe: work.ownerId === viewerId,
		composeBlocker: composeBlocker({
			state: work.state,
			hasDemo: Boolean(demo) && demo?.status !== 'REJECTED'
		})
	};
}
export type WorkPage = NonNullable<Awaited<ReturnType<typeof workPage>>>;

/** Médias du porteur qu'on peut choisir comme maquette. */
export async function demoCandidates(workId: string, managerId: string) {
	const work = await loadWork(prisma, workId);
	await requireManage(prisma, work, managerId);
	return prisma.media.findMany({
		where: {
			actorId: work.ownerId,
			status: 'PUBLISHED',
			kind: { in: ['AUDIO', 'VIDEO', 'EXTERNAL_LINK'] }
		},
		orderBy: { createdAt: 'desc' },
		take: 20,
		select: { id: true, title: true }
	});
}

/**
 * Morceaux composés d'un acteur, pour `/@handle` : ceux qu'il porte, et pour
 * une personne ceux où son crédit est confirmé. Le porteur doit être
 * visible publiquement.
 */
export async function publicWorksOf(actorId: string, now = new Date(), viewerId?: string | null) {
	const rows = await prisma.work.findMany({
		where: {
			state: 'COMPOSED',
			owner: {
				...publicActorWhere(now, viewerId),
				OR: [{ organization: null }, { organization: { dissolvedAt: null } }]
			},
			OR: [
				{ ownerId: actorId },
				{ contributors: { some: { personId: actorId, confirmedAt: { not: null } } } }
			]
		},
		orderBy: { composedAt: 'desc' },
		take: 24,
		select: {
			id: true,
			title: true,
			proof: true,
			ownerId: true,
			owner: { select: { kind: true, handle: true, displayName: true } },
			contributors: {
				where: { confirmedAt: { not: null } },
				select: {
					personId: true,
					roles: { select: { kind: true, instrument: { select: { name: true } } } }
				}
			}
		}
	});
	return rows.map((w) => ({
		id: w.id,
		title: w.title,
		proof: w.proof,
		credits: w.contributors.length,
		/** Groupe porteur, si l'acteur n'est pas lui-même le porteur. */
		band:
			w.ownerId !== actorId && w.owner.kind === 'ORGANIZATION'
				? { handle: w.owner.handle, name: w.owner.displayName }
				: null,
		roles: (w.contributors.find((c) => c.personId === actorId)?.roles ?? []).map((r) =>
			roleLabel(r)
		),
		/** Rôles du son confirmés de l'acteur (P4-07), pour ses cartes métier. */
		soundRoles: (w.contributors.find((c) => c.personId === actorId)?.roles ?? [])
			.map((r) => r.kind)
			.filter(isSoundRole)
	}));
}

/** Morceaux d'un groupe, pour sa fiche (`/groupes/[handle]`, équipe). */
export async function bandWorks(bandId: string) {
	return prisma.work.findMany({
		where: { ownerId: bandId },
		orderBy: { updatedAt: 'desc' },
		select: { id: true, title: true, state: true, proof: true }
	});
}

/**
 * Premier morceau composé du groupe : l'étape « Première composition »
 * (P3-04) s'appuiera dessus (corroborée si le morceau l'est).
 */
export async function firstComposedWork(bandId: string, db: Db = prisma) {
	return db.work.findFirst({
		where: { ownerId: bandId, state: 'COMPOSED' },
		orderBy: { composedAt: 'asc' },
		select: { id: true, title: true, proof: true, composedAt: true }
	});
}

/** Export RGPD : morceaux portés et crédits de la personne. */
export async function worksExport(personId: string) {
	const [owned, credits] = await Promise.all([
		prisma.work.findMany({
			where: { ownerId: personId },
			select: {
				title: true,
				state: true,
				proof: true,
				composedAt: true,
				createdAt: true,
				genres: { select: { genre: { select: { name: true } } } }
			}
		}),
		prisma.workContributor.findMany({
			where: { personId },
			select: {
				confirmedAt: true,
				createdAt: true,
				work: { select: { title: true, owner: { select: { displayName: true } } } },
				roles: { select: { kind: true, instrument: { select: { name: true } } } }
			}
		})
	]);
	return {
		owned: owned.map((w) => ({ ...w, genres: w.genres.map((g) => g.genre.name) })),
		credits: credits.map((c) => ({
			work: c.work.title,
			carriedBy: c.work.owner.displayName,
			roles: c.roles.map((r) => roleLabel(r)),
			confirmedAt: c.confirmedAt,
			createdAt: c.createdAt
		}))
	};
}
