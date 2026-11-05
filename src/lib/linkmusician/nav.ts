/**
 * LINKMUSICIAN: navigation de l'espace (P0-05b), **selon le mode de jeu**
 * (P2-12b, D21) : en carrière on suit son parcours, en jam on joue et on
 * rencontre. Le mode se change depuis la pastille du haut (`/jouer`).
 */
import { Compass, Guitar, Megaphone, MessageCircle, Trophy, UserRound } from 'lucide-svelte';
import type { PlayModeValue } from './modes';

export type AppNavItem = {
	href: string;
	label: string;
	icon: typeof Trophy;
	soon: boolean;
	/** Autres chemins rattachés à cette entrée (sous-pages). */
	match?: readonly string[];
};

const messages: AppNavItem = {
	href: '/messages',
	label: 'Messages',
	icon: MessageCircle,
	soon: false
};
const profile: AppNavItem = {
	href: '/profil',
	label: 'Profil',
	icon: UserRound,
	soon: false,
	match: ['/reglages']
};
const discover: AppNavItem = { href: '/decouvrir', label: 'Découvrir', icon: Compass, soon: false };

export const NAV_BY_MODE: Readonly<Record<PlayModeValue, readonly AppNavItem[]>> = {
	CAREER: [
		{ href: '/espace', label: 'Mon parcours', icon: Trophy, soon: false },
		discover,
		{ href: '/annonces', label: 'Annonces', icon: Megaphone, soon: false },
		messages,
		profile
	],
	JAM: [
		// L'annuaire des lieux (P2-14a) se rattache à l'onglet Jam.
		{ href: '/jam', label: 'Jam', icon: Guitar, soon: false, match: ['/lieux'] },
		discover,
		messages,
		profile
	]
};

/** Navigation du mode carrière (compatibilité). */
export const APP_NAV = NAV_BY_MODE.CAREER;

/** L'entrée correspond au chemin, ou à l'une de ses sous-pages. */
export function isActive(item: AppNavItem, pathname: string): boolean {
	const roots = [item.href, ...(item.match ?? [])];
	return roots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

/**
 * Mode affiché : la page le dit quand elle appartient à un mode (`/jam`,
 * `/espace`), sinon c'est le dernier mode choisi (carrière par défaut).
 */
export function modeFor(
	pathname: string,
	preferred: PlayModeValue | null | undefined
): PlayModeValue {
	if (/^\/(jam|lieux)(\/|$)/.test(pathname)) return 'JAM';
	if (pathname === '/espace' || pathname.startsWith('/espace/')) return 'CAREER';
	return preferred ?? 'CAREER';
}
