/**
 * Coups de pouce (P4-13a, conception 07 §4.7) : lit le carnet volontaire de la
 * personne et le passe au choix pur `#lib/career/nudges`.
 *
 * - Réseau : son carnet (`SavedContact`, D82), des personnes enregistrées,
 *   visibles pour elle (ni blocage, ni compte masqué ou
 *   suspendu).
 * - Places libres : rôles d'instrument à pourvoir sur ses morceaux, et les
 *   personnes de son réseau à moins de 50 km qui déclarent cet instrument
 *   (hors équipe du morceau).
 * - À enregistrer : un morceau composé dont l'enregistrement n'est ni fait
 *   ni pris en charge (DASH-06c : une étape prise soi-même n'est plus un
 *   besoin), et les ingés son (prise de son) ou producteur·rices de son
 *   réseau, hors équipe.
 * - À mixer (DASH-06c) : un morceau enregistré, même déclaré, dont le mixage
 *   n'est ni fait ni pris en charge, et les ingés son (mixage) ou
 *   producteur·rices de son réseau, hors équipe.
 * - Jams : jams à venir près de chez elle cette semaine, où elle ne vient
 *   pas déjà (le filtre des mineur·es, D5, est celui de l'agenda).
 *
 * Rien n'est écrit, rien n'est notifié. Jamais l'XP ni le palier.
 */
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { findActorsNear, type GeoTarget } from '#lib/server/geo/queries';
import { teamWhere } from '#lib/server/works/service';
import { stepFactsOf } from '#lib/server/works/production';
import { nextProductionNeed, productionStages } from '#lib/works/production';
import {
	JAM_WINDOW_DAYS,
	isStalled,
	pickNudges,
	type NamedPerson,
	type NudgeInput
} from '#lib/career/nudges';
import { canReceiveRequest } from '#lib/messaging/rules';

/** Rayon des personnes proposées pour une place libre. */
export const NUDGE_RADIUS_KM = 50;
const DAY = 86_400_000;

type Options = {
	now?: Date;
	/** Cible du SQL brut (tests d'intégration). */
	geo?: GeoTarget;
	/** Jams de la semaine où l'on ne vient pas déjà ; l'agenda des jams par défaut. */
	countJamsSoon?: (personId: string, now: Date) => Promise<number>;
	/**
	 * Ne lit le réseau et les jams que si la personne n'avance plus (menu de
	 * `/espace`, chargé souvent) ; sinon, aucun coup de pouce.
	 */
	onlyIfStalled?: boolean;
};

async function defaultJamsSoon(personId: string, now: Date) {
	const { upcomingJamsNear } = await import('#lib/server/jam/publicJams');
	const until = now.getTime() + JAM_WINDOW_DAYS * DAY;
	const jams = await upcomingJamsNear(personId, now);
	return jams.filter((j) => !j.imComing && new Date(j.startsAt).getTime() <= until).length;
}

/** Dernier progrès : le dernier événement de domaine qui la concerne (hors simple modification du profil). */
async function lastProgressAt(personId: string) {
	const last = await prisma.domainEvent.findFirst({
		where: { actorIds: { has: personId }, type: { not: 'profile.updated' } },
		orderBy: { occurredAt: 'desc' },
		select: { occurredAt: true }
	});
	return last?.occurredAt ?? null;
}

/**
 * Le carnet volontaire et les morceaux de l'équipe, avec leurs besoins (lecture
 * commune aux coups de pouce et aux prochaines actions, N3). Rien n'est
 * filtré par la gestion du morceau : l'appelant décide qui peut agir.
 */
