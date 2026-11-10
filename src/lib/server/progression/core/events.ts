/**
 * Événements de domaine qui alimentent la progression (conception 03 §2.4).
 * Union discriminée validée par Zod : un événement mal formé est refusé avant
 * toute règle. Le client n'émet jamais d'événement : les services métier le
 * font, côté serveur, après avoir écrit l'état.
 */
import { z } from 'zod';
import { CRAFT_SERVICES, CRAFT_TRACKS } from './crafts';

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
		participantIds: z.array(id).min(2),
		/**
		 * Prestation de chaque participant·e qui exerce un métier du son
		 * (P4-01, D20) : ingé son, producteur·rice. Absent pour qui joue.
		 */
		services: z.record(id, z.enum(CRAFT_SERVICES)).optional()
	}),
	/**
	 * Une sortie vérifiée (ISRC, UPC) crédite une personne d'un métier du son
	 * (P4-01, conception 08 §5 et §7). Une fois par sortie et par personne.
	 */
	z.object({
		...base,
		type: z.literal('release.credit_verified'),
		actorId: id,
		releaseId: id,
		track: z.enum(CRAFT_TRACKS)
	}),
	/**
	 * Morceau composé à plusieurs, corroboré (D35) : au moins deux personnes
	 * ont confirmé leur rôle et une maquette est jointe. Chaque contributeur
	 * confirmé reçoit sa part, une fois par morceau.
	 */
	z.object({
		...base,
		type: z.literal('work.composed'),
		workId: id,
		/** Personnes ayant confirmé leur rôle (au moins deux). */
		contributorIds: z.array(id).min(2)
	}),
	/**
	 * Rôle confirmé sur un morceau déjà corroboré (D35) : la personne reçoit
	 * sa part à ce moment-là ; les autres ne reçoivent rien de plus.
	 */
	z.object({
		...base,
		type: z.literal('work.credit_confirmed'),
		workId: id,
		personId: id,
		/** Autres contributeurs déjà confirmés (au moins un). */
		otherIds: z.array(id).min(1)
	}),
	z.object({
		...base,
		type: z.literal('endorsement.received'),
		actorId: id,
		endorserId: id,
		/** Qualité (« bon groove ») ou instrument apprécié. */
		skill: z.string().min(1),
		/** Jam où les deux étaient présent·es (P2-15, D27). */
		jamId: id.optional(),
		/** Collaboration confirmée par les deux (P2-07). */
		collaborationId: id.optional()
	}),
	/**
	 * Appréciation reprise (P2-07) : par son autrice ou son auteur, ou parce
	 * qu'une présence à la jam a été retirée. L'XP est repris à part, par
	 * transaction négative liée ; ce fait sert au palier (endosseurs
	 * distincts) et ne rapporte rien.
	 */
	z.object({
		...base,
		type: z.literal('endorsement.revoked'),
		actorId: id,
		endorserId: id,
		/** Événement `endorsement.received` repris. */
		endorsementEventId: id
	}),
	/**
	 * « J'y étais » à une jam (P2-15b) : ne rapporte rien (D27), sert aux
	 * succès fun. Les faits utiles sont calculés par le service émetteur.
	 */
	z.object({
		...base,
		type: z.literal('jam.attended'),
		actorId: id,
		jamId: id,
		/** La jam a fini après minuit (heure de Paris). */
		lateNight: z.boolean(),
		/** Instruments différents joués en jam jusqu'ici, celle-ci comprise. */
		distinctInstruments: z.number().int().min(0),
		/** Lead d'une jam dont toutes les places réservées ont été acceptées. */
		ledFullLineup: z.boolean()
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
	}),
	/**
	 * Une étape est retirée (P3-06) : contestation retenue par la modération,
	 * ou retrait par la gestion du groupe. L'XP est reprise à part, par
	 * transactions négatives liées ; l'événement retire l'étape du palier.
	 */
	z.object({
		...base,
		type: z.literal('milestone.revoked'),
		bandId: id,
		milestone: z.enum(MILESTONES),
		/** Membres crédités par les attestations de l'étape. */
		memberIds: z.array(id),
		reason: z.enum(['contested', 'retracted'])
	}),
	/**
	 * Une personne confirme une étape de groupe (P3-05). Ne rapporte rien en
	 * soi : tracé pour la détection des cercles fermés (P2-10).
	 */
	z.object({
		...base,
		type: z.literal('milestone.attestation_confirmed'),
		bandId: id,
		milestoneId: id,
		attesterId: id,
		/** Personne de la gestion qui a demandé (vide après RGPD). */
		requesterId: id.nullable()
	})
]);

export type DomainEvent = z.infer<typeof domainEventSchema>;
export type DomainEventType = DomainEvent['type'];
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;

/** Valide un événement (lève une erreur Zod s'il est mal formé). */
export function parseDomainEvent(input: unknown): DomainEvent {
	return domainEventSchema.parse(input);
}
