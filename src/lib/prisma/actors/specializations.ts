/**
 * Spécialités et intentions par métier (ONB-01, D56). Seul point d'écriture
 * de `person_track_specializations` et `person_track_intents` (hors
 * anonymisation, où elles suivent `person_tracks` en cascade).
 *
 * Coexistence avec les profils existants : pour l'ingé son, le ou la
 * producteur·rice et l'organisateur·rice, les colonnes `specialties` et
 * `eventKinds` restent la source de la recherche, des quêtes et des
 * annonces jusqu'à ONB-04, 05 et 08. Les deux sont donc écrites ensemble :
 * - `setTrackDetails` recopie les codes historiques dans la colonne ;
 * - les enregistrements des profils appellent `legacySpecializationOps`, qui
 *   ne remplace que les codes historiques (les nouveaux restent) ;
 * - `syncLegacySpecializations` recopie les colonnes quand un métier est
 *   repris (retirer un métier efface ses lignes, pas son profil).
 */
import type {
	PrismaPromise,
	ProducerSpecialty,
	PromoterEventKind,
	SoundSpecialty
} from '@prisma/client';
import { prisma } from '#lib/server';
import {
	catalogOf,
	checkCodes,
	parseTrackDetails,
	SELECTION_LISTS,
	SPECIALIZATIONS,
	type SelectionList,
	type TrackDetails,
	type TrackDetailsRow
} from '#lib/actors/specializations';
import type { TrackKindValue } from '#lib/actors/tracks';
import type { SoundSpecialtyValue } from '#lib/crafts/sound';
import type { ProducerSpecialtyValue } from '#lib/crafts/producer';
import type { PromoterEventKindValue } from '#lib/crafts/promoter';

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/** Échouent à la compilation si un référentiel pur et son enum Prisma divergent. */
export const SOUND_SPECIALTIES_MATCH_PRISMA: Equals<SoundSpecialty, SoundSpecialtyValue> = true;
export const PRODUCER_SPECIALTIES_MATCH_PRISMA: Equals<ProducerSpecialty, ProducerSpecialtyValue> =
	true;
export const PROMOTER_EVENT_KINDS_MATCH_PRISMA: Equals<PromoterEventKind, PromoterEventKindValue> =
	true;

/** Métiers dont les spécialités ont déjà une colonne dans un profil. */
export const LEGACY_TRACKS = ['SOUND_ENGINEER', 'PRODUCER', 'PROMOTER'] as const;
export type LegacyTrack = (typeof LEGACY_TRACKS)[number];

const isLegacyTrack = (track: TrackKindValue): track is LegacyTrack =>
	(LEGACY_TRACKS as readonly string[]).includes(track);

function legacyCodes(track: TrackKindValue): string[] {
	return SPECIALIZATIONS[track].filter((s) => s.legacy).map((s) => s.code);
}

export class TrackNotHeldError extends Error {
	constructor(track: TrackKindValue) {
		super(`Métier non déclaré : ${track}`);
	}
}

export class InvalidTrackCodeError extends Error {
	constructor(
		readonly list: SelectionList,
		readonly code: string,
		readonly reason: 'unknown' | 'retired'
	) {
		super(`Code ${reason === 'unknown' ? 'inconnu' : 'retiré'} (${list}) : ${code}`);
	}
}

const DIRECTION = { offers: 'OFFER', needs: 'NEED' } as const;

/** Spécialités, offres et besoins de chaque métier de la personne. */
export async function getTrackDetails(personId: string): Promise<TrackDetails[]> {
	const [tracks, specializations, intents] = await Promise.all([
		prisma.personTrack.findMany({ where: { personId }, select: { track: true } }),
		prisma.personTrackSpecialization.findMany({
			where: { personId },
			select: { track: true, code: true }
		}),
		prisma.personTrackIntent.findMany({
			where: { personId },
			select: { track: true, direction: true, code: true }
		})
	]);
	const rows: TrackDetailsRow[] = [
		...specializations.map((s) => ({ ...s, list: 'specializations' as const })),
		...intents.map((i) => ({
			track: i.track,
			code: i.code,
			list: i.direction === 'OFFER' ? ('offers' as const) : ('needs' as const)
		}))
	];
	return parseTrackDetails(
		tracks.map((t) => t.track),
		rows
	);
}

/** Remplace, dans une liste, les codes de `scope` par `codes` ; les autres restent. */
function replaceOps(
	personId: string,
	track: TrackKindValue,
	list: SelectionList,
	codes: readonly string[],
	scope: readonly string[]
): PrismaPromise<unknown>[] {
	const where = { personId, track, code: { in: [...scope], notIn: [...codes] } };
	if (list === 'specializations') {
		return [
			prisma.personTrackSpecialization.deleteMany({ where }),
			prisma.personTrackSpecialization.createMany({
				data: codes.map((code) => ({ personId, track, code })),
				skipDuplicates: true
			})
		];
	}
	const direction = DIRECTION[list];
	return [
		prisma.personTrackIntent.deleteMany({ where: { ...where, direction } }),
		prisma.personTrackIntent.createMany({
			data: codes.map((code) => ({ personId, track, direction, code })),
			skipDuplicates: true
		})
	];
}

