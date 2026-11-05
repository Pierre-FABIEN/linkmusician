// LINKMUSICIAN: fiche d'une jam publique (P2-14b) : lieu, créneau, places,
// « Je viens » (sans acceptation, sans XP, D27). Formation du lead,
// invitations et matériel sur place (P2-14c).
import { error, fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { listInstrumentsByFamily } from '#lib/prisma/skills/referentials';
import {
	JamError,
	cancelJamInvite,
	comeToJam,
	getJam,
	inviteToJam,
	networkHandles,
	notComingToJam,
	respondToJamInvite,
	setJamBackline,
	setJamLead
} from '#lib/server/jam/publicJams';
import { BACKLINE_ITEMS, BACKLINE_LABELS, backlineSchema, inviteSchema } from '#lib/jam/lineup';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { actorId } = await me(locals);
	const jam = await getJam(params.id, actorId);
	if (!jam) error(404, 'Jam introuvable');
	const [instruments, network] = await Promise.all([
		listInstrumentsByFamily(),
		jam.canManage ? networkHandles(actorId) : Promise.resolve([])
	]);
	return {
		jam,
		instruments: instruments.flatMap((f) =>
			f.instruments.map((i) => ({ id: i.id, slug: i.slug, name: i.name }))
		),
		network,
		backlineOptions: BACKLINE_ITEMS.map((value) => ({ value, label: BACKLINE_LABELS[value] })),
		published: url.searchParams.has('publiee')
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
	come: async ({ locals, params, request }) => {
		const instrument = text(await request.formData(), 'instrument');
		const { actorId } = await me(locals);
		return attempt(
			() => comeToJam(params.id, actorId, /^[a-z0-9-]{1,60}$/.test(instrument) ? instrument : null),
			'C’est noté : tu viens !'
		);
	},
	notComing: async ({ locals, params }) => {
		await notComingToJam(params.id, (await me(locals)).actorId);
		return { message: 'Tu ne viens plus.' };
	},
	invite: async ({ locals, params, request }) => {
		const data = await request.formData();
		const parsed = inviteSchema.safeParse({
			handle: text(data, 'handle'),
			instrument: text(data, 'instrument')
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Vérifie l’invitation.' });
		}
		const { actorId } = await me(locals);
		try {
			const invitee = await inviteToJam(params.id, actorId, parsed.data);
			return { message: `${invitee.displayName} est invité·e. La place lui est réservée.` };
		} catch (err) {
			if (err instanceof JamError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	cancelInvite: async ({ locals, params, request }) => {
		const handle = text(await request.formData(), 'handle');
		const { actorId } = await me(locals);
		return attempt(
			() => cancelJamInvite(params.id, actorId, handle),
			'Invitation retirée : la place est de nouveau ouverte.'
		);
	},
	accept: async ({ locals, params }) => {
		const { actorId } = await me(locals);
		return attempt(
			() => respondToJamInvite(params.id, actorId, true),
			'Tu fais partie de la formation !'
		);
	},
	decline: async ({ locals, params }) => {
		const { actorId } = await me(locals);
		return attempt(
			() => respondToJamInvite(params.id, actorId, false),
			'Invitation déclinée. Merci d’avoir répondu.'
		);
	},
	lead: async ({ locals, params, request }) => {
		const handle = text(await request.formData(), 'handle')
			.replace(/^@/, '')
			.toLowerCase();
		const { actorId } = await me(locals);
		return attempt(
			() => setJamLead(params.id, actorId, handle),
			handle ? 'Lead désigné.' : 'Tu reprends le lead.'
		);
	},
	backline: async ({ locals, params, request }) => {
		const parsed = backlineSchema.safeParse((await request.formData()).getAll('backline'));
		if (!parsed.success) return fail(400, { error: 'Matériel inconnu.' });
		const { actorId } = await me(locals);
		return attempt(() => setJamBackline(params.id, actorId, parsed.data), 'Matériel enregistré.');
	}
};
