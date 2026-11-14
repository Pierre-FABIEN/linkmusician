/**
 * Accompagnement d'un artiste par un·e manager ou un·e booker (P5-07,
 * conception 06 §3.4, §3.5 et 08 §9, §10) : libellés et règles. Module pur,
 * partagé par le serveur et le navigateur.
 *
 * L'agent propose, l'artiste confirme (pour un groupe : une personne de sa
 * gestion). **Un accompagnement non confirmé ne rapporte rien** et ne se
 * voit nulle part en public. Le profil d'agent (genres, ce qu'il ou elle
 * cherche) vit dans `#lib/crafts/agent`.
 */
import { z } from 'zod';

/** Alignés sur l'enum Prisma `AgentKind` et sur les pistes du même nom. */
export const AGENT_KINDS = ['MANAGER', 'BOOKER'] as const;
export type AgentKindValue = (typeof AGENT_KINDS)[number];

export const AGENT_KIND_INFO: Readonly<
	Record<AgentKindValue, { label: string; as: string; hint: string }>
> = {
	MANAGER: {
		label: 'Manager',
		as: 'comme manager',
		hint: 'Tu accompagnes sa carrière : projets, entourage, décisions.'
	},
	BOOKER: {
		label: 'Booker',
		as: 'comme booker',
		hint: 'Tu lui trouves des dates : les concerts que tu bookes comptent pour toi.'
	}
};

export const REPRESENTATION_STATUS_LABELS = {
	PROPOSED: 'En attente de réponse',
	CONFIRMED: 'Confirmé',
	ENDED: 'Terminé',
	DECLINED: 'Proposition déclinée',
	WITHDRAWN: 'Proposition retirée'
} as const;

/** Mot facultatif de l'agent à l'artiste. */
export const MAX_REPRESENTATION_MESSAGE = 400;
/** Propositions en attente au plus, par agent (pas de démarchage de masse). */
export const MAX_PENDING_PROPOSALS = 10;

const HANDLE = /^@?[a-z0-9][a-z0-9_-]{1,59}$/i;

export const representationProposalSchema = z.object({
	artist: z
		.string()
		.trim()
		.regex(HANDLE, 'Indique le nom d’utilisateur de l’artiste (par exemple @les-pistons).'),
	kind: z.enum(AGENT_KINDS),
	message: z
		.string()
		.trim()
		.max(MAX_REPRESENTATION_MESSAGE, `${MAX_REPRESENTATION_MESSAGE} caractères au plus.`)
		.optional()
		.transform((v) => v || undefined)
});
export type RepresentationProposal = z.infer<typeof representationProposalSchema>;

/** Titre de la notification : « Les Pistons, comme booker ». */
export function representationTitle(artistName: string, kind: AgentKindValue): string {
	return `${artistName}, ${AGENT_KIND_INFO[kind].as}`;
}

/** DASH-04a : droits applicatifs explicites, jamais une signature contractuelle. */
export const MANDATE_ACTIONS = ['CAREER_SUPPORT', 'BOOKING_CREDIT'] as const;
export type MandateAction = (typeof MANDATE_ACTIONS)[number];
export const MANDATE_ACTION_LABELS: Record<MandateAction, string> = {
	CAREER_SUPPORT: 'Accompagnement de carrière',
	BOOKING_CREDIT: 'Attribution des concerts bookés'
};
const optionalDay = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.')
	.refine(
		(v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
		'Date invalide.'
	)
	.optional();
export const mandateScopeSchema = z
	.object({
		startsOn: optionalDay,
		expiresOn: optionalDay,
		departmentCodes: z
			.array(
				z
					.string()
					.regex(
						/^(?:0[1-9]|1[0-9]|2[1-9]|[3-8][0-9]|9[0-5]|2[AB]|97[1-4]|976)$/,
						'Code de département invalide.'
					)
			)
			.max(101)
			.default([]),
		allowedActions: z.array(z.enum(MANDATE_ACTIONS)).min(1, 'Choisis au moins une activité.').max(2)
	})
	.refine((v) => !v.startsOn || !v.expiresOn || v.startsOn < v.expiresOn, {
		message: 'La fin doit suivre le début.',
		path: ['expiresOn']
	});
export type MandateScope = z.infer<typeof mandateScopeSchema>;
export type StoredMandateScope = {
	startsAt: Date | null;
	expiresAt: Date | null;
	departmentCodes: readonly string[];
	allowedActions: readonly string[];
};
export function defaultMandateAction(kind: AgentKindValue): MandateAction {
	return kind === 'BOOKER' ? 'BOOKING_CREDIT' : 'CAREER_SUPPORT';
}
/** Dates bornées à la journée UTC ; la fin est exclusive. */
export function mandateAllows(
	scope: StoredMandateScope,
	action: string,
	on: Date,
	departmentCode?: string | null
): boolean {
	return (
		Number.isFinite(on.getTime()) &&
		scope.allowedActions.includes(action) &&
		(!scope.startsAt || on >= scope.startsAt) &&
		(!scope.expiresAt || on < scope.expiresAt) &&
		(scope.departmentCodes.length === 0 ||
			(!!departmentCode && scope.departmentCodes.includes(departmentCode)))
	);
}
export function mandateSummary(scope: StoredMandateScope): string {
	const date = (v: Date) => new Date(v).toISOString().slice(0, 10);
	return `${scope.allowedActions.map((a) => MANDATE_ACTION_LABELS[a as MandateAction] ?? a).join(', ')} · ${scope.departmentCodes.length ? 'Départements ' + scope.departmentCodes.join(', ') : 'Tous territoires'} · ${scope.startsAt ? 'à partir du ' + date(scope.startsAt) : 'sans date de début'} · ${scope.expiresAt ? 'jusqu’au ' + date(scope.expiresAt) + ' exclu' : 'sans échéance'}`;
}

/** Code INSEE utilisé par les concerts ; aucun lieu précis. */
export function departmentOfCommune(code: string | null): string | null {
	if (!code || !/^(?:[0-9]{5}|2[AB][0-9]{3})$/.test(code)) return null;
	return code.startsWith('97') || code.startsWith('98') ? code.slice(0, 3) : code.slice(0, 2);
}
