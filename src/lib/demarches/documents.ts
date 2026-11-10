/**
 * Documents préremplis (P3-15b, conception 09 §1.3) : ce que l'app sait déjà,
 * mis en forme pour être imprimé. LinkMusician **ne fixe rien** : les parts
 * du bulletin de partage restent à écrire et à signer à la main, l'état
 * civil aussi. Module pur.
 */

export type RoleKind = 'INSTRUMENT' | 'COMPOSITION' | 'LYRICS' | 'ARRANGEMENT';

/** Ce qui ouvre une part d'auteur (paroles, musique, arrangement). */
export const WRITING_ROLES: readonly RoleKind[] = ['LYRICS', 'COMPOSITION', 'ARRANGEMENT'];

const WRITING_LABELS: Record<Exclude<RoleKind, 'INSTRUMENT'>, string> = {
	LYRICS: 'Paroles',
	COMPOSITION: 'Musique',
	ARRANGEMENT: 'Arrangement'
};

export type Credit = {
	name: string;
	confirmed: boolean;
	roles: { kind: RoleKind; instrument?: string | null }[];
};

export type SharingSheet = {
	/** Auteur·es, compositeur·rices, arrangeur·ses : une ligne chacun·e. */
	writers: { name: string; roles: string[] }[];
	/** Interprètes (pour mémoire : pas de part d'auteur). */
	performers: { name: string; instruments: string[] }[];
	/** Crédits pas encore confirmés : absents du bulletin, signalés. */
	pending: number;
	/** Colonnes de parts à remplir : une par type de rôle présent. */
	columns: string[];
};

/** Bulletin de partage d'un morceau, d'après ses crédits confirmés. */
export function sharingSheet(credits: readonly Credit[]): SharingSheet {
	const confirmed = credits.filter((c) => c.confirmed);
	const writers = confirmed
		.map((c) => ({
			name: c.name,
			roles: WRITING_ROLES.filter((k) => c.roles.some((r) => r.kind === k)).map(
				(k) => WRITING_LABELS[k as Exclude<RoleKind, 'INSTRUMENT'>]
			)
		}))
		.filter((w) => w.roles.length > 0);
	const performers = confirmed
		.map((c) => ({
			name: c.name,
			instruments: c.roles
				.filter((r) => r.kind === 'INSTRUMENT')
				.map((r) => r.instrument ?? 'Instrument')
		}))
		.filter((p) => p.instruments.length > 0);
	const present = new Set(writers.flatMap((w) => w.roles));
	return {
		writers,
		performers,
		pending: credits.length - confirmed.length,
		columns: Object.values(WRITING_LABELS).filter((l) => present.has(l))
	};
}

export type ProgramWork = {
	title: string;
	credits: Credit[];
};

export type ProgramLine = {
	title: string;
	/** Paroles et musique, d'après les crédits confirmés. */
	lyrics: string[];
	music: string[];
};

/** Lignes vides laissées pour les reprises et les ajouts du jour. */
export const PROGRAM_BLANK_LINES = 6;

/**
 * Programme des œuvres d'un concert : les morceaux composés du groupe, avec
 * leurs auteur·es et compositeur·rices confirmé·es. Les reprises s'ajoutent
 * à la main.
 */
export function concertProgram(works: readonly ProgramWork[]): ProgramLine[] {
	const who = (w: ProgramWork, kind: RoleKind) =>
		w.credits.filter((c) => c.confirmed && c.roles.some((r) => r.kind === kind)).map((c) => c.name);
	return [...works]
		.sort((a, b) => a.title.localeCompare(b.title, 'fr'))
		.map((w) => ({ title: w.title, lyrics: who(w, 'LYRICS'), music: who(w, 'COMPOSITION') }));
}
