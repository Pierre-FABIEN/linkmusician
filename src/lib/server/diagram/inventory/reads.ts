/**
 * LINKMUSICIAN: lectures significatives (DIAGRAM-01).
 *
 * Un `load` ne modifie rien, mais certains décident de ce qu'une personne
 * voit ou trouve : la recherche, « À traiter », la fiche d'un projet. Ils
 * sont inventoriés quand un parcours s'appuie dessus ; les autres lectures
 * restent hors inventaire (aucune écriture, aucune décision de droit propre).
 */
import type { ProcessEntry } from '#lib/diagram/types';
import { e2e, it, routeFile, routeSlug } from './define';

interface ReadDef {
	route: string;
	title: string;
	domain: string;
	actors: string[];
	services: string[];
	entities: string[];
	tests: string[];
	decisions?: string[];
	errors?: string[];
}

const READS: ReadDef[] = [
	{
		route: '/(app)/decouvrir',
		title: 'Chercher une personne par métier, spécialité, instrument et rayon',
		domain: 'rencontre',
		actors: ['membre'],
		services: ['server/search/musicians.searchMusicians', 'server/discovery/suggestions'],
		entities: ['Actor', 'PersonTrack', 'PersonTrackIntent', 'ActorLocation'],
		tests: [...e2e('recherche', 'suggestions'), ...it('search/musicians.integration.test.ts')],
		decisions: ['D62'],
		errors: ['Débit limité : 60 recherches, puis une toutes les 2 s', 'Sans commune : pas de rayon']
	},
	{
		route: '/(app)/espace/a-confirmer',
		title: 'Lire « À traiter » (invitations, coordinations et besoins proposés)',
		domain: 'projets',
		actors: ['membre', 'gestion'],
		services: ['server/space/inbox'],
		entities: ['ProjectParticipant', 'ProjectNeed', 'Membership', 'Representation'],
		tests: [
			...e2e('projets-besoins', 'projets-equipe-u3'),
			...it('space/inbox.integration.test.ts')
		]
	},
	{
		route: '/(app)/projets/[id]',
		title: 'Lire la fiche d’un projet (une requête décide de l’accès)',
		domain: 'projets',
		actors: ['gestion', 'coordination', 'participant'],
		services: ['server/projects/view.projectView', 'server/projects/participants.inviteCandidates'],
		entities: ['Project', 'ProjectItem', 'ProjectAct', 'ProjectParticipant', 'ProjectNeed'],
		tests: [...e2e('projets', 'projets-besoins'), ...it('projects/view.perf.integration.test.ts')],
		decisions: ['D72'],
		errors: ['404 identique pour un projet inexistant ou inaccessible']
	}
];

export const READ_PROCESSES: ProcessEntry[] = READS.map((r) => ({
	id: `${routeSlug(r.route)}.load`,
	title: r.title,
	domain: r.domain,
	actors: r.actors,
	trigger: { kind: 'load', route: r.route },
	services: r.services,
	entities: r.entities,
	status: r.tests.length > 0 ? 'TESTED' : 'IMPLEMENTED',
	errors: r.errors ?? [],
	references: {
		decisions: r.decisions ?? [],
		issues: [],
		sourceFiles: [routeFile(r.route)],
		tests: r.tests,
		docs: []
	},
	provenance: 'code'
}));
