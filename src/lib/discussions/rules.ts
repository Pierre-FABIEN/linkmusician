/**
 * Discussions de groupe (P3-16c, D46) : règles pures, partagées par le
 * serveur et le navigateur.
 *
 * - Une discussion s'ouvre depuis un **groupe de contacts**. Chaque personne
 *   reçoit une **invitation** (Rejoindre, Non merci) et ne voit rien de la
 *   discussion avant de l'avoir acceptée. On peut la quitter.
 * - Seul l'**auteur** invite, et seulement ses contacts.
 * - **Mineur·es** : pas de discussion de groupe au lancement (D46), sans
 *   jamais dire pourquoi.
 * - **Blocage** : pas d'invitation entre l'auteur et une personne bloquée ;
 *   pas de « Rejoindre » si un blocage existe avec quelqu'un déjà présent.
 * - « Non merci » et « Quitter » sont définitifs pour cette discussion :
 *   l'auteur ne peut pas réinviter (le consentement prime).
 */

export { groupNameSchema as discussionTitleSchema } from '#lib/contacts/rules';

/** Personnes au plus dans une discussion (invitées et présentes). */
export const MAX_DISCUSSION_MEMBERS = 30;
/** Discussions ouvertes au plus par personne (auteur). */
export const MAX_DISCUSSIONS_CREATED = 20;

export type MemberState = 'INVITED' | 'ACTIVE' | 'DECLINED' | 'LEFT';

/** Ce qu'une personne voit d'une discussion. */
export type Access = 'member' | 'invitation' | 'none';

export function accessOf(state: MemberState | null | undefined): Access {
	if (state === 'ACTIVE') return 'member';
	if (state === 'INVITED') return 'invitation';
	return 'none';
}

export type InviteRefusal =
	'not_creator' | 'not_contact' | 'unavailable' | 'already' | 'declined' | 'full';

export const INVITE_ERRORS: Record<InviteRefusal, string> = {
	not_creator: 'Seule la personne qui a ouvert la discussion invite.',
	not_contact: 'On n’invite que ses contacts.',
	// Mineur·e ou blocage : jamais la raison.
	unavailable: 'Cette personne ne peut pas être invitée à une discussion de groupe.',
	already: 'Cette personne est déjà invitée.',
	declined: 'Cette personne a déjà répondu à cette discussion.',
	full: `${MAX_DISCUSSION_MEMBERS} personnes au plus par discussion.`
};

/** Peut-on inviter cette personne ? `null` si oui. */
export function inviteRefusal(input: {
	inviterIsCreator: boolean;
	inviterState: MemberState | null;
	isContact: boolean;
	/** Majeur·e (`isIndexable`, date de naissance inconnue : non). */
	inviteeIsAdult: boolean;
	blockedWithInviter: boolean;
	inviteeState: MemberState | null;
	/** Personnes invitées ou présentes. */
	seats: number;
}): InviteRefusal | null {
	if (!input.inviterIsCreator || input.inviterState !== 'ACTIVE') return 'not_creator';
	if (input.inviteeState === 'ACTIVE' || input.inviteeState === 'INVITED') return 'already';
	if (input.inviteeState === 'DECLINED' || input.inviteeState === 'LEFT') return 'declined';
	if (!input.isContact) return 'not_contact';
	if (!input.inviteeIsAdult || input.blockedWithInviter) return 'unavailable';
	if (input.seats >= MAX_DISCUSSION_MEMBERS) return 'full';
	return null;
}

export type JoinRefusal = 'not_invited' | 'unavailable';

export const JOIN_ERRORS: Record<JoinRefusal, string> = {
	not_invited: 'Cette invitation n’est plus valable.',
	unavailable: 'Tu ne peux pas rejoindre cette discussion.'
};

/** Peut-on rejoindre ? `null` si oui. */
export function joinRefusal(input: {
	state: MemberState | null;
	isAdult: boolean;
	/** Un blocage avec une personne déjà présente. */
	blockedWithAMember: boolean;
}): JoinRefusal | null {
	if (input.state !== 'INVITED') return 'not_invited';
	if (!input.isAdult || input.blockedWithAMember) return 'unavailable';
	return null;
}

/** Peut-on écrire ? Seulement en étant présent·e. */
export function canPost(state: MemberState | null | undefined): boolean {
	return state === 'ACTIVE';
}

/** « Léa, Malik et 2 autres » : qui est dans la discussion. */
export function membersSummary(names: string[], max = 3): string {
	if (names.length === 0) return 'Personne d’autre pour l’instant';
	if (names.length <= max) {
		return names.length === 1
			? names[0]
			: `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
	}
	const rest = names.length - max;
	return `${names.slice(0, max).join(', ')} et ${rest} autre${rest > 1 ? 's' : ''}`;
}
