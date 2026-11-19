/**
 * LINKMUSICIAN: fond Metro de la page (D55, D56). Le fond enveloppe l'en-tête,
 * la page et le pied de page dans un même conteneur (`MetroBackdrop`, posé par
 * la mise en page racine). Les modules du boilerplate en veille (boutique,
 * blog, administration, D6) et les maquettes gardent le leur.
 */
export type Backdrop = { metro: boolean; aurora: 'jam' | 'career' | 'mix' | null };

const BOILERPLATE = [
	'/admin',
	'/blog',
	'/products',
	'/checkout',
	'/suivi-commande',
	'/cgv',
	'/_lab'
];

const under = (pathname: string, prefix: string) =>
	pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Le fond d'une page : papier Metro, et l'Aurora sur les accueils (Q38). */
export function backdropFor(pathname: string): Backdrop {
	// Melokiva Diagram (D80) : sa coquille pose elle-même le papier Metro.
	if (
		pathname === '/' ||
		under(pathname, '/diagram') ||
		BOILERPLATE.some((p) => under(pathname, p))
	) {
		return { metro: false, aurora: null };
	}
	// Accueils de mode et profil public : seulement l'accueil lui-même, jamais
	// ses écrans (un formulaire ou un long texte ne se lit pas sur l'Aurora).
	if (pathname === '/jam') return { metro: true, aurora: 'jam' };
	if (pathname === '/espace') return { metro: true, aurora: 'career' };
	if (pathname === '/jouer' || /^\/jouer\/[^/]+$/.test(pathname) || /^\/@[^/]+$/.test(pathname)) {
		return { metro: true, aurora: 'mix' };
	}
	return { metro: true, aurora: null };
}
