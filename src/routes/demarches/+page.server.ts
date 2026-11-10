// LINKMUSICIAN: guide des démarches (P3-15a) : toutes les fiches, par moment.
import { fichesByMoment } from '#lib/demarches/catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	groups: fichesByMoment().map((g) => ({
		label: g.label,
		fiches: g.fiches.map((f) => ({ slug: f.slug, title: f.title, summary: f.summary }))
	}))
});
