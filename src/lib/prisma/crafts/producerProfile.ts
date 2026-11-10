/**
 * Profil de producteur·rice (P4-04) : spécialités, styles produits,
 * logiciels, tarifs indicatifs, mobilité, productions en écoute. Seul point
 * d'écriture de `producer_profiles`, `producer_genres` et des
 * `craft_references` de la piste producteur·rice (hors anonymisation).
 */
import { prisma } from '#lib/server';
import type { CraftMobilityValue, Reference, ReferenceInput } from '#lib/crafts/common';
import {
	MAX_PRODUCER_GENRES,
	normalizeRate,
	normalizeSoftware,
	type ProducerSpecialtyValue
} from '#lib/crafts/producer';
import { listReferences, normalizeReferences, replaceReferencesOps } from './references';

const TRACK = 'PRODUCER' as const;

export type ProducerProfile = {
	specialties: ProducerSpecialtyValue[];
	mobility: CraftMobilityValue[];
	software: string;
	rate: string;
	genres: { id: string; name: string }[];
	references: Reference[];
};

export async function getProducerProfile(personId: string): Promise<ProducerProfile | null> {
	const [profile, references] = await Promise.all([
		prisma.producerProfile.findUnique({
			where: { personId },
			select: {
				specialties: true,
				mobility: true,
				software: true,
				rate: true,
				genres: { select: { genre: { select: { id: true, name: true, sortOrder: true } } } }
			}
		}),
		listReferences(personId, TRACK)
	]);
	if (!profile) return null;
	const { genres, ...rest } = profile;
	return {
		...rest,
		genres: genres
			.map((g) => g.genre)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map(({ id, name }) => ({ id, name })),
		references
	};
}

export class UnknownGenreError extends Error {
	constructor() {
		super('Style inconnu ou désactivé');
	}
}

export type ProducerProfileInput = {
	specialties: readonly ProducerSpecialtyValue[];
	genreIds: readonly string[];
	software: string;
	rate: string;
	mobility: readonly CraftMobilityValue[];
	references: readonly ReferenceInput[];
};

/**
 * Remplace le profil, en une transaction. La saisie est revérifiée ici :
 * styles existants et actifs (5 au plus), textes normalisés, liens contrôlés.
 */
export async function saveProducerProfile(personId: string, input: ProducerProfileInput) {
	const references = normalizeReferences(input.references);
	const genreIds = [...new Set(input.genreIds)];
	if (genreIds.length > MAX_PRODUCER_GENRES) throw new Error('Trop de styles');
	const known = await prisma.genre.count({ where: { id: { in: genreIds }, active: true } });
	if (known !== genreIds.length) throw new UnknownGenreError();
	const data = {
		specialties: [...new Set(input.specialties)],
		mobility: [...new Set(input.mobility)],
		software: normalizeSoftware(input.software),
		rate: normalizeRate(input.rate)
	};
	await prisma.$transaction([
		prisma.producerProfile.upsert({
			where: { personId },
			create: { personId, ...data },
			update: data
		}),
		prisma.producerGenre.deleteMany({ where: { personId } }),
		prisma.producerGenre.createMany({ data: genreIds.map((genreId) => ({ personId, genreId })) }),
		...replaceReferencesOps(personId, TRACK, references)
	]);
	return { ...data, genreIds, references };
}
