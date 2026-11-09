// LINKMUSICIAN: un groupe vu par une personne connectée (P3-01) : membres
// actuels et passés (comme un club), invitations et demandes pour la
// gestion, « Demander à rejoindre » pour les autres. La page publique
// `/@handle` du groupe arrive avec P3-02. Parcours du groupe (étapes, P3-04)
// pour ses membres ; la gestion déclare les étapes franchies.
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
import { bandWorks } from '#lib/server/works/service';
import {
	MilestoneError,
	bandMilestones,
	bandTierOf,
	declareMilestone,
	updateMilestoneDetails,
	verifyReleaseMilestone
} from '#lib/server/milestones/service';
import { retractMilestone } from '#lib/server/milestones/disputes';
import {
	VerificationError,
	requestVerification,
	verificationState
} from '#lib/server/organizations/verification';
import {
	addEvidence,
	bandMilestoneProofs,
	requestAttestation
} from '#lib/server/milestones/proofs';
import {
	DECLARABLE_KEYS,
	declareSchema,
	dayToDate,
	milestoneDetailsSchema
} from '#lib/milestones/rules';
import { releaseReferenceSchema } from '#lib/milestones/verification';
import { BAREME } from '#lib/server/progression/core/bareme';
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
		// Morceaux du groupe (P3-11), idées comprises : pour ses membres actifs.
		works: band.my?.status === 'ACTIVE' ? await bandWorks(band.id) : [],
		// Étapes (P3-04) : le parcours, et ce que rapporte une déclaration.
		milestones: band.my?.status === 'ACTIVE' ? await bandMilestones(band.id) : [],
		// Rang du groupe (P3-08).
		tier: await bandTierOf(band.id),
		// Vérification de l'organisation (P3-09), pour sa gestion.
		verification: band.my?.status === 'ACTIVE' ? await verificationState(band.id) : null,
		// Preuves (P3-05) : demandes, liens et ce qu'il reste à faire.
		proofs: band.my?.status === 'ACTIVE' ? await bandMilestoneProofs(band.id) : {},
		declaredXp: Object.fromEntries(
			DECLARABLE_KEYS.map((key) => [key, BAREME.milestones[key].DECLARED ?? 0])
		),
		created: url.searchParams.has('cree')
	};
};

/** Exécute une action du service ; ses refus deviennent un message. */
async function run(action: () => Promise<unknown>, message: string) {
	try {
		await action();
		return { message };
	} catch (err) {
		if (
			err instanceof BandError ||
			err instanceof MilestoneError ||
			err instanceof VerificationError
		) {
			return fail(err.status, { error: err.message });
		}
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
	declare: async ({ locals, params, request }) => {
		const { actorId, band, field } = await context(locals, params, request);
		const parsed = declareSchema().safeParse({
			key: field('key'),
			day: field('day'),
			note: field('note')
		});
		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.',
				milestone: field('key')
			});
		}
		return run(
			() => declareMilestone(band.id, actorId, parsed.data),
			'C’est dans votre parcours !'
		);
	},
	editMilestone: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, params, request);
		const parsed = milestoneDetailsSchema().safeParse({ day: field('day'), note: field('note') });
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.' });
		}
		return run(
			() => updateMilestoneDetails(field('milestoneId'), actorId, parsed.data),
			'Étape mise à jour.'
		);
	},
	/** Demander la vérification du groupe (P3-09). */
	requestVerification: async ({ locals, params, request }) => {
		const { actorId, band, field } = await context(locals, params, request);
		return run(
			() =>
				requestVerification(band.id, actorId, {
					siret: field('siret'),
					officialUrl: field('officialUrl')
				}),
			'Demande envoyée : l’équipe vérifie et vous répond ici.'
		);
	},
	/** Retirer une étape déclarée par erreur (P3-06) : XP reprise par transactions liées. */
	retractMilestone: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, params, request);
		return run(
			() => retractMilestone(field('milestoneId'), actorId),
			'Étape retirée de votre parcours.'
		);
	},
	askConfirm: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, params, request);
		try {
			const { displayName } = await requestAttestation(
				field('milestoneId'),
				actorId,
				field('handle')
			);
			return { message: `Demande envoyée à ${displayName}.` };
		} catch (err) {
			if (err instanceof MilestoneError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	addLink: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, params, request);
		try {
			const { reviewed, corroborated, verified, title } = await addEvidence(
				field('milestoneId'),
				actorId,
				field('url')
			);
			return {
				message: verified
					? `« ${title} » vérifiée par MusicBrainz, bravo !`
					: corroborated
						? 'Bravo, l’étape est corroborée !'
						: reviewed
							? 'Lien envoyé à la modération : on vérifie le nom d’artiste.'
							: 'Lien ajouté.'
			};
		} catch (err) {
			if (err instanceof MilestoneError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	verifyRelease: async ({ locals, params, request }) => {
		const { actorId, band, field } = await context(locals, params, request);
		const key = field('key');
		if (key !== 'FIRST_EP' && key !== 'FIRST_ALBUM') {
			return fail(400, { error: 'Choisis un EP ou un album.' });
		}
		const details = milestoneDetailsSchema().safeParse({ day: field('day'), note: '' });
		if (!details.success) {
			return fail(400, { error: details.error.issues[0]?.message ?? 'Vérifie la date.' });
		}
		const reference = releaseReferenceSchema.safeParse({
			kind: field('kind'),
			value: field('value')
		});
		if (!reference.success) {
			return fail(400, {
				error: reference.error.issues[0]?.message ?? 'Vérifie la référence de sortie.'
			});
		}
		try {
			const release = await verifyReleaseMilestone(band.id, actorId, {
				key,
				kind: reference.data.kind,
				value: reference.data.value,
				occurredAt: dayToDate(details.data.day)
			});
			return { message: `« ${release.title} » est vérifié et ajouté au parcours.` };
		} catch (err) {
			if (err instanceof MilestoneError) return fail(err.status, { error: err.message });
			throw err;
		}
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
