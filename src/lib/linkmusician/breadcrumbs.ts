/**
 * Fil d'Ariane de l'espace (D52) : règle pure, partagée par le serveur et le
 * navigateur. Chaque page connaît son parent **logique** (une jam remonte à
 * « Jams à venir », une conversation à « Messages »), pas seulement celui de
 * son adresse. Le premier badge est l'accueil du mode en cours ; le dernier,
 * la page elle-même, avec son vrai nom quand on l'a (titre de la jam, nom du
 * groupe…).
 */
import { modeFor, PLAY_MODE_INFO, type PlayModeValue } from './modes';

export type Crumb = { label: string; href: string };

type PageData = Record<string, unknown>;
type Node = {
	label: string;
	/** Route parente (identifiant SvelteKit sans les groupes). */
	parent?: string;
	/** Vrai nom de la page, lu dans ses données ; sinon `label`. */
	name?: (data: PageData) => unknown;
};

const at =
	(...path: string[]) =>
	(data: PageData): unknown =>
		path.reduce<unknown>(
			(v, key) => (v && typeof v === 'object' ? (v as PageData)[key] : undefined),
			data
		);

const ROUTES: Record<string, Node> = {
	'/jouer': { label: 'Jouer' },
	'/jouer/[mode]': { label: 'Présentation', parent: '/jouer' },
	'/espace': { label: PLAY_MODE_INFO.CAREER.label },
	'/jam': { label: PLAY_MODE_INFO.JAM.label },

	// Mode jam
	'/jam/dispos': { label: 'Musicos dispo', parent: '/jam' },
	'/jam/agenda': { label: 'Jams à venir', parent: '/jam' },
	'/jam/apprecier': { label: 'Apprécier', parent: '/jam' },
	'/jam/mes-jams': { label: 'Mes jams', parent: '/jam' },
	'/jam/carnet': { label: 'Carnet', parent: '/jam' },
	'/jams/nouvelle': { label: 'Lancer une jam', parent: '/jam' },
	'/jams/[id]': { label: 'Jam', parent: '/jam/agenda', name: at('jam', 'title') },
	'/jams/[id]/presents': { label: 'Qui était là ?', parent: '/jams/[id]' },
	'/lieux': { label: 'Lieux', parent: '/jam/agenda' },
	'/lieux/nouveau': { label: 'Ajouter un lieu', parent: '/lieux' },
	'/lieux/[id]': { label: 'Lieu', parent: '/lieux', name: at('venue', 'name') },

	// Mode carrière
	'/espace/carte': { label: 'Ma carte', parent: '/espace' },
	'/espace/fiche': { label: 'Ma fiche de carrière', parent: '/espace' },
	'/espace/ambition': { label: 'Mon ambition', parent: '/espace' },
	'/espace/objectifs': { label: 'Mes objectifs', parent: '/espace' },
	'/espace/campagnes': { label: 'Campagnes', parent: '/espace' },
	'/espace/equipe': { label: 'Mon équipe', parent: '/espace' },
	'/espace/agenda': { label: 'Agenda', parent: '/espace' },
	'/espace/journal': { label: 'Journal de bord', parent: '/espace' },
	'/espace/progression': { label: 'Points et succès', parent: '/espace' },
	'/espace/a-confirmer': { label: 'À confirmer', parent: '/espace' },
	'/annonces': { label: 'Annonces', parent: '/espace' },
	'/annonces/nouvelle': { label: 'Nouvelle annonce', parent: '/annonces' },
	'/annonces/[id]': { label: 'Annonce', parent: '/annonces', name: at('opportunity', 'title') },
	'/groupes': { label: 'Mes groupes', parent: '/espace' },
	'/groupes/nouveau': { label: 'Nouveau groupe', parent: '/groupes' },
	'/groupes/[handle]': { label: 'Groupe', parent: '/groupes', name: at('band', 'name') },
	'/groupes/[handle]/modifier': { label: 'Modifier', parent: '/groupes/[handle]' },
	'/morceaux': { label: 'Morceaux', parent: '/espace' },
	'/morceaux/nouveau': { label: 'Nouvelle idée', parent: '/morceaux' },
	'/morceaux/[id]': { label: 'Morceau', parent: '/morceaux', name: at('work', 'title') },
	'/etapes/[id]': { label: 'Confirmer une étape', parent: '/notifications' },
	'/structure': { label: 'Ma structure' },

	// Partout
	'/decouvrir': { label: 'Découvrir' },
	'/messages': { label: 'Messages' },
	'/messages/contacts': { label: 'Contacts', parent: '/messages' },
	'/messages/nouveau': { label: 'Nouveau message', parent: '/messages' },
	'/messages/[id]': {
		label: 'Conversation',
		parent: '/messages',
		name: at('conversation', 'other', 'displayName')
	},
	'/messages/groupes/[id]': {
		label: 'Discussion',
		parent: '/messages',
		name: at('discussion', 'title')
	},
	'/notifications': { label: 'Notifications' },
	'/profil': { label: 'Mon profil' },
	'/profil/musical': { label: 'Profil musical', parent: '/profil' },
	'/profil/medias': { label: 'Médias', parent: '/profil' },
	'/profil/ville': { label: 'Ma ville', parent: '/profil' },
	'/profil/son': { label: 'Profil d’ingé son', parent: '/profil' },
	'/profil/production': { label: 'Profil de producteur·rice', parent: '/profil' },
	'/studios': { label: 'Mes studios', parent: '/profil' },
	'/studios/[handle]': { label: 'Studio', parent: '/studios', name: at('studio', 'name') },
	'/reglages': { label: 'Réglages' },
	'/reglages/metiers': { label: 'Métiers', parent: '/reglages' },
	'/aide': { label: 'Aide' },
	'/aide/[page]': { label: 'Page d’aide', parent: '/aide', name: at('page', 'nav') },
	'/demarches': { label: 'Démarches' },
	'/demarches/[fiche]': { label: 'Démarche', parent: '/demarches', name: at('fiche', 'nav') },
	'/@[handle]': {
		label: 'Profil',
		parent: '/decouvrir',
		name: (d) => at('profile', 'displayName')(d) ?? at('band', 'displayName')(d)
	},
	'/medias/[id]': { label: 'Média', name: at('media', 'title') }
};

