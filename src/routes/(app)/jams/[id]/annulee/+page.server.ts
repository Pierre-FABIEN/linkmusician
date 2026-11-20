// LINKMUSICIAN: une jam annulée (#91a), pour ses seul·es participant·es et
// son hôte (D81) : titre, date, lieu et motif. Personne d'autre ne sait
// qu'elle a existé pour soi.
import { error } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { cancelledJamFor } from '#lib/server/jam/cancel';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const jam = await cancelledJamFor(params.id, person.actorId);
	if (!jam) error(404, 'Jam introuvable');
	return { jam };
};
