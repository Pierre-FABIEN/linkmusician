/**
 * Parrainage (P4-13b, conception 07 §4.8) : présenter deux personnes de son
 * réseau, et le succès _Passeur_ quand elles collaborent ensuite.
 *
 * - Qui présente : palier musicien Pilier local ou Référence (lu dans les
 *   faits, `getMusicianTier`), jamais l'XP.
 * - Qui est présenté : deux personnes de son réseau musical (`MusicalTie`),
 *   visibles, majeures (D5 : un·e mineur·e n'est jamais présenté·e à un·e
 *   adulte inconnu·e), sans blocage entre elles, qui n'ont pas encore joué
 *   ensemble.
 * - Effet : une notification à chacune (désactivable), rien d'autre. La
 *   réussite est constatée à la fin d'une collaboration (`markSucceeded`,
 *   appelé par le service des collaborations).
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { playedTogether } from '#lib/server/network/service';
import { notify } from '#lib/server/notifications/service';
import { getMusicianTier } from '#lib/server/progression/read';
import { emitAndProcess } from '#lib/server/progression/processor';
import { isIndexable } from '#lib/actors/visibility';
import {
	INTRODUCTION_WINDOW_DAYS,
	canSponsor,
	introductionBlocker,
	normalizeNote,
	pairOf,
	succeededBy
} from '#lib/career/introductions';

export class IntroductionError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

const DAY = 86_400_000;

/** La personne peut-elle parrainer ? (palier musicien atteint). */
export async function canIntroduce(personId: string) {
	const { reached } = await getMusicianTier(personId, prisma);
	return canSponsor(reached);
}

/** Personnes de son réseau que l'on peut présenter : visibles et majeures. */
export async function introducibleContacts(personId: string, now = new Date()) {
	const ties = await prisma.musicalTie.findMany({
		where: {
			ownerId: personId,
			contact: { ...publicActorWhere(now, personId), person: { isNot: null } }
		},
		orderBy: { contact: { displayName: 'asc' } },
		select: {
			contact: {
				select: {
					id: true,
					handle: true,
					displayName: true,
					person: { select: { birthDate: true } }
				}
			}
		}
	});
	return ties
		.map((t) => t.contact)
		.filter((c) => isIndexable(c.person?.birthDate, now))
		.map((c) => ({ id: c.id, handle: c.handle, displayName: c.displayName }));
}

export async function introduce(
	introducerId: string,
	input: { first: string; second: string; note: string },
	now = new Date()
) {
	const note = normalizeNote(input.note);
	const [sponsor, contacts] = await Promise.all([
		canIntroduce(introducerId),
		introducibleContacts(introducerId, now)
	]);
	const byHandle = new Map(contacts.map((c) => [c.handle, c]));
	const a = byHandle.get(input.first.trim().replace(/^@/, '').toLowerCase());
	const b = byHandle.get(input.second.trim().replace(/^@/, '').toLowerCase());
	const both = Boolean(a && b);
	const same = both && a!.id === b!.id;
	const [firstId, secondId] = both ? pairOf(a!.id, b!.id) : ['', ''];
	const [blocked, played, already, recent] =
		both && !same
			? await Promise.all([
					isBlockedBetween(a!.id, b!.id),
					playedTogether(a!.id, b!.id),
					prisma.introduction.count({ where: { introducerId, firstId, secondId } }),
					prisma.introduction.count({
						where: {
							introducerId,
							createdAt: { gte: new Date(now.getTime() - INTRODUCTION_WINDOW_DAYS * DAY) }
						}
					})
				])
			: [false, false, 0, 0];
	const blocker = introductionBlocker({
		sponsor,
		same,
		// Un·e mineur·e n'est jamais dans `introducibleContacts` : refusé ici aussi.
		bothInNetwork: both,
		minor: false,
		blocked,
		alreadyPlayed: played,
		alreadyIntroduced: already > 0,
		recent,
		noteLength: [...note].length
	});
	if (blocker) throw new IntroductionError(blocker, sponsor ? 400 : 403);

	await prisma.$transaction(async (tx) => {
		await tx.introduction.create({ data: { introducerId, firstId, secondId, note } });
		for (const [to, other] of [
			[a!, b!],
			[b!, a!]
		]) {
			await notify(tx, {
				recipientId: to.id,
				type: 'INTRODUCTION',
				fromActorId: introducerId,
				href: `/@${other.handle}`,
				title: other.displayName
			});
		}
	});
	return { first: a!.displayName, second: b!.displayName };
}

