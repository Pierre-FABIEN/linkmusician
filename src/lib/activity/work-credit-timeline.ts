import type { ActivityEntry } from './timeline';

export const WORK_CREDIT_LABELS = {
	CREATOR_CREDITED: 'Crédit personnel à la création du morceau',
	ASSIGNED: 'Crédit attribué par la gestion, en attente de consentement',
	SELF_ASSIGNED: 'Crédit personnel ajouté et consenti',
	CONFIRMED: 'Crédit confirmé personnellement',
	DECLINED: 'Crédit refusé personnellement',
	LEFT: 'Crédit retiré personnellement',
	WITHDRAWN: 'Crédit en attente retiré par la gestion'
} as const;

/** Seuls les actes autorisés du registre sont reçus ici, jamais confirmedAt. */
export function workCreditTimeline(
	acts: {
		id: string;
		kind: keyof typeof WORK_CREDIT_LABELS;
		concernsMe: boolean;
		author: string;
		occurredAt: Date;
	}[]
): ActivityEntry[] {
	return acts
		.map((a) => ({
			id: a.id,
			action: WORK_CREDIT_LABELS[a.kind] + (a.concernsMe ? '' : ' (pour autrui)'),
			author: a.author,
			occurredAt: a.occurredAt
		}))
		.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.id.localeCompare(b.id));
}
