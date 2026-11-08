/**
 * LINKMUSICIAN: file de modération (P1-12). Chaque action revérifie le rôle
 * (`requireModerator`) : SvelteKit n'exécute pas le `load` du layout avant
 * une action.
 */
import { fail } from '@sveltejs/kit';
import { requireModerator } from '#lib/server/moderation/guards';
import {
	approveMedia,
	collusionQueue,
	decideCollusion,
	dismissReport,
	moderationQueue,
	ModerationError,
	rejectMedia,
	sanction,
	removeOpportunity,
	removeVenue,
	validateVenue
} from '#lib/server/moderation/service';
import { VENUE_KIND_LABELS } from '#lib/venues/rules';
import { MilestoneError } from '#lib/server/milestones/service';
import { pendingEvidence, reviewEvidence } from '#lib/server/milestones/proofs';
import { disputeQueue, dismissContest, upholdContest } from '#lib/server/milestones/disputes';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [queue, collusion, evidence, disputes] = await Promise.all([
		moderationQueue(),
		collusionQueue(),
		pendingEvidence(),
		disputeQueue()
	]);
	const mediaView = (m: {
		id: string;
		kind: string;
		title: string;
		fileUrl: string | null;
		externalUrl: string | null;
		isDemo: boolean;
	}) => ({
		id: m.id,
		kind: m.kind,
		title: m.title,
		fileUrl: m.fileUrl,
		externalUrl: m.externalUrl,
		isDemo: m.isDemo
	});
	return {
		// Cercles fermés repérés la nuit (P2-10), jamais sanctionnés d'office.
		collusion,
		// Étapes de groupe contestées (P3-06), gelées ou non.
		disputes,
		// Liens d'écoute joints à une « première démo publique » (P3-05, D43).
		pendingEvidence: evidence,
		pendingVenues: queue.pendingVenues.map((v) => ({
			id: v.id,
			name: v.name,
			kind: VENUE_KIND_LABELS[v.kind],
			communeName: v.communeName,
			createdAt: v.createdAt,
			by: v.createdBy.handle
		})),
		pendingMedia: queue.pendingMedia.map((m) => ({
			...mediaView(m),
			actor: m.actor,
			createdAt: m.createdAt
		})),
		openReports: queue.openReports.map((r) => ({
			id: r.id,
			targetType: r.targetType,
			reason: r.reason,
			details: r.details,
			createdAt: r.createdAt,
			reporter: r.reporter.handle,
			targetActor: r.targetActor,
			media: r.media ? mediaView(r.media) : null,
			opportunity: r.opportunity,
			venue: r.venue
		}))
	};
};

async function run(
	locals: App.Locals,
	fn: (by: { userId: string }) => Promise<unknown>,
	done: string
) {
	requireModerator(locals);
	try {
		await fn({ userId: locals.user!.id });
		return { message: done };
	} catch (err) {
		if (err instanceof ModerationError || err instanceof MilestoneError) {
			return fail(400, { error: err.message });
		}
		throw err;
	}
}

const field = (data: FormData, name: string) => String(data.get(name) ?? '').trim();

export const actions: Actions = {
	/** Trancher un cercle fermé (P2-10) : rien d'anormal ou collusion confirmée. */
	decideCollusion: async ({ request, locals }) => {
		const data = await request.formData();
		const decision = field(data, 'decision') === 'CONFIRMED' ? 'CONFIRMED' : 'DISMISSED';
		return run(
			locals,
			(by) => decideCollusion(field(data, 'caseId'), decision, field(data, 'note'), by),
			decision === 'CONFIRMED' ? 'Collusion confirmée.' : 'Cas classé : rien d’anormal.'
		);
	},
	/** Retirer une annonce signalée (P2-02). */
	removeOpportunity: async ({ request, locals }) => {
		const data = await request.formData();
		return run(
			locals,
			(by) => removeOpportunity(field(data, 'opportunityId'), field(data, 'reason'), by),
			'Annonce retirée.'
		);
	},
	/** Preuve de démo publique (P3-05) : le nom d'artiste correspond-il ? */
	acceptEvidence: async ({ request, locals }) => {
		const data = await request.formData();
		return run(
			locals,
			(by) => reviewEvidence(field(data, 'evidenceId'), true, by),
			'Lien accepté.'
		);
	},
	rejectEvidence: async ({ request, locals }) => {
		const data = await request.formData();
		return run(
			locals,
			(by) => reviewEvidence(field(data, 'evidenceId'), false, by, field(data, 'reason')),
			'Lien refusé.'
		);
	},
	/** Étape contestée (P3-06) : retenue (XP reprise, avertissements) ou rejetée (dégel). */
	upholdMilestone: async ({ request, locals }) => {
		const data = await request.formData();
		return run(
			locals,
			(by) => upholdContest(field(data, 'milestoneId'), field(data, 'note'), by),
			'Contestation retenue : étape retirée, points repris, avertissements envoyés.'
		);
	},
	dismissMilestone: async ({ request, locals }) => {
		const data = await request.formData();
		return run(
			locals,
			(by) => dismissContest(field(data, 'milestoneId'), field(data, 'note'), by),
			'Contestation rejetée : l’étape est dégelée.'
		);
	},
	/** Valider un lieu ajouté par un compte récent (P2-14c, D26). */
	validateVenue: async ({ request, locals }) => {
		const data = await request.formData();
		return run(locals, (by) => validateVenue(field(data, 'venueId'), by), 'Lieu validé.');
	},
	/** Retirer un lieu signalé (P2-14a). */
	removeVenue: async ({ request, locals }) => {
		const data = await request.formData();
		return run(
			locals,
			(by) => removeVenue(field(data, 'venueId'), field(data, 'reason'), by),
			'Lieu retiré.'
		);
	},
	approve: async ({ request, locals }) => {
		const data = await request.formData();
		return run(locals, (by) => approveMedia(field(data, 'mediaId'), by), 'Média publié.');
	},
	reject: async ({ request, locals }) => {
		const data = await request.formData();
		return run(
			locals,
			(by) => rejectMedia(field(data, 'mediaId'), field(data, 'reason'), by),
			'Média refusé.'
		);
	},
	dismiss: async ({ request, locals }) => {
		const data = await request.formData();
		return run(
			locals,
			(by) => dismissReport(field(data, 'reportId'), field(data, 'note'), by),
			'Signalement classé.'
		);
	},
	sanction: async ({ request, locals }) => {
		const data = await request.formData();
		const kind = field(data, 'kind') === 'SUSPENSION' ? 'SUSPENSION' : 'WARNING';
		const days = Number(field(data, 'days')) || null;
		return run(
			locals,
			(by) =>
				sanction(
					field(data, 'actorId'),
					{ kind, reason: field(data, 'reason'), days, reportId: field(data, 'reportId') || null },
					by
				),
			kind === 'WARNING' ? 'Avertissement envoyé.' : 'Compte suspendu.'
		);
	}
};
