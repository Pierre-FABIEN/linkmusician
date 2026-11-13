import { z } from 'zod';
export const DELEGATION_ACTION_LABELS = {
	VIEW_MANDATE: 'Consulter l’accompagnement',
	END_MANDATE: 'Mettre fin à l’accompagnement'
} as const;
export const delegationProposalSchema = z.object({
	representationId: z.string().min(1),
	agencyId: z.string().min(1),
	delegate: z
		.string()
		.trim()
		.regex(/^@?[a-z0-9][a-z0-9_-]{1,59}$/i, 'Nom d’utilisateur invalide.'),
	expiresOn: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.refine(
			(v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
			'Date invalide.'
		)
		.optional(),
	allowEnd: z.boolean().default(false)
});
/** Le consentement est double ; chaque droit est explicite et révocable. */
export function delegationAllows(
	row: {
		actions: readonly string[];
		acceptedAt: Date | null;
		approvedAt: Date | null;
		endedAt: Date | null;
		expiresAt: Date | null;
	},
	action: string,
	now: Date
) {
	return (
		!row.endedAt &&
		!!row.acceptedAt &&
		!!row.approvedAt &&
		(!row.expiresAt || now < row.expiresAt) &&
		row.actions.includes(action)
	);
}
