/**
 * LINKMUSICIAN: une conversation (P2-04) : fil, réponse à une demande,
 * envoi, signalement de la personne. Rafraîchie par polling côté page (D8).
 */
import { error, fail } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import {
	MessagingError,
	openConversation,
	respondToRequest,
	sendMessage
} from '#lib/server/messaging/service';
import { fileReport, ModerationError } from '#lib/server/moderation/service';
import { blockActor } from '#lib/server/blocking/service';
import {
	CollaborationError,
	cancelCollaboration,
	collabFormContext,
	confirmCollaboration,
	listForConversation,
	proposeCollaboration,
	respondToCollaboration,
	today
} from '#lib/server/collaborations/service';
import { collaborationSchema } from '#lib/collaborations/rules';
import {
	collabAppreciations,
	endorseCollaborator,
	revokeCollabEndorsement
} from '#lib/server/collaborations/endorse';
import {
	COLLAB_QUALITIES,
	COLLAB_QUALITY_LABELS,
	collabEndorseSchema
} from '#lib/collaborations/endorse';
import { redirect } from '@sveltejs/kit';
import { currentTip } from '#lib/server/guide/service';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params, depends }) => {
	depends('app:conversation');
	try {
		const person = await me(locals);
		const actorId = person.actorId;
		const conversation = await openConversation(actorId, params.id);
		// Collaborations (P2-06) entre les deux personnes de la conversation.
		const [collaborations, collabForm] = await Promise.all([
			listForConversation(actorId, params.id),
			// Collaborations liées au morceau et prestations du son (P4-06).
			collabFormContext(actorId, params.id)
		]);
		return {
			conversation,
			collaborations,
			collabForm,
			// Appréciations après une collaboration confirmée (P2-07).
			appreciations: await collabAppreciations(
				actorId,
				collaborations.filter((k) => k.status === 'COMPLETED').map((k) => k.id)
			),
			qualities: COLLAB_QUALITIES.map((value) => ({ value, label: COLLAB_QUALITY_LABELS[value] })),
			today: today(),
			// Conseil en contexte (P2-17).
			tip: await currentTip('conversation', person)
		};
	} catch (err) {
		if (err instanceof MessagingError) error(err.status, err.message);
		throw err;
	}
};

const handle = async (run: () => Promise<unknown>) => {
	try {
		await run();
		return { ok: true };
	} catch (err) {
		if (
			err instanceof MessagingError ||
			err instanceof ModerationError ||
			err instanceof CollaborationError
		) {
			return fail(err instanceof ModerationError ? 400 : err.status, { error: err.message });
		}
		throw err;
	}
};

export const actions: Actions = {
	send: async ({ locals, params, request }) => {
		const body = String((await request.formData()).get('body') ?? '');
		return handle(async () => sendMessage((await me(locals)).actorId, params.id, body));
	},
	/** Collaborations (P2-06). */
	proposeCollab: async ({ locals, params, request }) => {
		const parsed = collaborationSchema(today()).safeParse(
			Object.fromEntries(await request.formData())
		);
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.' });
		}
		return handle(async () =>
			proposeCollaboration((await me(locals)).actorId, params.id, parsed.data)
		);
	},
	respondCollab: async ({ locals, request }) => {
		const data = await request.formData();
		const id = String(data.get('collaborationId') ?? '');
		const accept = data.get('answer') === 'yes';
		return handle(async () => respondToCollaboration((await me(locals)).actorId, id, accept));
	},
	confirmCollab: async ({ locals, request }) => {
		const id = String((await request.formData()).get('collaborationId') ?? '');
		return handle(async () => confirmCollaboration((await me(locals)).actorId, id));
	},
	/** Appréciation après une collaboration confirmée (P2-07). */
	endorseCollab: async ({ locals, request }) => {
		const data = await request.formData();
		const field = (name: string) => String(data.get(name) ?? '').trim() || undefined;
		const parsed = collabEndorseSchema.safeParse({
			collaborationId: field('collaborationId'),
			to: field('to'),
			quality: field('quality'),
			instrument: field('instrument')
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Vérifie l’appréciation.' });
		}
		try {
			const done = await endorseCollaborator((await me(locals)).actorId, parsed.data);
			return { ok: true, message: `Appréciation laissée à ${done.displayName} : ${done.skill}.` };
		} catch (err) {
			if (err instanceof CollaborationError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	revokeEndorsement: async ({ locals, request }) => {
		const data = await request.formData();
		const id = String(data.get('collaborationId') ?? '');
		const to = String(data.get('to') ?? '');
		return handle(async () => revokeCollabEndorsement((await me(locals)).actorId, id, to));
	},
	cancelCollab: async ({ locals, request }) => {
		const id = String((await request.formData()).get('collaborationId') ?? '');
		return handle(async () => cancelCollaboration((await me(locals)).actorId, id));
	},
	decline: async ({ locals, params }) =>
		handle(async () => respondToRequest((await me(locals)).actorId, params.id, false)),
	/** Signaler la personne (P1-12), depuis la conversation. */
	report: async ({ locals, params, request }) => {
		const data = await request.formData();
		const actorId = (await me(locals)).actorId;
		const other = await prisma.conversationParticipant.findFirst({
			where: { conversationId: params.id, actorId: { not: actorId } },
			select: { actorId: true }
		});
		if (!other) error(404, 'Conversation introuvable');
		return handle(() =>
			fileReport(actorId, {
				targetType: 'ACTOR',
				targetId: other.actorId,
				reason: String(data.get('reason') ?? ''),
				details: String(data.get('details') ?? '')
			})
		);
	},
	/** Bloquer la personne (P2-05) depuis la conversation. */
	block: async ({ locals, params }) => {
		const actorId = (await me(locals)).actorId;
		const other = await prisma.conversationParticipant.findFirst({
			where: { conversationId: params.id, actorId: { not: actorId } },
			select: { actorId: true }
		});
		if (!other) error(404, 'Conversation introuvable');
		await blockActor(actorId, other.actorId);
		redirect(303, '/messages');
	}
};
