/**
 * Profil d'organisateur·rice (P5-05a) : ce que la personne organise, genres
 * programmés, jauge habituelle, événements passés en lien. Seul point
 * d'écriture de `promoter_profiles`, `promoter_genres` et des
 * `craft_references` de la piste organisateur·rice (hors anonymisation).
 */
import { prisma } from '#lib/server';
import type { Reference, ReferenceInput } from '#lib/crafts/common';
import {
	MAX_CAPACITY,
	MAX_PROMOTER_GENRES,
	type PromoterEventKindValue
} from '#lib/crafts/promoter';
import { listReferences, normalizeReferences, replaceReferencesOps } from './references';
import { UnknownGenreError } from './producerProfile';

export { UnknownGenreError };

const TRACK = 'PROMOTER' as const;

export type PromoterProfile = {
	eventKinds: PromoterEventKindValue[];
	capacity: number | null;
	genres: { id: string; name: string }[];
	references: Reference[];
};

export async function getPromoterProfile(personId: string): Promise<PromoterProfile | null> {
	const [profile, references] = await Promise.all([
		prisma.promoterProfile.findUnique({
			where: { personId },
			select: {
				eventKinds: true,
				capacity: true,
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

export type PromoterProfileInput = {
	eventKinds: readonly PromoterEventKindValue[];
	genreIds: readonly string[];
	capacity: number | null;
	references: readonly ReferenceInput[];
};

/**
 * Remplace le profil, en une transaction. La saisie est revérifiée ici :
 * genres existants et actifs (5 au plus), jauge bornée, liens contrôlés.
 */
export async function savePromoterProfile(personId: string, input: PromoterProfileInput) {
	const references = normalizeReferences(input.references);
	const genreIds = [...new Set(input.genreIds)];
	if (genreIds.length > MAX_PROMOTER_GENRES) throw new Error('Trop de genres');
	if (
		input.capacity !== null &&
		(!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > MAX_CAPACITY)
	)
		throw new Error('Jauge invalide');
	const known = await prisma.genre.count({ where: { id: { in: genreIds }, active: true } });
	if (known !== genreIds.length) throw new UnknownGenreError();
	const data = { eventKinds: [...new Set(input.eventKinds)], capacity: input.capacity };
	await prisma.$transaction([
		prisma.promoterProfile.upsert({
			where: { personId },
			create: { personId, ...data },
			update: data
		}),
		prisma.promoterGenre.deleteMany({ where: { personId } }),
		prisma.promoterGenre.createMany({ data: genreIds.map((genreId) => ({ personId, genreId })) }),
		...replaceReferencesOps(personId, TRACK, references)
	]);
	return { ...data, genreIds, references };
}
