// LINKMUSICIAN: programme des œuvres d'un concert (P3-15b, 09 §4), en PDF,
// prérempli avec les morceaux composés du groupe, pour ses membres actifs.
import { error } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { concertProgramFor } from '#lib/server/demarches/documents';
import { renderProgramPdf } from '#lib/server/demarches/pdf';
import { asDownload, pdfResponse } from '#lib/server/demarches/download';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) error(401, 'Non connecté');
	const person = await getPersonByUserId(locals.user.id);
	if (!person) error(403, 'Profil introuvable');
	return asDownload(async () => {
		const view = await concertProgramFor(params.handle, person.actorId);
		return pdfResponse(view.filename, renderProgramPdf(view));
	});
};
