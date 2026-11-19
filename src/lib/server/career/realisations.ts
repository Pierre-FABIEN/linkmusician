/**
 * Lecture unifiée des réalisations d'un acteur (N1, #72, conception 21 §6.3
 * et §13.2) : lit les tables et les événements **existants**, sans table
 * nouvelle, et construit les réalisations du module pur
 * (`#lib/career/realisations`). La carte et la fiche de carrière en
 * déduisent leurs faits ; le futur moteur de suggestions (N3) et
 * l'avancement des projets (N5) les liront aussi.
 *
 * Un nombre fixe de requêtes, quel que soit le nombre de faits :
 *
 * 1. les événements du résumé musicien (une seule lecture, partagée avec le
 *    palier : les attestations d'étapes en font partie) ;
 * 2. ses contributions confirmées, avec le morceau et ses rôles (Prisma
 *    charge chaque relation par une requête : trois au total) ;
 * 3. les morceaux produits de ses groupes actifs ;
 * 4. les étapes de scène des groupes qui la créditent (dès les événements
 *    lus, en parallèle des morceaux).
 *
 * Six requêtes SQL au lieu de huit avant N1 (deux lectures d'événements,
 * quatre comptes de morceaux et de rôles, trois comptes d'étapes, moins le
 * palier) ; la fiche économise en plus son compte de crédits.
 *
 * **Lecteur** : `realisationsOf(actorId, reader)` ne rend à un autre lecteur
 * que des faits publics et confirmés, sur des acteurs qu'il peut voir
 * (`publicActorWhere`, blocages compris) ; les collaborations, privées entre
 * leurs parties, ne sortent que pour l'acteur lui-même. Les **comptes** de la
 * fiche publique restent ceux d'avant N1 (P3-14 : faits confirmés, sans
 * objet ni titre), calculés sur la lecture complète.
 */
import { prisma } from '#lib/server';
import { summaryEventsOf, tierOf } from '#lib/server/progression/read';
import type { DomainEvent } from '#lib/server/progression/core/events';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { SOUND_ROLE_KINDS } from '#lib/works/rules';
import { isPersonalMilestoneKey, PERSONAL_MILESTONE_KEYS } from '#lib/milestones/rules';
import {
	countable,
	dedupeRealisations,
	realisationKey,
	type Realisation,
	type RealisationObject,
	type RealisationProof,
	type RealisationRole
} from '#lib/career/realisations';

/** Étapes de groupe qui comptent sur la carte (actes III et V). */
export const SCENE_MILESTONES = ['FIRST_RECORDING', 'FIRST_GIG', 'FIRST_TOUR'] as const;
type SceneMilestone = (typeof SCENE_MILESTONES)[number];

/** Rôles où l'on joue ou écrit (acte IV : morceau produit). */
const PLAYING_ROLES = ['INSTRUMENT', 'COMPOSITION', 'LYRICS', 'ARRANGEMENT'] as const;
const SOUND_ROLES: readonly string[] = SOUND_ROLE_KINDS;

/** Lecteur : l'acteur lui-même, une autre personne, ou personne (visiteur). */
export type RealisationsReader = { actorId: string | null };

function make(r: Omit<Realisation, 'key' | 'roles'> & { roles: RealisationRole[] }): Realisation {
	return { ...r, key: realisationKey(r.kind, r.object) };
}

const WORK_FIELDS = {
	id: true,
	ownerId: true,
	state: true,
	proof: true,
	composedAt: true,
	producedAt: true
} as const;

/**
 * Morceaux où l'acteur a part, en deux lectures parallèles : ses
 * contributions confirmées (avec le morceau et ses rôles), et les morceaux
 * produits des groupes dont il est membre actif aujourd'hui (acte IV).
 */
