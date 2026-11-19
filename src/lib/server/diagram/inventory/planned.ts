/**
 * LINKMUSICIAN: processus conçus, prévus ou remplacés, sans code (DIAGRAM-01).
 *
 * Provenance documentaire : une conception, une décision ou une issue. Ces
 * entrées n'ont aucun déclencheur dans le code ; la synchronisation vérifie
 * seulement que leurs documents existent. Un processus livré quitte cette
 * liste pour `routes.ts` ou `endpoints.ts`, dans le commit qui le livre.
 */
import type { DeliveryStatus, ProcessEntry } from '#lib/diagram/types';

interface PlannedDef {
	id: string;
	title: string;
	domain: string;
	actors: string[];
	status: Exclude<DeliveryStatus, 'TESTED' | 'IMPLEMENTED'>;
	entities?: string[];
	decisions?: string[];
	issues?: number[];
	docs: string[];
	notes: string;
	provenance?: 'conception' | 'issue';
}

const PLANNED: PlannedDef[] = [
	{
		id: 'besoins.intervenant-propose',
		title: 'Proposer un intervenant pour un besoin (U3c)',
		domain: 'besoins',
		actors: ['participant', 'coordination', 'gestion'],
		status: 'DESIGNED',
		entities: ['ProjectNeed'],
		decisions: ['D76'],
		issues: [71],
		docs: ['docs/conception/22-besoins-projet.md'],
		notes:
			'Forme prévue `ProjectNeedSuggestion` (§6.4) ; mène au geste « Inviter », jamais à une invitation automatique.'
	},
	{
		id: 'besoins.notifications',
		title: 'Notifier la gestion d’une proposition de besoin',
		domain: 'besoins',
		actors: ['gestion', 'systeme'],
		status: 'PLANNED',
		decisions: ['D76'],
		docs: ['docs/conception/22-besoins-projet.md'],
		notes: 'Aucune notification au lancement (Q91) : un type nouveau demande une migration d’enum.'
	},
	{
		id: 'projets.partage-morceaux-autrui',
		title: 'Partager dans un projet les morceaux d’autrui',
		domain: 'projets',
		actors: ['gestion'],
		status: 'PLANNED',
		issues: [71],
		docs: ['docs/plan/prompt-reprise.md'],
		notes: 'Reste ouvert sur #71 après U3b.'
	},
	{
		id: 'projets.taches-livrables',
		title: 'Confier des tâches et livrables dans un projet (P13)',
		domain: 'projets',
		actors: ['gestion', 'coordination', 'participant'],
		status: 'DESIGNED',
		entities: ['WorkStep'],
		decisions: ['D72'],
		issues: [36],
		docs: ['docs/conception/19-architecture-cible-collab.md'],
		notes: 'Partage `WORK` réservé ; une tâche part d’un élément partagé, pas d’un besoin.'
	},
	{
		id: 'scene.plateaux-par-format',
		title: 'Plateaux par format (P8b, révision de D64)',
		domain: 'scene',
		actors: ['organisateur', 'musicien', 'groupe'],
		status: 'DESIGNED',
		entities: ['Opportunity', 'BandProfile'],
		decisions: ['D78'],
		docs: ['docs/decisions/D78-plateaux-par-format-revision-D64.md'],
		notes: 'D78 toujours Proposée : découpage P8b-1 à P8b-5.'
	},
	{
		id: 'scene.parcours-solo-plateaux',
		title: 'Parcours solo : formats du plateau, candidature et recherche solo (U6b)',
		domain: 'scene',
		actors: ['musicien', 'organisateur'],
		status: 'DESIGNED',
		decisions: ['D77', 'D78'],
		docs: ['docs/plan/fin-du-projet.md'],
		notes: 'Après P8b.'
	},
	{
		id: 'pros.studio-personnel',
		title: 'Studio franchissable par une personne (N6)',
		domain: 'pros',
		actors: ['inge-son', 'producteur'],
		status: 'PLANNED',
		docs: ['docs/plan/prompt-reprise.md'],
		notes: 'La scène l’est depuis P8 ; le studio reste porté par une organisation.'
	},
	{
		id: 'pros.devis-prestations',
		title: 'Devis et prestations',
		domain: 'pros',
		actors: ['inge-son', 'producteur', 'gestion'],
		status: 'PLANNED',
		issues: [39],
		docs: ['docs/plan/backlog-ordonne-2026-11-18.md'],
		notes: 'G2-06, après les tâches externes (#36).',
		provenance: 'issue'
	},
	{
		id: 'scene.agenda-culturel',
		title: 'Événement culturel généraliste et calendriers (G3)',
		domain: 'scene',
		actors: ['organisateur', 'lieu', 'membre'],
		status: 'PLANNED',
		issues: [77, 38, 46],
		docs: ['docs/plan/backlog-ordonne-2026-11-18.md'],
		notes: 'Distinguer inscription Jam, présence effective et découverte de concert.',
		provenance: 'issue'
	},
	{
		id: 'scene.referentiel-lieux',
		title: 'Import légal des lieux, revendication antifraude, fiches administrées (G4)',
		domain: 'scene',
		actors: ['administration', 'lieu'],
		status: 'PLANNED',
		entities: ['Venue', 'VenueClaim'],
		issues: [78, 79, 80, 81],
		docs: ['docs/plan/backlog-ordonne-2026-11-18.md'],
		notes: 'Aucune prise de contrôle par simple import.',
		provenance: 'issue'
	},
	{
		id: 'identites.metiers-label-editeur-communication',
		title: 'Ouvrir les métiers Label, Éditeur·rice et Communication',
		domain: 'identites',
		actors: ['label', 'editeur', 'communication'],
		status: 'PLANNED',
		issues: [47, 48, 49],
		docs: ['docs/plan/backlog-ordonne-2026-11-18.md'],
		notes:
			'Déclarables à l’inscription, mais sans recherche, annonce ni espace (Q95) : ne pas les ouvrir sur leur seul formulaire.',
		provenance: 'issue'
	},
	{
		id: 'identites.assistant-melokiva',
		title: 'Melokiva Assistant',
		domain: 'identites',
		actors: ['membre'],
		status: 'PLANNED',
		issues: [89],
		docs: ['docs/conception/22-besoins-projet.md'],
		notes: 'Préparé par U3b, non développé.',
		provenance: 'issue'
	},
	{
		id: 'carriere.graphe-non-lineaire-suite',
		title: 'Graphe de progression non linéaire : suites (U4/P5, U5/P13)',
		domain: 'carriere',
		actors: ['membre', 'systeme'],
		status: 'DESIGNED',
		decisions: ['D73'],
		issues: [72],
		docs: ['docs/conception/21-progression-non-lineaire.md'],
		notes: 'Plateaux solo et studio personnel restent sur #72.'
	},
	{
		id: 'securite.anonymisation-controle-t10',
		title: 'Contrôle T10 de l’export et de l’effacement RGPD',
		domain: 'securite',
		actors: ['systeme'],
		status: 'PLANNED',
		docs: ['docs/plan/prompt-reprise.md'],
		notes: 'Prochain contrôle planifié (`gdpr-data.spec.ts`) ; P6 attend l’avis RGPD.'
	},
	{
		id: 'messagerie.temps-reel',
		title: 'Messagerie temps réel (P4-12)',
		domain: 'messagerie',
		actors: ['membre'],
		status: 'PLANNED',
		docs: ['docs/plan/fin-du-projet.md'],
		notes: 'Aujourd’hui : sondage périodique (D8).'
	},
	{
		id: 'pros.reservation-studio',
		title: 'Réservation de studio (P5-10)',
		domain: 'pros',
		actors: ['studio', 'musicien'],
		status: 'PLANNED',
		docs: ['docs/plan/fin-du-projet.md'],
		notes: 'Étape E, après le lancement.'
	},
	{
		id: 'identites.modes-jam-carriere',
		title: '« Mode jam » et « Mode carrière » à l’écran',
		domain: 'identites',
		actors: ['membre'],
		status: 'DEPRECATED',
		issues: [74],
		docs: ['docs/plan/backlog-ordonne-2026-11-18.md'],
		notes:
			'Remplacés à l’écran par Rencontre et Collab (G1-01, commit 0a2bceb) ; les valeurs `JAM` et `CAREER` restent en base.'
	}
];

export const PLANNED_PROCESSES: ProcessEntry[] = PLANNED.map((p) => ({
	id: p.id,
	title: p.title,
	domain: p.domain,
	actors: p.actors,
	trigger: { kind: 'none' },
	services: [],
	entities: p.entities ?? [],
	status: p.status,
	errors: [],
	references: {
		decisions: p.decisions ?? [],
		issues: p.issues ?? [],
		sourceFiles: [],
		tests: [],
		docs: p.docs
	},
	provenance: p.provenance ?? 'conception',
	notes: p.notes
}));
