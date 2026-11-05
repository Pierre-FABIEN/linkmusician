/**
 * Indicateurs produit (P1-13, D13) : lit les faits de chaque personne de la
 * cohorte, puis délègue le calcul au module pur `#lib/metrics/indicators`.
 * Agrégats seulement : aucune donnée individuelle ne sort d'ici.
 */
import { prisma } from '#lib/server';
import {
	computeIndicators,
	DAY_MS,
	weeklySignups,
	type Availability,
	type PersonFacts
} from '#lib/metrics/indicators';
import { TRACK_KINDS, type TrackKindValue } from '#lib/actors/tracks';
import { musicianSummary } from '#lib/server/progression/core/summary';
import { musicianTier } from '#lib/server/progression/core/tiers';
import { SUMMARY_EVENTS } from '#lib/server/progression/read';
import { toDomainEvent } from '#lib/server/progression/events';

/**
 * Fonctionnalités en place. À passer à `true` avec la messagerie (P2-04)
 * et les collaborations (P2-06) : avant, ces indicateurs valent « pas
 * encore mesurable » plutôt qu'un 0 % trompeur.
 */
export const INDICATOR_AVAILABILITY: Availability = {
	conversations: false,
	collaborations: false
};

/** Périodes proposées (jours) ; `null` = depuis le début. */
export const PERIODS = [30, 90, 365, null] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(value: string | null): Period {
	if (value === 'tout') return null;
	const n = Number(value);
	return (PERIODS as readonly (number | null)[]).includes(n) ? (n as Period) : 90;
}

const firstBy = (map: Map<string, Date>, id: string, at: Date) => {
	const prev = map.get(id);
	if (!prev || at < prev) map.set(id, at);
};

export async function getIndicators(period: Period, now = new Date()) {
	const since = period === null ? new Date(0) : new Date(now.getTime() - period * DAY_MS);
	const persons = await prisma.person.findMany({
		where: { createdAt: { gte: since } },
		select: { actorId: true, createdAt: true, onboardedAt: true }
	});
	const ids = persons.map((p) => p.actorId);

	const [events, activity, spam, allCreatedAt, tracks] = await Promise.all([
		prisma.domainEvent.findMany({
			where: { actorIds: { hasSome: ids }, type: { in: [...SUMMARY_EVENTS] } },
			select: { id: true, type: true, payload: true, occurredAt: true, actorIds: true }
		}),
		prisma.actorActivityDay.findMany({
			where: { actorId: { in: ids } },
			select: { actorId: true, day: true }
		}),
		prisma.report.findMany({
			where: { reason: 'SPAM', targetActorId: { in: ids } },
			distinct: ['targetActorId'],
			select: { targetActorId: true }
		}),
		prisma.person.findMany({
			where: { createdAt: { gte: new Date(now.getTime() - 8 * 7 * DAY_MS) } },
			select: { createdAt: true }
		}),
		prisma.personTrack.groupBy({ by: ['track', 'isPrimary'], _count: { _all: true } })
	]);

	const cohort = new Set(ids);
	const firstReciprocal = new Map<string, Date>();
	const firstCollabOrBand = new Map<string, Date>();
	const eventsByActor = new Map<string, ReturnType<typeof toDomainEvent>[]>();
	for (const row of events) {
		const event = toDomainEvent(row);
		for (const id of row.actorIds) {
			if (!cohort.has(id)) continue;
			eventsByActor.set(id, [...(eventsByActor.get(id) ?? []), event]);
			if (row.type === 'conversation.reciprocated') firstBy(firstReciprocal, id, row.occurredAt);
			if (row.type === 'collaboration.completed') firstBy(firstCollabOrBand, id, row.occurredAt);
			if (row.type === 'membership.accepted' && event.type === 'membership.accepted') {
				if (event.personId === id) firstBy(firstCollabOrBand, id, row.occurredAt);
			}
		}
	}
	const days = new Map<string, Set<string>>();
	for (const a of activity) {
		const set = days.get(a.actorId) ?? new Set<string>();
		set.add(a.day.toISOString().slice(0, 10));
		days.set(a.actorId, set);
	}
	const spammed = new Set(spam.map((r) => r.targetActorId));

	const facts: PersonFacts[] = persons.map((p) => {
		const summary = musicianSummary(p.actorId, eventsByActor.get(p.actorId) ?? []);
		return {
			createdAt: p.createdAt,
			onboardedAt: p.onboardedAt,
			firstReciprocalAt: firstReciprocal.get(p.actorId) ?? null,
			firstCollabOrBandAt: firstCollabOrBand.get(p.actorId) ?? null,
			networked: musicianTier(summary).reached.includes('NETWORKED'),
			activeDays: days.get(p.actorId) ?? new Set(),
			reportedForSpam: spammed.has(p.actorId)
		};
	});

	// Demande par métier (06 §2) : tous les comptes, principal et secondaire.
	const byTrack = new Map<TrackKindValue, { primary: number; secondary: number }>(
		TRACK_KINDS.map((t) => [t, { primary: 0, secondary: 0 }])
	);
	for (const row of tracks) {
		const entry = byTrack.get(row.track);
		if (entry) entry[row.isPrimary ? 'primary' : 'secondary'] += row._count._all;
	}

	return {
		cohortSize: persons.length,
		indicators: computeIndicators(facts, now, INDICATOR_AVAILABILITY),
		weekly: weeklySignups(
			allCreatedAt.map((p) => p.createdAt),
			now
		),
		tracks: [...byTrack].map(([track, counts]) => ({ track, ...counts }))
	};
}
