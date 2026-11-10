/**
 * Guide des démarches (P3-15a, D42, conception 09) : la liste des fiches,
 * avec ce qui les rend fiables : date de vérification, sources officielles
 * et relecture par quelqu'un du métier. Le texte vit dans
 * `src/lib/demarches/fiches/*.md` (une fiche = un fichier), rendu par
 * `#lib/server/demarches/render`. Module pur.
 *
 * Écart avec la conception 09 §4 : l'en-tête de chaque fiche (date,
 * sources) est ici plutôt que dans le Markdown, pour que le test le
 * vérifie sans analyseur de métadonnées.
 */

/** Les moments de la vie musicale (conception 09 §2), dans l'ordre. */
export const MOMENTS = {
	creer: 'Créer un morceau',
	publier: 'Publier',
	concert: 'Jouer en concert',
	groupe: 'Le groupe'
} as const;
export type Moment = keyof typeof MOMENTS;

export type Source = { label: string; url: string };

export type Fiche = {
	slug: string;
	file: string;
	moment: Moment;
	/** Titre court, pour les listes et les liens. */
	title: string;
	/** Une phrase, pour les cartes et le SEO. */
	summary: string;
	/** Date de la dernière vérification sur les sources (AAAA-MM-JJ). */
	verifiedAt: string;
	/** Sources officielles d'abord (conception 09 §5). */
	sources: readonly Source[];
	/**
	 * Relecture par quelqu'un du métier (D42). `null` : pas encore relue,
	 * la fiche le dit en tête. À remplir avant l'ouverture publique.
	 */
	reviewedBy: { who: string; at: string } | null;
};

/** Une fiche dont la vérification a plus d'un an est à revoir (09 §5). */
export const MAX_AGE_DAYS = 365;

const LEGIFRANCE = 'https://www.legifrance.gouv.fr';

