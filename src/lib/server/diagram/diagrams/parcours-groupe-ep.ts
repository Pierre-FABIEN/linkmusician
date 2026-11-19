/**
 * LINKMUSICIAN: parcours de référence (DIAGRAM-01) — Groupe → Projet EP →
 * Besoin → Recherche → Invitation → Participation. Exemple fictif : Inès
 * (guitare) monte « Lumière » avec Malik (batterie), prépare l'EP « Aube »
 * et cherche Sam, ingé son. Chaque nœud cite le vrai service.
 */
import type { DiagramDefinition } from '../types';
import { step } from './define';

export const PARCOURS_GROUPE_EP: DiagramDefinition = {
	id: 'parcours-groupe-ep',
	slug: 'parcours-groupe-ep',
	title: 'Un groupe prépare un EP et invite un ingé son',
	description:
		'Parcours vertical de référence : du groupe formé à l’ingé son qui rejoint le projet, avec les refus, les quotas et les chemins de contournement réels.',
	kind: 'parcours',
	domain: 'projets',
	actors: ['musicien', 'groupe', 'gestion', 'inge-son', 'systeme'],
	entities: [
		'Organization',
		'Membership',
		'Project',
		'ProjectNeed',
		'ProjectParticipant',
		'ProjectAct',
		'Conversation',
		'Notification'
	],
	parents: ['global-carte'],
	children: [
		'couloirs-besoin-coordination',
		'dataflow-besoin-ajouter',
		'etats-besoin',
		'etats-participation'
	],
	related: ['donnees-projets'],
	source: 'docs/diagram/drawio/projets/parcours-groupe-ep.drawio',
	status: 'TESTED',
	references: {
		decisions: ['D37', 'D72', 'D76'],
		issues: [71],
		sourceFiles: [
			'src/lib/server/bands/service.ts',
			'src/lib/server/projects/service.ts',
			'src/lib/server/projects/needs.ts',
			'src/lib/server/projects/participants.ts'
		],
		tests: [
			'e2e/linkmusician/projets-besoins.spec.ts',
			'e2e/linkmusician/projets-equipe-u3.spec.ts',
			'src/lib/server/projects/needs.integration.test.ts'
		],
		docs: ['docs/conception/22-besoins-projet.md', 'docs/projets/README.md']
	},
	steps: [
		step({
			id: 'band-create',
			title: 'Inès monte le groupe « Lumière »',
			actor: 'musicien',
			process: 'groupes-nouveau.default',
			preconditions: ['Personne connectée', 'Moins de groupes actifs que le plafond'],
			inputs: ['Nom du groupe', 'Titre dans le groupe (facultatif)'],
			validations: ['`bandSchema` (Zod)', 'Identifiant suggéré unique'],
			reads: ['Membership', 'Actor'],
			writes: ['Actor', 'Organization', 'Membership'],
			effects: [
				'Organisation `BAND`, adhésion `OWNER` `ACTIVE`',
				'Aucune XP : rien d’unilatéral tant qu’il n’y a pas de 2ᵉ membre (D37)'
			],
			permissions: ['Toute personne connectée'],
			transitions: ['Membership : — → ACTIVE (OWNER)'],
			next: ['band-invite'],
			goto: { domain: 'groupes' }
		}),
		step({
			id: 'band-invite',
			title: 'Inès invite Malik par son @identifiant',
			actor: 'gestion',
			process: 'groupes-handle.invite',
			preconditions: ['Gestion du groupe (OWNER ou ADMIN)', 'Groupe vivant'],
			inputs: ['@identifiant', 'Titre proposé'],
			validations: [
				'Profil visible, non bloqué dans les deux sens',
				'Mineur·e : seulement une personne connue (conversation acceptée ou jouée ensemble)'
			],
			reads: ['Actor', 'Membership', 'Block', 'Conversation'],
			writes: ['Membership', 'Notification'],
			effects: ['Adhésion `INVITED`', 'Notification `BAND_INVITE` à Malik'],
			permissions: ['Gestion du groupe'],
			transitions: ['Membership : — → INVITED'],
			next: ['band-accept']
		}),
		step({
			id: 'band-accept',
			title: 'Malik accepte : le groupe est formé',
			actor: 'musicien',
			process: 'groupes.accept',
			preconditions: ['Invitation `INVITED` à son nom', 'Plafond de groupes actifs non atteint'],
			inputs: ['Identifiant de l’adhésion'],
			validations: ['Relu sous le verrou du groupe'],
			reads: ['Membership', 'Organization'],
			writes: [
				'Membership',
				'MembershipDecision',
				'Organization',
				'DomainEvent',
				'Milestone',
				'Notification'
			],
			effects: [
				'2ᵉ adhésion active : `formedAt` posé',
				'Événement `membership.accepted` pour chaque membre (XP calculée par le serveur)',
				'Étape « Formation » vérifiée',
				'Notification `BAND_JOINED` à la gestion'
			],
			permissions: ['La personne invitée elle-même'],
			transitions: ['Membership : INVITED → ACTIVE'],
			next: ['project-create'],
			references: { decisions: ['D37'] }
		}),
		step({
			id: 'project-create',
			title: 'Inès crée l’EP « Aube » au nom du groupe',
			actor: 'gestion',
			process: 'projets-nouveau.default',
			preconditions: [
				'Gestion du porteur choisi (le groupe)',
				'Porteur autorisé : personne, BAND, PROMOTER, STUDIO, VENUE'
			],
			inputs: ['Nom', 'Type (EP)', 'Porteur', 'Phrase, dates (facultatives)'],
			validations: [
				'`newProjectSchema` (Zod)',
				'`managesOwner` relu sous verrou',
				'Quota `projectQuota`'
			],
			reads: ['Actor', 'Organization', 'Membership', 'Project'],
			writes: ['Project', 'ProjectAct'],
			effects: [
				'Projet `ACTIVE`, acte `CREATED`',
				'Aucune XP, aucun événement, aucun crédit (I1, I3)'
			],
			permissions: ['Gestion du porteur'],
			transitions: ['Project : — → ACTIVE'],
			next: ['need-add'],
			alternatives: ['alt-quota'],
			goto: { domain: 'projets' }
		}),
		step({
			id: 'need-add',
			title: 'Elle ajoute le besoin « Ingé son · Prise de son »',
			actor: 'gestion',
			process: 'projets-id.besoin-ajouter',
			description: '« Enregistrer cinq titres en janvier » : une phrase, 280 caractères au plus.',
			preconditions: [
				'Projet en cours, porteur vivant',
				'Gestion (naît `OPEN`) ou coordination (naît `PROPOSED`)'
			],
			inputs: ['Métier', 'Spécialité', 'Phrase'],
			validations: [
				'`projectNeedDraftSchema` (Zod)',
				'Droits relus sous `project:`',
				'Quotas `needQuota`'
			],
			reads: ['Project', 'ProjectParticipant', 'Membership', 'ProjectNeed'],
			writes: ['ProjectNeed', 'ProjectAct'],
			effects: [
				'Besoin `OPEN`, acte `NEED_OPENED`',
				'Aucune invitation, annonce, participation ni XP (N2, N4)'
			],
			permissions: ['Gestion', 'Coordination (proposition)'],
			transitions: ['ProjectNeed : — → OPEN'],
			next: ['need-search'],
			alternatives: ['alt-quota'],
			goto: { diagram: 'dataflow-besoin-ajouter' }
		}),
		step({
			id: 'need-search',
			title: '« Trouver un pro » ouvre la recherche préremplie',
			actor: 'gestion',
			process: 'decouvrir.load',
			preconditions: ['Lire le projet (gestion, coordination ou participation)'],
			inputs: ['`/decouvrir?metier=sound-engineer&specialite=…`'],
			validations: ['`parseFilters`', 'Débit limité par personne'],
			reads: ['Actor', 'PersonTrack', 'PersonTrackIntent', 'ActorLocation'],
			writes: [],
			effects: [
				'Résultats triés : réseau, tranche de distance, pertinence — jamais l’XP',
				'Seules les personnes ayant coché une offre du métier (D62)',
				'Rien n’est envoyé (P12)'
			],
			permissions: ['Toute personne connectée'],
			next: ['contact-first'],
			alternatives: ['alt-no-opportunity', 'invite-handle'],
			goto: { domain: 'rencontre' }
		}),
		step({
			id: 'contact-first',
			title: 'Inès écrit d’abord à Sam',
			actor: 'gestion',
			process: 'messages-nouveau.default',
			description: 'Une personne trouvée par la recherche n’est pas « connue » : l’écran le dit.',
			preconditions: ['Profil de Sam visible, pas de blocage'],
			inputs: ['@identifiant', 'Premier message'],
			validations: [
				'Conversation existante rouverte',
				'Mineur·e : aucune demande d’un·e inconnu·e'
			],
			reads: ['Actor', 'Block', 'Conversation'],
			writes: ['Conversation', 'ConversationParticipant', 'Message', 'Notification'],
			effects: ['Demande de contact en attente pour Sam'],
			permissions: ['Toute personne connectée'],
			transitions: ['ConversationParticipant (Sam) : — → REQUEST'],
			next: ['contact-accept'],
			goto: { domain: 'messagerie' }
		}),
		step({
			id: 'contact-accept',
			title: 'Sam répond : le contact est accepté',
			actor: 'inge-son',
			process: 'messages-id.send',
			preconditions: ['Demande reçue'],
			inputs: ['Message'],
			validations: ['`sendPermission`', 'Blocage relu'],
			reads: ['ConversationParticipant', 'Block'],
			writes: ['Message', 'ConversationParticipant'],
			effects: ['Sam devient un contact d’Inès : il figure parmi les personnes à inviter'],
			permissions: ['Destinataire de la demande'],
			transitions: ['ConversationParticipant (Sam) : REQUEST → ACCEPTED'],
			next: ['invite']
		}),
		step({
			id: 'invite-handle',
			title: 'Ou : inviter Sam directement par son @identifiant',
			actor: 'gestion',
			process: 'projets-id.inviter',
			description: 'Possible pour une personne majeure (Q81), sans contact préalable.',
			preconditions: ['Sam est majeur·e'],
			inputs: ['@identifiant', 'Rôle libre prérempli « Ingé son · Prise de son »'],
			validations: ['Mêmes règles que l’invitation (`inviteParticipant`)'],
			reads: ['Actor'],
			writes: [],
			effects: ['Rejoint le geste « Inviter »'],
			permissions: ['Gestion', 'Coordination'],
			next: ['invite']
		}),
		step({
			id: 'invite',
			title: 'Inès invite Sam au projet',
			actor: 'gestion',
			process: 'projets-id.inviter',
			preconditions: ['Gestion ou coordination', 'Projet en cours, porteur vivant'],
			inputs: ['Personne connue ou @identifiant', 'Rôle', 'Coordination proposée (gestion seule)'],
			validations: [
				'`inviteSchema` (Zod)',
				'`inviteRefusal` : mineur·e, capacités',
				'Pas déjà invité·e ou présent·e ; refus de moins de 30 jours',
				'Quotas : 20 invitations en attente, 50 participant·es'
			],
			reads: ['Actor', 'Block', 'ProjectParticipant', 'Membership'],
			writes: ['ProjectParticipant', 'ProjectAct', 'Notification'],
			effects: [
				'Participation `INVITED`, acte `INVITED`',
				'Notification `PROJECT_INVITE` (nom du projet et qui invite seulement)',
				'Le besoin n’est pas relié à l’invitation (Q98)'
			],
			permissions: ['Gestion', 'Coordination (participation simple seulement)'],
			transitions: ['ProjectParticipant : — → INVITED'],
			next: ['invite-answer'],
			alternatives: ['alt-invite-refused']
		}),
		step({
			id: 'invite-answer',
			title: 'Sam accepte depuis « À traiter »',
			actor: 'inge-son',
			process: 'projets.repondre',
			preconditions: ['Invitation `INVITED` à son nom', 'Projet en cours'],
			inputs: ['Identifiant de la participation', 'Oui / non'],
			validations: ['Relu sous `project:`', 'Mineur·e : seulement un projet de son groupe'],
			reads: ['ProjectParticipant', 'Membership'],
			writes: ['ProjectParticipant', 'ProjectAct', 'Notification'],
			effects: [
				'Participation `ACTIVE`, acte `JOINED`',
				'Accepter vaut consentement aux capacités proposées',
				'Notification `PROJECT_JOINED` à Inès',
				'Le besoin n’est pas pourvu automatiquement'
			],
			permissions: ['La personne invitée elle-même'],
			transitions: ['ProjectParticipant : INVITED → ACTIVE'],
			next: ['need-fill'],
			alternatives: ['invite-declined'],
			goto: { diagram: 'etats-participation' }
		}),
		step({
			id: 'need-fill',
			title: 'Inès marque le besoin pourvu, en désignant Sam',
			actor: 'gestion',
			process: 'projets-id.besoin-pourvu',
			preconditions: ['Besoin `OPEN`', 'Gestion ou coordination'],
			inputs: ['Besoin', 'Participation active (facultative)'],
			validations: ['`needTransition(fill)`', '`canNeed`', 'Participation active de ce projet'],
			reads: ['ProjectNeed', 'ProjectParticipant'],
			writes: ['ProjectNeed', 'ProjectAct'],
			effects: [
				'Besoin `FILLED`, acte `NEED_FILLED`',
				'Aucune tâche, aucun crédit, aucune XP : un repère pour l’équipe (N4)'
			],
			permissions: ['Gestion', 'Coordination'],
			transitions: ['ProjectNeed : OPEN → FILLED'],
			next: ['team-ready'],
			goto: { diagram: 'etats-besoin' }
		}),
		step({
			id: 'team-ready',
			title: 'L’équipe de l’EP est constituée',
			actor: 'systeme',
			description:
				'Suite possible : une collaboration confirmée des deux côtés, seule preuve du travail commun et source de crédits.',
			effects: ['Rien n’est prouvé tant qu’aucune collaboration n’est confirmée'],
			status: 'TESTED',
			references: { tests: ['e2e/linkmusician/projets-equipe-u3.spec.ts'] },
			goto: { domain: 'collaborations' }
		}),
		step({
			id: 'alt-quota',
			title: 'Refus : quota atteint (409)',
			actor: 'systeme',
			description: 'Le message dit quoi faire ; rien n’est écrit.',
			effects: [
				'Projets : 20 en cours, 200 au total ; besoins : 20 vivants, 5 propositions, 30 par jour'
			],
			status: 'TESTED',
			references: { tests: ['src/lib/projects/needs.test.ts', 'src/lib/projects/rules.test.ts'] }
		}),
		step({
			id: 'alt-no-opportunity',
			title: 'Pas d’annonce depuis ce besoin : le projet est porté par le groupe',
			actor: 'systeme',
			description:
				'Une annonce ne se prépare depuis un besoin que dans un projet porté en son nom (Q100) ; au nom d’un groupe, on ne publie qu’un recrutement.',
			effects: ['Le bouton « Préparer l’annonce » n’existe pas ; une phrase dit pourquoi'],
			status: 'TESTED',
			references: {
				sourceFiles: ['src/lib/server/projects/needs.ts', 'src/lib/projects/needs.ts'],
				tests: ['src/lib/projects/needs.test.ts']
			}
		}),
		step({
			id: 'alt-invite-refused',
			title: 'Refus silencieux de l’invitation',
			actor: 'systeme',
			description:
				'Blocage, mineur·e hors de son groupe, refus de moins de 30 jours : « ne peut pas recevoir d’invitation pour l’instant », sans raison.',
			effects: ['Rien n’est écrit, la raison n’est jamais dite'],
			status: 'TESTED',
			references: { tests: ['src/lib/server/projects/participants.integration.test.ts'] }
		}),
		step({
			id: 'invite-declined',
			title: 'Sam refuse l’invitation',
			actor: 'inge-son',
			process: 'projets.repondre',
			writes: ['ProjectParticipant', 'ProjectAct'],
			effects: [
				'Participation `DECLINED`, acte `DECLINED`',
				'Nouvelle invitation possible après 30 jours'
			],
			permissions: ['La personne invitée elle-même'],
			transitions: ['ProjectParticipant : INVITED → DECLINED']
		})
	]
};
