/**
 * LINKMUSICIAN: données de la coquille de l'espace pour une page publique
 * vue par un membre (P2-12b) : profil `/@handle`, médias. `null` pour un
 * visiteur, ou un compte qui n'a pas encore fini son onboarding.
 */
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { unreadTotal } from '#lib/server/messaging/service';

export async function memberShell(locals: App.Locals) {
	if (!locals.user?.emailVerified) return null;
	const person = await getPersonByUserId(locals.user.id);
	if (!person?.onboardedAt) return null;
	return { unread: await unreadTotal(person.actorId), preferredMode: person.preferredMode };
}
