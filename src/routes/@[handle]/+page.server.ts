/**
 * LINKMUSICIAN: profil public `/@handle` (P1-11). 404 si l'acteur n'existe pas
 * ou n'est pas visible (anonymisé, masqué par la personne, suspendu), sans
 * dire pourquoi. Contenu public seulement (D1) : voir `getPublicProfile`.
 */
import { error, fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getPublicProfile } from '#lib/server/actors/publicProfile';
import { publicCareerSheet } from '#lib/server/career/sheet';
import { fileReport, ModerationError } from '#lib/server/moderation/service';
import { blockActor, BlockingError } from '#lib/server/blocking/service';
import { suggestMusicians } from '#lib/server/discovery/suggestions';
import { prisma } from '#lib/server';
import { getPublicBand } from '#lib/server/bands/public';
import { getPublicStudio, studiosOfPerson } from '#lib/server/studios/service';
import { getPublicPromoterOrg } from '#lib/server/organizations/promoters';
import { BandError, requestToJoin } from '#lib/server/bands/service';
import { MilestoneError } from '#lib/server/milestones/service';
import { contestMilestone } from '#lib/server/milestones/disputes';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Les handles sont en minuscules : une seule adresse par profil.
	const handle = params.handle.toLowerCase();
	if (handle !== params.handle) redirect(301, `/@${handle}`);

	const viewer = locals.user ? await getPersonByUserId(locals.user.id) : null;
	// Blocage (P2-05) : 404 dans les deux sens, sans dire pourquoi.
	const profile = await getPublicProfile(handle, new Date(), viewer?.actorId);
	if (!profile) {
		// Page publique d'un groupe (P3-02).
		const band = await getPublicBand(handle, new Date(), viewer?.actorId);
		if (!band) {
			// Page publique d'un studio publié (P4-03a).
			const studio = await getPublicStudio(handle, new Date(), viewer?.actorId);
			if (!studio) {
				// Page publique d'une organisation d'organisateur·rices (P5-05b).
				const promoterOrg = await getPublicPromoterOrg(handle, new Date(), viewer?.actorId);
				if (promoterOrg) {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { id: _orgId, ...publicOrg } = promoterOrg;
					return {
						profile: null,
						band: null,
						studio: null,
						promoterOrg: publicOrg,
						studios: [],
						careerSheet: null,
						suggestions: [],
						isOwner: false,
						signedIn: Boolean(viewer?.onboardedAt),
						canReport: Boolean(viewer)
					};
				}
				// Un lieu n'a pas de page `/@handle` : sa page est sa fiche (P5-03a, Q19).
				const venue = await prisma.venue.findFirst({
					where: { removedAt: null, claimedBy: { handle, deletedAt: null } },
					select: { id: true }
				});
				if (venue) redirect(303, `/lieux/${venue.id}`);
				error(404, 'Profil introuvable');
			}
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { id: _studioId, ...publicStudio } = studio;
			return {
				profile: null,
				band: null,
				studio: publicStudio,
				promoterOrg: null,
				studios: [],
				careerSheet: null,
				suggestions: [],
				isOwner: false,
				signedIn: Boolean(viewer?.onboardedAt),
				canReport: Boolean(viewer)
			};
		}
		// L'identifiant interne reste côté serveur.
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { id: _bandId, ...publicBand } = band;
		return {
			profile: null,
			band: publicBand,
			studio: null,
			promoterOrg: null,
			studios: [],
			careerSheet: null,
			suggestions: [],
			isOwner: false,
			signedIn: Boolean(viewer?.onboardedAt),
			canReport: Boolean(viewer)
		};
	}

	// L'identifiant interne reste côté serveur.
	const { id: actorId, ...publicProfile } = profile;
	const isOwner = viewer?.actorId === actorId;
	// Suggestions (P2-18), pour un membre seulement : les siennes sur son
	// profil, « Dans le même style » sur celui d'un autre.
	const [suggestions, careerSheet, studios] = await Promise.all([
		viewer?.onboardedAt && profile.kind === 'PERSON'
			? suggestMusicians(
					viewer.actorId,
					{ db: prisma },
					{
						likeActorId: isOwner ? undefined : actorId,
						limit: 3
					}
				)
			: [],
		profile.kind === 'PERSON' ? publicCareerSheet(actorId, viewer?.actorId) : null,
		// Studios publiés que la personne gère (P4-03a).
		profile.kind === 'PERSON' ? studiosOfPerson(actorId, new Date(), viewer?.actorId) : []
	]);
	return {
		profile: publicProfile,
		band: null,
		studio: null,
		promoterOrg: null,
		studios,
		careerSheet,
		signedIn: Boolean(viewer?.onboardedAt),
		suggestions,
		isOwner,
		canReport: Boolean(viewer) && !isOwner
	};
};

