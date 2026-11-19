/**
 * Centre d'aide : la liste des pages, dans l'ordre de lecture. Le contenu
 * vit dans `src/lib/aide/pages/*.md` (une page = un fichier), rendu par
 * `#lib/server/aide/render`. Voir `docs/aide/README.md`.
 */
export type HelpIcon = 'home' | 'start' | 'jam' | 'career' | 'points' | 'meet' | 'safety';

export type HelpPage = {
	/** `''` pour l'accueil de l'aide (`/aide`). */
	slug: string;
	file: string;
	/** Titre court, pour la navigation. */
	nav: string;
	/** Une phrase, pour les cartes et le SEO. */
	summary: string;
	icon: HelpIcon;
};

export const HELP_PAGES: readonly HelpPage[] = [
	{
		slug: '',
		file: '00-accueil.md',
		nav: 'Accueil de l’aide',
		summary: 'LinkMusician en 30 secondes, les deux modes et les questions fréquentes.',
		icon: 'home'
	},
	{
		slug: 'premiers-pas',
		file: '01-premiers-pas.md',
		nav: 'Premiers pas',
		summary: 'Ton compte, ton profil, ta ville et ton mode de jeu.',
		icon: 'start'
	},
	{
		slug: 'mode-jam',
		file: '02-mode-jam.md',
		nav: 'Le mode jam',
		summary: 'Se mettre dispo, trouver une jam, l’après-jam et ton carnet.',
		icon: 'jam'
	},
	{
		slug: 'mode-carriere',
		file: '03-mode-carriere.md',
		nav: 'Le mode carrière',
		summary: 'Tes projets, leur équipe et leurs besoins, tes morceaux et ton parcours scénique.',
		icon: 'career'
	},
	{
		slug: 'points',
		file: '04-points-et-progression.md',
		nav: 'Points et progression',
		summary: 'Ce qui rapporte, ce qui ne rapporte rien, niveaux, paliers et succès.',
		icon: 'points'
	},
	{
		slug: 'rencontrer',
		file: '05-rencontrer.md',
		nav: 'Rencontrer des musicien·nes',
		summary: 'Découvrir, les annonces, les messages et ton réseau musical.',
		icon: 'meet'
	},
	{
		slug: 'securite',
		file: '06-securite.md',
		nav: 'Sécurité et vie privée',
		summary: 'Lieux sûrs, mineur·es, bloquer, signaler et tes données.',
		icon: 'safety'
	}
];

export function helpHref(page: Pick<HelpPage, 'slug'>): string {
	return page.slug ? `/aide/${page.slug}` : '/aide';
}

export function helpPage(slug: string): HelpPage | null {
	return HELP_PAGES.find((p) => p.slug === slug) ?? null;
}

/** Page précédente et suivante, dans l'ordre de lecture. */
export function neighbours(slug: string) {
	const i = HELP_PAGES.findIndex((p) => p.slug === slug);
	return {
		previous: i > 0 ? HELP_PAGES[i - 1] : null,
		next: i >= 0 && i < HELP_PAGES.length - 1 ? HELP_PAGES[i + 1] : null
	};
}