export async function workNetworkFacts(
	personId: string,
	options: Pick<Options, 'now' | 'geo'> = {}
) {
	const now = options.now ?? new Date();
	const visible = publicActorWhere(now, personId);
	// Lecture à plat d'abord : Prisma lancerait sinon une requête par relation,
	// même sans aucune ligne (compte neuf). Les détails ne partent que s'il y en a.
	const [ties, rows] = await Promise.all([
		prisma.savedContact.findMany({
			where: { ownerId: personId, contact: { ...visible, person: { isNot: null } } },
			select: { contactId: true }
		}),
		prisma.work.findMany({
			where: teamWhere(personId),
			orderBy: { updatedAt: 'desc' },
			take: 20,
			select: {
				id: true,
				title: true,
				state: true,
				updatedAt: true,
				demoMediaId: true,
				recordedAt: true,
				mixedAt: true,
				masteredAt: true,
				producedAt: true,
				ownerId: true
			}
		})
	]);
	const workIds = rows.map((w) => w.id);
	const [contacts, contributors, roles] = await Promise.all([
		ties.length
			? prisma.actor.findMany({
					where: { id: { in: ties.map((t) => t.contactId) } },
					orderBy: { id: 'asc' },
					select: {
						id: true,
						handle: true,
						displayName: true,
						person: {
							select: {
								birthDate: true,
								instruments: { select: { instrumentId: true } },
								soundProfile: { select: { specialties: true } },
								producerProfile: { select: { specialties: true } }
							}
						}
					}
				})
			: [],
		workIds.length
			? prisma.workContributor.findMany({
					where: { workId: { in: workIds } },
					select: { workId: true, personId: true }
				})
			: [],
		workIds.length
			? prisma.workRole.findMany({
					where: {
						workId: { in: workIds },
						kind: 'INSTRUMENT',
						contributorId: null,
						instrumentId: { not: null }
					},
					orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
					select: { workId: true, instrumentId: true, instrument: { select: { name: true } } }
				})
			: []
	]);
	const works = rows.map((w) => ({
		...w,
		contributors: contributors.filter((c) => c.workId === w.id),
		roles: roles.filter((r) => r.workId === w.id)
	}));

	// Proches : à moins de NUDGE_RADIUS_KM (commune déclarée des deux côtés).
	// Seulement s'il y a une place libre à proposer : la recherche géographique coûte.
	const near =
		contacts.length > 0 && works.some((w) => w.roles.length > 0)
			? new Set(
					(await findActorsNear(personId, NUDGE_RADIUS_KM, options.geo)).map((a) => a.actorId)
				)
			: new Set<string>();
	type Contact = (typeof contacts)[number];
	const named = (c: Contact) => ({ handle: c.handle, displayName: c.displayName });
	const team = (w: (typeof works)[number]) =>
		new Set([w.ownerId, ...w.contributors.map((c) => c.personId)]);

	// DASH-06c : le besoin réel de chaque morceau composé (faits et étapes prises).
	const composed = works.filter((w) => w.state === 'COMPOSED');
	const facts = await stepFactsOf(composed.map((w) => w.id));
	type Pro = NamedPerson & { craft: 'SOUND_ENGINEER' | 'PRODUCER'; adult: boolean };
	const adult = (c: Contact) => canReceiveRequest(c.person?.birthDate ?? null, now);

	return works.map((w) => {
		const inTeam = team(w);
		const steps = facts.get(w.id) ?? [];
		const prosFor = (specialty: 'RECORDING' | 'MIXING') =>
			contacts.flatMap((c): Pro[] => {
				if (inTeam.has(c.id)) return [];
				if (c.person?.soundProfile?.specialties.includes(specialty))
					return [{ ...named(c), craft: 'SOUND_ENGINEER' as const, adult: adult(c) }];
				if ((c.person?.producerProfile?.specialties.length ?? 0) > 0)
					return [{ ...named(c), craft: 'PRODUCER' as const, adult: adult(c) }];
				return [];
			});
		const need =
			w.state === 'COMPOSED' ? nextProductionNeed(productionStages(w, steps), steps) : null;
		return {
			id: w.id,
			title: w.title,
			state: w.state,
			updatedAt: w.updatedAt,
			hasDemo: w.demoMediaId !== null,
			ownerId: w.ownerId,
			need,
			pros: need ? prosFor(need) : [],
			openRoles: w.roles.map((r) => ({
				instrument: r.instrument!.name,
				candidates: contacts
					.filter(
						(c) =>
							near.has(c.id) &&
							!inTeam.has(c.id) &&
							c.person?.instruments.some((i) => i.instrumentId === r.instrumentId)
					)
					.map((c) => ({ ...named(c), adult: adult(c) }))
			}))
		};
	});
}

export async function nudgesFor(personId: string, options: Options = {}) {
	const now = options.now ?? new Date();
	const [person, last] = await Promise.all([
		prisma.actor.findUniqueOrThrow({ where: { id: personId }, select: { createdAt: true } }),
		lastProgressAt(personId)
	]);
	const stalled = isStalled(last, person.createdAt, now);
	if (options.onlyIfStalled && !stalled) return { stalled, nudges: [] };

	const [works, jamsSoon] = await Promise.all([
		workNetworkFacts(personId, { now, geo: options.geo }),
		(options.countJamsSoon ?? defaultJamsSoon)(personId, now)
	]);
	const strip = <T extends { adult: boolean }>({ adult: _adult, ...p }: T) => p;

	const openRoles: NudgeInput['openRoles'] = works.flatMap((w) =>
		w.openRoles.map((r) => ({
			workId: w.id,
			workTitle: w.title,
			instrument: r.instrument,
			candidates: r.candidates.map(strip)
		}))
	);
	const recording = works.find((w) => w.need === 'RECORDING');
	const toRecord: NudgeInput['toRecord'] = recording
		? { workId: recording.id, workTitle: recording.title, pros: recording.pros.map(strip) }
		: null;
	const mixing = works.find((w) => w.need === 'MIXING');
	const toMix: NudgeInput['toMix'] = mixing
		? { workId: mixing.id, workTitle: mixing.title, pros: mixing.pros.map(strip) }
		: null;

	return {
		stalled,
		nudges: pickNudges({ jamsSoon, openRoles, toRecord, toMix })
	};
}