export const actions: Actions = {
	/** Signaler le profil (personne connectée, P1-12). */
	report: async ({ params, request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Connecte-toi pour signaler.' });
		const reporter = await getPersonByUserId(locals.user.id);
		if (!reporter) return fail(403, { error: 'Complète ton profil pour signaler.' });
		const handle = params.handle.toLowerCase();
		const profile =
			(await getPublicProfile(handle, new Date(), reporter.actorId)) ??
			(await getPublicBand(handle, new Date(), reporter.actorId)) ??
			(await getPublicStudio(handle, new Date(), reporter.actorId)) ??
			(await getPublicPromoterOrg(handle, new Date(), reporter.actorId));
		if (!profile) error(404, 'Profil introuvable');
		const data = await request.formData();
		try {
			const result = await fileReport(reporter.actorId, {
				targetType: 'ACTOR',
				targetId: profile.id,
				reason: String(data.get('reason') ?? ''),
				details: String(data.get('details') ?? '')
			});
			return {
				reported: result.alreadyReported
					? 'Tu as déjà signalé ce profil : il est en cours d’examen.'
					: 'Merci, ton signalement est transmis à la modération.'
			};
		} catch (err) {
			if (err instanceof ModerationError) return fail(400, { error: err.message });
			throw err;
		}
	},
	/** Demander à rejoindre un groupe (P3-02), depuis sa page publique. */
	join: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Connecte-toi pour rejoindre le groupe.' });
		const me = await getPersonByUserId(locals.user.id);
		if (!me?.onboardedAt)
			return fail(403, { error: 'Complète ton profil pour rejoindre le groupe.' });
		const band = await getPublicBand(params.handle.toLowerCase(), new Date(), me.actorId);
		if (!band) error(404, 'Profil introuvable');
		try {
			await requestToJoin(band.id, me.actorId);
			return { joined: 'Demande envoyée : le groupe te répondra.' };
		} catch (err) {
			if (err instanceof BandError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	/** Contester une étape du groupe (P3-06) : signalement, gel si la personne est de confiance. */
	contestMilestone: async ({ params, locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Connecte-toi pour contester une étape.' });
		const me = await getPersonByUserId(locals.user.id);
		if (!me?.onboardedAt) return fail(403, { error: 'Complète ton profil pour contester.' });
		const band = await getPublicBand(params.handle.toLowerCase(), new Date(), me.actorId);
		if (!band) error(404, 'Profil introuvable');
		const data = await request.formData();
		const milestone = await prisma.milestone.findFirst({
			where: { bandId: band.id, definitionId: String(data.get('key') ?? '') },
			select: { id: true }
		});
		if (!milestone) return fail(404, { error: 'Cette étape n’existe plus.' });
		try {
			const result = await contestMilestone(
				me.actorId,
				milestone.id,
				String(data.get('details') ?? '')
			);
			return {
				reported: result.alreadyReported
					? 'Tu as déjà contesté cette étape : elle est en cours d’examen.'
					: 'Merci : la modération va vérifier cette étape.'
			};
		} catch (err) {
			if (err instanceof MilestoneError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	/** Bloquer la personne (P2-05) : son profil disparaît aussitôt, dans les deux sens. */
	block: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Connecte-toi pour bloquer.' });
		const me = await getPersonByUserId(locals.user.id);
		if (!me) return fail(403, { error: 'Complète ton profil pour bloquer.' });
		const profile = await getPublicProfile(params.handle.toLowerCase(), new Date(), me.actorId);
		if (!profile) error(404, 'Profil introuvable');
		try {
			await blockActor(me.actorId, profile.id);
		} catch (err) {
			if (err instanceof BlockingError) return fail(400, { error: err.message });
			throw err;
		}
		redirect(303, '/reglages?bloque=1');
	}
};
