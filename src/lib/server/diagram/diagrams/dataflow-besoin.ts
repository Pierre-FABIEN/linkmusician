/**
 * LINKMUSICIAN: dataflow technique d'« Ajouter un besoin » (DIAGRAM-01),
 * relevé dans `projets/[id]/+page.server.ts` et `server/projects/needs.ts`.
 * Aucun événement de progression ni notification : le code n'en produit pas.
 */
import type { DiagramDefinition } from '#lib/diagram/types';
import { refs, step } from './define';

const ROUTE = 'src/routes/(app)/projets/[id]/+page.server.ts';
const NEEDS = 'src/lib/server/projects/needs.ts';
const UNIT = ['src/lib/projects/needs.test.ts'];
const INTEGRATION = ['src/lib/server/projects/needs.integration.test.ts'];

export const DATAFLOW_BESOIN: DiagramDefinition = {
	id: 'dataflow-besoin-ajouter',
	slug: 'dataflow-besoin-ajouter',
	title: 'Dataflow : ajouter un besoin',
	description:
		'Du formulaire à PostgreSQL : session, Zod, verrous consultatifs, relecture des droits, quotas, écriture et journal en ajout seul, dans une seule transaction.',
	kind: 'dataflow',
	domain: 'besoins',
	actors: ['gestion', 'coordination', 'systeme'],
	entities: ['ProjectNeed', 'ProjectAct', 'Project', 'ProjectParticipant', 'Membership'],
	parents: ['parcours-groupe-ep'],
	children: [],
	related: ['couloirs-besoin-coordination', 'etats-besoin', 'donnees-projets'],
	source: 'docs/diagram/drawio/projets/dataflow-besoin-ajouter.drawio',
	status: 'TESTED',
	references: {
		decisions: ['D76'],
		issues: [71],
		sourceFiles: [
			ROUTE,
			NEEDS,
			'src/lib/schema/projects/need.ts',
			'src/lib/server/projects/access.ts'
		],
		tests: [...INTEGRATION, ...UNIT],
		docs: ['docs/conception/22-besoins-projet.md']
	},
	steps: [
		step({
			id: 'df-form',
			title: 'Formulaire « Ajouter un besoin » (POST ?/besoin-ajouter)',
			actor: 'gestion',
			process: 'projets-id.besoin-ajouter',
			inputs: ['track', 'specialty | instrument', 'description'],
			effects: ['Le client envoie un contenu et une intention, jamais un état ni un auteur (N5)'],
			next: ['df-action']
		}),
		step({
			id: 'df-action',
			title: 'Action serveur : identité relue depuis la session',
			actor: 'systeme',
			description: '`requirePerson(locals)` : la personne vient de la session Better Auth.',
			validations: ['Session valide, personne existante'],
			reads: ['Person'],
			status: 'TESTED',
			references: refs({
				sourceFiles: [ROUTE, 'src/lib/server/actors/tracksForm.ts'],
				tests: INTEGRATION
			}),
			next: ['df-zod']
		}),
		step({
			id: 'df-zod',
			title: 'Validation Zod `projectNeedDraftSchema`',
			actor: 'systeme',
			validations: [
				'Métier parmi `NEED_TRACKS`',
				'Spécialité permise',
				'Phrase ≤ 280 caractères',
				'Objet strict'
			],
			status: 'TESTED',
			references: refs({ sourceFiles: ['src/lib/schema/projects/need.ts'], tests: UNIT }),
			next: ['df-lock-author'],
			alternatives: ['df-400']
		}),
		step({
			id: 'df-lock-author',
			title: 'Transaction Prisma, verrou `project-need-author:<personne>`',
			actor: 'systeme',
			description:
				'`prisma.$transaction` (15 s) ; `pg_advisory_xact_lock` pris avant `project:` pour sérialiser le quota par personne.',
			status: 'TESTED',
			references: refs({ sourceFiles: [NEEDS], tests: INTEGRATION }),
			next: ['df-lock-project']
		}),
		step({
			id: 'df-lock-project',
			title: '`lockProjectContext` : `project:` puis le verrou du porteur',
			actor: 'systeme',
			reads: ['Project', 'Actor', 'Organization'],
			status: 'TESTED',
			references: refs({ sourceFiles: ['src/lib/server/projects/service.ts'], tests: INTEGRATION }),
			next: ['df-access']
		}),
		step({
			id: 'df-access',
			title: '`projectAccess` : rôle relu sous verrou',
			actor: 'systeme',
			description:
				'Gestion (adhésion OWNER/ADMIN relue), coordination (capacité acceptée), participation, mineur·e.',
			reads: ['Membership', 'ProjectParticipant'],
			permissions: [
				'Gestion → OPEN',
				'Coordination → PROPOSED',
				'Participation simple → 403',
				'Extérieur → 404'
			],
			status: 'TESTED',
			references: refs({ sourceFiles: ['src/lib/server/projects/access.ts'], tests: INTEGRATION }),
			next: ['df-quota'],
			alternatives: ['df-refus']
		}),
		step({
			id: 'df-quota',
			title: '`needQuota` : trois comptages',
			actor: 'systeme',
			reads: ['ProjectNeed'],
			validations: [
				'20 besoins vivants par projet',
				'5 propositions en attente par auteur',
				'30 besoins par jour et par personne'
			],
			status: 'TESTED',
			references: refs({
				sourceFiles: [NEEDS, 'src/lib/projects/needs.ts'],
				tests: [...UNIT, ...INTEGRATION]
			}),
			next: ['df-write'],
			alternatives: ['df-refus']
		}),
		step({
			id: 'df-write',
			title: 'INSERT `project_needs` et `project_acts`',
			actor: 'systeme',
			writes: ['ProjectNeed', 'ProjectAct'],
			effects: [
				'Trigger `project_acts_append_only` : le journal ne se modifie pas',
				'Aucun `DomainEvent`, aucune `XpTransaction`, aucune `Notification`'
			],
			status: 'TESTED',
			references: refs({ sourceFiles: [NEEDS], tests: INTEGRATION }),
			next: ['df-response']
		}),
		step({
			id: 'df-response',
			title: 'COMMIT, puis réponse : message et fiche rechargée',
			actor: 'systeme',
			effects: ['`use:enhance` relit la fiche (`projectView`) : le besoin apparaît'],
			status: 'TESTED',
			references: refs({
				sourceFiles: [ROUTE],
				tests: ['e2e/linkmusician/projets-besoins.spec.ts']
			})
		}),
		step({
			id: 'df-400',
			title: '`fail(400)` : premier message de validation',
			actor: 'systeme',
			effects: ['Rien n’est écrit ; la transaction n’est pas ouverte'],
			status: 'TESTED',
			references: refs({ sourceFiles: [ROUTE], tests: UNIT })
		}),
		step({
			id: 'df-refus',
			title: '`ProjectError` : 404, 403 ou 409, ROLLBACK',
			actor: 'systeme',
			description:
				'404 si la personne ne lit pas le projet (indistinct d’un projet absent), 403 participation simple, 409 projet clos ou quota.',
			effects: ['Transaction annulée, verrous relâchés'],
			status: 'TESTED',
			references: refs({ sourceFiles: [NEEDS], tests: INTEGRATION })
		})
	]
};
