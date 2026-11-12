// LINKMUSICIAN: page publique ; un membre connecté y garde la navigation de
// son espace (P2-12b).
import { memberShell } from '#lib/server/actors/shell';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => ({
	memberShell: await memberShell(locals, cookies)
});
