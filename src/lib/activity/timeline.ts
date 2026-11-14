/** Contrat de lecture commun : aucun message, condition ou identifiant personnel. */
export type ActivityEntry = {
	id: string;
	action: string;
	author: string;
	occurredAt: Date;
};

type Author = { displayName: string; deletedAt?: Date | null } | null;
const authorName = (author: Author) =>
	author && !author.deletedAt ? author.displayName : 'Compte supprimé';
type DelegationFacts = {
	id: string;
	createdAt: Date;
	proposedBy: Author;
	acceptedAt: Date | null;
	delegate: Author;
	approvedAt: Date | null;
	approvedBy: Author;
	endedAt: Date | null;
	endedBy: Author;
};

/** Projection des faits conservés, après autorisation de lecture du domaine. */
export function delegationTimeline(facts: DelegationFacts): ActivityEntry[] {
	const entries: ActivityEntry[] = [];
	function add(key: string, action: string, at: Date | null, author: Author) {
		if (!at) return;
		entries.push({
			id: `${facts.id}:${key}`,
			action,
			author: authorName(author),
			occurredAt: at
		});
	}
	add('proposed', 'Affectation proposée', facts.createdAt, facts.proposedBy);
	add('accepted', 'Accord du collaborateur', facts.acceptedAt, facts.delegate);
	add('approved', 'Accord pour l’artiste', facts.approvedAt, facts.approvedBy);
	// Le modèle ne distingue pas refus et retrait : ne pas inventer une décision.
	add('ended', 'Affectation close', facts.endedAt, facts.endedBy);
	// Le rang initial départage les horodatages égaux, sans prétendre connaître
	// l’ordre réel des deux accords lorsqu’ils ont la même date.
	return entries.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

export function representationTimeline(facts: {
	status?: 'PROPOSED' | 'CONFIRMED' | 'ENDED' | 'DECLINED' | 'WITHDRAWN';
	id: string;
	createdAt: Date;
	agent: Author;
	confirmedAt: Date | null;
	confirmedBy: Author;
	endedAt: Date | null;
	endedBy: Author;
}): ActivityEntry[] {
	return [
		{ key: 'proposed', action: 'Accompagnement proposé', at: facts.createdAt, by: facts.agent },
		{
			key: 'confirmed',
			action: 'Accompagnement confirmé',
			at: facts.confirmedAt,
			by: facts.confirmedBy
		},
		{
			key: 'ended',
			action:
				facts.status === 'DECLINED'
					? 'Proposition déclinée'
					: facts.status === 'WITHDRAWN'
						? 'Proposition retirée'
						: 'Accompagnement terminé',
			at: facts.endedAt,
			by: facts.endedBy
		}
	]
		.flatMap((event) =>
			event.at
				? [
						{
							id: `${facts.id}:${event.key}`,
							action: event.action,
							author: authorName(event.by),
							occurredAt: event.at
						}
					]
				: []
		)
		.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

/** Sans référence d’invitant, aucune origine (invitation, demande, fondation) n’est déduite. */
export function membershipInvitationTimeline(facts: {
	id: string;
	createdAt: Date;
	invitedById: string | null;
	invitedBy: Author;
}): ActivityEntry[] {
	return facts.invitedById
		? [
				{
					id: `${facts.id}:invited`,
					action: 'Invitation à la structure',
					author: authorName(facts.invitedBy),
					occurredAt: facts.createdAt
				}
			]
		: [];
}
