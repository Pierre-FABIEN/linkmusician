/**
 * LINKMUSICIAN: modèle de données du domaine Projets (DIAGRAM-01), relevé
 * dans `prisma/schema.prisma`. Dans un diagramme de données, `next` liste
 * les clés étrangères **physiques** sortantes et `alternatives` les
 * relations **calculées ou sans clé** (trait pointillé).
 */
import type { DiagramDefinition } from '../types';
import { refs, step } from './define';

const SCHEMA = refs({
	sourceFiles: ['prisma/schema.prisma'],
	tests: [
		'src/lib/server/projects/service.integration.test.ts',
		'src/lib/server/projects/needs.integration.test.ts'
	],
	docs: ['docs/projets/README.md', 'docs/conception/22-besoins-projet.md']
});

export const DONNEES_PROJETS: DiagramDefinition = {
	id: 'donnees-projets',
	slug: 'donnees-projets',
	title: 'Modèle de données : projets, équipe et besoins',
	description:
		'Entités, clés, cardinalités, unicités et cascades du domaine Projets. Les relations en pointillé sont calculées par les services, pas matérialisées en base.',
	kind: 'donnees',
	domain: 'projets',
	actors: ['gestion', 'coordination', 'participant'],
	entities: [
		'Actor',
		'Project',
		'ProjectItem',
		'ProjectAct',
		'ProjectParticipant',
		'ProjectNeed',
		'Opportunity',
		'Work',
		'Instrument',
		'Membership'
	],
	parents: ['global-carte'],
	children: [],
	related: ['parcours-groupe-ep', 'etats-besoin', 'etats-participation'],
	source: 'docs/diagram/drawio/donnees/donnees-projets.drawio',
	status: 'TESTED',
	references: {
		decisions: ['D72', 'D76'],
		issues: [71],
		sourceFiles: ['prisma/schema.prisma'],
		tests: [
			'src/lib/server/projects/service.integration.test.ts',
			'src/lib/server/projects/needs.integration.test.ts'
		],
		docs: ['docs/projets/README.md']
	},
	steps: [
		step({
			id: 'ent-actor',
			title: 'Actor',
			actor: 'systeme',
			description:
				'Personne ou organisation (BAND, STUDIO, VENUE, PROMOTER…). Porteur, auteur, sujet.',
			status: 'TESTED',
			references: SCHEMA
		}),
		step({
			id: 'ent-membership',
			title: 'Membership',
			actor: 'systeme',
			description:
				'Adhésion d’une personne à une organisation : rôle OWNER/ADMIN/MEMBER, statut. Index partiel `memberships_open_key` (une adhésion ouverte par paire).',
			next: ['ent-actor'],
			status: 'TESTED',
			references: SCHEMA
		}),
		step({
			id: 'ent-project',
			title: 'Project',
			actor: 'systeme',
			description:
				'ownerId → Actor (Cascade) · name, kind, description, startsOn, dueOn · status ACTIVE | DONE | ABANDONED · index (ownerId, status).',
			next: ['ent-actor'],
			alternatives: ['ent-membership'],
			status: 'TESTED',
			references: SCHEMA
		}),
		step({
			id: 'ent-item',
			title: 'ProjectItem',
			actor: 'systeme',
			description:
				'projectId (Cascade), workId (Cascade), share NONE | SUMMARY | WORK, addedById (SetNull) · unique (projectId, workId).',
			next: ['ent-project', 'ent-work'],
			status: 'TESTED',
			references: SCHEMA
		}),
		step({
			id: 'ent-work',
			title: 'Work',
			actor: 'systeme',
			description: 'Le morceau : jamais possédé par le projet, seulement référencé.',
			status: 'TESTED',
			references: SCHEMA
		}),
		step({
			id: 'ent-participant',
			title: 'ProjectParticipant',
			actor: 'systeme',
			description:
				'projectId (Cascade), personId (Cascade), status INVITED | ACTIVE | DECLINED | LEFT | REMOVED, role, capabilities[], proposedCapabilities[], invitedById (SetNull) · index partiel `project_participants_open_key`.',
			next: ['ent-project', 'ent-actor'],
			status: 'TESTED',
			references: SCHEMA
		}),
		step({
			id: 'ent-need',
			title: 'ProjectNeed',
			actor: 'systeme',
			description:
				'projectId (Cascade), status PROPOSED | OPEN | FILLED | DECLINED | CANCELLED, track, specialty, instrumentId (SetNull), description ≤ 280, createdBy / decidedBy / filledBy → Actor (SetNull), opportunityId unique (SetNull).',
			next: ['ent-project', 'ent-actor', 'ent-opportunity', 'ent-instrument'],
			alternatives: ['ent-participant'],
			status: 'TESTED',
			references: SCHEMA
		}),
		step({
			id: 'ent-opportunity',
			title: 'Opportunity',
			actor: 'systeme',
			description:
				'L’annonce garde sa vie propre (expiration, candidatures) ; elle ne nomme pas le projet (Q97).',
			status: 'TESTED',
			references: SCHEMA
		}),
		step({
			id: 'ent-instrument',
			title: 'Instrument',
			actor: 'systeme',
			description: 'Référentiel ; précise un besoin de musicien·ne.',
			status: 'TESTED',
			references: SCHEMA
		}),
		step({
			id: 'ent-act',
			title: 'ProjectAct',
			actor: 'systeme',
			description:
				'Journal en ajout seul (trigger `project_acts_append_only`) : projectId (Cascade), authorId / subjectId (SetNull), kind, workId et needId **sans clé étrangère**.',
			next: ['ent-project', 'ent-actor'],
			alternatives: ['ent-need', 'ent-work'],
			status: 'TESTED',
			references: SCHEMA
		})
	]
};
