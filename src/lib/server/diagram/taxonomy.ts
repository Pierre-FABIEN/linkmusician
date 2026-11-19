/**
 * LINKMUSICIAN: domaines et acteurs de Melokiva Diagram (DIAGRAM-01).
 *
 * Issus de l'inventaire réel : métiers = `TrackKind`, structures = `OrgKind`,
 * rôles = droits relus par les services (`projectAccess`, `structureAccess`,
 * `Role`). Ajouter un domaine ou un acteur = une ligne ici ; la navigation,
 * les compteurs et la recherche suivent sans autre changement.
 */
import type { ActorDefinition, DomainDefinition } from '#lib/diagram/types';

export const DOMAINS: readonly DomainDefinition[] = [
	{
		id: 'identites',
		label: 'Identités et inscription',
		description:
			'Compte, « Qui es-tu ? », onboarding par métier, profils, visibilité, complétude, réglages.'
	},
	{
		id: 'rencontre',
		label: 'Rencontre',
		description:
			'Disponibilités, recherche, suggestions, carnet, contacts, appréciations : se trouver pour jouer.'
	},
	{
		id: 'jams',
		label: 'Jams',
		description:
			'Jams publiques dans un lieu de l’annuaire, invitations du lead, présence, appréciations.'
	},
	{
		id: 'groupes',
		label: 'Groupes',
		description:
			'Création, invitations, demandes, rôles, transmission, départ, dissolution, étapes du groupe.'
	},
	{
		id: 'projets',
		label: 'Projets',
		description:
			'Projet porté par une personne ou une structure : éléments, partage, équipe, coordination, état.'
	},
	{
		id: 'besoins',
		label: 'Besoins',
		description:
			'Ce qui manque à un projet : proposition, validation, refus, pourvu, annonce préparée.'
	},
	{
		id: 'annonces',
		label: 'Annonces',
		description: 'Recrutement, session, plateaux : publication, critères, expiration, clôture.'
	},
	{
		id: 'candidatures',
		label: 'Candidatures',
		description:
			'Candidater en son nom, au nom d’un groupe ou d’un artiste (délégation), présélection, réponse.'
	},
	{
		id: 'messagerie',
		label: 'Messagerie',
		description:
			'Demandes de contact, conversations, discussions de groupe, signalement et blocage.'
	},
	{
		id: 'collaborations',
		label: 'Collaborations',
		description:
			'Collaboration proposée, confirmée des deux côtés, appréciée ; seule preuve d’un travail commun.'
	},
	{
		id: 'morceaux',
		label: 'Morceaux',
		description:
			'Idée, composition, crédits, rôles du son, étapes de production prises en charge, maquette.'
	},
	{
		id: 'scene',
		label: 'Scène',
		description:
			'Lieux, organisations d’organisateurs, plateaux, concerts reconnus, scènes ouvertes, tournées.'
	},
	{
		id: 'pros',
		label: 'Métiers pros',
		description:
			'Studios, accompagnement (manager, booker), délégations, agences, écoles, profils de métier.'
	},
	{
		id: 'carriere',
		label: 'Carrière et progression',
		description:
			'Ambition, étapes, XP en registre, rangs, confiance, réputation, propositions, parrainage.'
	},
	{
		id: 'securite',
		label: 'Sécurité et RGPD',
		description:
			'Authentification, 2FA, sessions, blocages, modération, export et effacement des données.'
	},
	{
		id: 'transversal',
		label: 'Processus transversaux',
		description:
			'Notifications, digest, médias, conseils, célébrations, jobs planifiés, recherche de communes.'
	}
];

