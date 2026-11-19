/**
 * LINKMUSICIAN: responsabilités autour d'un besoin proposé (DIAGRAM-01) —
 * scénario S5 de la conception 22 : la coordination propose, la gestion
 * tranche, la coordination invite, l'ingé son consent.
 */
import type { DiagramDefinition } from '../types';
import { step } from './define';

const LANE_TESTS = ['src/lib/server/projects/needs.integration.test.ts'];

export const COULOIRS_BESOIN: DiagramDefinition = {
	id: 'couloirs-besoin-coordination',
	slug: 'couloirs-besoin-coordination',
	title: 'Qui fait quoi : besoin proposé par la coordination',
	description:
		'Couloirs Coordination, Gestion, Ingé son et Système : la proposition ne devient jamais d’elle-même une invitation (N2), la coordination ne devient jamais gestion (N1).',
	kind: 'couloirs',
	domain: 'besoins',
	actors: ['coordination', 'gestion', 'inge-son', 'systeme'],
	entities: ['ProjectNeed', 'ProjectAct', 'ProjectParticipant', 'Notification'],
	parents: ['parcours-groupe-ep'],
	children: [],
	related: ['etats-besoin', 'dataflow-besoin-ajouter'],
	source: 'docs/diagram/drawio/projets/couloirs-besoin-coordination.drawio',
	status: 'TESTED',
	references: {
		decisions: ['D76'],
		issues: [71, 36],
		sourceFiles: ['src/lib/server/projects/needs.ts', 'src/lib/server/space/inbox.ts'],
		tests: [
			'src/lib/server/projects/needs.integration.test.ts',
			'e2e/linkmusician/projets-besoins.spec.ts'
		],
		docs: ['docs/conception/22-besoins-projet.md']
	},
	steps: [
		step({
			id: 'lane-coordination',
			title: 'Coordination',
			actor: 'coordination',
			description: 'Participation active avec `COORDINATE`, acceptée par la personne.',
			status: 'TESTED',
			references: { tests: LANE_TESTS }
		}),
		step({
			id: 'lane-gestion',
			title: 'Gestion',
			actor: 'gestion',
			description: 'La gestion du porteur, relue à chaque geste.',
			status: 'TESTED',
			references: { tests: LANE_TESTS }
		}),
		step({
			id: 'lane-inge',
			title: 'Ingé son',
			actor: 'inge-son',
			description: 'La personne invitée, qui seule consent.',
			status: 'TESTED',
			references: { tests: LANE_TESTS }
		}),
		step({
			id: 'lane-systeme',
			title: 'Système',
			actor: 'systeme',
			description: 'Ce que le serveur fait de lui-même, dans la même transaction.',
			status: 'TESTED',
			references: { tests: LANE_TESTS }
		}),
		step({
			id: 'c-propose',
			title: 'Proposer le besoin « Producteur·rice · Arrangement »',
			actor: 'coordination',
			process: 'projets-id.besoin-ajouter',
			preconditions: ['Participation active', 'Capacité `COORDINATE`', 'Projet en cours'],
			inputs: ['Métier', 'Spécialité', 'Phrase'],
			validations: [
				'Zod',
				'`statusOnAdd(coordination)` = `PROPOSED`',
				'Quota : 5 propositions en attente'
			],
			reads: ['ProjectParticipant', 'ProjectNeed'],
			writes: ['ProjectNeed', 'ProjectAct'],
			effects: [
				'Besoin `PROPOSED`, acte `NEED_PROPOSED`',
				'Aucune invitation automatique, aucun crédit ni XP'
			],
			permissions: ['Coordination'],
			transitions: ['ProjectNeed : — → PROPOSED'],
			next: ['s-inbox']
		}),
		step({
			id: 's-inbox',
			title: 'Ligne dans « À traiter » de la gestion',
			actor: 'systeme',
			process: 'espace-a-confirmer.load',
			description: 'Calculée à la lecture (`inboxFor`), pas stockée ; aucune notification (Q91).',
			reads: ['ProjectNeed', 'Project', 'Membership'],
			effects: ['Compteur `answers` incrémenté', 'Règle `project.need` au rang 2'],
			permissions: ['Gestion du porteur'],
			next: ['g-decide']
		}),
		step({
			id: 'g-decide',
			title: 'Ouvrir ce besoin (après retouche éventuelle)',
			actor: 'gestion',
			process: 'projets-id.besoin-decider',
			preconditions: ['Gestion', 'Besoin `PROPOSED`'],
			inputs: ['Intention `open`'],
			validations: ['`needTransition(open)`', '`canNeed` : gestion seule (N1)'],
			reads: ['ProjectNeed'],
			writes: ['ProjectNeed', 'ProjectAct'],
			effects: [
				'`decidedById`, `decidedAt` posés ; acte `NEED_OPENED`',
				'Ne crée qu’un besoin ouvert (N2)'
			],
			permissions: ['Gestion'],
			transitions: ['ProjectNeed : PROPOSED → OPEN'],
			next: ['c-invite'],
			alternatives: ['g-decline', 'g-revoke']
		}),
		step({
			id: 'g-decline',
			title: 'Ne pas retenir',
			actor: 'gestion',
			process: 'projets-id.besoin-decider',
			inputs: ['Intention `decline`'],
			writes: ['ProjectNeed', 'ProjectAct'],
			effects: [
				'« Non retenu » visible par l’auteur·rice, sans motif obligatoire (Q92)',
				'État terminal'
			],
			permissions: ['Gestion'],
			transitions: ['ProjectNeed : PROPOSED → DECLINED']
		}),
		step({
			id: 'g-revoke',
			title: 'Retirer la coordination',
			actor: 'gestion',
			process: 'projets-id.revoquer',
			preconditions: ['Gestion'],
			writes: ['ProjectParticipant', 'ProjectAct'],
			effects: ['Même sur un projet clos ; effet à l’écriture suivante (I12)'],
			permissions: ['Gestion'],
			next: ['s-cancel']
		}),
		step({
			id: 's-cancel',
			title: 'Propositions en attente annulées',
			actor: 'systeme',
			description: '`cancelPendingNeeds`, dans la transaction qui retire le droit.',
			reads: ['ProjectNeed'],
			writes: ['ProjectNeed', 'ProjectAct'],
			effects: ['Les besoins `OPEN` qu’elle a proposés restent au projet'],
			permissions: ['Système, dans la transaction de la gestion qui retire le droit'],
			transitions: ['ProjectNeed : PROPOSED → CANCELLED'],
			status: 'TESTED',
			references: {
				sourceFiles: ['src/lib/server/projects/needs.ts'],
				tests: ['src/lib/server/projects/needs.integration.test.ts']
			}
		}),
		step({
			id: 'c-invite',
			title: 'Inviter une productrice connue',
			actor: 'coordination',
			process: 'projets-id.inviter',
			preconditions: [
				'Coordination',
				'Personne connue (contact, membre du groupe) ou @identifiant'
			],
			validations: ['La coordination n’invite qu’en participation simple'],
			writes: ['ProjectParticipant', 'ProjectAct', 'Notification'],
			effects: ['Notification `PROJECT_INVITE`'],
			permissions: ['Coordination', 'Gestion'],
			transitions: ['ProjectParticipant : — → INVITED'],
			next: ['i-accept']
		}),
		step({
			id: 'i-accept',
			title: 'Accepter l’invitation',
			actor: 'inge-son',
			process: 'projets.repondre',
			writes: ['ProjectParticipant', 'ProjectAct', 'Notification'],
			effects: ['Participation `ACTIVE`'],
			permissions: ['La personne invitée'],
			transitions: ['ProjectParticipant : INVITED → ACTIVE'],
			next: ['s-notify']
		}),
		step({
			id: 's-notify',
			title: 'Notification `PROJECT_JOINED` à qui a invité',
			actor: 'systeme',
			description: 'Écrite par `notify` dans la transaction d’acceptation.',
			writes: ['Notification'],
			status: 'TESTED',
			references: {
				sourceFiles: ['src/lib/server/projects/participants.ts'],
				tests: ['src/lib/server/projects/participants.integration.test.ts']
			},
			next: ['c-fill']
		}),
		step({
			id: 'c-fill',
			title: 'Marquer le besoin pourvu',
			actor: 'coordination',
			process: 'projets-id.besoin-pourvu',
			writes: ['ProjectNeed', 'ProjectAct'],
			effects: ['Aucune tâche, crédit ni XP'],
			permissions: ['Coordination', 'Gestion'],
			transitions: ['ProjectNeed : OPEN → FILLED']
		})
	]
};
