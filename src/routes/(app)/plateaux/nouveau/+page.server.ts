// LINKMUSICIAN: publier un plateau (P5-05a, conception 08 §8) : une date dans
// un lieu de l'annuaire, des groupes cherchés, des conditions sur des faits
// prouvés (rang, genre, zone), jamais l'XP. Aucune XP à la publication.
// Au nom d'une organisation (P5-05b) ou d'un lieu que l'on gère (P5-03b) :
// la gestion d'un lieu publie chez lui sans le métier d'organisateur·rice.
import { fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { listGenreTree } from '#lib/prisma/skills/referentials';
import { getActorLocation } from '#lib/server/geo/queries';
import { getVenue, venuesNear } from '#lib/server/venues/service';
import { OpportunityError } from '#lib/server/opportunities/service';
import { createGigSlot, isPromoter } from '#lib/server/opportunities/gigSlots';
import { GIG_TIER_OPTIONS, gigSlotSchema } from '#lib/opportunities/gigSlot';
import { parisDay } from '#lib/metrics/indicators';
import { myPromoterOrgs } from '#lib/server/organizations/promoters';
import { myVenues } from '#lib/server/venues/profile';

/** Organisations et lieux au nom desquels la personne peut publier maintenant. */
async function issuersFor(personId: string, promoter: boolean) {
	const [orgs, venues] = await Promise.all([
		promoter ? myPromoterOrgs(personId) : Promise.resolve([]),
		myVenues(personId)
	]);
	return [
		...orgs
			.filter((o) => o.gaps.length === 0)
			.map((o) => ({
				id: o.id,
				handle: o.handle,
				name: o.name,
				commune: o.commune,
				venueId: null
			})),
		...venues
			.filter((v) => v.published)
			.map((v) => ({
				id: v.orgId,
				handle: v.handle,
				name: v.name,
				commune: v.commune as string | null,
				venueId: v.venueId as string | null
			}))
	];
}
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const promoter = await isPromoter(person.actorId);
	const issuers = await issuersFor(person.actorId, promoter);
	if (!promoter && issuers.length === 0) return { promoter: false as const };
	const location = await getActorLocation(person.actorId);
	const chosenId = url.searchParams.get('lieu');
	const [venues, chosen, genres] = await Promise.all([
		location ? venuesNear(person.actorId, { limit: 50 }) : Promise.resolve([]),
		// Un lieu en attente de validation n'accueille rien (D26).
		chosenId
			? getVenue(chosenId, person.actorId).then((v) => (v?.validated ? v : null))
			: Promise.resolve(null),
		listGenreTree()
	]);
	// « Publier une date » depuis la fiche d'un lieu : le lieu en émetteur.
	const asOrg =
		url.searchParams.get('au-nom-de') ??
		issuers.find((o) => o.venueId && o.venueId === chosenId)?.handle ??
		null;
	const canPublishAsMe = promoter && location !== null;
	const options = chosen && !venues.some((v) => v.id === chosen.id) ? [chosen, ...venues] : venues;
	return {
		promoter: true as const,
		commune: location?.communeName ?? null,
		canPublishAsMe,
		orgs: issuers.map(({ handle, name, commune, venueId }) => ({ handle, name, commune, venueId })),
		// Sans pouvoir publier en son nom, on publie au nom d'une organisation.
		defaultOrg: issuers.some((o) => o.handle === asOrg)
			? asOrg!
			: canPublishAsMe
				? ''
				: (issuers[0]?.handle ?? ''),
		venues: options.map((v) => ({
			id: v.id,
			label: `${v.name} · ${v.kindLabel} · ${v.communeName}`
		})),
		venueId: chosen?.id ?? '',
		today: parisDay(new Date()),
		tiers: GIG_TIER_OPTIONS,
		genres: genres.map((g) => ({
			slug: g.slug,
			name: g.name,
			children: g.children.map((c) => ({ slug: c.slug, name: c.name }))
		}))
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const person = (await getPersonByUserId(locals.user!.id))!;
		const raw = Object.fromEntries(await request.formData()) as Record<string, string>;
		const parsed = gigSlotSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, {
				values: raw,
				error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.'
			});
		}
		// Au nom d'une organisation (P5-05b) : relu côté serveur.
		const asOrg = typeof raw.asOrg === 'string' ? raw.asOrg : '';
		const org = asOrg
			? (await issuersFor(person.actorId, await isPromoter(person.actorId))).find(
					(o) => o.handle === asOrg
				)
			: null;
		if (asOrg && !org) {
			return fail(403, { values: raw, error: 'Tu ne gères pas cette organisation.' });
		}
		let id: string;
		try {
			({ id } = await createGigSlot(person.actorId, parsed.data, new Date(), org?.id ?? null));
		} catch (err) {
			if (err instanceof OpportunityError)
				return fail(err.status, { values: raw, error: err.message });
			throw err;
		}
		redirect(303, `/annonces/${id}?publiee=1`);
	}
};
