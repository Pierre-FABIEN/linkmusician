// LINKMUSICIAN: une fiche du guide des démarches (P3-15a, D42).
import { error } from '@sveltejs/kit';
import { ficheBySlug, fichesByMoment, MOMENTS } from '#lib/demarches/catalog';
import { renderedFiche } from '#lib/server/demarches/render';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const fiche = ficheBySlug(params.fiche);
	const help = fiche ? renderedFiche(fiche.file) : null;
	if (!fiche || !help) error(404, 'Fiche introuvable');
	// Les autres fiches du même moment, pour continuer la lecture.
	const related =
		fichesByMoment()
			.find((g) => g.moment === fiche.moment)
			?.fiches.filter((f) => f.slug !== fiche.slug)
			.map((f) => ({ slug: f.slug, title: f.title })) ?? [];
	return {
		fiche: {
			slug: fiche.slug,
			title: fiche.title,
			summary: fiche.summary,
			moment: MOMENTS[fiche.moment],
			verifiedAt: fiche.verifiedAt,
			sources: fiche.sources,
			reviewedBy: fiche.reviewedBy
		},
		help,
		related
	};
};