/** Identifiant de route sans les groupes : `/(app)/jam` → `/jam`. */
export function normalizeRouteId(routeId: string): string {
	return routeId.replace(/\/\([^)]+\)/g, '') || '/';
}

/** Adresse d'une route avec ses paramètres : `/jams/[id]` → `/jams/abc`. */
function hrefOf(route: string, params: Record<string, string>): string | null {
	let missing = false;
	const href = route.replace(/\[([^\]]+)\]/g, (_, key: string) => {
		const value = params[key];
		if (!value) missing = true;
		return encodeURIComponent(value ?? '');
	});
	return missing ? null : href;
}

const MAX_LABEL = 32;
const short = (label: string) =>
	[...label].length > MAX_LABEL ? `${[...label].slice(0, MAX_LABEL - 1).join('')}…` : label;

/**
 * Le fil d'Ariane d'une page, du plus haut au plus bas. Vide pour une page
 * inconnue ou un accueil de mode (rien à remonter).
 */
export function breadcrumbs(input: {
	routeId: string | null;
	pathname: string;
	params: Record<string, string>;
	data: PageData;
	preferredMode: PlayModeValue | null | undefined;
}): Crumb[] {
	if (!input.routeId) return [];
	let route: string | undefined = normalizeRouteId(input.routeId);
	if (!ROUTES[route]) return [];
	const trail: Crumb[] = [];
	const seen = new Set<string>();
	while (route && ROUTES[route] && !seen.has(route)) {
		seen.add(route);
		const node: Node = ROUTES[route];
		const href = hrefOf(route, input.params);
		if (href) {
			const name = node.name?.(input.data);
			trail.unshift({
				label: short(typeof name === 'string' && name.trim() ? name.trim() : node.label),
				href
			});
		}
		route = node.parent;
	}
	// Premier badge : l'accueil du mode en cours, s'il n'y est pas déjà.
	const mode = PLAY_MODE_INFO[modeFor(input.pathname, input.preferredMode)];
	if (trail[0]?.href !== mode.href && !['/jouer', '/espace', '/jam'].includes(trail[0]?.href)) {
		trail.unshift({ label: mode.label, href: mode.href });
	}
	return trail.length >= 2 ? trail : [];
}

/** Routes connues (pour le test qui vérifie que chaque page en a une). */
export const BREADCRUMB_ROUTES: readonly string[] = Object.keys(ROUTES);
