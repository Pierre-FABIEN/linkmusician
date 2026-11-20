// LINKMUSICIAN: jams signalées (#91b) : dossiers « la jam n'a pas lieu » et
// interdictions d'organiser. Chaque action revérifie le rôle
// (`requireModerator`) : SvelteKit n'exécute pas le `load` du layout avant
// une action.
import { fail } from '@sveltejs/kit';
import { requireModerator } from '#lib/server/moderation/guards';
import { JamError } from '#lib/server/jam/publicJams';
import {
	activeRestrictions,
	decideIncident,
	jamIncidentQueue,
	liftRestriction
} from '#lib/server/jam/incidents';
import {
	INCIDENT_SANCTIONS,
	INCIDENT_SANCTION_LABELS,
	incidentDecisionSchema
} from '#lib/jam/incidents';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [incidents, restrictions] = await Promise.all([jamIncidentQueue(), activeRestrictions()]);
	return {
		incidents,
		restrictions,
		sanctions: INCIDENT_SANCTIONS.map((value) => ({
			value,
			label: INCIDENT_SANCTION_LABELS[value]
		}))
	};
};

const text = (data: FormData, name: string) => String(data.get(name) ?? '').trim();

async function attempt(fn: () => Promise<unknown>, message: string) {
	try {
		await fn();
		return { message };
	} catch (err) {
		if (err instanceof JamError) return fail(err.status, { error: err.message });
		throw err;
	}
}

export const actions: Actions = {
	decide: async ({ locals, request }) => {
		requireModerator(locals);
		const data = await request.formData();
		const parsed = incidentDecisionSchema.safeParse({
			decision: text(data, 'decision'),
			sanction: text(data, 'sanction') || 'none',
			note: text(data, 'note')
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Vérifie la décision.' });
		}
		const incidentId = text(data, 'incidentId');
		return attempt(
			() => decideIncident(incidentId, parsed.data, { userId: locals.user.id }),
			parsed.data.decision === 'confirm' ? 'Manquement confirmé.' : 'Dossier classé.'
		);
	},
	lift: async ({ locals, request }) => {
		requireModerator(locals);
		const data = await request.formData();
		return attempt(
			() =>
				liftRestriction(text(data, 'restrictionId'), text(data, 'note'), {
					userId: locals.user.id
				}),
			'Interdiction levée.'
		);
	}
};