async function worksOf(actorId: string): Promise<WorkRow[]> {
	const [contributions, bandProduced] = await Promise.all([
		prisma.workContributor.findMany({
			where: { personId: actorId, confirmedAt: { not: null } },
			select: {
				confirmedAt: true,
				roles: { select: { id: true, kind: true } },
				work: { select: WORK_FIELDS }
			}
		}),
		prisma.work.findMany({
			where: {
				producedAt: { not: null },
				owner: {
					organization: {
						kind: 'BAND',
						memberships: { some: { personId: actorId, status: 'ACTIVE' } }
					}
				}
			},
			select: WORK_FIELDS
		})
	]);
	const member = new Set(bandProduced.map((w) => w.id));
	const rows = new Map<string, WorkRow>();
	for (const c of contributions) {
		rows.set(c.work.id, {
			...c.work,
			contributor: { confirmedAt: c.confirmedAt, roles: c.roles },
			bandMember: member.has(c.work.id)
		});
	}
	for (const w of bandProduced) {
		if (!rows.has(w.id)) rows.set(w.id, { ...w, contributor: null, bandMember: true });
	}
	return [...rows.values()];
}

/** Un morceau vu par l'acteur : sa contribution confirmée et son appartenance au groupe porteur. */
export type WorkRow = {
	id: string;
	ownerId: string;
	state: 'IDEA' | 'COMPOSED';
	proof: 'DECLARED' | 'CORROBORATED' | null;
	composedAt: Date | null;
	producedAt: Date | null;
	contributor: { confirmedAt: Date | null; roles: { id: string; kind: string }[] } | null;
	/** Membre actif du groupe qui porte ce morceau produit. */
	bandMember: boolean;
};

/** Réalisations d'un morceau, vues par l'acteur (règles des actes II et IV, fiche). */
export function workRealisations(w: WorkRow): Realisation[] {
	const out: Realisation[] = [];
	const contributor = w.contributor;
	const roles = contributor?.roles ?? [];
	const work: RealisationObject = { type: 'WORK', id: w.id };
	if (
		contributor &&
		w.state === 'COMPOSED' &&
		(w.proof === 'CORROBORATED' || w.proof === 'DECLARED')
	) {
		out.push(
			make({
				kind: 'WORK_COMPOSED',
				branch: 'CREATION',
				bearerId: w.ownerId,
				object: work,
				roles: ['CREDITED'],
				occurredAt: w.composedAt,
				proof: w.proof,
				status: 'ACTIVE',
				visibility: 'PUBLIC',
				firstTime: false
			})
		);
	}
	if (w.producedAt) {
		const plays = roles.some((r) => (PLAYING_ROLES as readonly string[]).includes(r.kind));
		const member = w.bandMember;
		if (plays || member) {
			out.push(
				make({
					kind: 'PRODUCTION_STAGE',
					branch: 'PRODUCTION',
					bearerId: w.ownerId,
					object: work,
					roles: [
						...(plays ? (['CREDITED'] as const) : []),
						...(member ? (['BAND_MEMBER'] as const) : [])
					],
					occurredAt: w.producedAt,
					// Confirmée par le ou la producteur·rice (collaboration terminée).
					proof: 'CORROBORATED',
					status: 'ACTIVE',
					visibility: w.state === 'IDEA' ? 'PRIVATE' : 'PUBLIC',
					firstTime: false
				})
			);
		}
	}
	for (const role of roles) {
		const sound = SOUND_ROLES.includes(role.kind);
		// Un rôle d'écriture vaut la preuve du morceau composé ; une idée ne crédite rien.
		// Un rôle du son, confirmé des deux côtés, compte dès sa confirmation.
		const proof: RealisationProof | null = sound
			? 'CORROBORATED'
			: w.state === 'COMPOSED' && w.proof
				? w.proof
				: null;
		if (!proof) continue;
		out.push(
			make({
				kind: 'CREDIT',
				branch: sound ? 'PRODUCTION' : 'CREATION',
				bearerId: w.ownerId,
				object: { type: 'WORK_ROLE', id: role.id, workId: w.id, roleKind: role.kind },
				roles: ['CREDITED'],
				occurredAt: contributor?.confirmedAt ?? null,
				proof,
				status: 'ACTIVE',
				// Une idée reste cachée des listes publiques (P3-11).
				visibility: w.state === 'IDEA' ? 'PRIVATE' : 'PUBLIC',
				firstTime: false
			})
		);
	}
	return out;
}

