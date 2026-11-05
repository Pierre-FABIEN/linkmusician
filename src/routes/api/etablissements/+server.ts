/**
 * LINKMUSICIAN: suggestions d'établissements pendant l'ajout d'un lieu
 * (P2-14d, D30), réservées aux comptes connectés. Données publiques de la
 * base Sirene : enseigne, type de lieu proposé, commune, SIRET.
 */
import { error, json } from '@sveltejs/kit';
import { suggestEstablishments } from '#lib/server/venues/establishments';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) error(401, 'Connexion requise');
	const q = (url.searchParams.get('q') ?? '').slice(0, 80);
	return json({ establishments: await suggestEstablishments(q) });
};
