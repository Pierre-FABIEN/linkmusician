/**
 * Projets et RGPD (P2, D72 §6.5, conception 19 §9.3).
 *
 * Export : les projets que la personne porte en son nom (avec leurs
 * éléments : ses morceaux), et les actes qu'elle a posés dans les projets
 * d'une structure (type d'acte, projet, date), sans titre d'un morceau
 * qu'elle ne porte pas.
 *
 * Anonymisation : ses projets personnels sont supprimés (conteneurs, I1) ;
 * dans les projets d'une structure, elle est oubliée comme autrice d'un
 * acte ou d'un rangement. Le journal reste en ajout seul (trigger I8).
 */
import { prisma } from '#lib/server';
import { PROJECT_KIND_LABELS, PROJECT_STATUS_LABELS, SHARE_LABELS } from '#lib/projects/rules';

export async function projectsExport(personId: string) {
	const [owned, acts] = await Promise.all([
		prisma.project.findMany({
			where: { ownerId: personId },
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
			select: {
				name: true,
				kind: true,
				description: true,
				startsOn: true,
				dueOn: true,
				status: true,
				createdAt: true,
				items: {
					orderBy: { createdAt: 'asc' },
					select: {
						share: true,
						workingTitle: true,
						createdAt: true,
						work: { select: { title: true, ownerId: true } }
					}
				}
			}
		}),
		prisma.projectAct.findMany({
			where: { authorId: personId, project: { ownerId: { not: personId } } },
			orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
			select: {
				kind: true,
				occurredAt: true,
				project: { select: { name: true, owner: { select: { displayName: true } } } }
			}
		})
	]);
	return {
		portes: owned.map((p) => ({
			nom: p.name,
			type: PROJECT_KIND_LABELS[p.kind],
			objectif: p.description,
			debut: p.startsOn,
			echeance: p.dueOn,
			etat: PROJECT_STATUS_LABELS[p.status],
			cree_le: p.createdAt,
			elements: p.items.map((i) => ({
				// Un morceau d'un groupe rangé dans mon projet : son titre est une
				// donnée du groupe ; seul le titre affiché que j'ai saisi est le mien.
				morceau: i.work.ownerId === personId ? i.work.title : null,
				titre_affiche: i.workingTitle,
				partage: SHARE_LABELS[i.share],
				range_le: i.createdAt
			}))
		})),
		actes_dans_les_projets_de_structures: acts.map((a) => ({
			acte: a.kind,
			projet: a.project.name,
			porteur: a.project.owner.displayName,
			le: a.occurredAt
		}))
	};
}

/** À inclure dans la transaction d'anonymisation (`personAnonymizationOps`). */
export function projectAnonymizationOps(personId: string) {
	return [
		prisma.projectAct.updateMany({ where: { authorId: personId }, data: { authorId: null } }),
		prisma.projectItem.updateMany({ where: { addedById: personId }, data: { addedById: null } }),
		prisma.project.deleteMany({ where: { ownerId: personId } })
	];
}