/** Dernière attestation (au moins corroborée) qui crédite l'acteur, par groupe et étape. */
export function creditedMilestones(actorId: string, events: readonly DomainEvent[]) {
	const out = new Map<
		string,
		{ bandId: string; milestone: SceneMilestone; to: RealisationProof; at: Date }
	>();
	for (const e of events) {
		if (e.type !== 'milestone.attested') continue;
		if (!(SCENE_MILESTONES as readonly string[]).includes(e.milestone)) continue;
		if (e.to === 'DECLARED' || !e.memberIds.includes(actorId)) continue;
		const key = `${e.bandId}|${e.milestone}`;
		const seen = out.get(key);
		if (!seen || seen.at.getTime() <= e.occurredAt.getTime()) {
			out.set(key, {
				bandId: e.bandId,
				milestone: e.milestone as SceneMilestone,
				to: e.to,
				at: e.occurredAt
			});
		}
	}
	return out;
}

/**
 * Lignes des étapes de scène : celles des groupes crédités, et (P8) les
 * étapes personnelles de l'acteur s'il est une personne, en une requête.
 */
async function sceneMilestoneRows(bandIds: string[], actorId: string) {
	return prisma.milestone.findMany({
		where: {
			definitionId: { in: [...SCENE_MILESTONES] },
			OR: [
				...(bandIds.length ? [{ bandId: { in: bandIds } }] : []),
				{
					bandId: actorId,
					definitionId: { in: [...PERSONAL_MILESTONE_KEYS] },
					band: { kind: 'PERSON' as const }
				}
			]
		},
		select: {
			id: true,
			bandId: true,
			definitionId: true,
			proof: true,
			occurredAt: true,
			frozenAt: true
		}
	});
}

/**
 * Étapes de scène où l'acteur est crédité (membre à la date). La ligne fait
 * foi pour la preuve et le gel ; sans ligne, l'étape a été retirée
 * (contestation retenue ou retrait par la gestion) : `RETIRED`.
 */
export function milestoneRealisations(
	credited: ReturnType<typeof creditedMilestones>,
	rows: Awaited<ReturnType<typeof sceneMilestoneRows>>
): Realisation[] {
	const byKey = new Map(rows.map((m) => [`${m.bandId}|${m.definitionId}`, m]));
	return [...credited.entries()].map(([key, c]) => {
		const row = byKey.get(key);
		return make({
			kind: 'MILESTONE',
			branch: c.milestone === 'FIRST_RECORDING' ? 'PRODUCTION' : 'SCENE',
			bearerId: c.bandId,
			object: {
				type: 'MILESTONE',
				id: row?.id ?? null,
				bandId: c.bandId,
				definitionId: c.milestone
			},
			roles: ['BAND_MEMBER'],
			occurredAt: row?.occurredAt ?? c.at,
			proof: row?.proof ?? c.to,
			status: !row ? 'RETIRED' : row.frozenAt ? 'FROZEN' : 'ACTIVE',
			// La page du groupe montre ses étapes.
			visibility: 'PUBLIC',
			firstTime: true
		});
	});
}

/**
 * Étapes de scène **personnelles** (P8, D77) : la personne a joué en son nom,
 * l'hôte a confirmé. Pas d'attestation (aucune XP propre) : la ligne fait
 * foi. Clé `milestone:<personne>:<étape>`, distincte de celle d'un groupe
 * (DC4) : un concert du groupe ne franchit pas l'étape personnelle, ni
 * l'inverse.
 */