export const ACTORS: readonly ActorDefinition[] = [
	// Métiers (`TrackKind`).
	{
		id: 'musicien',
		label: 'Musicien·ne',
		kind: 'metier',
		prisma: 'MUSICIAN',
		description: 'Joue, compose, rejoint des jams, des groupes et des projets.'
	},
	{
		id: 'inge-son',
		label: 'Ingé son',
		kind: 'metier',
		prisma: 'SOUND_ENGINEER',
		description: 'Prise de son, mixage, mastering, façade, retours ; gère parfois un studio.'
	},
	{
		id: 'producteur',
		label: 'Producteur·rice',
		kind: 'metier',
		prisma: 'PRODUCER',
		description: 'Beatmaking, production, arrangement, topline ; gère parfois un studio.'
	},
	{
		id: 'organisateur',
		label: 'Organisateur·rice',
		kind: 'metier',
		prisma: 'PROMOTER',
		description: 'Publie des plateaux, porte une organisation, confirme des concerts.'
	},
	{
		id: 'manager',
		label: 'Manager',
		kind: 'metier',
		prisma: 'MANAGER',
		description: 'Accompagne un artiste (représentation confirmée par l’artiste), agence.'
	},
	{
		id: 'booker',
		label: 'Booker',
		kind: 'metier',
		prisma: 'BOOKER',
		description: 'Représente un artiste, candidate en son nom (délégation), « Booké par ».'
	},
	{
		id: 'label',
		label: 'Label',
		kind: 'metier',
		prisma: 'LABEL_PRO',
		description:
			'Métier déclarable à l’inscription ; aucune recherche ni annonce dédiée (#47, Q95).'
	},
	{
		id: 'editeur',
		label: 'Éditeur·rice',
		kind: 'metier',
		prisma: 'PUBLISHER',
		description:
			'Métier déclarable à l’inscription ; aucune recherche ni annonce dédiée (#48, Q95).'
	},
	{
		id: 'communication',
		label: 'Communication',
		kind: 'metier',
		prisma: 'MUSIC_COMMS',
		description: 'Métier déclarable à l’inscription ; aucune recherche ni annonce dédiée (Q95).'
	},
	// Structures (`OrgKind`).
	{
		id: 'groupe',
		label: 'Groupe',
		kind: 'structure',
		prisma: 'BAND',
		description: 'Organisation `BAND` : membres, gestion (OWNER, ADMIN), projets, concerts.'
	},
	{
		id: 'studio',
		label: 'Studio',
		kind: 'structure',
		prisma: 'STUDIO',
		description: 'Organisation `STUDIO` gérée par des ingés son ou producteur·rices.'
	},
	{
		id: 'lieu',
		label: 'Lieu',
		kind: 'structure',
		prisma: 'VENUE',
		description: 'Lieu de l’annuaire, revendiqué par une organisation `VENUE`.'
	},
	{
		id: 'organisation',
		label: 'Organisation d’organisateurs',
		kind: 'structure',
		prisma: 'PROMOTER',
		description: 'Association, collectif, festival (`OrgKind.PROMOTER`) qui publie des plateaux.'
	},
	{
		id: 'ecole',
		label: 'École',
		kind: 'structure',
		prisma: 'SCHOOL',
		description: 'École, MJC, conservatoire : liens d’invitation, ateliers réservés aux élèves.'
	},
	{
		id: 'agence',
		label: 'Agence',
		kind: 'structure',
		prisma: 'AGENCY',
		description: 'Agence privée de managers ou bookers, affectations nominatives (D66, D67).'
	},
	// Rôles relus par les services.
	{
		id: 'membre',
		label: 'Personne connectée',
		kind: 'role',
		description: 'Toute personne inscrite, quel que soit son métier.'
	},
	{
		id: 'visiteur',
		label: 'Visiteur·se',
		kind: 'role',
		description: 'Sans compte : pages publiques, inscription, lien d’école.'
	},
	{
		id: 'gestion',
		label: 'Gestion',
		kind: 'role',
		description:
			'La personne elle-même, ou une adhésion `ACTIVE` `OWNER`/`ADMIN` de la structure porteuse.'
	},
	{
		id: 'coordination',
		label: 'Coordination',
		kind: 'role',
		description:
			'Participation active avec la capacité `COORDINATE`, acceptée par la personne (P4a).'
	},
	{
		id: 'participant',
		label: 'Participant·e',
		kind: 'role',
		description: 'Participation `ACTIVE` sans capacité : lit le projet, n’agit pas en son nom.'
	},
	{
		id: 'invite',
		label: 'Personne invitée',
		kind: 'role',
		description: 'Invitation en attente : voit l’aperçu, accepte ou refuse.'
	},
	{
		id: 'moderation',
		label: 'Modération',
		kind: 'role',
		prisma: 'MODERATOR',
		description: 'Rôle `MODERATOR` (ou `ADMIN`) : file de modération, sanctions, vérifications.'
	},
	{
		id: 'administration',
		label: 'Administration',
		kind: 'role',
		prisma: 'ADMIN',
		description: 'Rôle `ADMIN` : `/admin`, référentiels, indicateurs, Melokiva Diagram.'
	},
	{
		id: 'systeme',
		label: 'Système',
		kind: 'role',
		description: 'Jobs planifiés (QStash, cron), triggers SQL, projections recalculées.'
	}
];

export const domainById = new Map(DOMAINS.map((d) => [d.id, d]));
export const actorById = new Map(ACTORS.map((a) => [a.id, a]));
