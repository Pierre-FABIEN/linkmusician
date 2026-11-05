// LINKMUSICIAN: fiche d'un lieu de l'annuaire (P2-14a). Ses jams à venir
// s'y afficheront avec les jams publiques (P2-14b).
import { error, fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getVenue } from '#lib/server/venues/service';
import { ModerationError, fileReport } from '#lib/server/moderation/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const venue = await getVenue(params.id);
	if (!venue) error(404, 'Lieu introuvable');
	return {
		venue: {
			id: venue.id,
			name: venue.name,
			kindLabel: venue.kindLabel,
			communeName: venue.communeName,
			departmentCode: venue.departmentCode,
			claimed: venue.claimedByActorId !== null
		},
		added: url.searchParams.has('ajoute')
	};
};

export const actions: Actions = {
	report: async ({ locals, params, request }) => {
		const person = (await getPersonByUserId(locals.user!.id))!;
		if (!(await getVenue(params.id))) error(404, 'Lieu introuvable');
		const data = await request.formData();
		try {
			const result = await fileReport(person.actorId, {
				targetType: 'VENUE',
				targetId: params.id,
				reason: String(data.get('reason') ?? ''),
				details: String(data.get('details') ?? '')
			});
			return {
				message: result.alreadyReported
					? 'Tu as déjà signalé ce lieu : il est en cours d’examen.'
					: 'Merci, ton signalement est transmis à la modération.'
			};
		} catch (err) {
			if (err instanceof ModerationError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