export const FICHES: readonly Fiche[] = [
	{
		slug: 'proteger-un-morceau',
		file: 'proteger-un-morceau.md',
		moment: 'creer',
		title: 'Protéger un morceau',
		summary:
			'Le droit d’auteur naît avec le morceau ; ce qui manque souvent, c’est la preuve de la date.',
		verifiedAt: '2026-11-10',
		sources: [
			{
				label: 'INPI : déposer une e-Soleau',
				url: 'https://www.inpi.fr/realiser-demarches/propriete-intellectuelle/deposer-une-e-soleau-ou-un-entiercement'
			},
			{
				label: 'INPI : proroger une e-Soleau',
				url: 'https://www.inpi.fr/realiser-demarches/propriete-intellectuelle/proroger-une-e-soleau'
			},
			{
				label: 'Code de la propriété intellectuelle, article L111-1',
				url: `${LEGIFRANCE}/codes/texte_lc/LEGITEXT000006069414`
			}
		],
		reviewedBy: null
	},
	{
		slug: 'ecrire-a-plusieurs',
		file: 'ecrire-a-plusieurs.md',
		moment: 'creer',
		title: 'Écrire un morceau à plusieurs',
		summary:
			'Qui a écrit les paroles, qui a composé, et à quel pourcentage : à écrire avant que l’argent arrive.',
		verifiedAt: '2026-11-10',
		sources: [
			{ label: 'Sacem : déclarer une œuvre', url: 'https://www.sacem.fr' },
			{
				label: 'Code de la propriété intellectuelle, article L113-3 (œuvre de collaboration)',
				url: `${LEGIFRANCE}/codes/texte_lc/LEGITEXT000006069414`
			}
		],
		reviewedBy: null
	},
	{
		slug: 'premiere-demo',
		file: 'premiere-demo.md',
		moment: 'publier',
		title: 'Première démo et déclaration des œuvres',
		summary:
			'Avant de publier, déclarer ses morceaux auprès d’une société d’auteurs pour ne pas perdre de droits.',
		verifiedAt: '2026-11-10',
		sources: [
			{ label: 'Sacem : devenir membre', url: 'https://www.sacem.fr' },
			{
				label: 'Centre national de la musique : ressources',
				url: 'https://cnm.fr'
			}
		],
		reviewedBy: null
	},
	{
		slug: 'premier-concert',
		file: 'premier-concert.md',
		moment: 'concert',
		title: 'Premier concert et programme des œuvres',
		summary:
			'Le lieu déclare le concert et paie la Sacem ; le groupe remet la liste des morceaux joués.',
		verifiedAt: '2026-11-10',
		sources: [
			{ label: 'Sacem : organiser un concert', url: 'https://www.sacem.fr' },
			{
				label: 'Ministère de la Culture : organisateur occasionnel de spectacles',
				url: 'https://www.culture.gouv.fr/Media/Medias-creation-rapide/Vos-demarches-et-responsabilites-en-tant-qu-organisateur-occasionnel-de-spectacles-vivants'
			}
		],
		reviewedBy: null
	},
	{
		slug: 'etre-paye-pour-un-concert',
		file: 'etre-paye-pour-un-concert.md',
		moment: 'concert',
		title: 'Être payé·e pour un concert',
		summary:
			'Un·e musicien·ne payé·e pour jouer est salarié·e : un cachet, déclaré par l’organisateur (souvent par le GUSO).',
		verifiedAt: '2026-11-10',
		sources: [
			{ label: 'GUSO', url: 'https://www.guso.fr' },
			{
				label: 'Code du travail, article L7121-3 (présomption de salariat)',
				url: `${LEGIFRANCE}/codes/texte_lc/LEGITEXT000006072050`
			},
			{
				label: 'Artcena : le GUSO',
				url: 'https://www.artcena.fr/precis-juridique/droit-du-travail/artistes-et-compagnies-amateurs/guichet-unique-du-spectacle-occasionnel-guso'
			}
		],
		reviewedBy: null
	},
	{
		slug: 'jouer-gratuitement',
		file: 'jouer-gratuitement.md',
		moment: 'concert',
		title: 'Jouer gratuitement ou au chapeau',
		summary:
			'La pratique amateur est libre ; ce qu’il faut éviter, c’est une rémunération déguisée.',
		verifiedAt: '2026-11-10',
		sources: [
			{
				label: 'Ministère de la Culture : décret n° 2017-1049 du 10 mai 2017 (artistes amateurs)',
				url: 'https://www.culture.gouv.fr/Media/Regions/Dac-de-la-Reunion/Files/2018/Spectacle-vivant/Decret-du-10-mai-2017-amateurs'
			},
			{
				label: 'Sénat : question écrite sur la pratique amateur (2018)',
				url: 'https://www.senat.fr/questions/base/2018/qSEQ18040325S.html'
			}
		],
		reviewedBy: null
	},
	{
		slug: 'association-du-groupe',
		file: 'association-du-groupe.md',
		moment: 'groupe',
		title: 'L’association du groupe',
		summary:
			'Pour encaisser de l’argent au nom du groupe : une association loi 1901, gratuite à déclarer.',
		verifiedAt: '2026-11-10',
		sources: [
			{
				label: 'Service-public.fr : créer une association',
				url: 'https://www.service-public.fr/associations'
			},
			{
				label: 'Justice.fr : coût de la publication au Journal officiel',
				url: 'https://www.justice.fr/fiche/combien-coute-publication-journal-officiel-jo-association'
			},
			{ label: 'GUSO', url: 'https://www.guso.fr' }
		],
		reviewedBy: null
	},
	{
		slug: 'mineurs-sur-scene',
		file: 'mineurs-sur-scene.md',
		moment: 'concert',
		title: 'Les mineur·es sur scène',
		summary:
			'Pour les jeunes musicien·nes et leurs parents : ce qui demande une autorisation, et ce qui reste libre.',
		verifiedAt: '2026-11-10',
		sources: [
			{
				label: 'DREETS Normandie : emploi d’un enfant de moins de 16 ans dans le spectacle',
				url: 'https://normandie.dreets.gouv.fr/Emploi-d-un-enfant-age-de-moins-de-16-ans-dans-les-secteurs-du-spectacle-vivant'
			},
			{
				label: 'Code du travail, article L7124-1',
				url: `${LEGIFRANCE}/codes/texte_lc/LEGITEXT000006072050`
			}
		],
		reviewedBy: null
	}
];

export const FICHES_BY_SLUG: ReadonlyMap<string, Fiche> = new Map(FICHES.map((f) => [f.slug, f]));

export function ficheBySlug(slug: string): Fiche | null {
	return FICHES_BY_SLUG.get(slug) ?? null;
}

export function ficheHref(slug: string): string {
	return `/demarches/${slug}`;
}

/** Les fiches regroupées par moment, dans l'ordre de la conception. */
export function fichesByMoment(): { moment: Moment; label: string; fiches: Fiche[] }[] {
	return (Object.keys(MOMENTS) as Moment[])
		.map((moment) => ({
			moment,
			label: MOMENTS[moment],
			fiches: FICHES.filter((f) => f.moment === moment)
		}))
		.filter((g) => g.fiches.length > 0);
}

/** Âge de la vérification, en jours entiers. */
export function verificationAgeDays(fiche: Pick<Fiche, 'verifiedAt'>, now = new Date()): number {
	const verified = Date.parse(`${fiche.verifiedAt}T00:00:00Z`);
	return Math.floor((now.getTime() - verified) / 86_400_000);
}
