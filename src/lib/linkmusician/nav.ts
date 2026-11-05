/**
 * LINKMUSICIAN: navigation de l'espace (P0-05b). `soon` : l'écran annonce
 * ce qui arrive, le lot qui le construit passe ce drapeau à `false`.
 */
import { Compass, Megaphone, MessageCircle, Trophy, UserRound } from 'lucide-svelte';

export type AppNavItem = {
	href: string;
	label: string;
	icon: typeof Trophy;
	soon: boolean;
	/** Autres chemins rattachés à cette entrée (sous-pages). */
	match?: readonly string[];
};

export const APP_NAV: readonly AppNavItem[] = [
	{ href: '/espace', label: 'Mon parcours', icon: Trophy, soon: false },
	{ href: '/decouvrir', label: 'Découvrir', icon: Compass, soon: false },
	{ href: '/annonces', label: 'Annonces', icon: Megaphone, soon: false },
	{ href: '/messages', label: 'Messages', icon: MessageCircle, soon: false },
	{ href: '/profil', label: 'Profil', icon: UserRound, soon: false, match: ['/reglages'] }
];

/** L'entrée correspond au chemin, ou à l'une de ses sous-pages. */
export function isActive(item: AppNavItem, pathname: string): boolean {
	const roots = [item.href, ...(item.match ?? [])];
	return roots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}
