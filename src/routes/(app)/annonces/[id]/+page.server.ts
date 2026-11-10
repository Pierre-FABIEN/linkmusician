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
import { opportunityNudge } from '#lib/server/demarches/service';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const person = await me(locals);
	const actorId = person.actorId;
	const opportunity = await getOpportunity(params.id, actorId);
	if (!opportunity) error(404, 'Annonce introuvable');
	// Démarches au bon moment (P3-15a) : une session parle d'être payé·e.
	const nudge = opportunityNudge(opportunity.kind, person);
	if (opportunity.isOwner) {
		return {
			opportunity,
			nudge,
			applications: await listForIssuer(actorId, params.id),
			mine: null,
			unmet: []
		};
	}
	const mine = await myApplication(actorId, params.id);
	let unmet: string[] = [];
	if (!mine && opportunity.active) {
		const raw = await prisma.opportunity.findUniqueOrThrow({
			where: { id: params.id },
			select: {
				instrumentId: true,
				minLevel: true,
				genreSlug: true,
				minTier: true,
				targetTrack: true,
				targetSpecialty: true
			}
		});
		unmet = await eligibilityFor(actorId, raw);
	}
	return { opportunity, nudge, applications: [], mine, unmet };
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
	apply: async ({ locals, params, request }) => {
		const body = String((await request.formData()).get('message') ?? '');
		return guard(
			async () => applyTo((await me(locals)).actorId, params.id, body),
			'Candidature envoyée !'
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
