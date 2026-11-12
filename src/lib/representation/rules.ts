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
	ENDED: 'Terminé'
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
