// LINKMUSICIAN: point d'entrée de l'espace, le « menu du jeu » (P2-12, P2-12b,
// D21) : mode carrière ou mode jam, le dernier choix retenu ; la première
// fois, une présentation pas à pas (`/jouer/[mode]`).
import { z } from 'zod';
import { TRACK_KINDS } from '#lib/actors/tracks';
import { contextDestination } from '#lib/linkmusician/navigation';
import { saveNavigation } from '#lib/server/actors/navigation';
import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getDashboard } from '#lib/server/progression/dashboard';
import { getActorLocation } from '#lib/server/geo/queries';
import { upcomingJamsNear } from '#lib/server/jam/publicJams';
import { myNetwork } from '#lib/server/network/service';
import { listNearby } from '#lib/server/opportunities/service';
import { ambitionPriorities } from '#lib/career/ambition';
import { linkable } from '#lib/server/career/service';
import { destinationFor, isPlayMode } from '#lib/linkmusician/modes';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const location = await getActorLocation(person.actorId);
	// Les mêmes services que les écrans détaillés : visibilité, blocages et
	// protections des mineur·es s'appliquent aussi aux aperçus de l'accueil.
	const [dashboard, jams, network, opportunities] = await Promise.all([
		getDashboard(person.actorId, ambitionPriorities(person.ambition)),
		location ? upcomingJamsNear(person.actorId) : Promise.resolve([]),
		myNetwork(person.actorId),
		location ? listNearby(person.actorId) : Promise.resolve([])
	]);
	return {
		preferredMode: person.preferredMode,
		level: dashboard.level,
		commune: location?.communeName ?? null,
		jams: jams.slice(0, 2),
		network: network.slice(0, 2),
		opportunities: opportunities.filter((o) => o.kind !== 'JAM').slice(0, 4),
		progress: {
			xp: dashboard.xp,
			xpIntoLevel: dashboard.xpIntoLevel,
			xpForNextLevel: dashboard.xpForNextLevel,
			objective: linkable(dashboard.objectives)[0] ?? null,
			achievements: dashboard.achievements.filter((a) => a.unlockedAt).slice(-4)
		}
	};
};

export const actions: Actions = {
	switchTrack: async ({ locals, request, cookies }) => {
		const input = await request.formData();
		const parsed = z.enum(TRACK_KINDS).safeParse(input.get('track'));
		if (!parsed.success) return fail(400, { error: 'Métier inconnu.' });
		const person = (await getPersonByUserId(locals.user!.id))!;
		if (!saveNavigation(person, parsed.data, cookies))
			return fail(403, { error: 'Ce métier ne fait pas partie de ton profil.' });
		redirect(303, contextDestination(String(input.get('returnTo') ?? '/espace'), parsed.data));
	},
	choose: async ({ locals, request }) => {
		const mode = (await request.formData()).get('mode');
		if (!isPlayMode(mode)) return fail(400, { error: 'Mode inconnu.' });
		const person = (await getPersonByUserId(locals.user!.id))!;
		await prisma.person.update({
			where: { actorId: person.actorId },
			data: { preferredMode: mode }
		});
		redirect(303, destinationFor(mode, person.modeIntrosSeen));
	},
	toggleMode: async ({ locals, request }) => {
		const mode = (await request.formData()).get('mode');
		if (!isPlayMode(mode)) return fail(400, { error: 'Mode inconnu.' });
		const person = (await getPersonByUserId(locals.user!.id))!;
		await prisma.person.update({
			where: { actorId: person.actorId },
			data: { preferredMode: mode }
		});
		redirect(303, mode === 'JAM' ? '/jam' : '/espace');
	}
};
