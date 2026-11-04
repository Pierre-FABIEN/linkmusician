/**
 * Floutage de la localisation (P1-05).
 *
 * Invariant du projet : aucune localisation précise n'est stockée. Le seul
 * point enregistré pour un acteur est le **centre de sa commune**, aligné sur
 * une grille d'environ 2 km. Il ne dépend donc que de la commune choisie,
 * jamais d'une adresse ou d'une position GPS. La grille ajoute une marge pour
 * les petites communes voisines et évite d'exposer le centroïde officiel.
 *
 * Module pur (aucun accès réseau ni base), partagé par le serveur et le
 * navigateur.
 */

export type LatLng = { lat: number; lng: number };

/** Commune telle que renvoyée par geo.api.gouv.fr (champs utiles). */
export type Commune = {
	code: string;
	nom: string;
	codeDepartement: string;
	codesPostaux: string[];
	population?: number;
	centre: LatLng;
};

export const GRID_KM = 2;
const KM_PER_DEGREE_LAT = 111.32;

/**
 * Aligne un point sur une grille d'environ `cellKm` km. La latitude est
 * arrondie d'abord, puis la longitude avec un pas calculé à cette latitude
 * arrondie : le résultat ne dépend que de la cellule, pas du point d'origine.
 */
export function snapToGrid(point: LatLng, cellKm = GRID_KM): LatLng {
	const latStep = cellKm / KM_PER_DEGREE_LAT;
	const lat = Math.round(point.lat / latStep) * latStep;
	const lngStep = cellKm / (KM_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));
	const lng = Math.round(point.lng / lngStep) * lngStep;
	return { lat: round6(lat), lng: round6(lng) };
}

/** Point stocké pour une commune : son centre, aligné sur la grille. */
export function fuzzedPointOf(commune: Pick<Commune, 'centre'>): LatLng {
	return snapToGrid(commune.centre);
}

function round6(value: number): number {
	return Math.round(value * 1e6) / 1e6;
}
