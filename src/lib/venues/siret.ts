/**
 * Lieux vérifiés par SIRET (P2-14d, D30) : règles pures, partagées par le
 * serveur, le navigateur et le script d'import des établissements.
 *
 * Source : API publique Recherche d'entreprises
 * (`recherche-entreprises.api.gouv.fr`). On ne garde jamais de nom de
 * personne (entreprise individuelle sans enseigne écartée) ni d'adresse :
 * la commune seulement.
 */
import { z } from 'zod';
import type { VenueKindValue } from './rules';

export const SIRET_API = 'https://recherche-entreprises.api.gouv.fr/search';

/** Départements où un SIRET peut valider un lieu (lancement à Toulouse, D28). */
export const SIRET_DEPARTMENTS: readonly string[] = ['31'];

/** EPCI de Toulouse Métropole, pour l'import des établissements. */
export const TOULOUSE_METROPOLE_EPCI = '243100518';

/** Activités importées et type de lieu proposé pour chacune. */
export const NAF_KINDS: Readonly<Record<string, VenueKindValue>> = {
	'56.30Z': 'BAR',
	'90.04Z': 'CONCERT_HALL',
	'59.20Z': 'STUDIO',
	'85.52Z': 'MJC'
};

/** Chiffres seuls, espaces et points retirés. */
export const normalizeSiret = (raw: string) => raw.replace(/[\s.]/g, '');

/**
 * Clé de Luhn d'un SIRET (14 chiffres). Exception : les établissements de
 * La Poste (SIREN 356000000), dont la somme des chiffres est un multiple de 5.
 */
export function isValidSiret(siret: string): boolean {
	if (!/^\d{14}$/.test(siret)) return false;
	if (siret.startsWith('356000000')) {
		return [...siret].reduce((n, d) => n + Number(d), 0) % 5 === 0;
	}
	let sum = 0;
	for (let i = 0; i < 14; i++) {
		let d = Number(siret[13 - i]);
		if (i % 2 === 1) {
			d *= 2;
			if (d > 9) d -= 9;
		}
		sum += d;
	}
	return sum % 10 === 0;
}

export const siretSchema = z
	.string()
	.transform(normalizeSiret)
	.pipe(
		z.string().refine(isValidSiret, 'Ce numéro SIRET n’est pas valide : vérifie les 14 chiffres.')
	);

/** Établissement de la table de référence. */
export type EstablishmentData = {
	siret: string;
	siren: string;
	name: string;
	naf: string;
	communeCode: string;
	communeName: string;
	departmentCode: string;
	active: boolean;
};

type ApiEtablissement = {
	siret: string;
	activite_principale?: string | null;
	commune?: string | null;
	libelle_commune?: string | null;
	etat_administratif?: string | null;
	statut_diffusion_etablissement?: string | null;
	liste_enseignes?: string[] | null;
	nom_commercial?: string | null;
};
export type ApiResult = {
	siren: string;
	nom_raison_sociale?: string | null;
	nature_juridique?: string | null;
	activite_principale?: string | null;
	siege?: ApiEtablissement | null;
	matching_etablissements?: ApiEtablissement[] | null;
};

/** « LE BAR DES AMIS » → « Le Bar des Amis ». */
export function titleCase(raw: string): string {
	const small = new Set(['de', 'des', 'du', 'la', 'le', 'les', 'et', 'en', 'au', 'aux', 'à']);
	return raw
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.split(' ')
		.map((w, i) =>
			i > 0 && small.has(w)
				? w
				: w.replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase())
		)
		.join(' ');
}

/** Entreprise individuelle (catégorie juridique 1xxx) : sa raison sociale est un nom de personne. */
const isIndividual = (natureJuridique?: string | null) => (natureJuridique ?? '').startsWith('1');

/**
 * Nom public d'un établissement : son enseigne ou son nom commercial ; à
 * défaut, la raison sociale d'une société. `null` pour une entreprise
 * individuelle sans enseigne (ce serait le nom d'une personne).
 */
export function publicName(result: ApiResult, e: ApiEtablissement): string | null {
	const sign = e.liste_enseignes?.find((s) => s.trim()) ?? e.nom_commercial?.trim();
	if (sign) return titleCase(sign);
	if (isIndividual(result.nature_juridique) || !result.nom_raison_sociale) return null;
	return titleCase(result.nom_raison_sociale);
}

/**
 * Établissements diffusibles d'un résultat de l'API, réduits à ce qu'on
 * garde. Ceux sans nom public sont écartés.
 */
export function establishmentsOf(result: ApiResult): EstablishmentData[] {
	const list = [...(result.matching_etablissements ?? [])];
	if (result.siege && !list.some((e) => e.siret === result.siege!.siret)) list.push(result.siege);
	return list.flatMap((e) => {
		if (e.statut_diffusion_etablissement && e.statut_diffusion_etablissement !== 'O') return [];
		const name = publicName(result, e);
		const communeCode = e.commune ?? '';
		if (!name || !/^[0-9AB]{5}$/.test(communeCode)) return [];
		return [
			{
				siret: e.siret,
				siren: result.siren,
				name: name.slice(0, 80),
				naf: e.activite_principale ?? result.activite_principale ?? '',
				communeCode,
				communeName: titleCase(e.libelle_commune ?? ''),
				departmentCode: communeCode.startsWith('97')
					? communeCode.slice(0, 3)
					: communeCode.slice(0, 2),
				active: e.etat_administratif === 'A'
			}
		];
	});
}

/**
 * Un SIRET peut-il valider un lieu de cette commune ? Renvoie un message
 * d'erreur, ou `null` si oui.
 */
export function siretMismatch(
	establishment: Pick<EstablishmentData, 'active' | 'communeCode' | 'departmentCode'>,
	communeCode: string
): string | null {
	if (!establishment.active) return 'Cet établissement est fermé selon l’Insee.';
	if (!SIRET_DEPARTMENTS.includes(establishment.departmentCode)) {
		return 'La vérification par SIRET est ouverte en Haute-Garonne pour l’instant.';
	}
	if (establishment.communeCode !== communeCode) {
		return 'Ce SIRET correspond à un établissement d’une autre commune.';
	}
	return null;
}
