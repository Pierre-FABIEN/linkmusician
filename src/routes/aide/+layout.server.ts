// LINKMUSICIAN: centre d'aide, public ; un membre connecté y garde la
// navigation de son espace (comme `/@handle`).
import { memberShell } from '#lib/server/actors/shell';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => ({
	memberShell: await memberShell(locals, cookies)
});
