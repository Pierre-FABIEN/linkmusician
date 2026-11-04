/**
 * Contrôle d'intégrité des référentiels (instruments, genres) avant leur
 * chargement en base. Module pur : utilisé par les tests sur les listes de
 * `prisma/seed-data/`.
 */
import { INSTRUMENT_FAMILIES } from './instruments';

/** Même format que les handles : minuscules sans accent, chiffres, tirets. */
export const REFERENTIAL_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type InstrumentData = Record<string, readonly (readonly [string, string])[]>;
export type GenreData = readonly {
	slug: string;
	name: string;
	children: readonly (readonly [string, string])[];
}[];

function checkEntry(slug: string, name: string, seen: Set<string>, problems: string[]) {
	if (!REFERENTIAL_SLUG.test(slug)) problems.push(`slug invalide : « ${slug} »`);
	if (seen.has(slug)) problems.push(`slug en double : « ${slug} »`);
	if (name.trim() === '' || name !== name.trim()) problems.push(`nom invalide pour « ${slug} »`);
	seen.add(slug);
}

/** Liste des problèmes de la liste d'instruments (vide si tout va bien). */
export function checkInstrumentData(data: InstrumentData): string[] {
	const problems: string[] = [];
	const seen = new Set<string>();
	for (const family of Object.keys(data)) {
		if (!(INSTRUMENT_FAMILIES as readonly string[]).includes(family)) {
			problems.push(`famille inconnue : « ${family} »`);
		}
		if (data[family].length === 0) problems.push(`famille vide : « ${family} »`);
		for (const [slug, name] of data[family]) checkEntry(slug, name, seen, problems);
	}
	for (const family of INSTRUMENT_FAMILIES) {
		if (!(family in data)) problems.push(`famille sans instrument : « ${family} »`);
	}
	return problems;
}

/**
 * Liste des problèmes de l'arbre des genres. La structure (un parent, des
 * enfants sans enfant) garantit déjà les deux niveaux de D12 ; on vérifie
 * l'unicité des slugs sur tout l'arbre.
 */
export function checkGenreData(data: GenreData): string[] {
	const problems: string[] = [];
	const seen = new Set<string>();
	for (const parent of data) {
		checkEntry(parent.slug, parent.name, seen, problems);
		for (const [slug, name] of parent.children) checkEntry(slug, name, seen, problems);
	}
	return problems;
}
