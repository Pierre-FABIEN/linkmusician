// LINKMUSICIAN: un groupe vu par une personne connectée (P3-01) : membres
// actuels et passés (comme un club), invitations et demandes pour la
// gestion, « Demander à rejoindre » pour les autres. La page publique
// `/@handle` du groupe arrive avec P3-02.
import { error, fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import {
	BandError,
	answerRequest,
	bandPage,
	inviteCandidates,
	inviteToBand,
	leaveBand,
	removeMember,
	requestToJoin,
	setMyTitle,
	setRole,
	transferOwnership,
	withdrawPending
} from '#lib/server/bands/service';
import { bandSchema, inviteSchema, isManager } from '#lib/bands/rules';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { actorId } = await me(locals);
	const band = await bandPage(params.handle, actorId);
	if (!band) error(404, 'Groupe introuvable');
	const manager = isManager(band.my?.role);
	return {
		band,
		candidates: manager && !band.dissolvedAt ? await inviteCandidates(band.id, actorId) : [],
		created: url.searchParams.has('cree')
	};
};

/** Exécute une action du service ; ses refus deviennent un message. */
async function run(action: () => Promise<unknown>, message: string) {
	try {
		await action();
		return { message };
	} catch (err) {
		if (err instanceof BandError) return fail(err.status, { error: err.message });
		throw err;
	}
}

async function context(locals: App.Locals, params: { handle: string }, request: Request) {
	const { actorId } = await me(locals);
	const band = await bandPage(params.handle, actorId);
	if (!band) error(404, 'Groupe introuvable');
	const form = await request.formData();
	const field = (name: string) => String(form.get(name) ?? '');
	return { actorId, band, field };
}

export const actions: Actions = {
	invite: async ({ locals, params, request }) => {
		const { actorId, band, field } = await context(locals, params, request);
		const parsed = inviteSchema.safeParse({ handle: field('handle'), title: field('title') });
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.' });
		}
		try {
			const invitee = await inviteToBand(band.id, actorId, parsed.data);
			return { message: `Invitation envoyée à ${invitee.displayName}.` };
		} catch (err) {
			if (err instanceof BandError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	request: async ({ locals, params, request }) => {
		const { actorId, band } = await context(locals, params, request);
		return run(() => requestToJoin(band.id, actorId), 'Demande envoyée au groupe.');
	},
	acceptRequest: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, params, request);
		return run(
			() => answerRequest(field('membershipId'), actorId, true),
			'Bienvenue au nouveau membre !'
		);
	},
	declineRequest: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, params, request);
		return run(() => answerRequest(field('membershipId'), actorId, false), 'Demande refusée.');
	},
	withdraw: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, params, request);
		return run(() => withdrawPending(field('membershipId'), actorId), 'C’est retiré.');
	},
	remove: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, params, request);
		return run(() => removeMember(field('membershipId'), actorId), 'Retiré·e du groupe.');
	},
	promote: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, params, request);
		return run(() => setRole(field('membershipId'), actorId, 'ADMIN'), 'Co-gestion confiée.');
	},
	demote: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, params, request);
		return run(() => setRole(field('membershipId'), actorId, 'MEMBER'), 'Co-gestion retirée.');
	},
	transfer: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, params, request);
		return run(() => transferOwnership(field('membershipId'), actorId), 'Groupe transmis.');
	},
	title: async ({ locals, params, request }) => {
		const { actorId, band, field } = await context(locals, params, request);
		const parsed = bandSchema.shape.title.safeParse(field('title'));
		if (!parsed.success)
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Trop long.' });
		return run(() => setMyTitle(band.id, actorId, parsed.data), 'C’est noté.');
	},
	leave: async ({ locals, params, request }) => {
		const { actorId, band } = await context(locals, params, request);
		try {
			const { dissolved } = await leaveBand(band.id, actorId);
			redirect(303, dissolved ? '/groupes?dissous=1' : '/groupes');
		} catch (err) {
			if (err instanceof BandError) return fail(err.status, { error: err.message });
			throw err;
		}
	}
};
