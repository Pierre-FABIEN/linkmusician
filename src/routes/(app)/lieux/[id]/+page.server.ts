// LINKMUSICIAN: fiche d'un lieu de l'annuaire (P2-14a) et ses jams à venir
// (P2-14b). Validation par un second membre et matériel sur place (P2-14c).
// Revendication de la fiche, niveau 1 (P5-03a, D31).
import { error, fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import {
	VenueError,
	confirmVenue,
	getVenue,
	setVenueBackline,
	verifyVenueSiret
} from '#lib/server/venues/service';
import { siretSchema } from '#lib/venues/siret';
import { ClaimError, claimState, startClaim, submitClaimProof } from '#lib/server/venues/claims';
import { isJamOrganizer, upcomingJamsAt } from '#lib/server/jam/publicJams';
import { ModerationError, fileReport } from '#lib/server/moderation/service';
import { BACKLINE_ITEMS, BACKLINE_LABELS, backlineSchema } from '#lib/jam/lineup';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const person = await me(locals);
	const venue = await getVenue(params.id, person.actorId);
	if (!venue) error(404, 'Lieu introuvable');
	const [jams, claim] = await Promise.all([
		venue.validated ? upcomingJamsAt(venue.id, person.actorId) : [],
		venue.validated ? claimState(venue.id, person.actorId) : null
	]);
	return {
		venue: {
			id: venue.id,
			name: venue.name,
			kindLabel: venue.kindLabel,
			communeName: venue.communeName,
			departmentCode: venue.departmentCode,
			claimed: venue.claimedByActorId !== null,
			validated: venue.validated,
			isCreator: venue.isCreator,
			canConfirm: venue.canConfirm,
			canEditBackline: venue.canEditBackline,
			verified: venue.verifiedAt !== null,
			backline: venue.backline
		},
		backlineOptions: BACKLINE_ITEMS.map((value) => ({ value, label: BACKLINE_LABELS[value] })),
		jams,
		claim,
		/** « Publier une jam ici » : organisateurs seulement (D51). */
		organizer: await isJamOrganizer(person.actorId),
		added: url.searchParams.has('ajoute')
	};
};

function venueFail(err: unknown) {
	if (err instanceof VenueError || err instanceof ClaimError) {
		return fail(err.status, { error: err.message });
	}
	throw err;
}

export const actions: Actions = {
	/** Un second membre confirme un lieu en attente (P2-14c, D26). */
	confirm: async ({ locals, params }) => {
		try {
			await confirmVenue(params.id, (await me(locals)).actorId);
			return { message: 'Merci ! Le lieu est confirmé : il peut accueillir des jams.' };
		} catch (err) {
			return venueFail(err);
		}
	},
	/** Matériel sur place (P2-14c). */
	backline: async ({ locals, params, request }) => {
		const parsed = backlineSchema.safeParse((await request.formData()).getAll('backline'));
		if (!parsed.success) return fail(400, { error: 'Matériel inconnu.' });
		try {
			await setVenueBackline(params.id, (await me(locals)).actorId, parsed.data);
			return { message: 'Matériel enregistré.' };
		} catch (err) {
			return venueFail(err);
		}
	},
	/** SIRET vérifié : le lieu est validé tout de suite (P2-14d, D30). */
	siret: async ({ locals, params, request }) => {
		const parsed = siretSchema.safeParse(String((await request.formData()).get('siret') ?? ''));
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'SIRET invalide.' });
		}
		try {
			await verifyVenueSiret(params.id, (await me(locals)).actorId, parsed.data);
			return { message: 'Lieu vérifié : il peut accueillir des jams.' };
		} catch (err) {
			return venueFail(err);
		}
	},
	/** « C'est mon lieu » (P5-03a) : un code à publier sur le compte officiel. */
	claim: async ({ locals, params }) => {
		const person = await me(locals);
		if (!(await getVenue(params.id, person.actorId))) error(404, 'Lieu introuvable');
		try {
			await startClaim(params.id, person.actorId);
			return { message: 'Voici ton code : publie-le, puis colle le lien ici.' };
		} catch (err) {
			return venueFail(err);
		}
	},
	/** Lien où le code est publié : la demande part en modération. */
	claimProof: async ({ locals, params, request }) => {
		const person = await me(locals);
		const proofUrl = String((await request.formData()).get('proofUrl') ?? '');
		try {
			await submitClaimProof(params.id, person.actorId, proofUrl);
			return { message: 'Merci ! L’équipe vérifie le code et te répond ici.' };
		} catch (err) {
			return venueFail(err);
		}
	},
	report: async ({ locals, params, request }) => {
		const person = await me(locals);
		if (!(await getVenue(params.id, person.actorId))) error(404, 'Lieu introuvable');
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
