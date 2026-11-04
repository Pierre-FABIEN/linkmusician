/**
 * LINKMUSICIAN: autocomplétion des communes (P1-05), réservée aux comptes
 * connectés. Ne renvoie que des données publiques (nom, code, départements,
 * codes postaux), jamais de coordonnées : le point est calculé côté serveur à
 * l'enregistrement.
 */
import { error, json } from '@sveltejs/kit';
import { searchCommunes } from '#lib/server/geo/communes';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) error(401, 'Connexion requise');
	const q = (url.searchParams.get('q') ?? '').slice(0, 60);
	try {
		const communes = await searchCommunes(q);
		return json({
			communes: communes.map((c) => ({
				code: c.code,
				nom: c.nom,
				codeDepartement: c.codeDepartement,
				codePostal: c.codesPostaux[0] ?? null
			}))
		});
	} catch {
		return json({ communes: [], unavailable: true }, { status: 502 });
	}
};
