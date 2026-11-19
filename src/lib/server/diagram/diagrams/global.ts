/**
 * LINKMUSICIAN: cartographie globale (DIAGRAM-01). Les grands objets de
 * Melokiva et leurs liens métier, sans détail technique. Chaque nœud ouvre
 * son domaine ; les flèches sont des relations, pas des clés étrangères.
 */
import type { DiagramDefinition } from '#lib/diagram/types';
import { refs, step } from './define';

const C = (docs: string[], decisions: string[] = []) =>
	refs({
		docs: ['docs/conception/README.md', ...docs],
		decisions,
		sourceFiles: ['prisma/schema.prisma']
	});

export const GLOBAL_CARTE: DiagramDefinition = {
	id: 'global-carte',
	slug: 'global-carte',
	title: 'Vue globale de Melokiva',
	description:
		'Personnes, groupes, structures, projets, opportunités, collaborations, œuvres, concerts et progression : qui se relie à quoi.',
	kind: 'carte',
	domain: 'transversal',
	actors: ['musicien', 'groupe', 'organisateur', 'inge-son', 'producteur', 'manager', 'booker'],
	entities: [
		'Actor',
		'Membership',
		'Project',
		'ProjectNeed',
		'Opportunity',
		'Collaboration',
		'Work',
		'Milestone',
		'XpTransaction',
		'Representation',
		'Venue'
	],
	parents: [],
	children: ['parcours-groupe-ep', 'donnees-projets'],
	related: [],
	source: 'docs/diagram/drawio/global/global-carte.drawio',
	status: 'IMPLEMENTED',
	references: {
		decisions: ['D72'],
		issues: [],
		sourceFiles: ['prisma/schema.prisma'],
		tests: [],
		docs: ['docs/conception/README.md', 'docs/conception/audit-structurel-collab.md']
	},
	steps: [
		step({
			id: 'g-personne',
			title: 'Personne',
			actor: 'membre',
			description: 'Un compte, une personne (`Actor` + `Person`), un ou plusieurs métiers.',
			next: ['g-groupe', 'g-projet', 'g-annonce', 'g-jam', 'g-conversation', 'g-accompagnement'],
			goto: { domain: 'identites' },
			references: C(['docs/conception/06-metiers.md'])
		}),
		step({
			id: 'g-groupe',
			title: 'Groupe',
			actor: 'groupe',
			description: 'Organisation `BAND` ; adhésions, gestion, formation au 2ᵉ membre.',
			next: ['g-projet', 'g-concert'],
			goto: { domain: 'groupes' },
			references: C(['docs/groupes/README.md'], ['D37'])
		}),
		step({
			id: 'g-structure',
			title: 'Structures',
			actor: 'organisation',
			description:
				'Studio, lieu, organisation d’organisateurs, école, agence : gérées à plusieurs.',
			next: ['g-projet', 'g-annonce', 'g-concert'],
			goto: { domain: 'scene' },
			references: C(['docs/structures/README.md'])
		}),
		step({
			id: 'g-lieu',
			title: 'Lieu',
			actor: 'lieu',
			description: 'Fiche de l’annuaire (`Venue`), revendiquée par une structure.',
			next: ['g-jam', 'g-concert'],
			goto: { domain: 'scene' },
			references: C(['docs/scene/README.md'], ['D31'])
		}),
		step({
			id: 'g-projet',
			title: 'Projet',
			actor: 'gestion',
			description: 'Un objectif porté par un acteur ; référence sans posséder ni prouver (D72).',
			next: ['g-besoin', 'g-oeuvre'],
			goto: { diagram: 'parcours-groupe-ep' },
			references: C(['docs/projets/README.md'], ['D72'])
		}),
		step({
			id: 'g-besoin',
			title: 'Besoin',
			actor: 'gestion',
			description: 'Ce qui manque au projet ; ne donne aucun droit, ne contacte personne.',
			next: ['g-annonce'],
			goto: { diagram: 'etats-besoin' },
			references: C(['docs/conception/22-besoins-projet.md'], ['D76'])
		}),
		step({
			id: 'g-annonce',
			title: 'Annonce et candidature',
			actor: 'membre',
			description:
				'Recrutement, session, plateau ; candidature en son nom, d’un groupe ou d’un artiste.',
			next: ['g-collaboration'],
			goto: { domain: 'annonces' },
			references: C(['docs/annonces/README.md'], ['D63'])
		}),
		step({
			id: 'g-jam',
			title: 'Jam',
			actor: 'musicien',
			description: 'Toujours dans un lieu de l’annuaire ; « j’y étais », appréciations.',
			next: ['g-progression'],
			goto: { domain: 'jams' },
			references: C(['docs/jam/README.md'], ['D27'])
		}),
		step({
			id: 'g-conversation',
			title: 'Conversation',
			actor: 'membre',
			description: 'Demande de contact acceptée des deux côtés, puis messages.',
			next: ['g-collaboration'],
			goto: { domain: 'messagerie' },
			references: C(['docs/messagerie/README.md'])
		}),
		step({
			id: 'g-collaboration',
			title: 'Collaboration confirmée',
			actor: 'membre',
			description: 'Seule preuve d’un travail commun : confirmée des deux côtés.',
			next: ['g-oeuvre', 'g-concert', 'g-progression'],
			goto: { domain: 'collaborations' },
			references: C(['docs/collaborations/README.md'])
		}),
		step({
			id: 'g-oeuvre',
			title: 'Morceau et crédits',
			actor: 'musicien',
			description: 'Idée, composition, crédits confirmés, rôles du son, étapes de production.',
			next: ['g-progression'],
			goto: { domain: 'morceaux' },
			references: C(['docs/morceaux/README.md'], ['D35'])
		}),
		step({
			id: 'g-concert',
			title: 'Concert reconnu',
			actor: 'groupe',
			description:
				'Collaboration `GIG` confirmée par un hôte ; seul un concert reconnu compte (D79).',
			next: ['g-progression'],
			goto: { domain: 'scene' },
			references: C(['docs/scene/README.md'], ['D79'])
		}),
		step({
			id: 'g-accompagnement',
			title: 'Accompagnement',
			actor: 'manager',
			description: 'Représentation confirmée par l’artiste ; droit de candidater ; agences.',
			next: ['g-annonce'],
			goto: { domain: 'pros' },
			references: C(['docs/agences/README.md'], ['D65'])
		}),
		step({
			id: 'g-progression',
			title: 'Progression',
			actor: 'systeme',
			description:
				'Événements → registre d’XP en ajout seul → projection. Le client n’envoie jamais de valeur ; l’XP n’entre dans aucun tri.',
			goto: { domain: 'carriere' },
			references: C(['docs/conception/02-progression.md', 'docs/progression/README.md'], ['D73'])
		})
	]
};
