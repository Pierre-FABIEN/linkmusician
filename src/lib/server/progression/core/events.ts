/**
 * Événements de domaine qui alimentent la progression (conception 03 §2.4).
 * Union discriminée validée par Zod : un événement mal formé est refusé avant
 * toute règle. Le client n'émet jamais d'événement : les services métier le
 * font, côté serveur, après avoir écrit l'état.
 */
import { z } from 'zod';

const id = z.string().min(1);
const base = { id, occurredAt: z.coerce.date() };

export const MILESTONES = [
	'FORMATION',
	'FIRST_REHEARSAL',
	'FIRST_COMPOSITION',
	'FIRST_RECORDING',
	'FIRST_PUBLIC_DEMO',
	'FIRST_GIG',
	'FIRST_TOUR',
	'FIRST_EP',
	'FIRST_ALBUM',
	'SIGNING'
] as const;
export type Milestone = (typeof MILESTONES)[number];

/** Niveau de preuve (conception 02 §4), du plus faible au plus fort. */
export const PROOF_STATUSES = ['DECLARED', 'CORROBORATED', 'VERIFIED'] as const;
export type ProofStatus = (typeof PROOF_STATUSES)[number];

export const domainEventSchema = z.discriminatedUnion('type', [
	z.object({ ...base, type: z.literal('profile.completed'), actorId: id }),
	/** Modification du profil : tracée, ne rapporte rien. */
	z.object({ ...base, type: z.literal('profile.updated'), actorId: id }),
	z.object({
		...base,
		type: z.literal('media.published'),
		actorId: id,
		mediaId: id,
		/** Seules les démos validées par la modération rapportent. */
		kind: z.enum(['DEMO', 'PHOTO', 'VIDEO'])
	}),
	z.object({
		...base,
		type: z.literal('conversation.reciprocated'),
		actorId: id,
		counterpartId: id,
		/** Conversation née d'une annonce : seule celle-ci rapporte. */
		fromOpportunity: z.boolean()
	}),
	z.object({ ...base, type: z.literal('membership.accepted'), personId: id, bandId: id }),
	z.object({
		...base,
		type: z.literal('collaboration.completed'),
		collaborationId: id,
		/** Personnes ayant confirmé, des deux côtés (au moins deux). */
		participantIds: z.array(id).min(2)
	}),
	z.object({
		...base,
		type: z.literal('endorsement.received'),
		actorId: id,
		endorserId: id,
		skill: z.string().min(1)
	}),
	z.object({
		...base,
		type: z.literal('milestone.attested'),
		bandId: id,
		milestone: z.enum(MILESTONES),
		/** Statut précédent (`null` : première attestation). */
		from: z.enum(PROOF_STATUSES).nullable(),
		to: z.enum(PROOF_STATUSES),
		/** Membres actifs à la date de l'étape (créditent 25 %). */
		memberIds: z.array(id)
	})
]);

export type DomainEvent = z.infer<typeof domainEventSchema>;
export type DomainEventType = DomainEvent['type'];
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;

/** Valide un événement (lève une erreur Zod s'il est mal formé). */
export function parseDomainEvent(input: unknown): DomainEvent {
	return domainEventSchema.parse(input);
}
