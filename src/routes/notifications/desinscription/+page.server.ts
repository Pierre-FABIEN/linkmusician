/**
 * LINKMUSICIAN: désinscription du digest email (P2-09b), sans connexion,
 * par lien signé (`#lib/server/notifications/unsubscribe`). L'ouverture du
 * lien ne coupe rien : les antivirus de messagerie suivent les liens. Il faut
 * confirmer d'un clic (POST). Le nom de la personne n'est pas affiché (un
 * email peut avoir été transféré).
 */
import { fail } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { verifyUnsubscribeToken } from '#lib/server/notifications/unsubscribe';
import { unsubscribeEmail } from '#lib/server/notifications/service';
import { EMAIL_TOPIC_LABELS } from '#lib/notifications/types';
import type { Actions, PageServerLoad } from './$types';

async function resolve(token: string | null) {
	const parsed = token ? verifyUnsubscribeToken(token) : null;
	if (!parsed) return null;
	const exists = await prisma.actor.count({ where: { id: parsed.actorId, deletedAt: null } });
	return exists ? parsed : null;
}

const topicLabel = (topic: string) =>
	topic === 'ALL' ? null : (EMAIL_TOPIC_LABELS[topic as keyof typeof EMAIL_TOPIC_LABELS] ?? null);

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('t');
	const parsed = await resolve(token);
	return {
		token: parsed ? token : null,
		topic: parsed ? topicLabel(parsed.topic) : null
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const token = String((await request.formData()).get('t') ?? '');
		const parsed = await resolve(token);
		if (!parsed) return fail(400, { error: 'Ce lien n’est plus valide.' });
		await unsubscribeEmail(parsed.actorId, parsed.topic);
		return { done: true, topic: topicLabel(parsed.topic) };
	}
};
