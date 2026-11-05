/**
 * LINKMUSICIAN: file de modération (P1-12). Chaque action revérifie le rôle
 * (`requireModerator`) : SvelteKit n'exécute pas le `load` du layout avant
 * une action.
 */
import { fail } from '@sveltejs/kit';
import { requireModerator } from '#lib/server/moderation/guards';
import {
	approveMedia,
	dismissReport,
	moderationQueue,
	ModerationError,
	rejectMedia,
	sanction,
	removeOpportunity,
	removeVenue
} from '#lib/server/moderation/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const queue = await moderationQueue();
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
		if (err instanceof ModerationError) return fail(400, { error: err.message });
		throw err;
	}
}

const field = (data: FormData, name: string) => String(data.get(name) ?? '').trim();

export const actions: Actions = {
	/** Retirer une annonce signalée (P2-02). */
	removeOpportunity: async ({ request, locals }) => {
		const data = await request.formData();
		return run(
			locals,
			(by) => removeOpportunity(field(data, 'opportunityId'), field(data, 'reason'), by),
			'Annonce retirée.'
		);
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