export function personalMilestoneRealisations(
	actorId: string,
	rows: Awaited<ReturnType<typeof sceneMilestoneRows>>
): Realisation[] {
	return rows
		.filter((m) => m.bandId === actorId && isPersonalMilestoneKey(m.definitionId))
		.map((m) =>
			make({
				kind: 'MILESTONE',
				branch: 'SCENE',
				bearerId: m.bandId,
				object: { type: 'MILESTONE', id: m.id, bandId: m.bandId, definitionId: m.definitionId },
				roles: ['PERFORMER'],
				occurredAt: m.occurredAt,
				proof: m.proof,
				status: m.frozenAt ? 'FROZEN' : 'ACTIVE',
				visibility: 'PUBLIC',
				firstTime: true
			})
		);
}

/** Collaborations terminées et confirmées où l'acteur figure (événements du résumé). */
export function collaborationRealisations(actorId: string, events: readonly DomainEvent[]) {
	const out: Realisation[] = [];
	for (const e of events) {
		if (e.type !== 'collaboration.completed' || !e.participantIds.includes(actorId)) continue;
		const roles: RealisationRole[] = e.hostIds?.includes(actorId)
			? ['HOST']
			: e.services?.[actorId]
				? ['PROVIDER']
				: ['PARTICIPANT'];
		out.push(
			make({
				kind: 'COLLABORATION',
				branch: e.hostIds?.length ? 'SCENE' : e.services ? 'PRODUCTION' : 'EQUIPE',
				bearerId: null,
				object: { type: 'COLLABORATION', id: e.collaborationId },
				roles,
				occurredAt: e.occurredAt,
				proof: 'CORROBORATED',
				status: 'ACTIVE',
				// Privée entre ses parties.
				visibility: 'PRIVATE',
				firstTime: false
			})
		);
	}
	return out;
}

/**
 * Lecture complète (vue de l'acteur lui-même) : réalisations dédupliquées et
 * palier musicien.
 * Réservée aux services de carrière ; tout autre lecteur passe par
 * `realisationsOf`.
 */
export async function readRealisations(actorId: string) {
	// Les étapes partent dès les événements lus, sans attendre les morceaux.
	const scene = summaryEventsOf(actorId, prisma).then(async (events) => {
		const credited = creditedMilestones(actorId, events);
		const bandIds = [...new Set([...credited.values()].map((c) => c.bandId))];
		return { events, credited, rows: await sceneMilestoneRows(bandIds, actorId) };
	});
	const [{ events, credited, rows }, works] = await Promise.all([scene, worksOf(actorId)]);
	const realisations = dedupeRealisations([
		...works.flatMap(workRealisations),
		...milestoneRealisations(credited, rows),
		...personalMilestoneRealisations(actorId, rows),
		...collaborationRealisations(actorId, events)
	]);
	return {
		realisations,
		tier: tierOf(actorId, events)
	};
}

/**
 * Réalisations d'un acteur, filtrées pour `reader` (droits évalués côté
 * serveur). L'acteur lui-même voit tout (gelé et retiré compris, affichés
 * comme tels). Un autre lecteur ne voit que les faits actifs et au moins
 * corroborés, sur des objets publics (ni idée, ni collaboration), si l'acteur et chaque porteur lui sont
 * visibles ; sinon, rien.
 */
export async function realisationsOf(
	actorId: string,
	reader: RealisationsReader,
	now = new Date()
): Promise<Realisation[]> {
	const { realisations } = await readRealisations(actorId);
	if (reader.actorId === actorId) return realisations;
	const shown = realisations.filter(
		(r) => countable(r) && r.proof !== 'DECLARED' && r.visibility === 'PUBLIC'
	);
	const actorIds = [
		...new Set([actorId, ...shown.flatMap((r) => (r.bearerId ? [r.bearerId] : []))])
	];
	const visible = new Set(
		(
			await prisma.actor.findMany({
				where: { id: { in: actorIds }, ...publicActorWhere(now, reader.actorId) },
				select: { id: true }
			})
		).map((a) => a.id)
	);
	if (!visible.has(actorId)) return [];
	return shown.filter((r) => r.bearerId !== null && visible.has(r.bearerId));
}
