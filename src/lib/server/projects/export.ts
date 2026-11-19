/**
 * Projets et RGPD (P2, D72 §6.5, conception 19 §9.3).
 *
 * Export : les projets que la personne porte en son nom (avec leurs
 * éléments : ses morceaux), et les actes qu'elle a posés dans les projets
 * d'une structure (type d'acte, projet, date), sans titre d'un morceau
 * qu'elle ne porte pas.
 *
 * P4a : ses participations (projet, porteur, rôle, capacités, état, dates,
 * qui l'a invitée) et les actes qui la concernent, sans rien des éléments.
 *
 * Anonymisation : ses projets personnels sont supprimés (conteneurs, I1),
 * avec leurs participations ; dans les projets d'autrui, elle est oubliée
 * comme autrice d'un acte, d'un rangement, d'une invitation et comme
 * personne concernée ; ses participations ouvertes se closent, et l'équipe
 * ne garde que « Compte supprimé ». Le journal reste en ajout seul (I8).
 */
import { prisma } from '#lib/server';
import { PROJECT_KIND_LABELS, PROJECT_STATUS_LABELS, SHARE_LABELS } from '#lib/projects/rules';
import { CAPABILITY_LABELS, PARTICIPANT_STATUS_LABELS } from '#lib/projects/participants';

export async function projectsExport(personId: string) {
	const [owned, acts, participations, about] = await Promise.all([
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
		}),
		prisma.projectParticipant.findMany({
			where: { personId },
			orderBy: [{ invitedAt: 'asc' }, { id: 'asc' }],
			select: {
				status: true,
				role: true,
				capabilities: true,
				proposedCapabilities: true,
				asMember: true,
				invitedAt: true,
				answeredAt: true,
				endedAt: true,
				invitedBy: { select: { displayName: true } },
				project: { select: { name: true, owner: { select: { displayName: true } } } }
			}
		}),
		prisma.projectAct.findMany({
			where: { subjectId: personId },
			orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
			select: {
				kind: true,
				capability: true,
				occurredAt: true,
				project: { select: { name: true } }
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
		participations: participations.map((p) => ({
			projet: p.project.name,
			porteur: p.project.owner.displayName,
			etat: PARTICIPANT_STATUS_LABELS[p.status],
			role: p.role,
			capacites: p.capabilities.map((c) => CAPABILITY_LABELS[c]),
			capacites_proposees: p.proposedCapabilities.map((c) => CAPABILITY_LABELS[c]),
			recue_comme_membre: p.asMember,
			invitation_de: p.invitedBy?.displayName ?? null,
			invitee_le: p.invitedAt,
			reponse_le: p.answeredAt,
			fin_le: p.endedAt
		})),
		actes_me_concernant: about.map((a) => ({
			acte: a.kind,
			capacite: a.capability ? CAPABILITY_LABELS[a.capability] : null,
			projet: a.project.name,
			le: a.occurredAt
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
export function projectAnonymizationOps(personId: string, now = new Date()) {
	return [
		prisma.projectAct.updateMany({ where: { authorId: personId }, data: { authorId: null } }),
		prisma.projectAct.updateMany({ where: { subjectId: personId }, data: { subjectId: null } }),
		prisma.projectItem.updateMany({ where: { addedById: personId }, data: { addedById: null } }),
		// Participations (P4a) : les ouvertes se closent ; aucun rôle ni capacité ne reste.
		prisma.projectParticipant.updateMany({
			where: { personId, status: { in: ['INVITED', 'ACTIVE'] } },
			data: { status: 'LEFT', endedAt: now }
		}),
		prisma.projectParticipant.updateMany({
			where: { personId },
			data: { role: null, capabilities: [], proposedCapabilities: [], asMember: false }
		}),
		prisma.projectParticipant.updateMany({
			where: { invitedById: personId },
			data: { invitedById: null }
		}),
		prisma.project.deleteMany({ where: { ownerId: personId } })
	];
}
