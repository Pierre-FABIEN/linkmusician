/**
 * LINKMUSICIAN: réglages (P1-09) : palier de confiance, conditions du palier
 * suivant, quotas. Lecture seule : la confiance se calcule côté serveur.
 * Visibilité du profil public (P1-11, D19), préférences de notifications
 * (P2-09a, P2-09b).
 */
import { prisma } from '#lib/server';
import { requirePerson } from '#server/actors/tracksForm';
import { trustSummaryFor } from '#lib/server/progression/trust';
import {
	computeTrustLevel,
	nextTrustRequirements,
	QUOTA_LABELS,
	TRUST_NAMES,
	TRUST_PERMISSIONS
} from '#lib/server/progression/core/trust';
import { listBlocked, unblockActor } from '#lib/server/blocking/service';
import {
	getNotificationPreferences,
	setNotificationPreferences
} from '#lib/server/notifications/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	const summary = await trustSummaryFor(prisma, person.actorId);
	// Le palier affiché est recalculé à la volée : il ne dépend pas du passage
	// de la tâche nocturne (l'ancienneté a pu faire passer un palier).
	const level = summary ? computeTrustLevel(summary) : 0;
	const next = summary ? nextTrustRequirements(summary) : { next: 1 as const, requirements: [] };
	// Libellés transmis par le serveur : une page ne peut pas importer
	// `src/lib/server/**` côté navigateur.
	return {
		handle: person.actor.handle,
		hidden: person.actor.hidden,
		// Blocage (P2-05) : personnes bloquées, à débloquer ici.
		blocked: await listBlocked(person.actorId),
		// Notifications (P2-09a) : un interrupteur par type, tout activé par défaut.
		notificationPreferences: await getNotificationPreferences(person.actorId),
		names: TRUST_NAMES,
		quotaLabels: QUOTA_LABELS,
		trust: {
			level,
			permissions: TRUST_PERMISSIONS[level],
			...next
		}
	};
};

export const actions: Actions = {
	/** Débloquer une personne (P2-05). */
	unblock: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const actorId = String((await request.formData()).get('actorId') ?? '');
		await unblockActor(person.actorId, actorId);
		return { saved: 'Personne débloquée.' };
	},
	/** Sujets voulus dans l'app (P2-09a) et par email (P2-09b). */
	notifications: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const form = await request.formData();
		await setNotificationPreferences(person.actorId, {
			inApp: form.getAll('inApp'),
			email: form.getAll('email')
		});
		return { saved: 'Tes préférences de notifications sont enregistrées.' };
	},
	/** Masquer ou rendre visible le profil public `/@handle` (D19). */
	visibility: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const hidden = (await request.formData()).get('hidden') === 'on';
		await prisma.actor.update({ where: { id: person.actorId }, data: { hidden } });
		return {
			saved: hidden ? 'Ton profil public est masqué.' : 'Ton profil public est de nouveau visible.'
		};
	}
};
