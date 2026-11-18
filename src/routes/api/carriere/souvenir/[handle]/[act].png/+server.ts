import { error, redirect } from '@sveltejs/kit';
import { careerMap } from '#lib/career/map';
import { getPublicProfile } from '#lib/server/actors/publicProfile';
import { careerFacts, firstVerifiedGig } from '#lib/server/career/map';
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
	if (!act || act.state !== 'passed') error(404, 'Carte souvenir introuvable');

	const month = (d: Date) =>
		new Intl.DateTimeFormat('fr-FR', {
			month: 'long',
			year: 'numeric',
			timeZone: 'Europe/Paris'
		}).format(d);
	// « La scène » (P5-08, numéro interne 5) : la carte souvenir du concert, avec le groupe et l'hôte.
	const gig = actNumber === 5 ? await firstVerifiedGig(profile.id) : null;
	const png = await renderSouvenir({
		displayName: profile.displayName,
		// N2 : le nom de l'épreuve, sans numéro d'acte.
		actTitle: act.name,
		trial: gig
			? `Premier concert vérifié avec ${gig.bandName}${gig.hostName ? `, accueilli par ${gig.hostName}` : ''}.`
			: act.trial,
		date: gig ? `concert de ${month(gig.occurredAt)}` : `créée en ${month(new Date())}`
	});

	return new Response(new Uint8Array(png), {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=60, stale-while-revalidate=60',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
