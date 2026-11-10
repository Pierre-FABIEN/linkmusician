/**
 * Guide des démarches (P3-15a, D42, conception 09) : la liste des fiches,
 * rangées par moment de la vie musicale. Le contenu vit dans
 * `src/lib/demarches/fiches/*.md` (une fiche = un fichier, avec un en-tête
 * qui porte la date de vérification et les sources officielles), rendu par
 * `#lib/server/demarches/render`. Voir `docs/demarches/README.md`.
 *
 * Module pur, partagé par le serveur et le navigateur.
 */

export const MOMENTS = ['creer', 'publier', 'scene', 'groupe'] as const;
export type Moment = (typeof MOMENTS)[number];

export const MOMENT_INFO: Record<Moment, { label: string; text: string }> = {
	creer: { label: 'Créer un morceau', text: 'Prouver la date, écrire à plusieurs.' },
	publier: { label: 'Publier', text: 'Mettre une démo en ligne sans perdre ses droits.' },
	scene: { label: 'Jouer en concert', text: 'Le programme, le cachet, la pratique amateur.' },
	groupe: { label: 'Le groupe', text: 'Encaisser de l’argent ensemble.' }
};

export type FicheSlug =
	| 'proteger-un-morceau'
	| 'ecrire-a-plusieurs'
	| 'premiere-demo'
	| 'premier-concert'
	| 'etre-paye-pour-jouer'
	| 'jouer-gratuitement'
	| 'association-du-groupe'
	| 'mineurs-sur-scene';

export type Fiche = {
	slug: FicheSlug;
	file: string;
	moment: Moment;
	/** Titre court, pour les listes et les liens. */
	nav: string;
	/** Une phrase, pour les cartes et le SEO. */
	summary: string;
	/** Fiche écrite aussi pour les mineur·es et leurs parents (D5, 09 §1.7). */
	minors?: boolean;
};

/** Les fiches du lancement (09 §2, colonne « Lancement »), dans l'ordre de lecture. */
export const FICHES: readonly Fiche[] = [
	{
		slug: 'proteger-un-morceau',
		file: 'proteger-un-morceau.md',
		moment: 'creer',
		nav: 'Protéger un morceau',
		summary: 'Le droit d’auteur naît avec le morceau ; ce qui manque, c’est la preuve de la date.'
	},
	{
		slug: 'ecrire-a-plusieurs',
		file: 'ecrire-a-plusieurs.md',
		moment: 'creer',
		nav: 'Écrire un morceau à plusieurs',
		summary: 'Qui a écrit quoi, et à quelle part : à fixer avant que l’argent arrive.'
	},
	{
		slug: 'premiere-demo',
		file: 'premiere-demo.md',
		moment: 'publier',
		nav: 'Première démo et déclaration des œuvres',
		summary: 'Avant de publier : déclarer ses morceaux pour toucher ses droits d’auteur.'
	},
	{
		slug: 'premier-concert',
		file: 'premier-concert.md',
		moment: 'scene',
		nav: 'Premier concert et programme des œuvres',
		summary: 'Qui déclare quoi, et la liste des morceaux à remettre au lieu.'
	},
	{
		slug: 'etre-paye-pour-jouer',
		file: 'etre-paye-pour-jouer.md',
		moment: 'scene',
		nav: 'Être payé·e pour jouer',
		summary: 'Un cachet, c’est un salaire : qui t’emploie, le GUSO, ce qu’il faut garder.'
	},
	{
		slug: 'jouer-gratuitement',
		file: 'jouer-gratuitement.md',
		moment: 'scene',
		nav: 'Jouer gratuitement ou au chapeau',
		summary: 'Ce que permet la pratique amateur, et où elle s’arrête.'
	},
	{
		slug: 'association-du-groupe',
		file: 'association-du-groupe.md',
		moment: 'groupe',
		nav: 'L’association du groupe',
		summary: 'Faut-il une association ? Ce que ça permet, ce que ça coûte, ce que ça engage.'
	},
	{
		slug: 'mineurs-sur-scene',
		file: 'mineurs-sur-scene.md',
		moment: 'scene',
		nav: 'Jouer sur scène avant 18 ans',
		summary: 'Pour les mineur·es et leurs parents : autorisations, argent, horaires.',
		minors: true
	}
];

