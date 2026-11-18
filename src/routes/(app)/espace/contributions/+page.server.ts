// LINKMUSICIAN: « Mes contributions » (U1, #71, conception 20 §10.2) : ce que
// la personne a réalisé et qui le confirme, depuis la lecture unifiée N1.
// Page personnelle : l'identité vient de la session (garde du layout), le
// filtre et la page sont relus et bornés ici, et seules les lignes affichées
// partent dans la page.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { contributionsOf } from '#lib/server/career/contributions';
import {
	CATEGORY_SLUGS,
	filterContributions,
	filterFromSlug,
	presentCategories,
	type ContributionFilter
} from '#lib/career/contributions';
import type { PageServerLoad } from './$types';

/** Lignes par page ; « Voir plus » en ajoute autant, jusqu'à `MAX_PAGES`. */
const PAGE_SIZE = 50;
const MAX_PAGES = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const all = await contributionsOf(person.actorId);
	const categories = presentCategories(all);
	const asked = filterFromSlug(url.searchParams.get('role'));
	// Un filtre sans ligne (ou inconnu) revient à « Tout ».
	const filter: ContributionFilter =
		asked !== 'TOUT' && categories.includes(asked) ? asked : 'TOUT';
	const lines = filterContributions(all, filter);
	const page = Math.min(
		MAX_PAGES,
		Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
	);
	const shown = lines.slice(0, page * PAGE_SIZE);
	return {
		filter,
		categories,
		slugs: CATEGORY_SLUGS,
		total: lines.length,
		// Données minimales : pas les clés des faits sources (`sources`).
		lines: shown.map((l) => ({
			key: l.key,
			title: l.title,
			roles: l.roles,
			date: l.date,
			proof: l.proof,
			frozen: l.frozen,
			with: l.with,
			notes: l.notes,
			href: l.href
		})),
		nextPage: shown.length < lines.length && page < MAX_PAGES ? page + 1 : null
	};
};
