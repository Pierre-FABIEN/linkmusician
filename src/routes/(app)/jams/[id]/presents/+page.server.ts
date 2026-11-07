// LINKMUSICIAN: après la jam (P2-15, D27) : « J'y étais », qui était là,
// appréciations (les seules à rapporter des points), retrait d'un faux
// présent par l'hôte.
import { error, fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { JamError } from '#lib/server/jam/publicJams';
import { endorse, iWasThere, notThere, removeFromJam, whoWasThere } from '#lib/server/jam/afterJam';
import { NetworkError, keepInTouch } from '#lib/server/network/service';
import { JAM_QUALITIES, JAM_QUALITY_LABELS, endorseSchema } from '#lib/jam/afterJam';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const data = await whoWasThere(params.id, (await me(locals)).actorId);
	if (!data) error(404, 'Jam introuvable ou trop ancienne');
	return {
		...data,
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
	},
	remove: async ({ locals, params, request }) => {
		const handle = text(await request.formData(), 'handle');
		const { actorId } = await me(locals);
		return attempt(
			() => removeFromJam(params.id, actorId, handle),
			'Présent retiré : ses appréciations sont reprises.'
		);
	}
};
