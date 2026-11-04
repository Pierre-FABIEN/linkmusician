// LINKMUSICIAN: zone de modération (P1-12), ouverte aux modérateurs et aux
// administrateurs. Hors de `/admin`, réservé aux administrateurs par le hook
// du boilerplate.
import { assertModerator } from '#lib/server/moderation/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	assertModerator(locals);
	return {};
};
