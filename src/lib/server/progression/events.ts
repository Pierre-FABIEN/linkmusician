/**
 * Émission des événements de domaine (outbox). `emit` écrit le `DomainEvent`
 * dans la transaction de l'appelant ; le moteur le traite ensuite
 * (`processor.ts`), dans la même transaction au MVP.
 *
 * Imports relatifs (pas d'alias `#lib/server`) : ce module sert aussi au
 * script `progression:rebuild` et aux tests d'intégration, hors SvelteKit.
 */
import type { Prisma } from '@prisma/client';
import { parseDomainEvent, type DomainEvent } from './core/events';

export type Tx = Prisma.TransactionClient;

/** Événement à émettre : l'identifiant et la date sont fixés par la base. */
export type NewDomainEvent = DomainEvent extends infer E
	? E extends DomainEvent
		? Omit<E, 'id' | 'occurredAt'> & { occurredAt?: Date }
		: never
	: never;

/** Acteurs concernés par un événement (pour retrouver les faits passés). */
export function actorIdsOf(event: DomainEvent): string[] {
	switch (event.type) {
		case 'profile.completed':
		case 'profile.updated':
		case 'media.published':
		case 'jam.attended':
			return [event.actorId];
		case 'conversation.reciprocated':
			return [event.actorId, event.counterpartId];
		case 'membership.accepted':
			return [event.personId, event.bandId];
		case 'collaboration.completed':
			return [...new Set(event.participantIds)];
		case 'endorsement.received':
		case 'endorsement.revoked':
			return [event.actorId, event.endorserId];
		case 'work.composed':
			return [...new Set(event.contributorIds)];
		case 'work.credit_confirmed':
			return [event.personId, ...new Set(event.otherIds.filter((id) => id !== event.personId))];
		case 'milestone.attested':
			return [event.bandId, ...new Set(event.memberIds)];
		case 'milestone.attestation_confirmed':
			return [event.attesterId, event.bandId, ...(event.requesterId ? [event.requesterId] : [])];
	}
}

/** Relit un événement stocké sous sa forme typée. */
export function toDomainEvent(row: {
	id: string;
	type: string;
	payload: Prisma.JsonValue;
	occurredAt: Date;
}): DomainEvent {
	return parseDomainEvent({
		...(row.payload as Record<string, unknown>),
		type: row.type,
		id: row.id,
		occurredAt: row.occurredAt
	});
}

/** Valide puis écrit l'événement ; renvoie sa ligne. */
export async function emit(tx: Tx, input: NewDomainEvent) {
	const occurredAt = input.occurredAt ?? new Date();
	const event = parseDomainEvent({ ...input, id: 'pending', occurredAt });
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { id, type, occurredAt: _at, ...payload } = event;
	return tx.domainEvent.create({
		data: {
			type,
			payload: payload as Prisma.InputJsonValue,
			actorIds: actorIdsOf(event),
			occurredAt
		}
	});
}

/** Événement dérivé (niveau atteint, succès débloqué) : tracé, jamais rejoué. */
export async function recordDerived(
	tx: Tx,
	type: `progress.${string}`,
	payload: Record<string, unknown>,
	actorIds: string[]
) {
	return tx.domainEvent.create({
		data: { type, payload: payload as Prisma.InputJsonValue, actorIds, processedAt: new Date() }
	});
}
