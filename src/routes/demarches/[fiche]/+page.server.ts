// LINKMUSICIAN: une fiche du guide des démarches (P3-15a,
// `src/lib/demarches/fiches/*.md`). Publique ; lire ne rapporte rien (09 §1.6).
import { error } from '@sveltejs/kit';
import { fiche as ficheOf } from '#lib/demarches/catalog';
import { renderedFiche } from '#lib/server/demarches/render';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const fiche = ficheOf(params.fiche);
	const content = fiche ? renderedFiche(fiche) : null;
	if (!fiche || !content) error(404, 'Fiche introuvable');
	return { fiche, content };
};
