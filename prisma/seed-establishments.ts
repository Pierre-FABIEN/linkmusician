// LINKMUSICIAN (P2-14d, D30) : importe les établissements de Toulouse
// Métropole (bars, salles, studios, écoles de musique, MJC) depuis l'API
// publique Recherche d'entreprises, dans la table de référence
// `establishments`. Relançable : met à jour ce qui existe.
//
//   npm run seed:etablissements
//
// Jamais de nom de personne (entreprise individuelle sans enseigne écartée)
// ni d'adresse : enseigne, activité et commune seulement (`establishmentsOf`).
// L'API limite à 7 requêtes par seconde : on attend entre deux pages.
import dotenv from 'dotenv';
import { createPrismaClient } from './client.js';
import {
	NAF_KINDS,
	SIRET_API,
	TOULOUSE_METROPOLE_EPCI,
	establishmentsOf,
	type ApiResult,
	type EstablishmentData
} from '../src/lib/venues/siret';
import { venueNameKey } from '../src/lib/venues/rules';

dotenv.config({ quiet: true });

const PER_PAGE = 25;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(params: Record<string, string>, page: number) {
	const url = new URL(SIRET_API);
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	url.searchParams.set('epci', TOULOUSE_METROPOLE_EPCI);
	url.searchParams.set('per_page', String(PER_PAGE));
	url.searchParams.set('page', String(page));
	for (let attempt = 1; ; attempt++) {
		const response = await fetch(url, {
			headers: { 'User-Agent': 'LinkMusician (import des etablissements)' },
			signal: AbortSignal.timeout(15_000)
		});
		if (response.status === 429 && attempt < 5) {
			await sleep(2000 * attempt);
			continue;
		}
		if (!response.ok) throw new Error(`API ${response.status} sur ${url}`);
		return (await response.json()) as { results: ApiResult[]; total_pages: number };
	}
}

/** Toutes les pages d'une recherche, établissements de la métropole seulement. */
async function collect(params: Record<string, string>, keep: (e: EstablishmentData) => boolean) {
	const found: EstablishmentData[] = [];
	for (let page = 1; ; page++) {
		const data = await fetchPage(params, page);
		for (const result of data.results) {
			found.push(...establishmentsOf(result).filter((e) => e.departmentCode === '31' && keep(e)));
		}
		if (page >= data.total_pages || data.results.length === 0) break;
		await sleep(250);
	}
	return found;
}

async function main() {
	const prisma = createPrismaClient();
	try {
		const all = new Map<string, EstablishmentData>();
		for (const naf of Object.keys(NAF_KINDS)) {
			const list = await collect(
				{ activite_principale: naf, etat_administratif: 'A' },
				(e) => e.naf === naf
			);
			for (const e of list) all.set(e.siret, e);
			console.log(`${naf} : ${list.length} établissement(s)`);
		}
		const mjc = await collect({ q: 'maison des jeunes et de la culture' }, (e) =>
			/\bmjc\b|maison des jeunes/i.test(e.name)
		);
		for (const e of mjc) all.set(e.siret, e);
		console.log(`MJC : ${mjc.length} établissement(s)`);

		const rows = [...all.values()];
		for (let i = 0; i < rows.length; i += 50) {
			await prisma.$transaction(
				rows.slice(i, i + 50).map((e) => {
					const data = { ...e, nameKey: venueNameKey(e.name) };
					return prisma.establishment.upsert({
						where: { siret: e.siret },
						create: data,
						update: data
					});
				})
			);
		}
		console.log(`${rows.length} établissement(s) enregistré(s).`);
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
