// LINKMUSICIAN: laboratoire de maquettes (P1-02). Développement seulement :
// 404 en production. Données fictives, aucun accès à la base.
import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	if (!dev) error(404, 'Introuvable');
	return {};
};
