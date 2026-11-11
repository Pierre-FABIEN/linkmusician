// LINKMUSICIAN: fiche d'une organisation d'organisateur·rices (P5-05b), pour
// sa gestion (OWNER, ADMIN) : nom, présentation, ville (centre de commune
// seulement), ce qu'elle organise, genres, jauge ; ses plateaux ; la
// vérification (SIRET, P5-02) ; la co-gestion. Page publique : `/@handle`.
import { error, fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { getCommune } from '#lib/server/geo/communes';
import { listGenreTree } from '#lib/prisma/skills/referentials';
import {
	invitePromoterManager,
	leaveOrRemovePromoterManager,
	promoterOrgForManager,
	PromoterOrgError,
	updatePromoterOrg
} from '#lib/server/organizations/promoters';
import { promoterOrgProfileSchema } from '#lib/organizations/promoter';
import {
	requestVerification,
	VerificationError,
	verificationState
} from '#lib/server/organizations/verification';
import { displayStatus, type OpportunityStatusValue } from '#lib/opportunities/rules';
import type { Actions, PageServerLoad } from './$types';

async function managed(locals: App.Locals, handle: string) {
	const person = await requirePerson(locals);
	const org = await promoterOrgForManager(handle, person.actorId);
	if (!org) error(404, 'Organisation introuvable');
	return { actorId: person.actorId, org };
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { org } = await managed(locals, params.handle);
	const [genres, verification] = await Promise.all([listGenreTree(), verificationState(org.id)]);
	// L'identifiant interne reste côté serveur.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { id: _id, gigSlots, ...rest } = org;
	return {
		org: {
			...rest,
			gigSlots: gigSlots.map((g) => ({
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
		verification,
		created: url.searchParams.has('cree')
	};
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const { actorId, org } = await managed(locals, params.handle);
		const data = await request.formData();
		const parsed = promoterOrgProfileSchema.safeParse({
			name: String(data.get('name') ?? ''),
			bio: String(data.get('bio') ?? ''),
			eventKinds: data.getAll('eventKinds').map(String),
			genreIds: data.getAll('genreIds').map(String),
			capacity: String(data.get('capacity') ?? ''),
			communeCode: String(data.get('communeCode') ?? '')
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Vérifie la fiche.' });
		}
		const { communeCode, ...fiche } = parsed.data;
		let commune = null;
		if (communeCode) {
			try {
				commune = await getCommune(communeCode);
			} catch {
				return fail(502, {
					error: 'Le service des communes ne répond pas. Réessaie dans un instant.'
				});
			}
			if (!commune) return fail(400, { error: 'Choisis une commune dans la liste.' });
		}
		try {
			await updatePromoterOrg(org.id, actorId, { ...fiche, commune });
		} catch (err) {
			if (err instanceof PromoterOrgError) return fail(err.status, { error: err.message });
			throw err;
		}
		return { message: 'La fiche est enregistrée.' };
	},
	inviteManager: async ({ locals, params, request }) => {
		const { actorId, org } = await managed(locals, params.handle);
		const handle = String((await request.formData()).get('handle') ?? '');
		try {
			const name = await invitePromoterManager(org.id, actorId, handle);
			return { message: `Invitation envoyée à ${name}.` };
		} catch (err) {
			if (err instanceof PromoterOrgError)
				return fail(err.status, { teamError: err.message, handle });
			throw err;
		}
	},
	removeManager: async ({ locals, params, request }) => {
		const { actorId, org } = await managed(locals, params.handle);
		const membershipId = String((await request.formData()).get('membershipId') ?? '');
		const leaving = org.team.some((m) => m.membershipId === membershipId && m.isMe);
		try {
			await leaveOrRemovePromoterManager(org.id, actorId, membershipId);
		} catch (err) {
			if (err instanceof PromoterOrgError) return fail(err.status, { teamError: err.message });
			throw err;
		}
		if (leaving) redirect(303, '/organisations');
		return { message: 'C’est fait.' };
	},
	/** Demander la vérification (P5-02) : SIRET contrôlé, puis à la main. */
	requestVerification: async ({ locals, params, request }) => {
		const { actorId, org } = await managed(locals, params.handle);
		const form = await request.formData();
		try {
			await requestVerification(org.id, actorId, {
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
