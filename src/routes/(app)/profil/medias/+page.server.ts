/**
 * LINKMUSICIAN: « Mes médias » (P1-08a) : liens YouTube, SoundCloud, Bandcamp.
 * L'envoi de fichiers arrive avec P1-08b.
 */
import { fail } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { getMusicalProfile } from '#lib/prisma/skills/musicalProfile';
import { progressMessage } from '#lib/progression/messages';
import {
	addExternalMedia,
	countQuotaMedia,
	deleteOwnMedia,
	listOwnMedia,
	MediaError
} from '#lib/server/media/service';
import { checkStockQuota } from '#lib/server/trust/quotas';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	const [media, musical, used] = await Promise.all([
		listOwnMedia(person.actorId),
		getMusicalProfile(person),
		countQuotaMedia(person.actorId)
	]);
	const quota = await checkStockQuota(person.actorId, 'mediaItems', used);
	return {
		media: media.map((m) => ({
			id: m.id,
			kind: m.kind,
			status: m.status,
			title: m.title,
			externalUrl: m.externalUrl,
			isDemo: m.isDemo,
			instrument: m.instrument?.name ?? null
		})),
		instruments: musical.instruments.map((i) => ({ id: i.instrumentId, name: i.name })),
		quota: { used, limit: quota.limit, level: quota.level }
	};
};

export const actions: Actions = {
	addLink: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const data = await request.formData();
		const url = String(data.get('url') ?? '');
		try {
			const { media, progress } = await addExternalMedia(person.actorId, {
				url,
				title: String(data.get('title') ?? ''),
				isDemo: data.get('isDemo') === 'on',
				instrumentId: String(data.get('instrumentId') ?? '') || null
			});
			const base =
				media.status === 'PUBLISHED'
					? 'Ton lien est publié.'
					: 'Ton lien est enregistré : il sera visible après validation.';
			return { message: progress ? progressMessage(base, progress) : base };
		} catch (err) {
			if (err instanceof MediaError) return fail(400, { error: err.message, url });
			throw err;
		}
	},
	delete: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const id = String((await request.formData()).get('id') ?? '');
		try {
			await deleteOwnMedia(person.actorId, id);
			return { message: 'Média supprimé.' };
		} catch (err) {
			if (err instanceof MediaError) return fail(404, { error: err.message });
			throw err;
		}
	}
};
