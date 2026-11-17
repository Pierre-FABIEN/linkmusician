/**
 * Candidatures (P2-03) : règles pures. Une candidature se tranche une fois
 * (acceptée ou refusée) ; avant, l'auteur peut la présélectionner et le
 * candidat la retirer.
 */
export const APPLICATION_STATUSES = [
	'SENT',
	'SEEN',
	'SHORTLISTED',
	'ACCEPTED',
	'DECLINED',
	'WITHDRAWN'
] as const;
export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Readonly<Record<ApplicationStatusValue, string>> = {
	SENT: 'Envoyée',
	SEEN: 'Vue',
	SHORTLISTED: 'Présélectionnée',
	ACCEPTED: 'Acceptée',
	DECLINED: 'Non retenue',
	WITHDRAWN: 'Retirée'
};

export const MIN_APPLICATION = 10;
export const MAX_APPLICATION = 1000;

export type ApplicationAction = 'see' | 'shortlist' | 'accept' | 'decline' | 'withdraw';

const PENDING: readonly ApplicationStatusValue[] = ['SENT', 'SEEN', 'SHORTLISTED'];

/** Statut suivant, ou `null` si l'action n'est pas permise. */
export function applicationTransition(
	status: ApplicationStatusValue,
	action: ApplicationAction
): ApplicationStatusValue | null {
	switch (action) {
		case 'see':
			return status === 'SENT' ? 'SEEN' : null;
		case 'shortlist':
			return status === 'SENT' || status === 'SEEN' ? 'SHORTLISTED' : null;
		case 'accept':
			return PENDING.includes(status) ? 'ACCEPTED' : null;
		case 'decline':
			return PENDING.includes(status) ? 'DECLINED' : null;
		case 'withdraw':
			return PENDING.includes(status) ? 'WITHDRAWN' : null;
	}
}

export function isPending(status: ApplicationStatusValue): boolean {
	return PENDING.includes(status);
}

/** Libellés des conditions non remplies (`unmetConditions`). */
export const UNMET_LABELS = {
	instrument: 'tu ne joues pas l’instrument recherché',
	level: 'ton niveau déclaré est en dessous du niveau demandé',
	genre: 'ce genre n’est pas dans ton profil musical',
	tier: 'ton palier n’est pas encore celui demandé',
	track: 'l’annonce cherche un autre métier que les tiens',
	specialty: 'cette spécialité n’est pas cochée dans ton profil de métier',
	// ONB-13b (D63) : seulement quand le profil dit le contraire.
	commitment: 'l’annonce cherche un engagement régulier, ton profil dit « de temps en temps »',
	presence: 'l’annonce demande une autre façon de travailler (sur place ou à distance)'
} as const;