export function demarcheHref(slug: FicheSlug): string {
	return `/demarches/${slug}`;
}

export function fiche(slug: string): Fiche | null {
	return FICHES.find((f) => f.slug === slug) ?? null;
}

export function fichesByMoment(): { moment: Moment; fiches: Fiche[] }[] {
	return MOMENTS.map((moment) => ({
		moment,
		fiches: FICHES.filter((f) => f.moment === moment)
	})).filter((g) => g.fiches.length > 0);
}

// ─── En-tête des fiches ─────────────────────────────────────────────────────

/**
 * Sources officielles admises (09 §5) : une source secondaire ne suffit pas à
 * fonder une règle. Comparé au nom d'hôte, sous-domaines compris.
 */
export const OFFICIAL_HOSTS = [
	'sacem.fr',
	'inpi.fr',
	'guso.fr',
	'service-public.fr',
	'associations.gouv.fr',
	'dreets.gouv.fr',
	'culture.gouv.fr',
	'legifrance.gouv.fr',
	'cnm.fr',
	'artcena.fr',
	'adami.fr',
	'spedidam.fr'
] as const;

export function isOfficialSource(url: string): boolean {
	let host: string;
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'https:') return false;
		host = parsed.hostname;
	} catch {
		return false;
	}
	return OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/** Une fiche doit être revérifiée au moins une fois par an (09 §5). */
export const MAX_AGE_DAYS = 365;

export type FicheMeta = {
	/** Date de vérification sur les sources, `AAAA-MM-JJ`. */
	verifiedOn: string;
	sources: { label: string; url: string }[];
	/** Relue par quelqu'un du métier (09 §5) : obligatoire avant l'ouverture. */
	reviewed: boolean;
};

/**
 * Sépare l'en-tête (`---` … `---`) du corps Markdown. Format :
 *
 * ```
 * ---
 * verifie: 2026-11-10
 * relue: non
 * sources:
 *   - INPI, déposer une e-Soleau | https://www.inpi.fr/…
 * ---
 * ```
 */
export function parseFiche(raw: string): { meta: FicheMeta; body: string } {
	const text = raw.replace(/\r\n/g, '\n');
	const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
	const meta: FicheMeta = { verifiedOn: '', sources: [], reviewed: false };
	if (!match) return { meta, body: text };
	let inSources = false;
	for (const line of match[1].split('\n')) {
		const source = /^\s+-\s+(.+?)\s*\|\s*(\S+)\s*$/.exec(line);
		if (inSources && source) {
			meta.sources.push({ label: source[1], url: source[2] });
			continue;
		}
		inSources = false;
		const field = /^(\w+):\s*(.*)$/.exec(line);
		if (!field) continue;
		const [, key, value] = field;
		if (key === 'verifie') meta.verifiedOn = value.trim();
		else if (key === 'relue') meta.reviewed = value.trim() === 'oui';
		else if (key === 'sources') inSources = true;
	}
	return { meta, body: text.slice(match[0].length) };
}

/** Âge de la vérification en jours, ou `null` si la date est illisible. */
export function verificationAgeDays(verifiedOn: string, now: Date = new Date()): number | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(verifiedOn)) return null;
	const day = Date.parse(`${verifiedOn}T00:00:00Z`);
	if (Number.isNaN(day)) return null;
	return Math.floor((now.getTime() - day) / 86_400_000);
}

/** « 10 novembre 2026 ». */
export function frenchDate(verifiedOn: string): string {
	const day = Date.parse(`${verifiedOn}T12:00:00Z`);
	if (Number.isNaN(day)) return verifiedOn;
	return new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	}).format(day);
}
