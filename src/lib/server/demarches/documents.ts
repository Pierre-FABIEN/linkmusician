/**
 * Documents préremplis (P3-15b) : bulletin de partage d'un morceau (son
 * équipe), programme des œuvres du groupe (ses membres actifs). L'accès
 * reprend celui des pages existantes (`workPage`, `bandPage`) ; rien n'est
 * enregistré, rien ne rapporte d'XP.
 */
import { prisma } from '#lib/server';
import { workPage } from '#lib/server/works/service';
import { bandPage } from '#lib/server/bands/service';
import { concertProgram, sharingSheet, type Credit } from '#lib/demarches/documents';

const creditSelect = {
	confirmedAt: true,
	person: { select: { displayName: true, deletedAt: true } },
	roles: { select: { kind: true, instrument: { select: { name: true } } } }
} as const;

type CreditRow = {
	confirmedAt: Date | null;
	person: { displayName: string; deletedAt: Date | null };
	roles: { kind: Credit['roles'][number]['kind']; instrument: { name: string } | null }[];
};

const toCredit = (c: CreditRow): Credit => ({
	name: c.person.deletedAt ? 'Compte supprimé' : c.person.displayName,
	confirmed: c.confirmedAt !== null,
	roles: c.roles.map((r) => ({ kind: r.kind, instrument: r.instrument?.name ?? null }))
});

/** `null` : morceau introuvable ou hors de l'équipe de la personne. */
export async function sharingSheetFor(workId: string, viewerId: string) {
	const work = await workPage(workId, viewerId);
	if (!work || !work.team) return null;
	const rows = await prisma.workContributor.findMany({
		where: { workId },
		orderBy: { createdAt: 'asc' },
		select: creditSelect
	});
	return {
		work: {
			id: work.id,
			title: work.title,
			state: work.state,
			composedAt: work.composedAt,
			owner: work.owner.name
		},
		sheet: sharingSheet(rows.map(toCredit))
	};
}

/** `null` : groupe introuvable ou la personne n'en est pas membre active. */
export async function concertProgramFor(handle: string, viewerId: string) {
	const band = await bandPage(handle, viewerId);
	if (!band || band.my?.status !== 'ACTIVE') return null;
	const works = await prisma.work.findMany({
		where: { ownerId: band.id, state: 'COMPOSED' },
		select: { title: true, contributors: { select: creditSelect } }
	});
	return {
		band: { handle: band.handle, name: band.name },
		lines: concertProgram(
			works.map((w) => ({ title: w.title, credits: w.contributors.map(toCredit) }))
		)
	};
}