/** `/espace/parrainage` : mes présentations, les plus récentes d'abord. */
export async function myIntroductions(introducerId: string) {
	const rows = await prisma.introduction.findMany({
		where: { introducerId },
		orderBy: { createdAt: 'desc' },
		take: 50,
		select: {
			id: true,
			createdAt: true,
			succeededAt: true,
			first: { select: { handle: true, displayName: true, deletedAt: true } },
			second: { select: { handle: true, displayName: true, deletedAt: true } }
		}
	});
	const card = (p: { handle: string; displayName: string; deletedAt: Date | null }) =>
		p.deletedAt
			? { handle: null, name: 'Compte supprimé' }
			: { handle: p.handle, name: p.displayName };
	return rows.map((r) => ({
		id: r.id,
		createdAt: r.createdAt,
		succeededAt: r.succeededAt,
		first: card(r.first),
		second: card(r.second)
	}));
}

/**
 * Une collaboration vient de se terminer : les présentations entre deux de
 * ses participant·es, faites avant et pas encore réussies, le deviennent ;
 * qui les a présentées obtient _Passeur_ (une fois, unicité des succès).
 */
export async function markSucceeded(
	tx: Prisma.TransactionClient,
	collaboration: { id: string; participantIds: readonly string[] },
	now: Date
) {
	if (collaboration.participantIds.length < 2) return;
	const open = await tx.introduction.findMany({
		where: {
			succeededAt: null,
			firstId: { in: [...collaboration.participantIds] },
			secondId: { in: [...collaboration.participantIds] }
		},
		select: { id: true, introducerId: true, firstId: true, secondId: true, createdAt: true }
	});
	for (const intro of succeededBy(open, collaboration.participantIds, now)) {
		await tx.introduction.update({
			where: { id: intro.id },
			data: { succeededAt: now, collaborationId: collaboration.id }
		});
		await emitAndProcess(tx, {
			type: 'introduction.succeeded',
			introductionId: intro.id,
			introducerId: intro.introducerId,
			introducedIds: [intro.firstId, intro.secondId],
			collaborationId: collaboration.id,
			occurredAt: now
		});
	}
}

/** Export RGPD : présentations faites, et celles où la personne a été présentée. */
export async function introductionsExport(personId: string) {
	const rows = await prisma.introduction.findMany({
		where: { OR: [{ introducerId: personId }, { firstId: personId }, { secondId: personId }] },
		orderBy: { createdAt: 'asc' },
		select: {
			introducerId: true,
			note: true,
			createdAt: true,
			succeededAt: true,
			introducer: { select: { displayName: true } },
			first: { select: { id: true, displayName: true } },
			second: { select: { id: true, displayName: true } }
		}
	});
	return rows.map((r) => {
		const mine = r.introducerId === personId;
		const other = r.first.id === personId ? r.second : r.first;
		return mine
			? {
					role: 'présentées par moi',
					personnes: [r.first.displayName, r.second.displayName],
					mot: r.note,
					le: r.createdAt,
					collaboration_ensuite: r.succeededAt
				}
			: {
					role: 'présenté·e',
					par: r.introducer.displayName,
					a: other.displayName,
					le: r.createdAt,
					collaboration_ensuite: r.succeededAt
				};
	});
}
