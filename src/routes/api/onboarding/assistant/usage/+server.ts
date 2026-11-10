/**
 * LINKMUSICIAN (P3-17) : ce que la personne fait des propositions
 * (appliquées, ignorées, retirées, modifiées). Un compteur, aucune valeur.
 */
import { error, json } from '@sveltejs/kit';
import { recordUsage } from '#lib/server/onboarding-assistant';

export async function POST({ request, locals }) {
	if (!locals.user) error(401, 'Non connecté');
	const body = (await request.json().catch(() => null)) as {
		event?: unknown;
		count?: unknown;
	} | null;
	if (!(await recordUsage(body?.event, body?.count))) error(400, 'Événement inconnu');
	return json({ ok: true });
}
