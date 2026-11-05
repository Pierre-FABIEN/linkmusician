import { describe, expect, it } from 'vitest';
import {
	establishmentsOf,
	isValidSiret,
	normalizeSiret,
	siretMismatch,
	siretSchema,
	titleCase,
	type ApiResult
} from './siret';
import { venueSchema } from './rules';

describe('SIRET (P2-14d, D30)', () => {
	it('clé de Luhn, espaces tolérés', () => {
		expect(isValidSiret('65202368000034')).toBe(true);
		expect(isValidSiret('65202368000035')).toBe(false);
		expect(isValidSiret('6520236800003')).toBe(false);
		expect(normalizeSiret('652 023 680 00034')).toBe('65202368000034');
		expect(siretSchema.safeParse('652 023 680 00034').success).toBe(true);
		expect(siretSchema.safeParse('12345678901234').success).toBe(false);
		// La Poste : somme des chiffres multiple de 5.
		expect(isValidSiret('35600000000010')).toBe(true);
	});

	it('nom public : enseigne, sinon raison sociale d’une société, jamais une personne', () => {
		const etab = {
			siret: '65202368000034',
			commune: '31555',
			libelle_commune: 'TOULOUSE',
			etat_administratif: 'A',
			activite_principale: '56.30Z'
		};
		const company: ApiResult = {
			siren: '652023680',
			nom_raison_sociale: 'CHARLES WELLS (FRANCE)',
			nature_juridique: '5710',
			matching_etablissements: [{ ...etab, liste_enseignes: ['LONDON TOWN'] }]
		};
		expect(establishmentsOf(company)).toEqual([
			{
				siret: '65202368000034',
				siren: '652023680',
				name: 'London Town',
				naf: '56.30Z',
				communeCode: '31555',
				communeName: 'Toulouse',
				departmentCode: '31',
				active: true
			}
		]);
		const individual: ApiResult = {
			siren: '812345678',
			nom_raison_sociale: 'JEAN DUPONT',
			nature_juridique: '1000',
			matching_etablissements: [etab]
		};
		expect(establishmentsOf(individual)).toEqual([]);
		const hidden: ApiResult = {
			...company,
			matching_etablissements: [{ ...etab, statut_diffusion_etablissement: 'P' }]
		};
		expect(establishmentsOf(hidden)).toEqual([]);
	});

	it('un SIRET valide un lieu actif, en Haute-Garonne, de la même commune', () => {
		const bar = { active: true, communeCode: '31555', departmentCode: '31' };
		expect(siretMismatch(bar, '31555')).toBeNull();
		expect(siretMismatch(bar, '31069')).toMatch(/autre commune/);
		expect(siretMismatch({ ...bar, active: false }, '31555')).toMatch(/fermé/);
		expect(
			siretMismatch({ active: true, communeCode: '75056', departmentCode: '75' }, '75056')
		).toMatch(/Haute-Garonne/);
	});

	it('casse des noms', () => {
		expect(titleCase('LE BAR DES AMIS')).toBe('Le Bar des Amis');
		expect(titleCase("L'AUTRE CAFE-CONCERT")).toBe("L'Autre Cafe-Concert");
	});
});

describe('formulaire de lieu : SIRET facultatif', () => {
	const base = { name: 'Le Bar des Amis', kind: 'BAR', communeCode: '31555' };
	it('vide, absent ou valide ; sinon un message clair', () => {
		expect(venueSchema.parse({ ...base, siret: '' }).siret).toBeUndefined();
		expect(venueSchema.parse(base).siret).toBeUndefined();
		expect(venueSchema.parse({ ...base, siret: '652 023 680 00034' }).siret).toBe('65202368000034');
		const bad = venueSchema.safeParse({ ...base, siret: '12345678901234' });
		expect(bad.success ? '' : bad.error.issues[0].message).toMatch(/n’est pas valide/);
	});
});
