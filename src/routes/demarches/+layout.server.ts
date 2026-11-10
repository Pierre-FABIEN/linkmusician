// LINKMUSICIAN: guide des démarches (P3-15a), public comme l’aide ; un membre connecté y garde la
// navigation de son espace (comme `/@handle`).
import { memberShell } from '#lib/server/actors/shell';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => ({
	memberShell: await memberShell(locals)
});
