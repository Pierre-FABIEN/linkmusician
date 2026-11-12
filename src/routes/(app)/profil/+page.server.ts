/**
 * LINKMUSICIAN: « Mon profil » (P1-06b, D17, D18) : bio, statut pro, ce que je
 * recherche, matériel, pratique, mobilité, liens. Le profil musical a sa
 * page : `/profil/musical`.
 */
import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { profileSchema } from '#lib/schema/actors/profileSchema';
import {
	getProfileDetails,
	profileFormValues,
	saveProfileDetails
} from '#lib/prisma/actors/profile';
import { requirePerson } from '#server/actors/tracksForm';
import { onProfileChanged } from '#lib/server/progression/profile';

import { currentTip } from '#lib/server/guide/service';
import { prisma } from '#lib/server';
import { TRACK_KINDS, TRACKS } from '#lib/actors/tracks';
import { trackProfileHref } from '#lib/actors/completeness';
import { completenessOf } from '#lib/server/actors/trackSheets';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = await requirePerson(locals);
	const [details, completeness] = await Promise.all([
		getProfileDetails(person),
		completenessOf(person.actorId)
	]);
	return {
		form: await superValidate(profileFormValues(details), zod(profileSchema), { errors: false }),
		mayOrganize: details.mayOrganize,
		/** Arrivé·e depuis « Lancer une jam » sans avoir coché (D51). */
		askOrganize: url.searchParams.has('organiser'),
		/**
		 * Une page par métier (D59) ; musicien·ne : « Ma pratique ». Avec son
		 * état de complétude (ONB-12b) : le nombre de manques, communs compris.
		 */
		trackPages: TRACK_KINDS.filter((t) => person.tracks.some((p) => p.track === t)).map((t) => {
			const c = completeness.tracks.find((x) => x.track === t);
			return {
				href: trackProfileHref(t),
				label: TRACKS[t].label,
				missing: c && !c.soon ? completeness.common.length + c.missing.length : 0
			};
		}),
		/** Lien vers « Mon profil d'ingé son » (P4-02). */
		soundEngineer: person.tracks.some((t) => t.track === 'SOUND_ENGINEER'),
		/** Lien vers « Mon profil de producteur·rice » (P4-04). */
		producer: person.tracks.some((t) => t.track === 'PRODUCER'),
		/** Lien vers « Mon profil d'organisateur·rice » (P5-05a). */
		promoter: person.tracks.some((t) => t.track === 'PROMOTER'),
		/** Lien vers « Mon profil de manager ou de booker » (P5-07). */
		agent: person.tracks.some((t) => t.track === 'MANAGER' || t.track === 'BOOKER'),
		/** Lien « Mes lieux » : la personne gère un lieu revendiqué (P5-03b). */
		managesVenues:
			(await prisma.membership.count({
				where: {
					personId: person.actorId,
					status: { in: ['ACTIVE', 'INVITED'] },
					org: { kind: 'VENUE', dissolvedAt: null }
				}
			})) > 0,
		// Conseil en contexte (P2-17).
		tip: await currentTip('profil', person)
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const form = await superValidate(request, zod(profileSchema));
		if (!form.valid) return fail(400, { form });

		await saveProfileDetails(person, form.data);
		await onProfileChanged(person.actorId);
		form.data = profileFormValues(await getProfileDetails(person));
		// Les gains sont fêtés par les célébrations de l'espace (P2-11), plus dans ce message.
		return message(form, 'Ton profil est enregistré.');
	}
};
