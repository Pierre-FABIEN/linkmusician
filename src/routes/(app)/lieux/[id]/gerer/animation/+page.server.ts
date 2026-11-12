// LINKMUSICIAN: animateur·rices des scènes ouvertes d'un lieu (P5-04b,
// conception 08 §14), pour sa gestion : suggestions (personnes prêtes à
// organiser des jams autour, triées par appréciations et jams animées,
// jamais l'XP), invitations, lead par défaut de chaque série.
import { error, fail } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { prisma } from '#lib/server';
import { JamError } from '#lib/server/jam/publicJams';
import { setSeriesLead, venueSeries } from '#lib/server/jam/series';
import {
	inviteVenueHost,
	removeVenueHost,
	suggestJamLeads,
	venueHostsOf
} from '#lib/server/jam/venueHosts';
import type { Actions, PageServerLoad } from './$types';

const guard = async (run: () => Promise<unknown>, message: string, field = 'error') => {
	try {
		await run();
		return { message };
	} catch (err) {
		if (err instanceof JamError) return fail(err.status, { [field]: err.message });
		throw err;
	}
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const person = await requirePerson(locals);
	let hosts;
	try {
		hosts = await venueHostsOf(params.id, person.actorId);
	} catch (err) {
		if (err instanceof JamError) error(404, 'Lieu introuvable');
		throw err;
	}
	const [venue, suggestions, series] = await Promise.all([
		prisma.venue.findUniqueOrThrow({
			where: { id: params.id },
			select: { id: true, name: true, communeName: true }
		}),
		suggestJamLeads(params.id, person.actorId),
		venueSeries(params.id)
	]);
	return {
		venue,
		hosts,
		suggestions,
		series: series.filter((s) => !s.stopped)
	};
};

export const actions: Actions = {
	invite: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const handle = String((await request.formData()).get('handle') ?? '');
		try {
			const name = await inviteVenueHost(params.id, person.actorId, handle);
			return { message: `Invitation envoyée à ${name}. Elle ou il répond depuis « Mes jams ».` };
		} catch (err) {
			if (err instanceof JamError) return fail(err.status, { inviteError: err.message, handle });
			throw err;
		}
	},
	remove: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const hostId = String((await request.formData()).get('hostId') ?? '');
		return guard(() => removeVenueHost(hostId, person.actorId), 'C’est fait.');
	},
	setLead: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const data = await request.formData();
		const seriesId = String(data.get('seriesId') ?? '');
		const handle = String(data.get('handle') ?? '');
		return guard(
			() => setSeriesLead(person.actorId, seriesId, handle),
			handle
				? 'C’est noté : cette personne mène les prochaines soirées.'
				: 'Plus de lead par défaut pour cette scène ouverte.'
		);
	}
};
