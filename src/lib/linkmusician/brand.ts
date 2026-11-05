/**
 * LINKMUSICIAN: identité du produit (D9), en un seul endroit. Les fichiers du
 * boilerplate qui affichaient « MadeInDiamonds » en dur lisent ces valeurs.
 *
 * Le domaine est provisoire : il sera choisi avant l'ouverture publique
 * (P3-10). Le changer ici, dans `static/robots.txt` et dans
 * `static/pwa/manifest.webmanifest`.
 */
export const BRAND = {
	name: 'LinkMusician',
	url: 'https://linkmusician.fr',
	tagline: 'Trouve avec qui jouer. Avance comme dans un jeu.',
	description:
		'LinkMusician, la plateforme des musicien·nes : trouve avec qui jammer près de chez toi, monte ton groupe, enregistre, joue sur scène, et vois ta carrière avancer comme dans un jeu.',
	keywords:
		'musiciens, trouver des musiciens, jam, groupe de musique, recherche musicien, annonces musiciens, ingé son, producteur, scène locale, LinkMusician',
	email: 'contact@linkmusician.fr',
	/** Couleur principale (violet des maquettes P1-02). */
	themeColor: '#7c3aed'
} as const;
