// LINKMUSICIAN: bulletin de partage d'un morceau composé (P3-15b, 09 §4),
// en PDF, pour son équipe. Les parts restent à saisir et à signer à la main.
import { error } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { splitSheetFor } from '#lib/server/demarches/documents';
import { renderSplitSheetPdf } from '#lib/server/demarches/pdf';
import { asDownload, pdfResponse } from '#lib/server/demarches/download';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) error(401, 'Non connecté');
	const person = await getPersonByUserId(locals.user.id);
	if (!person) error(403, 'Profil introuvable');
	return asDownload(async () => {
		const view = await splitSheetFor(params.id, person.actorId);
		return pdfResponse(view.filename, renderSplitSheetPdf(view));
	});
};
