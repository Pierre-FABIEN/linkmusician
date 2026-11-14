/** Lecture privée des faits conservés : aucun nouveau droit de mutation. */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { isIndexable } from '#lib/actors/visibility';
import { representationTimeline } from '#lib/activity/timeline';

async function historyWhere(
	personId: string,
	now: Date
): Promise<Prisma.RepresentationWhereInput | null> {
	const viewer = await prisma.actor.findFirst({
		where: { id: personId, kind: 'PERSON', deletedAt: null },
		select: { person: { select: { birthDate: true } } }
	});
	if (!isIndexable(viewer?.person?.birthDate, now)) return null;
	const bands = await prisma.membership.findMany({
		where: {
			personId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			org: { kind: 'BAND', dissolvedAt: null, actor: { deletedAt: null } }
		},
		select: { orgId: true }
	});
	return {
		agent: { deletedAt: null },
		artist: {
			deletedAt: null,
			OR: [{ kind: 'PERSON' }, { organization: { kind: 'BAND', dissolvedAt: null } }]
		},
		OR: [{ agentId: personId }, { artistId: { in: [personId, ...bands.map((b) => b.orgId)] } }]
	};
}
const actor = { select: { displayName: true, deletedAt: true } } as const;

export async function representationHistoryForMe(personId: string, now = new Date()) {
	const where = await historyWhere(personId, now);
	if (!where) return [];
	const rows = await prisma.representation.findMany({
		where,
		orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
		take: 100,
		select: { id: true, kind: true, status: true, agent: actor, artist: actor }
	});
	return rows.map((r) => ({
		id: r.id,
		kind: r.kind,
		status: r.status,
		agentName: r.agent.displayName,
		artistName: r.artist.displayName
	}));
}

export async function representationActivityForMe(id: string, personId: string, now = new Date()) {
	const where = await historyWhere(personId, now);
	if (!where) return null;
	const row = await prisma.representation.findFirst({
		where: { AND: [where, { id }] },
		select: {
			id: true,
			kind: true,
			status: true,
			createdAt: true,
			confirmedAt: true,
			endedAt: true,
			agent: actor,
			artist: actor,
			confirmedBy: actor,
			endedBy: actor
		}
	});
	return row
		? {
				id: row.id,
				kind: row.kind,
				status: row.status,
				agentName: row.agent.displayName,
				artistName: row.artist.displayName,
				activity: representationTimeline(row)
			}
		: null;
}
