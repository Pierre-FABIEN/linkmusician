/**
 * LINKMUSICIAN: une annonce (P2-02). 404 si l'auteur n'est pas visible
 * (masqué, suspendu, bloqué dans un sens ou dans l'autre) ou si elle a été
 * retirée. L'auteur la clôture et tranche les candidatures (P2-03) ; les
 * autres postulent (conditions vérifiées) ou la signalent.
 */
import { error, fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import {
	OpportunityError,
	closeOpportunity,
	getOpportunity
} from '#lib/server/opportunities/service';
import { fileReport, ModerationError } from '#lib/server/moderation/service';
import { prisma } from '#lib/server';
import {
	applyTo,
	decideApplication,
	eligibilityFor,
	listForIssuer,
	myApplication,
	withdrawApplication
} from '#lib/server/opportunities/applications';
import {
	applyDelegated,
	delegatedOptions,
	delegatedApplicationsFor
} from '#lib/server/opportunities/delegated';
import { demarcheNudge } from '#lib/server/demarches/service';
import { completeLinks, type CompleteLink } from '#lib/opportunities/qualification';
import { isAdult } from '#lib/server/jam/publicJams';
import {
	applyAsBand,
	bandOptionsFor,
	withdrawBandApplication
} from '#lib/server/opportunities/gigSlots';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const person = await me(locals);
	const actorId = person.actorId;
	const opportunity = await getOpportunity(params.id, actorId);
	if (!opportunity) error(404, 'Annonce introuvable');
	const delegation = {
		delegatedOptions: opportunity.isOwner ? [] : await delegatedOptions(actorId, params.id),
		delegatedApplications: await delegatedApplicationsFor(actorId, params.id)
	};
	// Démarche en contexte (P3-15a, 09 §3) : une session payée, c'est un cachet.
	const demarche = await demarcheNudge(actorId, { screen: 'annonce', kind: opportunity.kind });
	if (opportunity.isOwner) {
		return {
			opportunity,
			...delegation,
			demarche,
			applications: await listForIssuer(actorId, params.id),
			mine: null,
			unmet: [],
			unknown: [],
			complete: [],
			gig: null
		};
	}
	// Plateau (P5-05a) : on candidate au nom d'un groupe que l'on gère.
	if (opportunity.kind === 'GIG_SLOT') {
		const [bands, adult] = await Promise.all([
			bandOptionsFor(actorId, params.id),
			isAdult(actorId)
		]);
		return {
			opportunity,
			...delegation,
			applications: [],
			mine: null,
			unmet: [],
			unknown: [],
			complete: [],
			demarche,
			gig: { bands, adult }
		};
	}
	const mine = await myApplication(actorId, params.id);
	let unmet: string[] = [];
	let unknown: string[] = [];
	let complete: CompleteLink[] = [];
	if (!mine && opportunity.active) {
		const raw = await prisma.opportunity.findUniqueOrThrow({
			where: { id: params.id },
			select: {
				instrumentId: true,
				minLevel: true,
				genreSlug: true,
				minTier: true,
				targetTrack: true,
				targetSpecialty: true,
				commitment: true,
				presence: true
			}
		});
		const eligibility = await eligibilityFor(actorId, raw);
		({ unmet, unknown } = eligibility);
		// Invitation à compléter, sans bloquer (ONB-12c3).
		complete = completeLinks(eligibility.unknownCriteria, {
			opportunityId: params.id,
			targetTrack: raw.targetTrack
		});
	}
	return {
		opportunity,
		...delegation,
		applications: [],
		mine,
		unmet,
		unknown,
		complete,
		demarche,
		gig: null
	};
};

const guard = async (run: () => Promise<unknown>, message: string) => {
	try {
		await run();
		return { message };
	} catch (err) {
		if (err instanceof OpportunityError) return fail(err.status, { error: err.message });
		throw err;
	}
};

export const actions: Actions = {
	applyDelegated: async ({ locals, params, request }) => {
		const data = await request.formData();
		return guard(
			async () =>
				applyDelegated(
					(await me(locals)).actorId,
					params.id,
					String(data.get('artistId') ?? ''),
					String(data.get('message') ?? '')
				),
			'Candidature envoyée au nom de l’artiste.'
		);
	},
	apply: async ({ locals, params, request }) => {
		const body = String((await request.formData()).get('message') ?? '');
		return guard(
			async () => applyTo((await me(locals)).actorId, params.id, body),
			'Candidature envoyée !'
		);
	},
	applyBand: async ({ locals, params, request }) => {
		const data = await request.formData();
		const band = String(data.get('band') ?? '');
		const body = String(data.get('message') ?? '');
		return guard(
			async () => applyAsBand((await me(locals)).actorId, params.id, band, body),
			'Candidature du groupe envoyée !'
		);
	},
	withdrawBand: async ({ locals, request }) => {
		const id = String((await request.formData()).get('applicationId') ?? '');
		return guard(
			async () => withdrawBandApplication((await me(locals)).actorId, id),
			'Candidature retirée.'
		);
	},
	withdraw: async ({ locals, request }) => {
		const id = String((await request.formData()).get('applicationId') ?? '');
		return guard(
			async () => withdrawApplication((await me(locals)).actorId, id),
			'Candidature retirée.'
		);
	},
	shortlist: async ({ locals, request }) => {
		const id = String((await request.formData()).get('applicationId') ?? '');
		return guard(
			async () => decideApplication((await me(locals)).actorId, id, 'shortlist'),
			'Candidature présélectionnée.'
		);
	},
	accept: async ({ locals, request }) => {
		const id = String((await request.formData()).get('applicationId') ?? '');
		try {
			const { joinedBand } = await decideApplication((await me(locals)).actorId, id, 'accept');
			// Recrutement d'un groupe (P3-03) : la personne entre dans le groupe.
			return {
				message: joinedBand
					? 'Candidature acceptée : bienvenue dans le groupe ! La conversation est ouverte.'
					: 'Candidature acceptée : la conversation est ouverte.'
			};
		} catch (err) {
			if (err instanceof OpportunityError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	decline: async ({ locals, request }) => {
		const id = String((await request.formData()).get('applicationId') ?? '');
		return guard(
			async () => decideApplication((await me(locals)).actorId, id, 'decline'),
			'Candidature non retenue.'
		);
	},
	close: async ({ locals, params }) => {
		try {
			await closeOpportunity((await me(locals)).actorId, params.id);
			return { message: 'Annonce clôturée.' };
		} catch (err) {
			if (err instanceof OpportunityError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	report: async ({ locals, params, request }) => {
		const actorId = (await me(locals)).actorId;
		if (!(await getOpportunity(params.id, actorId))) error(404, 'Annonce introuvable');
		const data = await request.formData();
		try {
			const result = await fileReport(actorId, {
				targetType: 'OPPORTUNITY',
				targetId: params.id,
				reason: String(data.get('reason') ?? ''),
				details: String(data.get('details') ?? '')
			});
			return {
				message: result.alreadyReported
					? 'Tu as déjà signalé cette annonce : elle est en cours d’examen.'
					: 'Merci, ton signalement est transmis à la modération.'
			};
		} catch (err) {
			if (err instanceof ModerationError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