/** Recopie les codes historiques dans la colonne du profil (créé s'il le faut). */
function legacyMirrorOps(
	personId: string,
	track: LegacyTrack,
	codes: readonly string[]
): PrismaPromise<unknown>[] {
	const legacy = codes.filter((c) => legacyCodes(track).includes(c));
	// Sans code, on ne crée pas de profil vide : on vide seulement l'existant.
	if (track === 'SOUND_ENGINEER') {
		const specialties = legacy as SoundSpecialty[];
		return legacy.length === 0
			? [prisma.soundEngineerProfile.updateMany({ where: { personId }, data: { specialties } })]
			: [
					prisma.soundEngineerProfile.upsert({
						where: { personId },
						create: { personId, specialties },
						update: { specialties }
					})
				];
	}
	if (track === 'PRODUCER') {
		const specialties = legacy as ProducerSpecialty[];
		return legacy.length === 0
			? [prisma.producerProfile.updateMany({ where: { personId }, data: { specialties } })]
			: [
					prisma.producerProfile.upsert({
						where: { personId },
						create: { personId, specialties },
						update: { specialties }
					})
				];
	}
	const eventKinds = legacy as PromoterEventKind[];
	return legacy.length === 0
		? [prisma.promoterProfile.updateMany({ where: { personId }, data: { eventKinds } })]
		: [
				prisma.promoterProfile.upsert({
					where: { personId },
					create: { personId, eventKinds },
					update: { eventKinds }
				})
			];
}

/**
 * Remplace les spécialités, offres et besoins d'un métier, en une
 * transaction. Revérifie tout : métier déclaré, codes du catalogue de ce
 * métier, pas d'ajout d'un code retiré (ceux déjà détenus restent).
 * `confirm` marque aussi l'étape du métier comme faite (onboarding, ONB-02).
 */
export async function setTrackDetails(
	personId: string,
	details: TrackDetails,
	options: { confirm?: boolean } = {}
) {
	const { track } = details;
	const held = await prisma.personTrack.findUnique({
		where: { personId_track: { personId, track } },
		select: {
			specializations: { select: { code: true } },
			intents: { select: { direction: true, code: true } }
		}
	});
	if (!held) throw new TrackNotHeldError(track);
	const heldCodes: Record<SelectionList, string[]> = {
		specializations: held.specializations.map((s) => s.code),
		offers: held.intents.filter((i) => i.direction === 'OFFER').map((i) => i.code),
		needs: held.intents.filter((i) => i.direction === 'NEED').map((i) => i.code)
	};

	const saved: TrackDetails = { track, specializations: [], offers: [], needs: [] };
	const ops: PrismaPromise<unknown>[] = [];
	for (const list of SELECTION_LISTS) {
		const check = checkCodes(track, list, details[list], heldCodes[list]);
		if (!check.ok) throw new InvalidTrackCodeError(list, check.code, check.reason);
		saved[list] = check.codes;
		const scope = catalogOf(track, list).map((e) => e.code);
		ops.push(...replaceOps(personId, track, list, check.codes, scope));
	}
	if (isLegacyTrack(track)) ops.push(...legacyMirrorOps(personId, track, saved.specializations));
	// Onboarding (ONB-02) : l'étape de ce métier est faite.
	if (options.confirm)
		ops.push(
			prisma.personTrack.update({
				where: { personId_track: { personId, track } },
				data: { detailsConfirmedAt: new Date() }
			})
		);
	await prisma.$transaction(ops);
	return saved;
}

/**
 * Pour les enregistrements des profils existants (`/profil/son`,
 * `/profil/production`, `/profil/organisateur`) : remplace les seuls codes
 * historiques, à ajouter à leur transaction. Rien si le métier n'est pas
 * déclaré : la recopie suivra quand il le sera (`syncLegacySpecializations`).
 */
export async function legacySpecializationOps(
	personId: string,
	track: LegacyTrack,
	codes: readonly string[]
): Promise<PrismaPromise<unknown>[]> {
	const held = await prisma.personTrack.findUnique({
		where: { personId_track: { personId, track } },
		select: { personId: true }
	});
	if (!held) return [];
	const scope = legacyCodes(track);
	const kept = scope.filter((c) => codes.includes(c));
	return replaceOps(personId, track, 'specializations', kept, scope);
}

/**
 * Recopie les colonnes des profils existants pour les métiers déclarés.
 * Rejouable sans effet ; même règle que la recopie de la migration
 * `specialites_par_metier`.
 */
export async function syncLegacySpecializations(personId: string) {
	const [tracks, sound, producer, promoter] = await Promise.all([
		prisma.personTrack.findMany({ where: { personId }, select: { track: true } }),
		prisma.soundEngineerProfile.findUnique({ where: { personId }, select: { specialties: true } }),
		prisma.producerProfile.findUnique({ where: { personId }, select: { specialties: true } }),
		prisma.promoterProfile.findUnique({ where: { personId }, select: { eventKinds: true } })
	]);
	const held = new Set(tracks.map((t) => t.track));
	const from: Record<LegacyTrack, readonly string[]> = {
		SOUND_ENGINEER: sound?.specialties ?? [],
		PRODUCER: producer?.specialties ?? [],
		PROMOTER: promoter?.eventKinds ?? []
	};
	const data = LEGACY_TRACKS.filter((track) => held.has(track)).flatMap((track) =>
		from[track].map((code) => ({ personId, track, code }))
	);
	if (data.length === 0) return;
	await prisma.personTrackSpecialization.createMany({ data, skipDuplicates: true });
}
