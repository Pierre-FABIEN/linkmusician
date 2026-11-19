/**
 * Notifications (P2-09a) : types, libellés des préférences et texte affiché.
 * Module pur, partagé par le serveur et le navigateur.
 *
 * Ton (conception 07 §7) : on annonce une bonne nouvelle ou une chose à
 * faire, jamais un reproche ni une pression (« tu n'as pas répondu »…).
 */

export const NOTIFICATION_TYPES = [
	'DELEGATION_REQUEST',
	'APPLICATION_GRANT',
	'CONTACT_REQUEST',
	'APPLICATION_RECEIVED',
	'APPLICATION_SENT',
	'APPLICATION_ACCEPTED',
	'COLLAB_TO_CONFIRM',
	'ENDORSEMENT',
	'JAM_INVITE',
	'BAND_INVITE',
	'BAND_REQUEST',
	'BAND_JOINED',
	'WORK_CREDIT',
	'MILESTONE_ATTEST',
	'GROUP_DISCUSSION_INVITE',
	'STUDIO_INVITE',
	'ORG_INVITE',
	'VENUE_HOST_INVITE',
	'REPRESENTATION_REQUEST',
	'VENUE_CLAIM',
	'INTRODUCTION',
	'PROJECT_INVITE',
	'PROJECT_JOINED'
] as const;
export type NotificationTypeValue = (typeof NOTIFICATION_TYPES)[number];

export function isNotificationType(value: unknown): value is NotificationTypeValue {
	return typeof value === 'string' && (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

/** Libellés des préférences (`/reglages`). */
export const NOTIFICATION_TYPE_LABELS: Readonly<Record<NotificationTypeValue, string>> = {
	CONTACT_REQUEST: 'Demandes de contact',
	APPLICATION_RECEIVED: 'Candidatures à mes annonces',
	APPLICATION_SENT: 'Candidatures envoyées en mon nom',
	APPLICATION_ACCEPTED: 'Candidatures acceptées',
	COLLAB_TO_CONFIRM: 'Collaborations à confirmer',
	ENDORSEMENT: 'Appréciations reçues',
	JAM_INVITE: 'Invitations à une jam',
	BAND_INVITE: 'Invitations à rejoindre un groupe',
	BAND_REQUEST: 'Demandes pour rejoindre mes groupes',
	BAND_JOINED: 'Nouveaux membres de mes groupes',
	WORK_CREDIT: 'Crédits sur un morceau à confirmer',
	MILESTONE_ATTEST: 'Étapes de groupe à confirmer',
	GROUP_DISCUSSION_INVITE: 'Invitations à une discussion de groupe',
	STUDIO_INVITE: 'Invitations à gérer un studio',
	DELEGATION_REQUEST: 'Affectations et délégations à confirmer',
	APPLICATION_GRANT: 'Droits de candidater pour un·e artiste (manager, booker)',
	ORG_INVITE: 'Invitations à rejoindre une organisation, un lieu ou une agence',
	VENUE_HOST_INVITE: 'Invitations à animer les scènes ouvertes d’un lieu',
	REPRESENTATION_REQUEST: 'Propositions d’accompagnement (manager, booker)',
	VENUE_CLAIM: 'Réponses à mes revendications de lieu',
	INTRODUCTION: 'Présentations par quelqu’un de mon réseau',
	PROJECT_INVITE: 'Invitations à participer à un projet',
	PROJECT_JOINED: 'Personnes qui rejoignent mes projets'
};

/**
 * Sujets du digest email (P2-09b) : les types de la cloche, plus les
 * messages non lus et la progression (gains, succès), qui n'ont pas de
 * ligne sous la cloche (célébrations, pastille des messages).
 */
export const EMAIL_TOPICS = [...NOTIFICATION_TYPES, 'MESSAGES', 'PROGRESS'] as const;
export type EmailTopic = (typeof EMAIL_TOPICS)[number];

export function isEmailTopic(value: unknown): value is EmailTopic {
	return typeof value === 'string' && (EMAIL_TOPICS as readonly string[]).includes(value);
}

export const EMAIL_TOPIC_LABELS: Readonly<Record<EmailTopic, string>> = {
	...NOTIFICATION_TYPE_LABELS,
	MESSAGES: 'Messages non lus',
	PROGRESS: 'Mes gains et mes succès'
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
		case 'APPLICATION_SENT':
			return `${who} a envoyé une candidature en ton nom${title ? ` : « ${title} »` : ''}.`;
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
		case 'BAND_INVITE':
			return `${who} t’invite à rejoindre le groupe${what}.`;
		case 'BAND_REQUEST':
			return `${who} aimerait rejoindre le groupe${what}.`;
		case 'BAND_JOINED':
			return `${who} a rejoint le groupe${what}.`;
		case 'WORK_CREDIT':
			return `${who} te crédite sur le morceau${what}. Confirme ton rôle si c’est bien toi.`;
		case 'MILESTONE_ATTEST':
			return `${who} te demande de confirmer${title ? ` : ${title}` : ' une étape de son groupe'}. Réponds seulement si tu y étais.`;
		case 'STUDIO_INVITE':
			return `${who} t’invite à gérer le studio${what} à ses côtés.`;
		case 'DELEGATION_REQUEST':
			return `${who} propose une affectation${what}. Consulte les droits puis réponds depuis « Affectations et délégations ».`;
		case 'APPLICATION_GRANT':
			// DASH-07a : le titre porte le geste (« demandé pour Les Pistons »).
			return `${who} : droit de candidater${title ? ` ${title}` : ''}. Ouvre « Accompagnement » pour voir où il en est.`;
		case 'ORG_INVITE':
			return `${who} t’invite à rejoindre${what}. Consulte le rôle proposé avant d’accepter.`;
		case 'VENUE_HOST_INVITE':
			return `${who} t’invite à animer les scènes ouvertes du lieu${what}. Réponds quand tu veux, depuis « Mes jams ».`;
		case 'REPRESENTATION_REQUEST':
			return `${who} propose de t’accompagner${title ? ` : ${title}` : ''}. Réponds depuis « Accompagnement ».`;
		case 'VENUE_CLAIM':
			return `L’équipe a répondu à ta demande pour le lieu${what} : ouvre sa fiche pour la suite.`;
		case 'INTRODUCTION':
			return `${who} te présente ${title ?? 'quelqu’un'} : vous devriez jouer ensemble. Jette un œil à son profil.`;
		case 'GROUP_DISCUSSION_INVITE':
			return `${who} t’invite à la discussion de groupe${what}. Rejoins-la si tu veux.`;
		case 'PROJECT_INVITE':
			return `${who} t’invite à participer au projet${what}. Regarde ce qui est proposé avant de répondre.`;
		case 'PROJECT_JOINED':
			return `${who} a rejoint le projet${what}.`;
	}
}

/** Pastille : au-delà de 9, « 9+ ». */
export function badgeLabel(count: number): string {
	return count > 9 ? '9+' : String(count);
}
