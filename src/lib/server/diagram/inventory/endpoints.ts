/**
 * LINKMUSICIAN: inventaire des endpoints et jobs de LinkMusician (DIAGRAM-01).
 *
 * Une entrée par méthode exportée d'un `+server.ts` du périmètre. Les jobs
 * acceptent deux déclencheurs (QStash en POST signé, Vercel Cron en GET avec
 * `Authorization: Bearer`) : la méthode GET et la méthode POST d'un même job
 * sont deux entrées, car elles n'ont pas la même garde.
 */
import { e2e, it, type EndpointDef } from './define';

const job = (
	route: string,
	title: string,
	domain: string,
	services: string[],
	entities: string[],
	tests: string[] = [],
	decisions: string[] = []
): EndpointDef[] =>
	(['POST', 'GET'] as const).map((method) => ({
		route,
		method,
		kind: 'job',
		title: `${title} (${method === 'POST' ? 'QStash signé' : 'Vercel Cron'})`,
		domain,
		actors: ['systeme'],
		services,
		entities,
		tests,
		decisions,
		errors: ['401 sans signature QStash ni jeton Cron']
	}));

export const ENDPOINTS: EndpointDef[] = [
	...job(
		'/api/jobs/opportunities',
		'Expirer les annonces et créer les jams des scènes ouvertes',
		'annonces',
		['server/opportunities/service', 'server/jam/series'],
		['Opportunity', 'JamSeries'],
		it('jam/series.integration.test.ts')
	),
	...job(
		'/api/jobs/collusion',
		'Détecter les cercles fermés (collusion)',
		'carriere',
		['server/jobs/collusion'],
		['CollusionCase', 'CollabEndorsement', 'JamEndorsement'],
		it('jobs/collusion.integration.test.ts')
	),
	...job(
		'/api/jobs/trust',
		'Recalculer la confiance',
		'carriere',
		['server/jobs/trust', 'server/progression/trust'],
		['Person'],
		it('progression/trust.integration.test.ts')
	),
	...job(
		'/api/jobs/reputation',
		'Recalculer la réputation',
		'carriere',
		['server/jobs/reputation', 'server/progression/reputation'],
		['ReputationSnapshot'],
		it('progression/reputation.integration.test.ts')
	),
	...job(
		'/api/jobs/digest',
		'Envoyer le digest e-mail quotidien',
		'transversal',
		['server/jobs/digest'],
		['Notification', 'NotificationPreference'],
		it('jobs/digest.integration.test.ts')
	),
	...job(
		'/api/jobs/cleanup',
		'Purger sessions, codes expirés et paniers abandonnés',
		'securite',
		['server/jobs/cleanup'],
		['AuthSession', 'EmailVerificationRequest', 'Order']
	),
	{
		route: '/api/celebrations',
		method: 'POST',
		kind: 'endpoint',
		title: 'Accuser lecture des célébrations',
		domain: 'carriere',
		actors: ['membre'],
		services: ['server/progression/celebrations'],
		entities: ['ActorAchievement'],
		tests: e2e('celebrations')
	},
	{
		route: '/api/demarches/vu',
		method: 'POST',
		kind: 'endpoint',
		title: '« J’ai compris » sur une démarche en contexte',
		domain: 'transversal',
		actors: ['membre'],
		services: ['server/demarches/service'],
		entities: ['Person'],
		tests: it('demarches/service.integration.test.ts')
	},
	{
		route: '/api/guide/tips',
		method: 'POST',
		kind: 'endpoint',
		title: '« J’ai compris » sur un conseil',
		domain: 'transversal',
		actors: ['membre'],
		services: ['server/guide/service'],
		entities: ['Person'],
		tests: e2e('conseils')
	},
	{
		route: '/api/suggestions/dismiss',
		method: 'POST',
		kind: 'endpoint',
		title: '« Pas intéressé·e » sur une suggestion de personne',
		domain: 'rencontre',
		actors: ['membre'],
		services: ['server/discovery/suggestions'],
		entities: ['SuggestionDismissal'],
		tests: [...e2e('suggestions'), ...it('discovery/suggestions.integration.test.ts')]
	},
	{
		route: '/api/media/sign',
		method: 'POST',
		kind: 'endpoint',
		title: 'Préparer un envoi signé vers Cloudinary (type, taille, quota)',
		domain: 'transversal',
		actors: ['membre'],
		services: ['server/media/service'],
		entities: ['Media'],
		tests: it('media/service.integration.test.ts')
	},
	{
		route: '/api/media/confirm',
		method: 'POST',
		kind: 'endpoint',
		title: 'Confirmer un envoi (fichier relu chez Cloudinary)',
		domain: 'transversal',
		actors: ['membre'],
		services: ['server/media/service'],
		entities: ['Media'],
		tests: it('media/service.integration.test.ts')
	},
	{
		route: '/api/media/webhook',
		method: 'POST',
		kind: 'endpoint',
		title: 'Recevoir la notification Cloudinary signée',
		domain: 'transversal',
		actors: ['systeme'],
		services: ['server/media/webhook'],
		entities: ['Media'],
		errors: ['Signature invalide : rien n’est fait']
	},
	{
		route: '/api/onboarding/assistant',
		method: 'POST',
		kind: 'endpoint',
		title: 'Analyser une description libre pour l’onboarding (accord explicite)',
		domain: 'identites',
		actors: ['membre'],
		services: ['server/onboarding-assistant'],
		entities: ['Person'],
		tests: [...e2e('assistant-inscription'), ...it('onboarding-assistant.integration.test.ts')],
		decisions: ['D47']
	},
	{
		route: '/api/onboarding/assistant/usage',
		method: 'POST',
		kind: 'endpoint',
		title: 'Compter l’usage des propositions de l’assistant',
		domain: 'identites',
		actors: ['membre'],
		services: ['server/onboarding-assistant'],
		entities: ['Person'],
		tests: it('onboarding-assistant.integration.test.ts'),
		decisions: ['D47']
	},
	{
		route: '/auth/settings/donnees/export',
		method: 'GET',
		kind: 'endpoint',
		title: 'Exporter ses données (RGPD, art. 20)',
		domain: 'securite',
		actors: ['membre'],
		services: ['server/gdpr/exportUserData'],
		entities: ['User', 'Actor', 'Person', 'Project', 'ProjectNeed'],
		tests: ['e2e/auth/gdpr-data.spec.ts'],
		notes: 'Chaque domaine fournit sa partie (ex. `server/projects/export`).'
	},
	{
		route: '/auth/signout',
		method: 'POST',
		kind: 'endpoint',
		title: 'Se déconnecter (endpoint)',
		domain: 'securite',
		actors: ['membre'],
		services: [],
		entities: ['AuthSession'],
		tests: ['e2e/auth/sessions.spec.ts']
	},
	{
		route: '/api/communes',
		method: 'GET',
		kind: 'endpoint',
		title: 'Chercher une commune (autocomplétion)',
		domain: 'transversal',
		actors: ['membre'],
		services: ['server/geo/communes'],
		entities: [],
		tests: e2e('recherche')
	},
	{
		route: '/api/etablissements',
		method: 'GET',
		kind: 'endpoint',
		title: 'Chercher un établissement (SIRET) pour un lieu',
		domain: 'scene',
		actors: ['membre'],
		services: ['server/venues/establishments'],
		entities: ['Establishment']
	},
	{
		route: '/api/address-search',
		method: 'GET',
		kind: 'endpoint',
		title: 'Chercher une adresse (boilerplate)',
		domain: 'transversal',
		actors: ['membre'],
		services: [],
		entities: []
	},
	{
		route: '/api/notifications/badge',
		method: 'GET',
		kind: 'endpoint',
		title: 'Lire le compteur de notifications',
		domain: 'transversal',
		actors: ['membre'],
		services: ['server/notifications/service'],
		entities: ['Notification'],
		tests: e2e('notifications')
	},
	{
		route: '/api/conversations/[id]/nouveaux',
		method: 'GET',
		kind: 'endpoint',
		title: 'Sonder les nouveaux messages d’une conversation',
		domain: 'messagerie',
		actors: ['membre'],
		services: ['server/messaging/service'],
		entities: ['Message'],
		tests: e2e('messagerie')
	},
	{
		route: '/api/discussions/[id]/nouveaux',
		method: 'GET',
		kind: 'endpoint',
		title: 'Sonder les nouveaux messages d’une discussion de groupe',
		domain: 'messagerie',
		actors: ['membre'],
		services: ['server/discussions/service'],
		entities: ['GroupDiscussionMessage'],
		tests: e2e('discussions')
	},
	{
		route: '/api/carriere/souvenir/[handle]/[act].png',
		method: 'GET',
		kind: 'endpoint',
		title: 'Générer la carte souvenir d’un acte',
		domain: 'carriere',
		actors: ['visiteur', 'membre'],
		services: ['server/career/souvenir'],
		entities: ['Milestone'],
		tests: e2e('carriere')
	},
	{
		route: '/(app)/groupes/[handle]/programme',
		method: 'GET',
		kind: 'endpoint',
		title: 'Télécharger le programme du groupe',
		domain: 'groupes',
		actors: ['gestion'],
		services: ['server/bands/service'],
		entities: ['Membership']
	},
	{
		route: '/(app)/morceaux/[id]/bulletin',
		method: 'GET',
		kind: 'endpoint',
		title: 'Télécharger le bulletin de déclaration d’un morceau',
		domain: 'morceaux',
		actors: ['gestion'],
		services: ['server/demarches/documents'],
		entities: ['Work', 'WorkContributor'],
		tests: it('demarches/documents.integration.test.ts')
	},
	{
		route: '/api/csp-report',
		method: 'POST',
		kind: 'endpoint',
		title: 'Recevoir un rapport CSP',
		domain: 'securite',
		actors: ['systeme'],
		services: [],
		entities: []
	},
	{
		route: '/sitemap.xml',
		method: 'GET',
		kind: 'endpoint',
		title: 'Plan du site',
		domain: 'transversal',
		actors: ['visiteur'],
		services: [],
		entities: []
	}
];
