// LINKMUSICIAN: confidentialité de mes jams (D81, conception 23) : qui voit
// mes jams passées et à venir, les personnes que j'autorise, celles à qui je
// les masque. Privé par défaut ; le partage avec tous les membres exige une
// case cochée.
import { fail } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import {
	PrivacyError,
	excludeFromActivities,
	grantActivityAccess,
	includeAgain,
	privacySettings,
	revokeActivityAccess,
	setPrivacyModes
} from '#lib/server/privacy/activities';
import { privacyModesSchema, SHARE_LABELS } from '#lib/privacy/activities';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	return { settings: await privacySettings(person.actorId), labels: SHARE_LABELS };
};

async function attempt(fn: () => Promise<unknown>, message: string) {
	try {
		await fn();
		return { message };
	} catch (err) {
		if (err instanceof PrivacyError) return fail(err.status, { error: err.message });
		throw err;
	}
}

const text = (data: FormData, name: string) => String(data.get(name) ?? '').trim();

export const actions: Actions = {
	modes: async ({ locals, request }) => {
		const data = await request.formData();
		const parsed = privacyModesSchema.safeParse({
			past: text(data, 'past'),
			future: text(data, 'future'),
			publicConsent: data.get('publicConsent') === 'on'
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Choisis un partage.' });
		}
		const { actorId } = await requirePerson(locals);
		return attempt(() => setPrivacyModes(actorId, parsed.data), 'Partage enregistré.');
	},
	grant: async ({ locals, request }) => {
		const handle = text(await request.formData(), 'handle');
		const { actorId } = await requirePerson(locals);
		return attempt(
			() => grantActivityAccess(actorId, handle),
			'Personne autorisée, selon ton partage.'
		);
	},
	revoke: async ({ locals, request }) => {
		const viewerId = text(await request.formData(), 'actorId');
		const { actorId } = await requirePerson(locals);
		return attempt(() => revokeActivityAccess(actorId, viewerId), 'Autorisation retirée.');
	},
	exclude: async ({ locals, request }) => {
		const handle = text(await request.formData(), 'handle');
		const { actorId } = await requirePerson(locals);
		return attempt(
			() => excludeFromActivities(actorId, handle),
			'Tes jams sont masquées à cette personne. Elle n’est pas prévenue.'
		);
	},
	include: async ({ locals, request }) => {
		const excludedId = text(await request.formData(), 'actorId');
		const { actorId } = await requirePerson(locals);
		return attempt(() => includeAgain(actorId, excludedId), 'Masquage retiré.');
	}
};
