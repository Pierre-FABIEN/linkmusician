// LINKMUSICIAN: fiche d'un lieu revendiqué (P5-03b, conception 08 §14), pour
// sa gestion (OWNER, ADMIN) : jauge, scène et son, conditions faites aux
// artistes, jours, accueil des mineur·es, genres ; publication (rang « Lieu
// ouvert ») ; dates publiées ; quêtes et « apprendre le métier » ;
// vérification (SIRET, P5-02) ; co-gestion. Page publique : `/lieux/[id]`.
import { error, fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { listGenreTree } from '#lib/prisma/skills/referentials';
import { prisma } from '#lib/server';
import {
	inviteVenueManager,
	leaveOrRemoveVenueManager,
	setVenuePublished,
	updateVenueProfile,
	VenueProfileError,
	venueForManager
} from '#lib/server/venues/profile';
import { venueProfileSchema } from '#lib/venues/profile';
import {
	requestVerification,
	VerificationError,
	verificationState
} from '#lib/server/organizations/verification';
import { displayStatus, type OpportunityStatusValue } from '#lib/opportunities/rules';
import type { Actions, PageServerLoad } from './$types';

async function managed(locals: App.Locals, venueId: string) {
	const person = await requirePerson(locals);
	const venue = await venueForManager(venueId, person.actorId);
	if (!venue) error(404, 'Lieu introuvable');
	return { actorId: person.actorId, venue };
}

const guard = async (run: () => Promise<unknown>, message: string) => {
	try {
		await run();
		return { message };
	} catch (err) {
		if (err instanceof VenueProfileError) return fail(err.status, { error: err.message });
		throw err;
	}
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const { venue } = await managed(locals, params.id);
	const org = await prisma.venue.findUniqueOrThrow({
		where: { id: params.id },
		select: { claimedByActorId: true }
	});
	const [genres, verification] = await Promise.all([
		listGenreTree(),
		verificationState(org.claimedByActorId!)
	]);
	return {
		venue: {
			...venue,
			gigSlots: venue.gigSlots.map((g) => ({
				id: g.id,
				title: g.title,
				startsAt: g.startsAt,
				pendingApplications: g.pendingApplications,
				status: displayStatus({
					status: g.status as OpportunityStatusValue,
					expiresAt: g.expiresAt
				})
			}))
		},
		genres,
		verification
	};
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const { actorId } = await managed(locals, params.id);
		const data = await request.formData();
		const parsed = venueProfileSchema.safeParse({
			capacity: String(data.get('capacity') ?? ''),
			stage: String(data.get('stage') ?? ''),
			conditions: data.getAll('conditions').map(String),
			days: data.getAll('days').map(String),
			ageRule: String(data.get('ageRule') ?? ''),
			genreIds: data.getAll('genreIds').map(String)
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Vérifie la fiche.' });
		}
		try {
			const { unpublished } = await updateVenueProfile(params.id, actorId, parsed.data);
			return {
				message: unpublished
					? 'Fiche enregistrée. Il lui manque des éléments : elle n’est plus publiée.'
					: 'La fiche est enregistrée.'
			};
		} catch (err) {
			if (err instanceof VenueProfileError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	publish: async ({ locals, params }) => {
		const { actorId } = await managed(locals, params.id);
		return guard(
			() => setVenuePublished(params.id, actorId, true),
			'Ta fiche est publiée : ton lieu est ouvert.'
		);
	},
	unpublish: async ({ locals, params }) => {
		const { actorId } = await managed(locals, params.id);
		return guard(
			() => setVenuePublished(params.id, actorId, false),
			'Ta fiche n’est plus visible.'
		);
	},
	inviteManager: async ({ locals, params, request }) => {
		const { actorId } = await managed(locals, params.id);
		const handle = String((await request.formData()).get('handle') ?? '');
		try {
			const name = await inviteVenueManager(params.id, actorId, handle);
			return { message: `Invitation envoyée à ${name}.` };
		} catch (err) {
			if (err instanceof VenueProfileError)
				return fail(err.status, { teamError: err.message, handle });
			throw err;
		}
	},
	removeManager: async ({ locals, params, request }) => {
		const { actorId, venue } = await managed(locals, params.id);
		const membershipId = String((await request.formData()).get('membershipId') ?? '');
		const leaving = venue.team.some((m) => m.membershipId === membershipId && m.isMe);
		try {
			await leaveOrRemoveVenueManager(params.id, actorId, membershipId);
		} catch (err) {
			if (err instanceof VenueProfileError) return fail(err.status, { teamError: err.message });
			throw err;
		}
		if (leaving) redirect(303, `/lieux/${params.id}`);
		return { message: 'C’est fait.' };
	},
	/** Demander la vérification de l'organisation du lieu (P5-02). */
	requestVerification: async ({ locals, params, request }) => {
		const { actorId } = await managed(locals, params.id);
		const org = await prisma.venue.findUniqueOrThrow({
			where: { id: params.id },
			select: { claimedByActorId: true }
		});
		const form = await request.formData();
		try {
			await requestVerification(org.claimedByActorId!, actorId, {
				siret: String(form.get('siret') ?? ''),
				officialUrl: String(form.get('officialUrl') ?? '')
			});
		} catch (err) {
			if (err instanceof VerificationError) return fail(err.status, { verifyError: err.message });
			throw err;
		}
		return { message: 'Demande envoyée : l’équipe vérifie et te répond ici.' };
	}
};
