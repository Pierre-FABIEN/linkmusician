/**
 * LINKMUSICIAN: données de la coquille de l'espace pour une page publique
 * vue par un membre (P2-12b) : profil `/@handle`, médias. `null` pour un
 * visiteur, ou un compte qui n'a pas encore fini son onboarding.
 */
import type { Cookies } from '@sveltejs/kit';
import { readNavigation } from './navigation';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { unreadTotal } from '#lib/server/messaging/service';
import { unreadNotifications } from '#lib/server/notifications/service';

export async function memberShell(locals: App.Locals, cookies: Pick<Cookies, 'get'>) {
	if (!locals.user?.emailVerified) return null;
	const person = await getPersonByUserId(locals.user.id);
	if (!person?.onboardedAt) return null;
	const [unread, notifications] = await Promise.all([
		unreadTotal(person.actorId),
		unreadNotifications(person.actorId)
	]);
	return {
		unread,
		notifications,
		preferredMode: person.preferredMode,
		navigation: readNavigation(person, cookies)
	};
}
