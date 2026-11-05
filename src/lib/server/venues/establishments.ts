/**
 * Établissements de référence et vérification par SIRET (P2-14d, D30).
 *
 * Un SIRET est cherché dans la table `establishments` (Toulouse Métropole,
 * `npm run seed:etablissements`), sinon auprès de l'API Recherche
 * d'entreprises, et le résultat est gardé dans la table. En e2e (recherche
 * d'adresse factice), jamais de réseau : la table seule.
 */
import { SECRET_ADDRESS_SEARCH_MODE } from '$app/env/private';
import { prisma } from '#lib/server';
import { isDummySecret } from '#lib/server/dummy-secrets';
import { RefillingTokenBucket } from '#lib/server/rate-limit';
import { venueNameKey } from '#lib/venues/rules';
import { NAF_KINDS, SIRET_API, establishmentsOf, type ApiResult } from '#lib/venues/siret';

const mocked = () => isDummySecret(SECRET_ADDRESS_SEARCH_MODE);

/** Recherches en direct par personne (l'API publique limite son débit). */
const lookupBucket = new RefillingTokenBucket<string>(20, 180, 'siret-lookup');

const select = {
	siret: true,
	name: true,
	naf: true,
	communeCode: true,
	communeName: true,
	departmentCode: true,
	active: true
} as const;

export class SiretLookupError extends Error {}

/** Un établissement par son SIRET, ou `null` s'il est inconnu. */
export async function lookupEstablishment(siret: string, actorId: string) {
	const local = await prisma.establishment.findUnique({ where: { siret }, select });
	if (local || mocked()) return local;
	if (!(await lookupBucket.consume(actorId, 1))) {
		throw new SiretLookupError('Trop de vérifications d’affilée. Réessaie dans quelques minutes.');
	}
	let results: ApiResult[];
	try {
		const url = `${SIRET_API}?${new URLSearchParams({ q: siret, per_page: '1' })}`;
		const response = await fetch(url, {
			headers: { 'User-Agent': 'LinkMusician' },
			signal: AbortSignal.timeout(5000)
		});
		if (!response.ok) throw new Error(String(response.status));
		results = ((await response.json()) as { results: ApiResult[] }).results;
	} catch {
		throw new SiretLookupError(
			'La vérification du SIRET ne répond pas. Réessaie plus tard, ou ajoute le lieu sans SIRET.'
		);
	}
	const found = results.flatMap(establishmentsOf).find((e) => e.siret === siret);
	if (!found) return null;
	const data = { ...found, nameKey: venueNameKey(found.name) };
	await prisma.establishment.upsert({ where: { siret }, create: data, update: data });
	return found;
}

/** Suggestions pendant la saisie du nom d'un lieu : établissements actifs. */
export async function suggestEstablishments(query: string, limit = 6) {
	const key = venueNameKey(query);
	if (key.length < 3) return [];
	const rows = await prisma.establishment.findMany({
		where: { active: true, nameKey: { contains: key } },
		orderBy: { name: 'asc' },
		take: limit,
		select
	});
	return rows.map((e) => ({
		siret: e.siret,
		name: e.name,
		kind: NAF_KINDS[e.naf] ?? null,
		commune: { code: e.communeCode, nom: e.communeName, codeDepartement: e.departmentCode }
	}));
}
