/**
 * LINKMUSICIAN: machines à états du domaine Projets (DIAGRAM-01). Relevées
 * dans `#lib/projects/needs` (`needTransition`, `canNeed`) et
 * `server/projects/participants.ts`. Chaque transition dit qui la déclenche.
 */
import type { DiagramDefinition } from '../types';
import { refs, step } from './define';

const NEED_REFS = refs({
	sourceFiles: ['src/lib/projects/needs.ts', 'src/lib/server/projects/needs.ts'],
	tests: ['src/lib/projects/needs.test.ts', 'src/lib/server/projects/needs.integration.test.ts'],
	decisions: ['D76'],
	docs: ['docs/conception/22-besoins-projet.md']
});

const PARTICIPANT_REFS = refs({
	sourceFiles: ['src/lib/projects/participants.ts', 'src/lib/server/projects/participants.ts'],
	tests: [
		'src/lib/projects/participants.test.ts',
		'src/lib/server/projects/participants.integration.test.ts'
	],
	decisions: ['D72'],
	docs: ['docs/projets/README.md']
});

export const ETATS_BESOIN: DiagramDefinition = {
	id: 'etats-besoin',
	slug: 'etats-besoin',
	title: 'Cycle de vie d’un besoin',
	description:
		'États de `ProjectNeed` et qui déclenche chaque transition. DECLINED et CANCELLED sont terminaux ; un projet clos gèle tout, sauf le retrait de sa proposition.',
	kind: 'etats',
	domain: 'besoins',
	actors: ['gestion', 'coordination', 'systeme'],
	entities: ['ProjectNeed', 'ProjectAct'],
	parents: ['parcours-groupe-ep'],
	children: [],
	related: ['couloirs-besoin-coordination', 'dataflow-besoin-ajouter', 'donnees-projets'],
	source: 'docs/diagram/drawio/projets/etats-besoin.drawio',
	status: 'TESTED',
	references: { ...NEED_REFS, issues: [71] },
	steps: [
		step({
			id: 'need-start',
			title: 'Ajout',
			actor: 'gestion',
			process: 'projets-id.besoin-ajouter',
			description: 'L’état initial dépend du rôle relu : jamais du client.',
			next: ['need-proposed', 'need-open']
		}),
		step({
			id: 'need-proposed',
			title: 'PROPOSED',
			actor: 'coordination',
			description:
				'Proposé par la coordination, en attente de la gestion. Modifiable par l’auteur·rice ou la gestion.',
			permissions: ['Valider, refuser : gestion', 'Retirer, modifier : auteur·rice ou gestion'],
			transitions: [
				'PROPOSED → OPEN : gestion (valider)',
				'PROPOSED → DECLINED : gestion (ne pas retenir)',
				'PROPOSED → CANCELLED : auteur·rice, ou système à la perte du droit'
			],
			next: ['need-open', 'need-declined', 'need-cancelled'],
			status: 'TESTED',
			references: NEED_REFS
		}),
		step({
			id: 'need-open',
			title: 'OPEN',
			actor: 'gestion',
			description: 'Exploitable : chercher, inviter, préparer une annonce (porteur personne).',
			permissions: ['Modifier, annuler : gestion', 'Marquer pourvu : gestion ou coordination'],
			transitions: ['OPEN → FILLED : gestion ou coordination', 'OPEN → CANCELLED : gestion'],
			next: ['need-filled', 'need-cancelled'],
			status: 'TESTED',
			references: NEED_REFS
		}),
		step({
			id: 'need-filled',
			title: 'FILLED',
			actor: 'gestion',
			description: 'Pourvu, éventuellement par une participation active désignée. Aucune XP.',
			permissions: ['Rouvrir : gestion ou coordination'],
			transitions: ['FILLED → OPEN : gestion ou coordination (`filledById` effacé)'],
			next: ['need-open'],
			status: 'TESTED',
			references: NEED_REFS
		}),
		step({
			id: 'need-declined',
			title: 'DECLINED',
			actor: 'gestion',
			description:
				'Terminal. Lisible par l’auteur·rice et la gestion, pour éviter de reproposer à l’identique.',
			status: 'TESTED',
			references: NEED_REFS
		}),
		step({
			id: 'need-cancelled',
			title: 'CANCELLED',
			actor: 'systeme',
			description: 'Terminal. Une annonce liée reste ouverte : la gestion la clôt elle-même.',
			status: 'TESTED',
			references: NEED_REFS
		})
	]
};

export const ETATS_PARTICIPATION: DiagramDefinition = {
	id: 'etats-participation',
	slug: 'etats-participation',
	title: 'Cycle de vie d’une participation à un projet',
	description:
		'États de `ProjectParticipant` : la gestion propose, la personne consent. Quitter, retirer et révoquer restent possibles sur un projet clos.',
	kind: 'etats',
	domain: 'projets',
	actors: ['gestion', 'coordination', 'invite', 'participant'],
	entities: ['ProjectParticipant', 'ProjectAct', 'Notification'],
	parents: ['parcours-groupe-ep'],
	children: [],
	related: ['etats-besoin', 'donnees-projets'],
	source: 'docs/diagram/drawio/projets/etats-participation.drawio',
	status: 'TESTED',
	references: { ...PARTICIPANT_REFS, issues: [71] },
	steps: [
		step({
			id: 'part-start',
			title: 'Invitation',
			actor: 'gestion',
			process: 'projets-id.inviter',
			next: ['part-invited']
		}),
		step({
			id: 'part-invited',
			title: 'INVITED',
			actor: 'invite',
			description: 'Aperçu limité : nom, type, porteur, qui invite, rôle (§9.3).',
			permissions: ['Accepter, refuser : la personne invitée', 'Retirer : gestion'],
			transitions: [
				'INVITED → ACTIVE : la personne (accepter)',
				'INVITED → DECLINED : la personne (refuser)',
				'INVITED → REMOVED : gestion (retirer l’invitation)'
			],
			next: ['part-active', 'part-declined', 'part-removed'],
			status: 'TESTED',
			references: PARTICIPANT_REFS
		}),
		step({
			id: 'part-active',
			title: 'ACTIVE',
			actor: 'participant',
			description: 'Lit le projet ; agit seulement avec une capacité acceptée (`COORDINATE`).',
			permissions: ['Quitter : la personne', 'Retirer : gestion'],
			transitions: [
				'ACTIVE → LEFT : la personne (quitter)',
				'ACTIVE → REMOVED : gestion (retirer)'
			],
			effects: ['Sortir annule ses propositions de besoin en attente'],
			next: ['part-left', 'part-removed'],
			status: 'TESTED',
			references: PARTICIPANT_REFS
		}),
		step({
			id: 'part-declined',
			title: 'DECLINED',
			actor: 'invite',
			description: 'Terminal pour cette ligne ; réinvitation possible après 30 jours.',
			status: 'TESTED',
			references: PARTICIPANT_REFS
		}),
		step({
			id: 'part-left',
			title: 'LEFT',
			actor: 'participant',
			description: 'Terminal ; capacités retirées, `endedAt` posé.',
			status: 'TESTED',
			references: PARTICIPANT_REFS
		}),
		step({
			id: 'part-removed',
			title: 'REMOVED',
			actor: 'gestion',
			description: 'Terminal ; capacités retirées, `endedAt` posé.',
			status: 'TESTED',
			references: PARTICIPANT_REFS
		})
	]
};
