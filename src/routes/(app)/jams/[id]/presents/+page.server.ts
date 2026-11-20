// LINKMUSICIAN: après la jam (P2-15, D27) : « J'y étais », qui était là,
// appréciations (les seules à rapporter des points). La présence est une
// déclaration personnelle : personne ne retire celle d'autrui (#92, D81).
import { error, fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { JamError, isJamOrganizer } from '#lib/server/jam/publicJams';
import { endorse, iWasThere, notThere, whoWasThere } from '#lib/server/jam/afterJam';
import { NetworkError, keepInTouch } from '#lib/server/network/service';
import { PrivacyError, startDiscovery, stopDiscovery } from '#lib/server/privacy/activities';
import { reportState } from '#lib/server/jam/incidents';
import { JAM_QUALITIES, JAM_QUALITY_LABELS, endorseSchema } from '#lib/jam/afterJam';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { actorId } = await me(locals);
	const data = await whoWasThere(params.id, actorId);
	if (!data) error(404, 'Jam introuvable ou trop ancienne');
	return {
		...data,
		/** « Rejouer ensemble » relance une jam : organisateurs seulement (D51). */
		organizer: await isJamOrganizer(actorId),
		/** « La jam n'a pas eu lieu ? » (#91b), jusqu'à 24 h après la fin. */
		canReport: (await reportState(params.id, actorId))?.canReport ?? false,
		qualities: JAM_QUALITIES.map((value) => ({ value, label: JAM_QUALITY_LABELS[value] }))
	};
};

async function attempt(fn: () => Promise<unknown>, message: string) {
	try {
		await fn();
		return { message };
	} catch (err) {
		if (err instanceof JamError) return fail(err.status, { error: err.message });
		throw err;
	}
}

const text = (data: FormData, name: string) => String(data.get(name) ?? '').trim();

export const actions: Actions = {
	there: async ({ locals, params }) => {
		const { actorId } = await me(locals);
		return attempt(() => iWasThere(params.id, actorId), 'C’est noté : tu y étais !');
	},
	notThere: async ({ locals, params }) => {
		const { actorId } = await me(locals);
		return attempt(() => notThere(params.id, actorId), 'Ta présence est retirée.');
	},
	endorse: async ({ locals, params, request }) => {
		const data = await request.formData();
		const parsed = endorseSchema.safeParse({
			to: text(data, 'to'),
			quality: text(data, 'quality') || undefined,
			instrument: text(data, 'instrument') || undefined
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Choisis une appréciation.' });
		}
		const { actorId } = await me(locals);
		try {
			const done = await endorse(params.id, actorId, parsed.data);
			return { message: `Merci ! ${done.displayName} reçoit ton « ${done.skill} ».` };
		} catch (err) {
			if (err instanceof JamError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	/** « Me rendre visible pour rencontrer des musicien·nes ici » (D81) : réciproque, jusqu'à la fin de la jam. */
	discover: async ({ locals, params }) => {
		const { actorId } = await me(locals);
		const data = await whoWasThere(params.id, actorId);
		if (!data) return fail(404, { error: 'Jam introuvable.' });
		try {
			await startDiscovery(data.jam, actorId);
			return { message: 'Tu es visible ici, jusqu’à la fin de la jam.' };
		} catch (err) {
			if (err instanceof PrivacyError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	hide: async ({ locals, params }) => {
		const { actorId } = await me(locals);
		await stopDiscovery(params.id, actorId);
		return { message: 'Tu n’es plus visible ici.' };
	},
	/** « Garder le contact » : réseau musical (P2-16). */
	keep: async ({ locals, request }) => {
		const handle = text(await request.formData(), 'handle');
		try {
			const contact = await keepInTouch((await me(locals)).actorId, handle);
			return {
				message: `${contact.displayName} rejoint tes contacts : tu le ou la retrouves dans Messages, onglet Contacts.`
			};
		} catch (err) {
			if (err instanceof NetworkError) return fail(err.status, { error: err.message });
			throw err;
		}
	}
};
