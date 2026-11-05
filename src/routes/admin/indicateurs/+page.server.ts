// LINKMUSICIAN: indicateurs produit (P1-13, D13). Agrégats seulement.
import { assertAdmin } from '#lib/admin/guards';
import { getIndicators, parsePeriod } from '#lib/server/indicators/indicators';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	assertAdmin(locals);
	const period = parsePeriod(url.searchParams.get('periode'));
	return { period, ...(await getIndicators(period)) };
};
