// LINKMUSICIAN: publier une annonce (P2-02). Aucune XP à la publication.
import { fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { listGenreTree, listInstrumentsByFamily } from '#lib/prisma/skills/referentials';
import {
	OpportunityError,
	TIER_OPTIONS,
	createOpportunity
} from '#lib/server/opportunities/service';
import {
	MAX_TITLE,
	GENERAL_KINDS,
	OPPORTUNITY_TARGETS,
	TARGET_SPECIALTIES,
	opportunitySchema,
	type OpportunityTarget
} from '#lib/opportunities/rules';
import { managedBands } from '#lib/server/bands/service';
import { manageableWorks } from '#lib/server/works/service';
import type { Actions, PageServerLoad } from './$types';

/** Identifiant d'un besoin (cuid) ; le serveur relit tout le reste. */
const NEED_ID = /^[a-z0-9]{10,40}$/;

export const load: PageServerLoad = async ({ locals, url }) => {
	// Une jam se publie dans un lieu de l'annuaire (P2-14b).
	if (url.searchParams.get('type') === 'JAM') redirect(303, '/jams/nouvelle');
	// Un plateau aussi (P5-05a).
	if (url.searchParams.get('type') === 'GIG_SLOT') redirect(303, '/plateaux/nouveau');
	const person = (await getPersonByUserId(locals.user!.id))!;
	const [location, instruments, genres, bands, works] = await Promise.all([
		getActorLocation(person.actorId),
		listInstrumentsByFamily(),
		listGenreTree(),
		// Groupes que je gère : publier un recrutement en leur nom (P3-03).
		managedBands(person.actorId),
		// Morceaux que je peux relier à l'annonce (P4-05).
		manageableWorks(person.actorId)
	]);
	// « Trouver un·e ingé son » depuis un morceau (P4-05) : ?cible=&specialite=&morceau=.
	const cible = url.searchParams.get('cible') ?? '';
	const target: OpportunityTarget = (OPPORTUNITY_TARGETS as readonly string[]).includes(cible)
		? (cible as OpportunityTarget)
		: 'MUSICIAN';
	const specialite = url.searchParams.get('specialite') ?? '';
	const morceau = url.searchParams.get('morceau') ?? '';
	const groupe = url.searchParams.get('groupe');
	// U3b-c : préparée depuis un besoin de projet ; relu sous verrou à la publication.
	const besoin = url.searchParams.get('besoin');
	return {
		need: besoin && NEED_ID.test(besoin) ? besoin : null,
		commune: location?.communeName ?? null,
		instruments: instruments.map((f) => ({
			family: f.family,
			instruments: f.instruments.map((i) => ({ slug: i.slug, name: i.name }))
		})),
		genres: genres.map((g) => ({
			slug: g.slug,
			name: g.name,
			children: g.children.map((c) => ({ slug: c.slug, name: c.name }))
		})),
		tiers: TIER_OPTIONS,
		works,
		bands: bands.map(({ handle, name, commune }) => ({ handle, name, commune })),
		defaultBand: bands.some((b) => b.handle === groupe) ? groupe : '',
		// « Recruter » depuis un rôle à pourvoir d'un morceau (P3-11).
		prefill: {
			title: (url.searchParams.get('titre') ?? '').slice(0, MAX_TITLE),
			instrument: instruments.some((f) =>
				f.instruments.some((i) => i.slug === url.searchParams.get('instrument'))
			)
				? url.searchParams.get('instrument')!
				: '',
			target,
			specialty: TARGET_SPECIALTIES[target].some((s) => s.id === specialite) ? specialite : '',
			work: works.some((w) => w.id === morceau) ? morceau : ''
		},
		// « Lancer une jam » depuis le mode jam (P2-12) : type présélectionné.
		defaultKind: (GENERAL_KINDS as readonly string[]).includes(url.searchParams.get('type') ?? '')
			? url.searchParams.get('type')!
			: 'RECRUIT_MEMBER'
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const person = (await getPersonByUserId(locals.user!.id))!;
		const raw = Object.fromEntries(await request.formData());
		const parsed = opportunitySchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, {
				values: raw as Record<string, string>,
				error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.'
			});
		}
		if (parsed.data.kind === 'JAM') redirect(303, '/jams/nouvelle');
		if (parsed.data.kind === 'GIG_SLOT') redirect(303, '/plateaux/nouveau');
		// Au nom d'un groupe que je gère (P3-03) : relu côté serveur.
		const asBand = typeof raw.asBand === 'string' ? raw.asBand : '';
		const needId = typeof raw.besoin === 'string' && NEED_ID.test(raw.besoin) ? raw.besoin : null;
		const band = asBand
			? (await managedBands(person.actorId)).find((b) => b.handle === asBand)
			: null;
		if (asBand && !band) {
			return fail(403, {
				values: raw as Record<string, string>,
				error: 'Tu ne gères pas ce groupe.'
			});
		}
		let id: string;
		try {
			({ id } = await createOpportunity(
				person.actorId,
				parsed.data,
				new Date(),
				band?.id ?? null,
				needId
			));
		} catch (err) {
			if (err instanceof OpportunityError) {
				return fail(err.status, { values: raw as Record<string, string>, error: err.message });
			}
			throw err;
		}
		redirect(303, `/annonces/${id}?publiee=1`);
	}
};
