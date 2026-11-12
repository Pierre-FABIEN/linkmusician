/**
 * Profil de musicien·ne (ONB-03, D58) : expérience, engagement, rôles
 * d'écriture, « Je propose », « Je recherche » et précisions selon
 * l'instrument. Seul point d'écriture de `musician_profiles` et des
 * précisions du métier musicien·ne (hors anonymisation).
 *
 * Tout s'enregistre en une transaction, avec la copie `Person.lookingFor`
 * (`lookingForOf`) que lisent la recherche, le profil public et l'assistant.
 */
import type { MusicCommitment, PracticeExperience, PrismaPromise } from '@prisma/client';
import { prisma } from '#lib/server';
import {
	checkDetails,
	DETAIL_FIELDS,
	detailGroupsFor,
	lookingForOf,
	type CommitmentValue,
	type Details,
	type InstrumentRef,
	type PracticeExperienceValue
} from '#lib/musician/profile';
import { confirmTrackOp, trackDetailsOps } from '#lib/prisma/actors/specializations';
import { catalogOf, type SelectionList } from '#lib/actors/specializations';

const TRACK = 'MUSICIAN' as const;

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/** Échouent à la compilation si le référentiel pur et les enums Prisma divergent. */
export const PRACTICE_EXPERIENCES_MATCH_PRISMA: Equals<
	PracticeExperience,
	PracticeExperienceValue
> = true;
export const COMMITMENTS_MATCH_PRISMA: Equals<MusicCommitment, CommitmentValue> = true;

export type MusicianStep = {
	practiceExperience: PracticeExperienceValue | null;
	commitment: CommitmentValue | null;
	specializations: string[];
	offers: string[];
	needs: string[];
	details: Details;
};

export type MusicianStepInput = {
	practiceExperience: PracticeExperienceValue;
	commitment: CommitmentValue;
	specializations: readonly string[];
	offers: readonly string[];
	needs: readonly string[];
	details: Details;
};

export class InvalidDetailError extends Error {
	constructor(
		readonly field: string,
		message: string
	) {
		super(message);
	}
}

/** Instruments de la personne, tels que les lisent les précisions. */
export async function instrumentRefsOf(personId: string): Promise<InstrumentRef[]> {
	const rows = await prisma.personInstrument.findMany({
		where: { personId },
		orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
		select: { instrument: { select: { slug: true, family: true, name: true } } }
	});
	return rows.map((r) => r.instrument);
}

function inCatalogOrder(list: SelectionList, codes: readonly string[]): string[] {
	return catalogOf(TRACK, list)
		.map((e) => e.code)
		.filter((c) => codes.includes(c));
}

export async function getMusicianStep(personId: string): Promise<MusicianStep> {
	const [profile, specializations, intents, attributes] = await Promise.all([
		prisma.musicianProfile.findUnique({
			where: { personId },
			select: { practiceExperience: true, commitment: true }
		}),
		prisma.personTrackSpecialization.findMany({
			where: { personId, track: TRACK },
			select: { code: true }
		}),
		prisma.personTrackIntent.findMany({
			where: { personId, track: TRACK },
			select: { direction: true, code: true }
		}),
		prisma.personTrackAttribute.findMany({
			where: { personId, track: TRACK },
			select: { field: true, code: true }
		})
	]);
	const details: Details = {};
	for (const field of DETAIL_FIELDS) {
		const codes = field.options
			.map((o) => o.code)
			.filter((c) => attributes.some((a) => a.field === field.id && a.code === c));
		if (codes.length > 0) details[field.id] = codes;
	}
	return {
		practiceExperience: profile?.practiceExperience ?? null,
		commitment: profile?.commitment ?? null,
		// Ordre du référentiel, pour une relecture exacte.
		specializations: inCatalogOrder(
			'specializations',
			specializations.map((s) => s.code)
		),
		offers: inCatalogOrder(
			'offers',
			intents.filter((i) => i.direction === 'OFFER').map((i) => i.code)
		),
		needs: inCatalogOrder(
			'needs',
			intents.filter((i) => i.direction === 'NEED').map((i) => i.code)
		),
		details
	};
}

/**
 * Enregistre l'écran musicien·ne, en une transaction. Revérifie tout :
 * métier déclaré, codes des catalogues, précisions des instruments de la
 * personne (celles d'un instrument qu'elle n'a plus sont gardées telles
 * quelles, sans s'appliquer). Confirme le métier (`detailsConfirmedAt`) ; le
 * récapitulatif termine l'onboarding (ONB-12a).
 */
export async function saveMusicianStep(personId: string, input: MusicianStepInput) {
	const instruments = await instrumentRefsOf(personId);
	const checked = checkDetails(input.details, instruments);
	if (!checked.ok) throw new InvalidDetailError(checked.field, checked.message);

	const { saved, ops } = await trackDetailsOps(personId, {
		track: TRACK,
		specializations: [...input.specializations],
		offers: [...input.offers],
		needs: [...input.needs]
	});

	const applicable = detailGroupsFor(instruments).flatMap((g) => g.fields.map((f) => f.id));
	const attributeOps: PrismaPromise<unknown>[] = [
		prisma.personTrackAttribute.deleteMany({
			where: { personId, track: TRACK, field: { in: applicable } }
		}),
		prisma.personTrackAttribute.createMany({
			data: Object.entries(checked.details).flatMap(([field, codes]) =>
				codes.map((code) => ({ personId, track: TRACK, field, code }))
			)
		})
	];
	const profile = { practiceExperience: input.practiceExperience, commitment: input.commitment };

	await prisma.$transaction([
		...ops,
		...attributeOps,
		prisma.musicianProfile.upsert({
			where: { personId },
			create: { personId, ...profile },
			update: profile
		}),
		prisma.person.update({
			where: { actorId: personId },
			data: { lookingFor: lookingForOf(saved) }
		}),
		confirmTrackOp(personId, TRACK)
	]);
	return { ...profile, ...saved, details: checked.details };
}
