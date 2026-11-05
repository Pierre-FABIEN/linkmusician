/**
 * Recherche de musicien·nes (P2-01) : filtres lus dans l'URL. Module pur,
 * partagé par le serveur et le navigateur. Une valeur inconnue ou invalide
 * est ignorée (jamais d'erreur) : l'URL reste partageable et robuste.
 */
import {
	LOOKING_FOR,
	PRO_STATUSES,
	type LookingForValue,
	type ProStatusValue
} from '#lib/actors/profile';
import { isInstrumentLevel, type InstrumentLevel } from '#lib/skills/levels';

/** Rayons proposés (km), alignés sur les tranches de distance. */
export const SEARCH_RADII = [5, 10, 25, 50, 100] as const;
export type SearchRadius = (typeof SEARCH_RADII)[number];
export const DEFAULT_RADIUS: SearchRadius = 25;

/** Résultats par page ; au-delà de `MAX_PAGE`, on affine plutôt que de défiler. */
export const PAGE_SIZE = 20;
export const MAX_PAGE = 10;

const SLUG = /^[a-z0-9-]{1,60}$/;

export type SearchFilters = {
	instrument: string | null;
	minLevel: InstrumentLevel | null;
	genre: string | null;
	radius: SearchRadius;
	lookingFor: LookingForValue | null;
	proStatus: ProStatusValue | null;
	/** Seulement les personnes dont le rayon de déplacement me couvre aussi. */
	reciprocal: boolean;
	page: number;
};

const oneOf = <T extends string>(list: readonly T[], value: string | null): T | null =>
	value !== null && (list as readonly string[]).includes(value) ? (value as T) : null;

export function parseFilters(params: URLSearchParams): SearchFilters {
	const slug = (key: string) => {
		const v = params.get(key)?.trim().toLowerCase() ?? '';
		return SLUG.test(v) ? v : null;
	};
	const level = Number(params.get('niveau'));
	const radius = Number(params.get('rayon'));
	const page = Number(params.get('page'));
	return {
		instrument: slug('instrument'),
		minLevel: isInstrumentLevel(level) ? level : null,
		genre: slug('genre'),
		radius: (SEARCH_RADII as readonly number[]).includes(radius)
			? (radius as SearchRadius)
			: DEFAULT_RADIUS,
		lookingFor: oneOf(LOOKING_FOR, params.get('recherche')),
		proStatus: oneOf(PRO_STATUSES, params.get('statut')),
		reciprocal: params.get('reciproque') === '1',
		page: Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1
	};
}

/** URL de recherche (paramètres par défaut omis), pour les liens et la pagination. */
export function filtersToParams(filters: SearchFilters): URLSearchParams {
	const params = new URLSearchParams();
	if (filters.instrument) params.set('instrument', filters.instrument);
	if (filters.minLevel) params.set('niveau', String(filters.minLevel));
	if (filters.genre) params.set('genre', filters.genre);
	if (filters.radius !== DEFAULT_RADIUS) params.set('rayon', String(filters.radius));
	if (filters.lookingFor) params.set('recherche', filters.lookingFor);
	if (filters.proStatus) params.set('statut', filters.proStatus);
	if (filters.reciprocal) params.set('reciproque', '1');
	if (filters.page > 1) params.set('page', String(filters.page));
	return params;
}
