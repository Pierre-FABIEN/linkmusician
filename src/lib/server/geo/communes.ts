/**
 * Recherche de communes françaises (P1-05) via geo.api.gouv.fr : API publique
 * de l'État, gratuite, sans clé. Mock sans réseau quand
 * `SECRET_ADDRESS_SEARCH_MODE` est factice (`e2e`), sur le modèle de
 * `api/address-search`.
 *
 * Le centre d'une commune n'est jamais accepté depuis le navigateur : le
 * client n'envoie qu'un code INSEE, et le serveur relit la commune ici.
 */
import { SECRET_ADDRESS_SEARCH_MODE } from '$app/env/private';
import { isDummySecret } from '#lib/server/dummy-secrets';
import { E2E_COMMUNES } from '#lib/geo/communes-e2e';
import type { Commune } from '#lib/geo/fuzz';

const API = 'https://geo.api.gouv.fr/communes';
const FIELDS = 'nom,code,codesPostaux,centre,population,codeDepartement';

type ApiCommune = {
	nom: string;
	code: string;
	codesPostaux?: string[];
	codeDepartement: string;
	population?: number;
	centre?: { type: 'Point'; coordinates: [number, number] };
};

function toCommune(c: ApiCommune): Commune | null {
	if (!c.centre) return null;
	const [lng, lat] = c.centre.coordinates;
	return {
		code: c.code,
		nom: c.nom,
		codeDepartement: c.codeDepartement,
		codesPostaux: c.codesPostaux ?? [],
		population: c.population,
		centre: { lat, lng }
	};
}

const mocked = () => isDummySecret(SECRET_ADDRESS_SEARCH_MODE);

function normalizeText(s: string) {
	return s
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
}

async function fetchCommunes(params: Record<string, string>): Promise<Commune[]> {
	const url = `${API}?${new URLSearchParams({ ...params, fields: FIELDS })}`;
	const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
	if (!response.ok) throw new Error(`geo.api.gouv.fr : ${response.status}`);
	const data = (await response.json()) as ApiCommune[];
	return data.map(toCommune).filter((c): c is Commune => c !== null);
}

/** Suggestions pour une saisie : nom de commune ou code postal. */
export async function searchCommunes(query: string, limit = 6): Promise<Commune[]> {
	const q = query.trim();
	if (q.length < 2) return [];
	if (mocked()) {
		const n = normalizeText(q);
		return E2E_COMMUNES.filter(
			(c) => normalizeText(c.nom).startsWith(n) || c.codesPostaux.some((cp) => cp.startsWith(q))
		).slice(0, limit);
	}
	if (/^\d{5}$/.test(q)) return (await fetchCommunes({ codePostal: q })).slice(0, limit);
	return fetchCommunes({ nom: q, boost: 'population', limit: String(limit) });
}

/** Commune par son code INSEE, ou `null` si elle n'existe pas. */
export async function getCommune(code: string): Promise<Commune | null> {
	if (!/^[0-9AB]{5}$/.test(code)) return null; // 2A/2B : Corse
	if (mocked()) return E2E_COMMUNES.find((c) => c.code === code) ?? null;
	const response = await fetch(`${API}/${code}?fields=${FIELDS}`, {
		signal: AbortSignal.timeout(5000)
	});
	if (response.status === 404) return null;
	if (!response.ok) throw new Error(`geo.api.gouv.fr : ${response.status}`);
	return toCommune((await response.json()) as ApiCommune);
}
