/**
 * LINKMUSICIAN: notifications (P2-09a). Les dernières notifications, les
 * nouvelles signalées ; ouvrir la page les marque comme lues (jusqu'à la plus
 * récente affichée, pas au-delà : une notification arrivée entre-temps reste
 * nouvelle).
 */
import { requirePerson } from '#server/actors/tracksForm';
import { listNotifications, markNotificationsRead } from '#lib/server/notifications/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	const notifications = await listNotifications(person.actorId);
	if (notifications.some((n) => n.unread)) {
		await markNotificationsRead(person.actorId, notifications[0].createdAt);
	}
	return { notifications };
};
