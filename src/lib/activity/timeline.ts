/** Contrat de lecture commun : aucun message, condition ou identifiant personnel. */
export type ActivityEntry = {
	id: string;
	action: string;
	author: string;
	occurredAt: Date;
};

type Author = { displayName: string; deletedAt?: Date | null } | null;
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
			author: author && !author.deletedAt ? author.displayName : 'Compte supprimé',
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
