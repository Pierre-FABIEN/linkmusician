/**
 * Profil musical d'une personne : instruments joués, genres, influences
 * (P1-06). Seul point d'écriture de `person_instruments`, `actor_genres` et
 * `influences` (hors anonymisation).
 */
import { prisma } from '#lib/server';
import { checkMusicalProfile, type MusicalProfile } from '#lib/skills/profile';
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
