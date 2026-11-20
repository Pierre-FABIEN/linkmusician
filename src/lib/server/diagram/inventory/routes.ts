/**
 * LINKMUSICIAN: inventaire des actions de formulaire (DIAGRAM-01).
 *
 * Une entrée par action réellement exportée par un `+page.server.ts`
 * (`actions`). Le test `inventory.test.ts` relit toutes les routes avec le
 * compilateur TypeScript : une action ajoutée au code sans être inscrite ici
 * (ou dans `out-of-scope.ts`) fait échouer la suite.
 *
 * Services : chemins depuis `src/lib/` (`server/projects/needs.addNeed`).
 * Tests : specs et intégrations qui exercent la route ou son service.
 */
import { e2e, it, type RouteGroup } from './define';

const PROJECT_DOCS = ['docs/projets/README.md', 'docs/conception/22-besoins-projet.md'];

export const ROUTE_GROUPS: RouteGroup[] = [
	// ── Identités et inscription ────────────────────────────────────────────
	{
		route: '/qui-es-tu',
		domain: 'identites',
		actors: ['membre'],
		services: ['server/onboarding', 'prisma/actors/tracks'],
		entities: ['PersonTrack'],
		tests: e2e('metiers', 'onboarding-metiers', 'musicien'),
		decisions: ['D15'],
		actions: { default: 'Choisir ses métiers à l’arrivée' }
	},
	{
		route: '/bienvenue',
		domain: 'identites',
		actors: ['membre'],
		services: ['prisma/actors/person'],
		entities: ['Actor', 'Person'],
		tests: it('onboarding.integration.test.ts'),
		actions: { default: 'Compléter sa personne (nom affiché, identifiant, naissance)' }
	},
	{
		route: '/demarrer/genres',
		domain: 'identites',
		actors: ['musicien'],
		services: ['server/onboarding'],
		entities: ['ActorGenre'],
		tests: e2e('onboarding'),
		actions: { default: 'Onboarding : déclarer ses genres' }
	},
	{
		route: '/demarrer/instruments',
		domain: 'identites',
		actors: ['musicien'],
		services: ['server/onboarding'],
		entities: ['PersonInstrument'],
		tests: e2e('onboarding-metiers'),
		actions: { default: 'Onboarding : déclarer ses instruments et son niveau' }
	},
	{
		route: '/demarrer/intention',
		domain: 'identites',
		actors: ['musicien'],
		services: ['server/onboarding'],
		entities: ['MusicianProfile', 'PersonTrackIntent'],
		tests: e2e('onboarding', 'musicien'),
		decisions: ['D58'],
		actions: { default: 'Onboarding : profil de musicien·ne (expérience, engagement, intentions)' }
	},
	{
		route: '/demarrer/metier/[slug]',
		domain: 'identites',
		actors: ['inge-son', 'producteur', 'manager', 'booker', 'organisateur'],
		services: ['server/actors/trackStep'],
		entities: ['PersonTrackSpecialization', 'PersonTrackIntent', 'PersonTrackAttribute'],
		tests: e2e('onboarding-metiers', 'inscription-transverse'),
		decisions: ['D57', 'D59'],
		actions: { default: 'Onboarding : étape d’un métier (spécialités, offres, besoins, champs)' }
	},
	{
		route: '/demarrer/recapitulatif',
		domain: 'identites',
		actors: ['membre'],
		services: ['server/onboarding-recap'],
		entities: ['Person'],
		tests: e2e('onboarding'),
		decisions: ['D60'],
		actions: { default: 'Terminer l’onboarding (pose `onboardedAt` après relecture)' }
	},
	{
		route: '/demarrer/ville',
		domain: 'identites',
		actors: ['membre'],
		services: ['server/geo/communes', 'server/geo/queries'],
		entities: ['ActorLocation'],
		tests: e2e('onboarding'),
		actions: { default: 'Onboarding : commune (centroïde seulement) et rayon' }
	},
	{
		route: '/(app)/profil',
		domain: 'identites',
		actors: ['membre'],
		services: ['prisma/actors/profile', 'server/progression/profile'],
		entities: ['Person', 'ProfileLink'],
		tests: e2e('profil'),
		decisions: ['D17', 'D18'],
		actions: { default: 'Modifier son profil (bio, statut, recherche, matériel, liens)' }
	},
	{
		route: '/(app)/profil/musical',
		domain: 'identites',
		actors: ['musicien'],
		services: ['prisma/skills/musicalProfile'],
		entities: ['PersonInstrument', 'ActorGenre', 'Influence'],
		tests: e2e('profil-musical'),
		decisions: ['D11', 'D12'],
		actions: { default: 'Modifier son profil musical (instruments, genres, influences)' }
	},
	{
		route: '/(app)/profil/pratique',
		domain: 'identites',
		actors: ['musicien'],
		services: ['server/musician/step'],
		entities: ['MusicianProfile', 'PersonTrackIntent'],
		tests: e2e('profil-metiers', 'musicien'),
		decisions: ['D58'],
		actions: { default: 'Modifier sa pratique de musicien·ne' }
	},
	{
		route: '/(app)/profil/metier/[slug]',
		domain: 'identites',
		actors: ['inge-son', 'producteur', 'manager', 'booker', 'organisateur'],
		services: ['server/actors/trackStep'],
		entities: ['PersonTrackSpecialization', 'PersonTrackIntent', 'PersonTrackAttribute'],
		tests: e2e('profil-metiers', 'profil-avance'),
		decisions: ['D59'],
		actions: { default: 'Modifier la page d’un métier' }
	},
	{
		route: '/(app)/profil/metier/[slug]/reglages',
		domain: 'identites',
		actors: ['membre'],
		services: ['server/actors/visibility'],
		entities: ['PersonTrack'],
		tests: e2e('profil-avance'),
		decisions: ['D61'],
		actions: { default: 'Régler la visibilité des blocs et les sollicitations d’un métier' }
	},
	{
		route: '/(app)/profil/son',
		domain: 'identites',
		actors: ['inge-son'],
		services: ['server/actors/trackSheets'],
		entities: ['SoundEngineerProfile', 'CraftReference'],
		tests: e2e('inge-son', 'profil-avance'),
		actions: { default: 'Modifier son profil d’ingé son' }
	},
	{
		route: '/(app)/profil/production',
		domain: 'identites',
		actors: ['producteur'],
		services: ['server/actors/trackSheets'],
		entities: ['ProducerProfile', 'ProducerGenre'],
		tests: e2e('producteur'),
		actions: { default: 'Modifier son profil de producteur·rice' }
	},
	{
		route: '/(app)/profil/organisateur',
		domain: 'identites',
		actors: ['organisateur'],
		services: ['server/actors/trackSheets'],
		entities: ['PromoterProfile', 'PromoterGenre'],
		tests: e2e('organisateur'),
		actions: { default: 'Modifier son profil d’organisateur·rice' }
	},
	{
		route: '/(app)/profil/accompagnement',
		domain: 'identites',
		actors: ['manager', 'booker'],
		services: ['server/representation/service'],
		entities: ['AgentProfile', 'AgentGenre'],
		tests: e2e('booker'),
		actions: { default: 'Modifier son profil de manager ou booker' }
	},
	{
		route: '/(app)/profil/ville',
		domain: 'identites',
		actors: ['membre'],
		services: ['server/geo/communes', 'server/geo/queries'],
		entities: ['ActorLocation'],
		tests: [...e2e('recherche', 'fil-ariane'), ...it('geo/queries.integration.test.ts')],
		actions: {
			save: {
				title: 'Choisir sa commune (code INSEE relu, centroïde arrondi à la grille)',
				errors: ['Commune inconnue', 'Aucune coordonnée précise stockée']
			},
			clear: 'Retirer sa commune'
		}
	},
	{
		route: '/(app)/profil/medias',
		domain: 'transversal',
		actors: ['membre'],
		services: ['server/media/service', 'server/trust/quotas'],
		entities: ['Media'],
		tests: [...e2e('medias'), ...it('media/service.integration.test.ts')],
		actions: { addLink: 'Ajouter un lien d’écoute (oEmbed)', delete: 'Supprimer un média' }
	},
	{
		route: '/(app)/reglages',
		domain: 'securite',
		actors: ['membre'],
		services: ['server/blocking/service', 'server/notifications/service'],
		entities: ['Block', 'NotificationPreference', 'Person'],
		tests: e2e('blocage', 'notifications', 'profil-public'),
		actions: {
			unblock: 'Débloquer une personne',
			notifications: { title: 'Régler ses notifications', domain: 'transversal' },
			visibility: { title: 'Masquer ou montrer son profil public', domain: 'identites' }
		}
	},
	{
		route: '/(app)/reglages/metiers',
		domain: 'identites',
		actors: ['membre'],
		services: ['prisma/actors/tracks'],
		entities: ['PersonTrack'],
		tests: e2e('metiers'),
		actions: { default: 'Ajouter ou retirer un métier' }
	},
	{
		route: '/(app)/jouer',
		domain: 'identites',
		actors: ['membre'],
		services: ['server/actors/navigation', 'server/career/service'],
		entities: ['Person', 'PersonTrack'],
		tests: e2e('modes'),
		actions: {
			switchTrack: 'Changer de métier affiché',
			choose: 'Choisir le mode (Rencontre ou Collab)',
			toggleMode: 'Basculer de mode'
		}
	},
	{
		route: '/(app)/jouer/[mode]',
		domain: 'identites',
		actors: ['membre'],
		services: ['server/actors/navigation'],
		entities: ['Person'],
		tests: e2e('modes'),
		actions: { start: 'Terminer la présentation d’un mode' }
	},

	// ── Rencontre ──────────────────────────────────────────────────────────
	{
		route: '/(app)/jam/dispos',
		domain: 'rencontre',
		actors: ['musicien'],
		services: ['server/jam/availability'],
		entities: ['Availability'],
		tests: e2e('dispo', 'suspension-ecritures'),
		actions: { dispo: 'Se mettre dispo pour jouer', pasDispo: 'Ne plus être dispo' }
	},
	{
		route: '/(app)/jam/carnet',
		domain: 'rencontre',
		actors: ['musicien'],
		services: ['server/jam/log', 'server/network/service'],
		entities: ['MusicalTie', 'JamAttendance'],
		tests: e2e('jams'),
		actions: { leave: 'Retirer une jam de son carnet' }
	},
	{
		route: '/(app)/messages/contacts',
		domain: 'rencontre',
		actors: ['membre'],
		services: ['server/contacts/service', 'server/discussions/service'],
		entities: ['ContactGroup', 'ContactGroupMember', 'GroupDiscussion'],
		tests: [...e2e('contacts', 'discussions'), ...it('contacts/service.integration.test.ts')],
		decisions: ['D45', 'D46'],
		actions: {
			createGroup: 'Créer un groupe de contacts',
			renameGroup: 'Renommer un groupe de contacts',
			deleteGroup: 'Supprimer un groupe de contacts',
			addToGroup: 'Ajouter un contact à un groupe',
			removeFromGroup: 'Retirer un contact d’un groupe',
			openDiscussion: { title: 'Ouvrir une discussion de groupe', domain: 'messagerie' },
			leaveCarnet: 'Retirer une personne de son carnet'
		}
	},
	{
		route: '/(app)/espace',
		domain: 'carriere',
		actors: ['membre'],
		services: ['server/career/nudges'],
		entities: ['SuggestionChoice'],
		tests: [...e2e('coups-de-pouce'), ...it('career/nudges.integration.test.ts')],
		actions: { later: 'Reporter un coup de pouce', notForMe: 'Écarter un coup de pouce' }
	},

	// ── Jams ───────────────────────────────────────────────────────────────
	{
		route: '/(app)/jams/nouvelle',
		domain: 'jams',
		actors: ['musicien'],
		services: ['server/jam/publicJams'],
		entities: ['Opportunity', 'Venue'],
		tests: e2e('organiser', 'jams'),
		decisions: ['D26', 'D27'],
		actions: { default: 'Publier une jam dans un lieu de l’annuaire (aucune XP)' }
	},
	{
		route: '/(app)/jams/[id]',
		domain: 'jams',
		actors: ['musicien'],
		services: ['server/jam/publicJams'],
		entities: ['JamAttendance', 'JamInvite', 'Opportunity'],
		tests: e2e('jams'),
		decisions: ['D27'],
		actions: {
			come: 'Dire « Je viens »',
			notComing: 'Ne plus venir',
			invite: 'Inviter à la jam (lead)',
			cancelInvite: 'Annuler une invitation à la jam',
			accept: 'Accepter une invitation du lead',
			decline: 'Refuser une invitation du lead',
			lead: 'Prendre ou laisser le rôle de lead',
			backline: 'Déclarer le matériel sur place'
		}
	},
	{
		route: '/(app)/jams/[id]/presents',
		domain: 'jams',
		actors: ['musicien'],
		services: ['server/jam/afterJam', 'server/endorsements/service'],
		entities: ['JamAttendance', 'JamEndorsement', 'MusicalTie', 'DomainEvent'],
		tests: [
			...e2e('jams'),
			...it('jam/crossed.integration.test.ts', 'jam/afterJamMinors.integration.test.ts')
		],
		decisions: ['D27'],
		actions: {
			there: 'Déclarer « J’y étais »',
			notThere: 'Retirer sa présence',
			endorse: {
				title: 'Apprécier une personne croisée (seule source d’XP de la jam)',
				domain: 'carriere'
			},
			keep: 'Garder une personne dans son carnet',
			remove: 'Retirer un faux présent (hôte)'
		}
	},
	{
		route: '/(app)/jam/mes-jams',
		domain: 'jams',
		actors: ['musicien', 'lieu'],
		services: ['server/jam/venueHosts'],
		entities: ['VenueHost'],
		tests: [...e2e('animation-lieu'), ...it('jam/venueHosts.integration.test.ts')],
		actions: {
			answerHost: 'Répondre à une invitation à animer un lieu',
			leaveHost: 'Ne plus animer les scènes ouvertes d’un lieu'
		}
	},

	// ── Groupes ────────────────────────────────────────────────────────────
	{
		route: '/(app)/groupes/nouveau',
		domain: 'groupes',
		actors: ['musicien'],
		services: ['server/bands/service.createBand'],
		entities: ['Actor', 'Organization', 'Membership'],
		tests: [...e2e('groupes', 'recrutement'), ...it('bands/service.integration.test.ts')],
		decisions: ['D37'],
		actions: {
			default: {
				title: 'Monter un groupe (la personne devient OWNER)',
				errors: ['Plafond de groupes actifs atteint']
			}
		}
	},
	{
		route: '/(app)/groupes',
		domain: 'groupes',
		actors: ['musicien', 'invite'],
		services: ['server/bands/service'],
		entities: ['Membership', 'MembershipDecision'],
		tests: [...e2e('groupes'), ...it('bands/service.integration.test.ts')],
		decisions: ['D37'],
		actions: {
			accept: 'Accepter une invitation à un groupe (forme le groupe au 2ᵉ membre)',
			decline: 'Refuser une invitation à un groupe',
			withdraw: 'Retirer sa demande d’adhésion'
		}
	},
	{
		route: '/(app)/groupes/[handle]',
		domain: 'groupes',
		actors: ['gestion', 'musicien', 'groupe'],
		services: ['server/bands/service', 'server/milestones/service'],
		entities: ['Membership', 'MembershipDecision', 'Milestone', 'MilestoneAttestation'],
		tests: [
			...e2e('groupes', 'etapes', 'etapes-depart', 'recrutement'),
			...it('bands/service.integration.test.ts', 'milestones/service.integration.test.ts')
		],
		decisions: ['D37', 'D43'],
		actions: {
			invite: 'Inviter une personne dans le groupe (gestion)',
			request: 'Demander à rejoindre le groupe',
			acceptRequest: 'Accepter une demande d’adhésion',
			declineRequest: 'Refuser une demande d’adhésion',
			withdraw: 'Retirer une invitation envoyée',
			remove: 'Exclure un membre',
			promote: 'Passer un membre en co-gestion (ADMIN)',
			demote: 'Retirer la co-gestion',
			transfer: 'Transmettre la responsabilité du groupe',
			title: 'Changer son titre dans le groupe',
			declare: { title: 'Déclarer une étape du groupe', domain: 'carriere' },
			editMilestone: { title: 'Modifier une étape déclarée', domain: 'carriere' },
			requestVerification: { title: 'Demander la vérification d’une étape', domain: 'carriere' },
			retractMilestone: { title: 'Retirer une étape', domain: 'carriere' },
			askConfirm: { title: 'Demander à un membre de confirmer une étape', domain: 'carriere' },
			addLink: 'Ajouter un lien de sortie',
			verifyRelease: { title: 'Vérifier une sortie par son lien', domain: 'carriere' },
			leave: 'Quitter le groupe (seul·e : dissolution)'
		}
	},
	{
		route: '/(app)/groupes/[handle]/modifier',
		domain: 'groupes',
		actors: ['gestion'],
		services: ['server/bands/service'],
		entities: ['Actor', 'BandProfile', 'ProfileLink', 'ActorLocation'],
		tests: e2e('groupes'),
		decisions: ['D64'],
		actions: {
			save: 'Modifier la fiche du groupe (formation, répertoire, ville)',
			addLink: 'Ajouter un lien d’écoute du groupe',
			deleteLink: 'Retirer un lien d’écoute du groupe'
		}
	},
	{
		route: '/(app)/etapes/[id]',
		domain: 'carriere',
		actors: ['musicien'],
		services: ['server/milestones/service'],
		entities: ['MilestoneAttestation', 'Milestone'],
		tests: [...e2e('etapes'), ...it('milestones/service.integration.test.ts')],
		decisions: ['D43'],
		actions: {
			confirm: 'Confirmer une étape de groupe demandée',
			decline: 'Refuser de confirmer une étape'
		}
	},

	// ── Projets et besoins (parcours de référence) ─────────────────────────
	{
		route: '/(app)/projets/nouveau',
		domain: 'projets',
		actors: ['gestion'],
		services: ['server/projects/service.createProject', 'server/projects/participants.inviteMany'],
		entities: ['Project', 'ProjectAct', 'ProjectParticipant'],
		tests: [...e2e('projets', 'mes-projets'), ...it('projects/service.integration.test.ts')],
		decisions: ['D72'],
		issues: [71],
		docs: PROJECT_DOCS,
		actions: {
			default: {
				title: 'Créer un projet (porteur : soi ou une structure gérée)',
				errors: [
					'403 si le porteur n’est pas géré',
					'409 quota : 20 projets en cours, 200 au total par porteur (Q76)'
				]
			}
		}
	},
	{
		route: '/(app)/projets',
		domain: 'projets',
		actors: ['invite'],
		services: ['server/projects/answer-form', 'server/projects/participants.answerInvitation'],
		entities: ['ProjectParticipant', 'ProjectAct', 'Notification'],
		tests: [
			...e2e('projets-equipe', 'projets-equipe-u3'),
			...it('projects/participants.integration.test.ts')
		],
		decisions: ['D72'],
		issues: [71],
		docs: PROJECT_DOCS,
		actions: {
			repondre: {
				title: 'Répondre à une invitation à un projet',
				errors: ['404 invitation disparue ou déjà traitée', '409 projet clos']
			}
		}
	},
	{
		route: '/(app)/espace/a-confirmer',
		domain: 'projets',
		actors: ['invite'],
		services: ['server/projects/answer-form', 'server/space/inbox'],
		entities: ['ProjectParticipant'],
		tests: [
			...e2e('projets-equipe-u3', 'projets-besoins'),
			...it('space/inbox.integration.test.ts')
		],
		issues: [71],
		actions: { repondre: 'Répondre à une invitation à un projet depuis « À traiter »' }
	},
	{
		route: '/(app)/projets/[id]',
		domain: 'projets',
		actors: ['gestion', 'coordination', 'participant'],
		services: ['server/projects/service', 'server/projects/participants', 'server/projects/needs'],
		entities: ['Project', 'ProjectItem', 'ProjectAct', 'ProjectParticipant', 'ProjectNeed'],
		tests: [
			...e2e('projets', 'projets-equipe', 'projets-equipe-u3', 'projets-besoins'),
			...it(
				'projects/service.integration.test.ts',
				'projects/participants.integration.test.ts',
				'projects/needs.integration.test.ts'
			)
		],
		decisions: ['D72', 'D76'],
		issues: [71, 36],
		docs: PROJECT_DOCS,
		actions: {
			ranger: {
				title: 'Ranger un morceau dans le projet',
				services: ['server/projects/service.addProjectItem'],
				entities: ['ProjectItem', 'ProjectAct', 'Work'],
				errors: ['404 morceau non géré', '409 projet clos', '409 quota de 200 éléments']
			},
			partage: {
				title: 'Choisir le partage d’un morceau rangé (gestion du morceau)',
				services: ['server/projects/service.updateProjectItemShare'],
				entities: ['ProjectItem', 'ProjectAct'],
				errors: ['403 gestion du projet sans gestion du morceau', '409 élargir sur projet clos']
			},
			retirer: {
				title: 'Retirer un élément du projet',
				services: ['server/projects/service.removeProjectItem'],
				entities: ['ProjectItem', 'ProjectAct']
			},
			modifier: {
				title: 'Modifier le projet (nom et type : gestion ; dates et phrase : coordination)',
				services: ['server/projects/service.updateProject'],
				entities: ['Project', 'ProjectAct'],
				errors: ['403 la coordination change le nom ou le type', '409 projet clos']
			},
			etat: {
				title: 'Changer l’état du projet (atteint, laissé de côté, rouvert)',
				services: ['server/projects/service.setProjectStatus'],
				entities: ['Project', 'ProjectAct']
			},
			'besoin-ajouter': {
				title: 'Ajouter un besoin (ouvert par la gestion, proposé par la coordination)',
				domain: 'besoins',
				services: ['server/projects/needs.addNeed'],
				entities: ['ProjectNeed', 'ProjectAct'],
				errors: [
					'404 projet illisible',
					'403 participation simple',
					'409 projet clos ou porteur dissous',
					'409 quotas : 20 vivants par projet, 5 propositions par auteur, 30 par jour'
				]
			},
			'besoin-modifier': {
				title: 'Modifier un besoin (sa proposition, ou tout besoin pour la gestion)',
				domain: 'besoins',
				services: ['server/projects/needs.updateNeed'],
				entities: ['ProjectNeed', 'ProjectAct'],
				errors: ['403 hors droits', '409 besoin déjà traité']
			},
			'besoin-decider': {
				title: 'Ouvrir ou refuser une proposition de besoin (gestion seule)',
				domain: 'besoins',
				services: ['server/projects/needs.decideNeed'],
				entities: ['ProjectNeed', 'ProjectAct'],
				errors: ['403 coordination (N1)', '409 déjà traité']
			},
			'besoin-retirer': {
				title: 'Retirer sa proposition de besoin (auteur·rice)',
				domain: 'besoins',
				services: ['server/projects/needs.withdrawNeed'],
				entities: ['ProjectNeed', 'ProjectAct']
			},
			'besoin-pourvu': {
				title: 'Marquer un besoin pourvu (participation active facultative)',
				domain: 'besoins',
				services: ['server/projects/needs.fillNeed'],
				entities: ['ProjectNeed', 'ProjectAct', 'ProjectParticipant'],
				errors: ['404 la personne désignée ne participe pas', '409 besoin non ouvert']
			},
			'besoin-rouvrir': {
				title: 'Rouvrir un besoin pourvu',
				domain: 'besoins',
				services: ['server/projects/needs.reopenNeed'],
				entities: ['ProjectNeed', 'ProjectAct']
			},
			'besoin-annuler': {
				title: 'Annuler un besoin ouvert (gestion)',
				domain: 'besoins',
				services: ['server/projects/needs.cancelNeed'],
				entities: ['ProjectNeed', 'ProjectAct']
			},
			inviter: {
				title: 'Inviter une personne connue ou par @identifiant',
				services: ['server/projects/participants.inviteParticipant'],
				entities: ['ProjectParticipant', 'ProjectAct', 'Notification'],
				errors: [
					'404 identifiant inconnu ou invisible',
					'400 blocage, mineur·e hors groupe, refus récent : raison jamais dite',
					'403 la coordination propose la coordination',
					'409 déjà invité·e ou présent·e',
					'409 quotas : 20 invitations en attente, 50 participant·es'
				]
			},
			'inviter-membres': {
				title: 'Inviter tous les membres du groupe porteur',
				services: ['server/projects/participants.inviteMany'],
				entities: ['ProjectParticipant', 'ProjectAct', 'Notification']
			},
			'retirer-personne': {
				title: 'Retirer une participation ou une invitation (gestion)',
				services: ['server/projects/participants.removeParticipant'],
				entities: ['ProjectParticipant', 'ProjectAct', 'ProjectNeed']
			},
			proposer: {
				title: 'Proposer la coordination à une participation (gestion)',
				services: ['server/projects/participants.proposeCapability'],
				entities: ['ProjectParticipant', 'ProjectAct']
			},
			revoquer: {
				title: 'Retirer la coordination (annule ses propositions en attente)',
				services: ['server/projects/participants.revokeCapability'],
				entities: ['ProjectParticipant', 'ProjectAct', 'ProjectNeed']
			},
			capacite: {
				title: 'Accepter ou refuser la coordination proposée',
				services: ['server/projects/participants.answerCapability'],
				entities: ['ProjectParticipant', 'ProjectAct']
			},
			quitter: {
				title: 'Quitter le projet (annule ses propositions en attente)',
				services: ['server/projects/participants.leaveProject'],
				entities: ['ProjectParticipant', 'ProjectAct', 'ProjectNeed']
			},
			supprimer: {
				title: 'Supprimer le projet (jamais un morceau)',
				services: ['server/projects/service.deleteProject'],
				entities: ['Project']
			}
		}
	},

	// ── Morceaux ───────────────────────────────────────────────────────────
	{
		route: '/(app)/morceaux/nouveau',
		domain: 'morceaux',
		actors: ['musicien', 'gestion'],
		services: ['server/works/service'],
		entities: ['Work', 'WorkContributor'],
		tests: [...e2e('morceaux', 'etapes-autonomes'), ...it('works/service.integration.test.ts')],
		decisions: ['D35'],
		actions: { default: 'Noter une idée de morceau (à soi ou au nom d’un groupe géré)' }
	},
	{
		route: '/(app)/morceaux',
		domain: 'morceaux',
		actors: ['musicien'],
		services: ['server/works/service'],
		entities: ['WorkContributor', 'WorkCreditAct'],
		tests: [...e2e('morceaux'), ...it('works/service.integration.test.ts')],
		actions: { confirm: 'Confirmer un crédit reçu', decline: 'Refuser un crédit reçu' }
	},
	{
		route: '/(app)/morceaux/[id]',
		domain: 'morceaux',
		actors: ['gestion', 'musicien'],
		services: ['server/works/service', 'server/works/release'],
		entities: ['Work', 'WorkContributor', 'WorkRole', 'WorkRoleAct', 'WorkCreditAct', 'Media'],
		tests: [
			...e2e('morceaux', 'collaborations-morceau'),
			...it(
				'works/service.integration.test.ts',
				'works/own-roles.integration.test.ts',
				'works/release.integration.test.ts'
			)
		],
		decisions: ['D35', 'D69'],
		issues: [52],
		actions: {
			confirm: 'Confirmer son crédit sur le morceau',
			leave: 'Quitter l’équipe du morceau',
			credit: 'Créditer une personne (à confirmer par elle)',
			addSoundRole: 'Ajouter un rôle du son à son propre crédit (D69)',
			withdrawCredit: 'Retirer un crédit proposé',
			openRole: 'Ouvrir un rôle à pourvoir',
			removeRole: 'Retirer un rôle à pourvoir',
			demo: 'Joindre une maquette',
			compose: 'Passer l’idée en morceau composé (public)',
			edit: 'Modifier le morceau',
			delete: 'Supprimer le morceau'
		}
	},
	{
		route: '/(app)/morceaux/[id]/etapes',
		domain: 'morceaux',
		actors: ['gestion'],
		services: ['server/works/steps', 'server/works/production'],
		entities: ['WorkStep', 'WorkStepAct', 'WorkContributor'],
		tests: [
			...e2e('etapes-autonomes', 'production-autonome'),
			...it('works/steps.integration.test.ts', 'works/production.integration.test.ts')
		],
		decisions: ['D68'],
		issues: [51],
		actions: {
			creditRecording: 'Se créditer pour l’enregistrement fait soi-même',
			step: 'Prendre en charge ou faire avancer une étape de production'
		}
	},

	// ── Messagerie et collaborations ───────────────────────────────────────
	{
		route: '/(app)/messages/nouveau',
		domain: 'messagerie',
		actors: ['membre'],
		services: ['server/messaging/service.startConversation'],
		entities: ['Conversation', 'ConversationParticipant', 'Message', 'Notification'],
		tests: e2e('messagerie', 'blocage'),
		actions: {
			default: {
				title: 'Écrire à quelqu’un (demande de contact)',
				errors: ['404 profil introuvable ou bloqué', 'Mineur·e : pas de demande d’un·e inconnu·e']
			}
		}
	},
	{
		route: '/(app)/messages/[id]',
		domain: 'messagerie',
		actors: ['membre'],
		services: [
			'server/messaging/service',
			'server/collaborations/service',
			'server/collaborations/endorse'
		],
		entities: [
			'Message',
			'ConversationParticipant',
			'Collaboration',
			'CollabEndorsement',
			'Report',
			'Block'
		],
		tests: [
			...e2e('messagerie', 'concerts', 'collaborations-morceau', 'studio-sessions', 'solo-scene'),
			...it(
				'collaborations/proposal.integration.test.ts',
				'collaborations/endorse.integration.test.ts',
				'collaborations/gigs.integration.test.ts'
			)
		],
		decisions: ['D75', 'D77', 'D79'],
		actions: {
			send: 'Envoyer un message (répondre accepte la demande)',
			proposeCollab: { title: 'Proposer une collaboration', domain: 'collaborations' },
			respondCollab: { title: 'Accepter ou refuser une collaboration', domain: 'collaborations' },
			confirmCollab: {
				title: 'Confirmer la collaboration réalisée (preuve, crédits, XP serveur)',
				domain: 'collaborations',
				entities: ['Collaboration', 'CollaborationParticipant', 'DomainEvent', 'XpTransaction']
			},
			endorseCollab: { title: 'Apprécier une collaboration', domain: 'collaborations' },
			revokeEndorsement: { title: 'Retirer son appréciation', domain: 'collaborations' },
			cancelCollab: { title: 'Annuler une collaboration proposée', domain: 'collaborations' },
			decline: 'Refuser une demande de contact (pèse sur la confiance)',
			report: { title: 'Signaler la personne', domain: 'securite' },
			block: { title: 'Bloquer la personne', domain: 'securite' }
		}
	},
	{
		route: '/(app)/messages/groupes/[id]',
		domain: 'messagerie',
		actors: ['membre'],
		services: ['server/discussions/service'],
		entities: ['GroupDiscussion', 'GroupDiscussionMember', 'GroupDiscussionMessage'],
		tests: [...e2e('discussions'), ...it('discussions/service.integration.test.ts')],
		decisions: ['D46'],
		actions: {
			join: 'Rejoindre une discussion de groupe',
			decline: 'Décliner une discussion de groupe',
			leave: 'Quitter une discussion de groupe',
			send: 'Écrire dans une discussion de groupe',
			invite: 'Inviter dans une discussion de groupe'
		}
	},

	// ── Annonces et candidatures ───────────────────────────────────────────
	{
		route: '/(app)/annonces/nouvelle',
		domain: 'annonces',
		actors: ['membre', 'gestion', 'groupe'],
		services: ['server/opportunities/service', 'server/projects/needs.linkNeedToOpportunity'],
		entities: ['Opportunity', 'ProjectNeed', 'ProjectAct'],
		tests: [
			...e2e('annonces', 'annonces-metier', 'annonces-qualifiees', 'projets-besoins'),
			...it(
				'opportunities/recruitment.integration.test.ts',
				'opportunities/targeted.integration.test.ts'
			)
		],
		decisions: ['D63', 'D76'],
		actions: {
			default: {
				title: 'Publier une annonce (éventuellement préparée depuis un besoin)',
				errors: [
					'Commune requise',
					'409 besoin non ouvert ou déjà lié',
					'409 porteur ou métier non éligible (Q99, Q100)'
				]
			}
		}
	},
	{
		route: '/(app)/annonces/[id]',
		domain: 'candidatures',
		actors: ['membre', 'gestion', 'booker', 'manager'],
		services: [
			'server/opportunities/applications',
			'server/opportunities/delegated',
			'server/opportunities/service'
		],
		entities: ['Application', 'Opportunity', 'Report', 'ApplicationGrant'],
		tests: [
			...e2e('candidatures', 'recrutement', 'candidature-deleguee', 'annonces'),
			...it(
				'opportunities/delegated.integration.test.ts',
				'opportunities/recruitment.integration.test.ts'
			)
		],
		decisions: ['D63', 'D71'],
		actions: {
			applyDelegated: 'Candidater au nom d’un artiste (délégation)',
			apply: 'Candidater en son nom',
			applyBand: 'Candidater au nom d’un groupe géré',
			withdrawBand: 'Retirer la candidature du groupe',
			withdraw: 'Retirer sa candidature',
			shortlist: 'Présélectionner une candidature (émetteur)',
			accept: 'Retenir une candidature',
			decline: 'Décliner une candidature',
			close: { title: 'Clore l’annonce', domain: 'annonces' },
			report: { title: 'Signaler l’annonce', domain: 'securite' }
		}
	},

	// ── Scène ──────────────────────────────────────────────────────────────
	{
		route: '/(app)/lieux/nouveau',
		domain: 'scene',
		actors: ['membre'],
		services: ['server/venues/service', 'server/venues/establishments'],
		entities: ['Venue', 'Establishment'],
		tests: e2e('lieux'),
		decisions: ['D27'],
		actions: { default: 'Ajouter un lieu à l’annuaire (aucune XP)' }
	},
	{
		route: '/(app)/lieux/[id]',
		domain: 'scene',
		actors: ['membre', 'lieu'],
		services: ['server/venues/service', 'server/venues/claims'],
		entities: ['Venue', 'VenueClaim', 'Report'],
		tests: [...e2e('lieux', 'lieu-revendication'), ...it('venues/claims.integration.test.ts')],
		decisions: ['D31'],
		actions: {
			confirm: 'Confirmer qu’un lieu existe (second membre)',
			backline: 'Déclarer le matériel du lieu',
			siret: 'Rattacher un SIRET au lieu',
			claim: 'Revendiquer la fiche du lieu',
			claimProof: 'Joindre une preuve de revendication',
			report: { title: 'Signaler le lieu', domain: 'securite' }
		}
	},
	{
		route: '/(app)/lieux/[id]/gerer',
		domain: 'scene',
		actors: ['gestion', 'lieu'],
		services: ['server/venues/profile', 'server/organizations/comanagement'],
		entities: ['VenueProfile', 'Membership', 'JamSeries', 'OrganizationVerification', 'Media'],
		tests: [
			...e2e('lieu-fiche', 'lieu-photos', 'scene-ouverte'),
			...it('venues/profile.integration.test.ts')
		],
		actions: {
			stopSeries: 'Arrêter une scène ouverte récurrente',
			save: 'Modifier la fiche du lieu',
			publish: 'Publier la fiche du lieu',
			unpublish: 'Dépublier la fiche du lieu',
			deletePhoto: 'Supprimer une photo du lieu',
			inviteManager: 'Inviter à la co-gestion du lieu',
			removeManager: 'Retirer une co-gestion du lieu',
			requestVerification: 'Demander la vérification du lieu'
		}
	},
	{
		route: '/(app)/lieux/[id]/gerer/animation',
		domain: 'scene',
		actors: ['gestion', 'lieu'],
		services: ['server/jam/venueHosts'],
		entities: ['VenueHost'],
		tests: [...e2e('animation-lieu'), ...it('jam/venueHosts.integration.test.ts')],
		actions: {
			invite: 'Inviter un·e animateur·rice de scène ouverte',
			remove: 'Retirer un·e animateur·rice',
			setLead: 'Choisir le lead par défaut d’une série'
		}
	},
	{
		route: '/(app)/lieux/[id]/gerer/scene-ouverte',
		domain: 'scene',
		actors: ['gestion', 'lieu'],
		services: ['server/jam/series'],
		entities: ['JamSeries', 'Opportunity'],
		tests: [...e2e('scene-ouverte'), ...it('jam/series.integration.test.ts')],
		actions: { default: 'Publier une scène ouverte récurrente' }
	},
	{
		route: '/(app)/plateaux/nouveau',
		domain: 'scene',
		actors: ['organisateur', 'organisation', 'lieu'],
		services: ['server/opportunities/gigSlots'],
		entities: ['Opportunity', 'Venue'],
		tests: [...e2e('organisateur'), ...it('opportunities/gigSlots.integration.test.ts')],
		decisions: ['D64', 'D77'],
		actions: { default: 'Publier un plateau (conditions sur des faits, jamais l’XP)' }
	},
	{
		route: '/(app)/organisations',
		domain: 'scene',
		actors: ['organisateur'],
		services: ['server/organizations/promoters', 'server/organizations/comanagement'],
		entities: ['Organization', 'Membership', 'PromoterOrgProfile'],
		tests: [
			...e2e('organisation-organisateurs', 'structures'),
			...it('organizations/promoters.integration.test.ts')
		],
		actions: {
			answer: 'Répondre à une invitation à co-gérer une organisation',
			create: 'Créer une organisation d’organisateurs'
		}
	},
	{
		route: '/(app)/organisations/[handle]',
		domain: 'scene',
		actors: ['gestion', 'organisation'],
		services: ['server/organizations/promoters', 'server/organizations/verification'],
		entities: ['PromoterOrgProfile', 'Membership', 'OrganizationVerification'],
		tests: [
			...e2e('organisation-organisateurs', 'organisation-verifiee'),
			...it('organizations/verification.integration.test.ts')
		],
		actions: {
			save: 'Modifier la fiche de l’organisation',
			inviteManager: 'Inviter à la co-gestion de l’organisation',
			removeManager: 'Retirer une co-gestion de l’organisation',
			requestVerification: 'Demander la vérification de l’organisation (SIRET)'
		}
	},

	// ── Métiers pros ───────────────────────────────────────────────────────
	{
		route: '/(app)/studios',
		domain: 'pros',
		actors: ['inge-son', 'producteur'],
		services: ['server/studios/service'],
		entities: ['Organization', 'StudioProfile', 'Membership'],
		tests: [...e2e('studio', 'studio-gestion'), ...it('studios/service.integration.test.ts')],
		actions: {
			answer: 'Répondre à une invitation à co-gérer un studio',
			create: 'Créer un studio'
		}
	},
	{
		route: '/(app)/studios/[handle]',
		domain: 'pros',
		actors: ['gestion', 'studio'],
		services: ['server/studios/service', 'server/organizations/verification'],
		entities: ['StudioProfile', 'StudioRoom', 'StudioHours', 'Media', 'Membership'],
		tests: [...e2e('studio', 'studio-gestion'), ...it('studios/service.integration.test.ts')],
		actions: {
			save: 'Modifier la fiche du studio',
			publish: 'Publier le studio',
			deletePhoto: 'Supprimer une photo du studio',
			inviteManager: 'Inviter à la co-gestion du studio',
			removeManager: 'Retirer une co-gestion du studio',
			requestVerification: 'Demander la vérification du studio',
			unpublish: 'Dépublier le studio'
		}
	},
	{
		route: '/(app)/accompagnement',
		domain: 'pros',
		actors: ['manager', 'booker', 'musicien', 'groupe'],
		services: ['server/representation/service'],
		entities: ['Representation'],
		tests: [
			...e2e('booker', 'accompagnement-blocage'),
			...it('representation/representation.integration.test.ts')
		],
		decisions: ['D65'],
		actions: {
			propose: 'Proposer d’accompagner un artiste',
			answer: 'Accepter ou refuser un accompagnement (l’artiste)',
			end: 'Mettre fin à un accompagnement'
		}
	},
	{
		route: '/(app)/accompagnement/[id]/candidatures',
		domain: 'pros',
		actors: ['booker', 'manager', 'gestion'],
		services: ['server/representation/applicationGrants'],
		entities: ['ApplicationGrant', 'ApplicationGrantAct'],
		tests: [
			...e2e('droit-de-candidater'),
			...it('representation/applicationGrants.integration.test.ts')
		],
		decisions: ['D71'],
		actions: {
			request: 'Demander le droit de candidater au nom de l’artiste',
			answer: 'Accorder ou refuser le droit de candidater',
			end: 'Mettre fin au droit de candidater'
		}
	},
	{
		route: '/(app)/delegations/nouvelle',
		domain: 'pros',
		actors: ['manager', 'booker'],
		services: ['server/representation/delegations'],
		entities: ['RepresentationDelegation'],
		tests: [...e2e('delegations'), ...it('representation/delegations.integration.test.ts')],
		decisions: ['D67'],
		actions: { default: 'Proposer une affectation nominative d’un mandat' }
	},
	{
		route: '/(app)/delegations/[id]',
		domain: 'pros',
		actors: ['manager', 'booker', 'musicien'],
		services: ['server/representation/delegations'],
		entities: ['RepresentationDelegation'],
		tests: [...e2e('delegations'), ...it('representation/delegations.integration.test.ts')],
		decisions: ['D67'],
		actions: {
			answer: 'Accepter ou refuser une affectation (collaborateur)',
			approve: 'Approuver une affectation (artiste)',
			revoke: 'Révoquer une affectation',
			end: 'Terminer une affectation'
		}
	},
	{
		route: '/(app)/agences/nouvelle',
		domain: 'pros',
		actors: ['manager', 'booker'],
		services: ['server/agencies/service'],
		entities: ['Organization', 'Membership'],
		tests: [...e2e('agences'), ...it('agencies/agencies.integration.test.ts')],
		decisions: ['D66'],
		actions: { default: 'Créer une agence' }
	},
	{
		route: '/(app)/agences/[id]/equipe',
		domain: 'pros',
		actors: ['gestion', 'agence'],
		services: ['server/agencies/service'],
		entities: ['Membership', 'Notification'],
		tests: [...e2e('agences'), ...it('agencies/agencies.integration.test.ts')],
		decisions: ['D66'],
		actions: { invite: 'Inviter dans l’agence', remove: 'Retirer de l’agence' }
	},
	{
		route: '/(app)/agences/[id]/participation',
		domain: 'pros',
		actors: ['manager', 'booker', 'agence'],
		services: ['server/agencies/service'],
		entities: ['Membership'],
		tests: [...e2e('agences'), ...it('agencies/agencies.integration.test.ts')],
		decisions: ['D66'],
		actions: {
			answer: 'Répondre à une invitation d’agence',
			leave: 'Quitter l’agence',
			close: 'Fermer l’agence'
		}
	},
	{
		route: '/(app)/ecoles',
		domain: 'pros',
		actors: ['membre'],
		services: ['server/schools/service'],
		entities: ['Organization', 'SchoolProfile', 'Membership'],
		tests: [...e2e('ecole'), ...it('schools/schools.integration.test.ts')],
		decisions: ['D29'],
		actions: { create: 'Ouvrir une école (personne majeure)' }
	},
	{
		route: '/(app)/ecoles/[handle]',
		domain: 'pros',
		actors: ['gestion', 'ecole', 'musicien'],
		services: ['server/schools/service'],
		entities: ['SchoolInvite', 'Membership'],
		tests: [...e2e('ecole'), ...it('schools/schools.integration.test.ts')],
		decisions: ['D29'],
		actions: {
			invite: 'Créer un lien d’invitation haché et plafonné',
			revoke: 'Retirer un lien d’invitation',
			remove: 'Retirer un·e élève ou un·e prof',
			leave: 'Quitter l’école'
		}
	},
	{
		route: '/(app)/ecoles/[handle]/atelier',
		domain: 'pros',
		actors: ['gestion', 'ecole'],
		services: ['server/schools/service'],
		entities: ['Opportunity'],
		tests: e2e('ecole'),
		actions: { default: 'Publier un atelier jam réservé aux élèves' }
	},
	{
		route: '/ecole/[token]',
		domain: 'pros',
		actors: ['visiteur', 'membre'],
		services: ['server/schools/service', 'server/schools/cookie'],
		entities: ['SchoolInvite', 'Membership'],
		tests: e2e('ecole'),
		actions: { default: 'Rejoindre une école par son lien' }
	},

	// ── Carrière ───────────────────────────────────────────────────────────
	{
		route: '/(app)/espace/ambition',
		domain: 'carriere',
		actors: ['membre'],
		services: ['server/career/service'],
		entities: ['Person'],
		tests: e2e('carriere'),
		actions: { default: 'Choisir son ambition (modifiable, jamais d’échec)' }
	},
	{
		route: '/(app)/espace/parrainage',
		domain: 'carriere',
		actors: ['membre'],
		services: ['server/career/introductions'],
		entities: ['Introduction'],
		tests: [...e2e('parrainage'), ...it('career/introductions.integration.test.ts')],
		actions: { default: 'Présenter deux personnes de son réseau' }
	},
	{
		route: '/(app)/espace/propositions',
		domain: 'carriere',
		actors: ['membre'],
		services: ['server/career/choices'],
		entities: ['SuggestionChoice'],
		tests: [...e2e('propositions'), ...it('career/choices.integration.test.ts')],
		decisions: ['D73'],
		actions: {
			reactivate: 'Réactiver une proposition écartée',
			decline: 'Écarter une proposition de Melokiva'
		}
	},

	// ── Profil public, modération, contact ─────────────────────────────────
	{
		route: '/@[handle]',
		domain: 'identites',
		actors: ['membre'],
		services: [
			'server/moderation/service',
			'server/bands/service',
			'server/milestones/disputes',
			'server/blocking/service'
		],
		entities: ['Report', 'Membership', 'Milestone', 'Block'],
		tests: e2e('profil-public', 'blocage', 'groupes', 'etapes'),
		actions: {
			report: { title: 'Signaler un profil', domain: 'securite' },
			join: { title: 'Demander à rejoindre un groupe depuis sa page', domain: 'groupes' },
			contestMilestone: { title: 'Contester une étape publique', domain: 'carriere' },
			block: { title: 'Bloquer depuis un profil', domain: 'securite' }
		}
	},
	{
		route: '/medias/[id]',
		domain: 'securite',
		actors: ['membre'],
		services: ['server/moderation/service'],
		entities: ['Report'],
		tests: e2e('moderation'),
		actions: { report: 'Signaler un média' }
	},
	{
		route: '/moderation',
		domain: 'securite',
		actors: ['moderation'],
		services: [
			'server/moderation/service',
			'server/milestones/disputes',
			'server/milestones/proofs',
			'server/organizations/verification',
			'server/venues/claims'
		],
		entities: [
			'Report',
			'Sanction',
			'CollusionCase',
			'MilestoneEvidence',
			'OrganizationVerification',
			'VenueClaim',
			'Venue',
			'Opportunity'
		],
		tests: [
			...e2e('moderation', 'lieu-revendication', 'organisation-verifiee'),
			...it('moderation/service.integration.test.ts')
		],
		actions: {
			decideCollusion: 'Trancher un cas de collusion',
			removeOpportunity: 'Retirer une annonce',
			acceptEvidence: 'Accepter une preuve d’étape',
			rejectEvidence: 'Rejeter une preuve d’étape',
			approveOrganization: 'Vérifier une organisation',
			rejectOrganization: 'Refuser la vérification d’une organisation',
			approveVenueClaim: 'Accepter une revendication de lieu',
			rejectVenueClaim: 'Refuser une revendication de lieu',
			revokeOrganization: 'Révoquer la vérification d’une organisation',
			upholdMilestone: 'Maintenir une étape contestée',
			dismissMilestone: 'Retirer une étape contestée',
			validateVenue: 'Valider un lieu de l’annuaire',
			removeVenue: 'Retirer un lieu de l’annuaire',
			approve: 'Approuver un média',
			reject: 'Rejeter un média',
			dismiss: 'Classer un signalement',
			sanction: 'Sanctionner un compte'
		}
	},
	{
		route: '/notifications/desinscription',
		domain: 'transversal',
		actors: ['visiteur'],
		services: ['server/notifications/unsubscribe'],
		entities: ['NotificationPreference'],
		tests: it('jobs/digest.integration.test.ts'),
		actions: { default: 'Se désinscrire du digest par lien signé' }
	},
	{
		route: '/contact',
		domain: 'transversal',
		actors: ['visiteur'],
		services: [],
		entities: ['ContactSubmission'],
		tests: ['e2e/contact/form.spec.ts'],
		actions: { send: 'Envoyer le formulaire de contact (boilerplate)' }
	},

	// ── Authentification et compte (Better Auth, boilerplate) ──────────────
	{
		route: '/auth',
		domain: 'securite',
		actors: ['membre'],
		services: [],
		entities: ['AuthSession'],
		tests: ['e2e/auth/sessions.spec.ts'],
		actions: { signout: 'Se déconnecter' }
	},
	{
		route: '/auth/signup',
		domain: 'securite',
		actors: ['visiteur'],
		services: ['server/emailVerification'],
		entities: ['User', 'EmailVerificationRequest'],
		tests: ['e2e/auth/journey.spec.ts'],
		actions: { signup: 'Créer un compte' }
	},
	{
		route: '/auth/login',
		domain: 'securite',
		actors: ['visiteur'],
		services: ['server/failedLoginAlert', 'server/newDeviceAlert'],
		entities: ['AuthSession', 'LoginEvent'],
		tests: ['e2e/auth/journey.spec.ts', 'e2e/auth/failed-login-alert.spec.ts'],
		actions: { login: 'Se connecter' }
	},
	{
		route: '/auth/verify-email',
		domain: 'securite',
		actors: ['visiteur'],
		services: ['server/emailVerification'],
		entities: ['EmailVerificationRequest', 'User'],
		tests: ['e2e/auth/journey.spec.ts'],
		actions: {
			verifyCode: 'Vérifier son adresse par code',
			resendCode: 'Renvoyer le code de vérification'
		}
	},
	{
		route: '/auth/forgot-password',
		domain: 'securite',
		actors: ['visiteur'],
		services: [],
		entities: ['PasswordResetSession'],
		tests: ['e2e/auth/journey.spec.ts'],
		actions: { forgotPassword: 'Demander la réinitialisation du mot de passe' }
	},
	{
		route: '/auth/reset-password',
		domain: 'securite',
		actors: ['visiteur'],
		services: ['server/passwordChangedAlert'],
		entities: ['PasswordResetSession', 'User'],
		tests: ['e2e/auth/password-changed-alert.spec.ts'],
		actions: { resetPassword: 'Choisir un nouveau mot de passe' }
	},
	{
		route: '/auth/reset-password/verify-email',
		domain: 'securite',
		actors: ['visiteur'],
		services: [],
		entities: ['PasswordResetSession'],
		tests: ['e2e/auth/reset-password-2fa.spec.ts'],
		actions: { verify: 'Vérifier l’adresse pendant la réinitialisation' }
	},
	{
		route: '/auth/reset-password/2fa',
		domain: 'securite',
		actors: ['visiteur'],
		services: [],
		entities: ['TwoFactor'],
		tests: ['e2e/auth/reset-password-2fa.spec.ts'],
		actions: {
			totp: 'Réinitialisation : code TOTP',
			recovery_code: 'Réinitialisation : code de secours'
		}
	},
	{
		route: '/auth/2fa',
		domain: 'securite',
		actors: ['membre'],
		services: ['auth/twoFactor'],
		entities: ['TwoFactor'],
		tests: ['e2e/auth/settings.spec.ts'],
		actions: { totp: 'Se connecter avec un code TOTP' }
	},
	{
		route: '/auth/2fa/setup',
		domain: 'securite',
		actors: ['membre'],
		services: ['auth/twoFactor'],
		entities: ['TwoFactor'],
		tests: ['e2e/auth/settings.spec.ts'],
		actions: { setuptotp: 'Activer la double authentification' }
	},
	{
		route: '/auth/2fa/reset',
		domain: 'securite',
		actors: ['membre'],
		services: ['auth/twoFactor'],
		entities: ['TwoFactor'],
		tests: ['e2e/auth/settings.spec.ts'],
		actions: { recovery_code: 'Réinitialiser la 2FA avec un code de secours' }
	},
	{
		route: '/auth/not-me/[token]',
		domain: 'securite',
		actors: ['visiteur'],
		services: ['server/newDeviceAlert'],
		entities: ['SessionRevokeToken', 'AuthSession'],
		tests: ['e2e/auth/new-device-alert.spec.ts'],
		actions: { confirm: '« Ce n’était pas moi » : révoquer les sessions' }
	},
	{
		route: '/auth/settings',
		domain: 'securite',
		actors: ['membre'],
		services: [],
		entities: ['User', 'TwoFactor'],
		tests: ['e2e/auth/settings.spec.ts'],
		actions: {
			password: 'Changer son mot de passe',
			email: 'Changer son adresse',
			isMfaEnabled: 'Activer ou couper la 2FA',
			marketingEmailsOptIn: 'Consentir ou non aux e-mails marketing'
		}
	},
	{
		route: '/auth/settings/sessions',
		domain: 'securite',
		actors: ['membre'],
		services: [],
		entities: ['AuthSession'],
		tests: ['e2e/auth/sessions.spec.ts'],
		actions: { revoke: 'Révoquer une session', revokeOthers: 'Révoquer les autres sessions' }
	},
	{
		route: '/auth/settings/donnees',
		domain: 'securite',
		actors: ['membre'],
		services: ['server/export/csv'],
		entities: ['User', 'Actor', 'Person'],
		tests: [
			'e2e/auth/gdpr-data.spec.ts',
			...it('collaborations/anonymisation.integration.test.ts')
		],
		actions: {
			delete: {
				title: 'Effacer son compte (anonymisation RGPD)',
				notes: 'Chaque domaine fournit son anonymisation ; contrôle T10 encore planifié.'
			}
		}
	}
];
