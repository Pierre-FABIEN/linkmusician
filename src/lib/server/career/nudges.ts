/**
 * Coups de pouce (P4-13a, conception 07 §4.7) : lit le réseau **réel** de la
 * personne et le passe au choix pur `#lib/career/nudges`.
 *
 * - Réseau : son réseau musical (`MusicalTie`, des gens avec qui elle a
 *   vraiment joué), visibles pour elle (ni blocage, ni compte masqué ou
 *   suspendu).
 * - Places libres : rôles d'instrument à pourvoir sur ses morceaux, et les
 *   personnes de son réseau à moins de 50 km qui déclarent cet instrument
 *   (hors équipe du morceau).
 * - À enregistrer : un morceau composé sans prise de son, et les ingés son
 *   (prise de son) ou producteur·rices de son réseau, hors équipe.
 * - Jams : jams à venir près de chez elle cette semaine, où elle ne vient
 *   pas déjà (le filtre des mineur·es, D5, est celui de l'agenda).
 *
 * Rien n'est écrit, rien n'est notifié. Jamais l'XP ni le palier.
 */
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { findActorsNear, type GeoTarget } from '#lib/server/geo/queries';
import { teamWhere } from '#lib/server/works/service';
import { JAM_WINDOW_DAYS, isStalled, pickNudges, type NudgeInput } from '#lib/career/nudges';

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

export async function nudgesFor(personId: string, options: Options = {}) {
	const now = options.now ?? new Date();
	const visible = publicActorWhere(now, personId);
	const [person, last] = await Promise.all([
		prisma.actor.findUniqueOrThrow({ where: { id: personId }, select: { createdAt: true } }),
		lastProgressAt(personId)
	]);
	const stalled = isStalled(last, person.createdAt, now);
	if (options.onlyIfStalled && !stalled) return { stalled, nudges: [] };

	const [ties, works, jamsSoon] = await Promise.all([
		prisma.musicalTie.findMany({
			where: { ownerId: personId, contact: { ...visible, person: { isNot: null } } },
			select: {
				contact: {
					select: {
						id: true,
						handle: true,
						displayName: true,
						person: {
							select: {
								instruments: { select: { instrumentId: true } },
								soundProfile: { select: { specialties: true } },
								producerProfile: { select: { specialties: true } }
							}
						}
					}
				}
			}
		}),
		prisma.work.findMany({
			where: teamWhere(personId),
			orderBy: { updatedAt: 'desc' },
			take: 20,
			select: {
				id: true,
				title: true,
				state: true,
				recordedAt: true,
				ownerId: true,
				contributors: { select: { personId: true } },
				roles: {
					where: { kind: 'INSTRUMENT', contributorId: null, instrumentId: { not: null } },
					orderBy: { createdAt: 'asc' },
					select: { instrumentId: true, instrument: { select: { name: true } } }
				}
			}
		}),
		(options.countJamsSoon ?? defaultJamsSoon)(personId, now)
	]);

	const contacts = ties.map((t) => t.contact);
	// Proches : à moins de NUDGE_RADIUS_KM (commune déclarée des deux côtés).
	const near =
		contacts.length > 0
			? new Set(
					(await findActorsNear(personId, NUDGE_RADIUS_KM, options.geo)).map((a) => a.actorId)
				)
			: new Set<string>();
	const named = (c: (typeof contacts)[number]) => ({
		handle: c.handle,
		displayName: c.displayName
	});
	const team = (w: (typeof works)[number]) =>
		new Set([w.ownerId, ...w.contributors.map((c) => c.personId)]);

	const openRoles: NudgeInput['openRoles'] = works.flatMap((w) => {
		const inTeam = team(w);
		return w.roles.map((r) => ({
			workId: w.id,
			workTitle: w.title,
			instrument: r.instrument!.name,
			candidates: contacts
				.filter(
					(c) =>
						near.has(c.id) &&
						!inTeam.has(c.id) &&
						c.person?.instruments.some((i) => i.instrumentId === r.instrumentId)
				)
				.map(named)
		}));
	});

	const composed = works.find((w) => w.state === 'COMPOSED' && w.recordedAt === null);
	let toRecord: NudgeInput['toRecord'] = null;
	if (composed) {
		const inTeam = team(composed);
		type Pro = NonNullable<NudgeInput['toRecord']>['pros'][number];
		const pros = contacts.flatMap((c): Pro[] => {
			if (inTeam.has(c.id)) return [];
			if (c.person?.soundProfile?.specialties.includes('RECORDING'))
				return [{ ...named(c), craft: 'SOUND_ENGINEER' as const }];
			if ((c.person?.producerProfile?.specialties.length ?? 0) > 0)
				return [{ ...named(c), craft: 'PRODUCER' as const }];
			return [];
		});
		toRecord = { workId: composed.id, workTitle: composed.title, pros };
	}

	return {
		stalled,
		nudges: pickNudges({ jamsSoon, openRoles, toRecord })
	};
}
