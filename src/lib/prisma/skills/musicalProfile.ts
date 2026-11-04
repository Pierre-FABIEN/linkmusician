/**
 * Profil musical d'une personne : instruments joués, genres, influences
 * (P1-06). Seul point d'écriture de `person_instruments`, `actor_genres` et
 * `influences` (hors anonymisation).
 */
import { prisma } from '#lib/server';
import {
	checkGenresInput,
	checkInstrumentsInput,
	checkMusicalProfile,
	type MusicalProfile
} from '#lib/skills/profile';
import type { InstrumentLevel } from '#lib/skills/levels';

export async function getMusicalProfile(person: { actorId: string }) {
	const [instruments, genres, influences] = await Promise.all([
		prisma.personInstrument.findMany({
			where: { personId: person.actorId },
			orderBy: [{ isPrimary: 'desc' }, { instrument: { name: 'asc' } }],
			select: {
				instrumentId: true,
				declaredLevel: true,
				isPrimary: true,
				instrument: { select: { name: true, slug: true } }
			}
		}),
		prisma.actorGenre.findMany({
			where: { actorId: person.actorId },
			select: { genreId: true, genre: { select: { name: true, slug: true } } }
		}),
		prisma.influence.findMany({
			where: { actorId: person.actorId },
			orderBy: { sortOrder: 'asc' },
			select: { label: true }
		})
	]);
	return {
		instruments: instruments.map((i) => ({
			instrumentId: i.instrumentId,
			name: i.instrument.name,
			slug: i.instrument.slug,
			level: i.declaredLevel as InstrumentLevel,
			isPrimary: i.isPrimary
		})),
		genres: genres.map((g) => ({ genreId: g.genreId, name: g.genre.name, slug: g.genre.slug })),
		influences: influences.map((i) => i.label)
	};
}

export class UnknownReferenceError extends Error {
	constructor(readonly field: 'instruments' | 'genreIds') {
		super(`Référence inconnue ou désactivée (${field})`);
	}
}

/**
 * Remplace le profil musical, en une transaction. La saisie est revérifiée
 * ici (quel que soit l'appelant : exactement un instrument principal), et
 * chaque instrument ou genre doit exister et être actif.
 */
export async function saveMusicalProfile(person: { actorId: string }, input: MusicalProfile) {
	const result = checkMusicalProfile({ ...input, influences: input.influences.join('\n') });
	if (!result.ok) throw new Error(`Profil musical invalide (${result.problems.join(', ')})`);
	const profile = result.profile;
	const instrumentIds = profile.instruments.map((i) => i.instrumentId);

	const [instrumentCount, genreCount] = await Promise.all([
		prisma.instrument.count({ where: { id: { in: instrumentIds }, active: true } }),
		prisma.genre.count({ where: { id: { in: profile.genreIds }, active: true } })
	]);
	if (instrumentCount !== instrumentIds.length) throw new UnknownReferenceError('instruments');
	if (genreCount !== profile.genreIds.length) throw new UnknownReferenceError('genreIds');

	const personId = person.actorId;
	await prisma.$transaction([
		prisma.personInstrument.deleteMany({ where: { personId } }),
		prisma.personInstrument.createMany({
			data: profile.instruments.map((i) => ({
				personId,
				instrumentId: i.instrumentId,
				declaredLevel: i.level,
				isPrimary: i.instrumentId === profile.primaryInstrumentId
			}))
		}),
		prisma.actorGenre.deleteMany({ where: { actorId: personId } }),
		prisma.actorGenre.createMany({
			data: profile.genreIds.map((genreId) => ({ actorId: personId, genreId }))
		}),
		prisma.influence.deleteMany({ where: { actorId: personId } }),
		prisma.influence.createMany({
			data: profile.influences.map((label, sortOrder) => ({ actorId: personId, label, sortOrder }))
		})
	]);
	return profile;
}

/** Remplace les seuls instruments (onboarding). Mêmes garanties que `saveMusicalProfile`. */
export async function saveInstruments(
	person: { actorId: string },
	input: {
		instruments: { instrumentId: string; level: number }[];
		primaryInstrumentId?: string | null;
	}
) {
	const checked = checkInstrumentsInput(input.instruments, input.primaryInstrumentId);
	if (!checked.ok) throw new Error(`Instruments invalides (${checked.problems.join(', ')})`);
	const ids = checked.instruments.map((i) => i.instrumentId);
	if (
		(await prisma.instrument.count({ where: { id: { in: ids }, active: true } })) !== ids.length
	) {
		throw new UnknownReferenceError('instruments');
	}
	await prisma.$transaction([
		prisma.personInstrument.deleteMany({ where: { personId: person.actorId } }),
		prisma.personInstrument.createMany({
			data: checked.instruments.map((i) => ({
				personId: person.actorId,
				instrumentId: i.instrumentId,
				declaredLevel: i.level,
				isPrimary: i.instrumentId === checked.primaryInstrumentId
			}))
		})
	]);
}

/** Remplace les seuls genres et influences (onboarding). */
export async function saveGenres(
	person: { actorId: string },
	input: { genreIds: string[]; influences?: string }
) {
	const checked = checkGenresInput(input.genreIds, input.influences ?? '');
	if (!checked.ok) throw new Error(`Genres invalides (${checked.problems.join(', ')})`);
	if (
		(await prisma.genre.count({ where: { id: { in: checked.genreIds }, active: true } })) !==
		checked.genreIds.length
	) {
		throw new UnknownReferenceError('genreIds');
	}
	const actorId = person.actorId;
	await prisma.$transaction([
		prisma.actorGenre.deleteMany({ where: { actorId } }),
		prisma.actorGenre.createMany({
			data: checked.genreIds.map((genreId) => ({ actorId, genreId }))
		}),
		prisma.influence.deleteMany({ where: { actorId } }),
		prisma.influence.createMany({
			data: checked.influences.map((label, sortOrder) => ({ actorId, label, sortOrder }))
		})
	]);
}
