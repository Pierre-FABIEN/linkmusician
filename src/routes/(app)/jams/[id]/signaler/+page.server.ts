// LINKMUSICIAN: « La jam n'a pas lieu » (#91b) : une personne inscrite avant
// le début signale depuis le terrain ; l'organisation de la jam répond. Les
// autres n'apprennent rien : 404.
import { error, fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { JamError } from '#lib/server/jam/publicJams';
import { reportJam, reportState, respondToIncident } from '#lib/server/jam/incidents';
import { INCIDENT_REASONS, INCIDENT_REASON_LABELS, jamReportSchema } from '#lib/jam/incidents';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { actorId } = await me(locals);
	const state = await reportState(params.id, actorId);
	if (!state || (!state.isOrganizer && !state.canReport && !state.myReport)) {
		error(404, 'Jam introuvable');
	}
	return {
		...state,
		reasons: INCIDENT_REASONS.map((value) => ({ value, label: INCIDENT_REASON_LABELS[value] }))
	};
};

const text = (data: FormData, name: string) => String(data.get(name) ?? '').trim();

export const actions: Actions = {
	report: async ({ locals, params, request }) => {
		const data = await request.formData();
		const parsed = jamReportSchema.safeParse({
			reason: text(data, 'reason'),
			wentThere: data.get('wentThere') === 'on',
			details: text(data, 'details')
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Vérifie le signalement.' });
		}
		const { actorId } = await me(locals);
		try {
			await reportJam(params.id, actorId, parsed.data);
			return {
				message:
					'Merci. L’organisation est prévenue, sans savoir qui a signalé, et la modération va examiner.'
			};
		} catch (err) {
			if (err instanceof JamError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	respond: async ({ locals, params, request }) => {
		const response = text(await request.formData(), 'response');
		const { actorId } = await me(locals);
		try {
			await respondToIncident(params.id, actorId, response);
			return { message: 'Réponse enregistrée : la modération la lira.' };
		} catch (err) {
			if (err instanceof JamError) return fail(err.status, { error: err.message });
			throw err;
		}
	}
};
