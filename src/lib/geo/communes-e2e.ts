/**
 * Communes fictives utilisées quand `SECRET_ADDRESS_SEARCH_MODE` est factice
 * (`e2e`) : aucun appel réseau. Vraies communes, centres arrondis (source :
 * geo.api.gouv.fr). Distances utiles aux tests : Toulouse–Blagnac ~7 km,
 * Toulouse–Muret ~20 km, Toulouse–Montauban ~46 km, Toulouse–Paris ~588 km.
 */
import type { Commune } from './fuzz';

export const E2E_COMMUNES: readonly Commune[] = [
	{
		code: '31555',
		nom: 'Toulouse',
		codeDepartement: '31',
		codesPostaux: ['31000', '31100', '31200', '31300', '31400', '31500'],
		population: 514819,
		centre: { lat: 43.6007, lng: 1.4328 }
	},
	{
		code: '31069',
		nom: 'Blagnac',
		codeDepartement: '31',
		codesPostaux: ['31700'],
		population: 25527,
		centre: { lat: 43.6459, lng: 1.3785 }
	},
	{
		code: '31395',
		nom: 'Muret',
		codeDepartement: '31',
		codesPostaux: ['31600'],
		population: 25976,
		centre: { lat: 43.4479, lng: 1.3069 }
	},
	{
		code: '82121',
		nom: 'Montauban',
		codeDepartement: '82',
		codesPostaux: ['82000'],
		population: 61372,
		centre: { lat: 44.0222, lng: 1.3639 }
	},
	{
		code: '75056',
		nom: 'Paris',
		codeDepartement: '75',
		codesPostaux: ['75001'],
		population: 2133111,
		centre: { lat: 48.8589, lng: 2.347 }
	}
];
