import { error, redirect } from '@sveltejs/kit';
import { careerMap } from '#lib/career/map';
import { getPublicProfile } from '#lib/server/actors/publicProfile';
import { careerFacts } from '#lib/server/career/map';
import { renderSouvenir } from '#lib/server/career/souvenir';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const handle = params.handle.toLowerCase();
	if (handle !== params.handle) {
		redirect(301, `/api/carriere/souvenir/${handle}/${params.act}.png`);
	}
	const actNumber = Number(params.act);
	if (!Number.isInteger(actNumber) || actNumber < 1 || actNumber > 8)
		error(404, 'Carte souvenir introuvable');

	const profile = await getPublicProfile(handle);
	if (!profile) error(404, 'Carte souvenir introuvable');
	const act = careerMap(await careerFacts(profile.id)).acts.find(
		(item) => item.number === actNumber
	);
	if (!act || act.status !== 'passed') error(404, 'Carte souvenir introuvable');

	const png = await renderSouvenir({
		displayName: profile.displayName,
		actTitle: `Acte ${act.roman} · ${act.name}`,
		trial: act.trial,
		date: `créée en ${new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date())}`
	});

	return new Response(new Uint8Array(png), {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=60, stale-while-revalidate=60',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
