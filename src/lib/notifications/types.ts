/**
 * Notifications (P2-09a) : types, libellés des préférences et texte affiché.
 * Module pur, partagé par le serveur et le navigateur.
 *
 * Ton (conception 07 §7) : on annonce une bonne nouvelle ou une chose à
 * faire, jamais un reproche ni une pression (« tu n'as pas répondu »…).
 */

export const NOTIFICATION_TYPES = [
	'CONTACT_REQUEST',
	'APPLICATION_RECEIVED',
	'APPLICATION_ACCEPTED',
	'COLLAB_TO_CONFIRM',
	'ENDORSEMENT',
	'JAM_INVITE'
] as const;
export type NotificationTypeValue = (typeof NOTIFICATION_TYPES)[number];

export function isNotificationType(value: unknown): value is NotificationTypeValue {
	return typeof value === 'string' && (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

/** Libellés des préférences (`/reglages`). */
export const NOTIFICATION_TYPE_LABELS: Readonly<Record<NotificationTypeValue, string>> = {
	CONTACT_REQUEST: 'Demandes de contact',
	APPLICATION_RECEIVED: 'Candidatures à mes annonces',
	APPLICATION_ACCEPTED: 'Candidatures acceptées',
	COLLAB_TO_CONFIRM: 'Collaborations à confirmer',
	ENDORSEMENT: 'Appréciations reçues',
	JAM_INVITE: 'Invitations à une jam'
};

/** Ce que la notification dit, à partir du nom de l'autre et du titre. */
export function notificationText(
	type: NotificationTypeValue,
	from: string | null,
	title: string | null
): string {
	const who = from ?? 'Quelqu’un';
	const what = title ? ` « ${title} »` : '';
	switch (type) {
		case 'CONTACT_REQUEST':
			return `${who} aimerait échanger avec toi.`;
		case 'APPLICATION_RECEIVED':
			return `${who} a postulé à ton annonce${what}.`;
		case 'APPLICATION_ACCEPTED':
			return `Bonne nouvelle : ta candidature${title ? ` à « ${title} »` : ''} est acceptée. La conversation est ouverte.`;
		case 'COLLAB_TO_CONFIRM':
			return `${who} te propose une collaboration${what}. Confirme-la quand c’est bon pour toi.`;
		case 'ENDORSEMENT':
			return `${who} t’a laissé une appréciation${what}.`;
		case 'JAM_INVITE':
			return `${who} t’invite à la jam${what}.`;
	}
}

/** Pastille : au-delà de 9, « 9+ ». */
export function badgeLabel(count: number): string {
	return count > 9 ? '9+' : String(count);
}
