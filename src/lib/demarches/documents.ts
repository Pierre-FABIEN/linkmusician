/**
 * Documents préremplis (P3-15b, conception 09 §1.3 et §4) : ce que l'app sait
 * déjà, mis en page pour être imprimé, complété et signé à la main.
 *
 * - **Bulletin de partage** d'un morceau : les crédits confirmés et leurs
 *   rôles (paroles, musique, arrangement cochés d'après LinkMusician). Les
 *   **parts restent vides** : LinkMusician ne fixe rien (09 §4).
 * - **Programme des œuvres** d'un concert : les morceaux composés du groupe,
 *   avec leurs auteur·rices et compositeur·rices ; date, lieu, durées et
 *   reprises à compléter.
 *
 * Rien ne rapporte d'XP (09 §1.6). Module pur : le rendu PDF est dans
 * `#lib/server/demarches/pdf`.
 */

export type CreditKind = 'INSTRUMENT' | 'COMPOSITION' | 'LYRICS' | 'ARRANGEMENT';

export type SplitSheetInput = {
	title: string;
	owner: { name: string; isBand: boolean };
	composedAt: Date | null;
	/** Crédits **confirmés** seulement, comptes supprimés exclus. */
	credits: { name: string; kinds: readonly CreditKind[]; roles: readonly string[] }[];
};

export type SplitSheetRow = {
	name: string;
	lyrics: boolean;
	music: boolean;
	arrangement: boolean;
	/** Ce que la personne fait dans le morceau, d'après LinkMusician. */
	roles: string;
};

export type SplitSheetView = {
	filename: string;
	heading: string;
	title: string;
	facts: { label: string; value: string }[];
	rows: SplitSheetRow[];
	/** Lignes vides en plus, pour une personne absente de l'app. */
	blankRows: number;
	notes: string[];
};

export type ProgramInput = {
	band: string;
	/** Morceaux **composés** du groupe. */
	works: { title: string; creators: readonly string[] }[];
};

export type ProgramView = {
	filename: string;
	heading: string;
	band: string;
	/** Champs à remplir à la main. */
	blanks: string[];
	rows: { title: string; creators: string }[];
	/** Lignes vides pour les reprises et les morceaux ajoutés. */
	blankRows: number;
	notes: string[];
};

const dayFormat = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'Europe/Paris'
});

/** « 1er octobre 2026 », « 12 octobre 2026 ». */
export function frenchDay(date: Date): string {
	return dayFormat.format(date).replace(/^1 /, '1er ');
}

/** Nom de fichier sûr : sans accents, ni espaces, ni caractères spéciaux. */
export function safeFilename(prefix: string, title: string): string {
	const slug = title
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^A-Za-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return `${prefix}${slug ? `-${slug}` : ''}.pdf`;
}

export function splitSheetView(input: SplitSheetInput, now: Date = new Date()): SplitSheetView {
	const rows = input.credits
		.map((c) => ({
			name: c.name,
			lyrics: c.kinds.includes('LYRICS'),
			music: c.kinds.includes('COMPOSITION'),
			arrangement: c.kinds.includes('ARRANGEMENT'),
			roles: c.roles.join(', ')
		}))
		.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
	return {
		filename: safeFilename('bulletin-de-partage', input.title),
		heading: 'Bulletin de partage',
		title: input.title,
		facts: [
			{ label: input.owner.isBand ? 'Groupe' : 'Porté par', value: input.owner.name },
			...(input.composedAt ? [{ label: 'Composé le', value: frenchDay(input.composedAt) }] : []),
			{ label: 'Préparé le', value: frenchDay(now) }
		],
		rows,
		blankRows: rows.length >= 8 ? 1 : 2,
		notes: [
			'Cochez ce que chaque personne a écrit, corrigez si besoin, puis inscrivez les parts. Le total des parts « paroles » fait 100 %, celui des parts « musique » aussi.',
			'Les cases cochées viennent des crédits confirmés dans LinkMusician. LinkMusician ne fixe aucune part : elles se décident entre vous.',
			'Chaque personne date et signe. Pour une personne mineure, un parent signe aussi.',
			'Cet accord reste entre vous : il ne remplace pas la déclaration du morceau à la Sacem, où vous reporterez les mêmes parts.'
		]
	};
}

export function programView(input: ProgramInput): ProgramView {
	return {
		filename: safeFilename('programme-des-oeuvres', input.band),
		heading: 'Programme des œuvres',
		band: input.band,
		blanks: ['Date du concert', 'Lieu', 'Organisateur'],
		rows: input.works
			.map((w) => ({
				title: w.title,
				creators: w.creators.length ? w.creators.join(', ') : 'À compléter'
			}))
			.sort((a, b) => a.title.localeCompare(b.title, 'fr')),
		blankRows: 6,
		notes: [
			'Rayez les morceaux que vous ne jouez pas, ajoutez les reprises avec leurs auteurs d’origine, et indiquez la durée de chaque morceau.',
			'Remettez ce programme à l’organisateur : c’est lui qui déclare le concert à la Sacem, et ce programme permet aux auteurs d’être payés.'
		]
	};
}
