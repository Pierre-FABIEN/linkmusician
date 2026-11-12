/** Contexte de navigation de session, revérifié contre les métiers du compte. */
import type { Cookies } from '@sveltejs/kit';
import { navigationContext, type HeldTrack } from '#lib/linkmusician/navigation';
import type { TrackKindValue } from '#lib/actors/tracks';

export const TRACK_CONTEXT_COOKIE = 'lm_track_context';

type Person = { actorId: string; tracks: readonly HeldTrack[] };

export function readNavigation(person: Person, cookies: Pick<Cookies, 'get'>) {
	let candidate: string | null = null;
	try {
		const saved = JSON.parse(cookies.get(TRACK_CONTEXT_COOKIE) ?? 'null');
		if (saved && saved.personId === person.actorId && typeof saved.track === 'string')
			candidate = saved.track;
	} catch {
		/* Un cookie ancien ou altéré ne doit jamais bloquer l'espace. */
	}
	return navigationContext(person.tracks, candidate);
}

export function saveNavigation(
	person: Person,
	track: TrackKindValue,
	cookies: Pick<Cookies, 'set'>
) {
	if (!person.tracks.some((t) => t.track === track)) return false;
	cookies.set(TRACK_CONTEXT_COOKIE, JSON.stringify({ personId: person.actorId, track }), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !import.meta.env.DEV
	});
	return true;
}
