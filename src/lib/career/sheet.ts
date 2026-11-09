/**
 * Fiche de carrière (P3-14, conception 07 §4.6, D1) : règle pure.
 *
 * Comme la fiche d'un joueur : jams, rencontres, collaborations, morceaux,
 * concerts, villes, appréciations, groupes, épreuves. La version
 * **publique** ne garde que les faits **confirmés par d'autres** ; la
 * version privée y ajoute ce que la personne déclare seule (« J'y étais »,
 * morceaux composés seul·e) et sa progression (XP, niveau). Jamais de
 * confiance, nulle part.
 */

export type CareerSheet = {
	/** Jams où quelqu'un t'a apprécié·e (confirmé par d'autres). */
	jamsAppreciated: number;
	/** Personnes avec qui l'on a vraiment joué (appréciations, collaborations). */
	peopleMet: number;
	collaborations: number;
	/** Morceaux composés à plusieurs, rôles confirmés. */
	worksTogether: number;
	/** Rôles crédités sur des morceaux corroborés. */
	credits: number;
	/** Concerts corroborés. */
	gigs: number;
	/** Villes des jams où l'on a été apprécié·e. */
	cities: string[];
	/** Personnes distinctes qui t'ont apprécié·e. */
	appreciatedBy: number;
	/** Groupes actifs (adhésion acceptée des deux côtés). */
	bands: number;
	/** Épreuves de la carte franchies (numéros d'acte). */
	actsPassed: number[];
};

/** Ce que seule la personne voit (déclaratif ou progression). */
export type PrivateExtras = {
	/** Jams où l'on a dit « J'y étais ». */
	jamsAttended: number;
	/** Morceaux composés seul·e. */
	worksSolo: number;
	xp: number;
	level: number;
};

const PUBLIC_KEYS: readonly (keyof CareerSheet)[] = [
	'jamsAppreciated',
	'peopleMet',
	'collaborations',
	'worksTogether',
	'credits',
	'gigs',
	'cities',
	'appreciatedBy',
	'bands',
	'actsPassed'
];

/** Fiche publique : seulement les faits confirmés, aucune donnée privée. */
export function publicSheet(sheet: CareerSheet & Partial<PrivateExtras>): CareerSheet {
	return Object.fromEntries(PUBLIC_KEYS.map((k) => [k, sheet[k]])) as CareerSheet;
}

/** Lignes de la fiche, pour l'affichage (un libellé, une valeur). */
export function sheetLines(sheet: CareerSheet) {
	const n = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;
	return [
		{ label: 'Jams appréciées', value: n(sheet.jamsAppreciated, 'jam', 'jams') },
		{ label: 'Rencontres', value: n(sheet.peopleMet, 'musicien·ne', 'musicien·nes') },
		{ label: 'Collaborations', value: n(sheet.collaborations, 'confirmée', 'confirmées') },
		{ label: 'Morceaux à plusieurs', value: n(sheet.worksTogether, 'morceau', 'morceaux') },
		{ label: 'Crédits confirmés', value: n(sheet.credits, 'rôle', 'rôles') },
		{ label: 'Concerts', value: n(sheet.gigs, 'corroboré', 'corroborés') },
		{ label: 'Recommandé·e par', value: n(sheet.appreciatedBy, 'personne', 'personnes') },
		{ label: 'Groupes', value: n(sheet.bands, 'groupe', 'groupes') },
		{
			label: 'Villes',
			value: sheet.cities.length > 0 ? sheet.cities.join(', ') : 'Aucune pour l’instant'
		}
	];
}
