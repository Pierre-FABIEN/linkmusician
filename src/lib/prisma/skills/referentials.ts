/**
 * Lecture des référentiels instruments et genres (P1-04). Écriture : seulement
 * `prisma/seed-referentials.js`.
 */
import type { InstrumentFamily } from '@prisma/client';
import { prisma } from '#lib/server';
import { INSTRUMENT_FAMILIES, type InstrumentFamilyValue } from '#lib/skills/instruments';

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/** Échoue à la compilation si les familles pures et l'enum Prisma divergent. */
export const INSTRUMENT_FAMILIES_MATCH_PRISMA: Equals<InstrumentFamily, InstrumentFamilyValue> =
	true;

/** Instruments groupés par famille, dans l'ordre d'affichage. */
export async function listInstrumentsByFamily(options: { includeInactive?: boolean } = {}) {
	const instruments = await prisma.instrument.findMany({
		where: options.includeInactive ? {} : { active: true },
		orderBy: { sortOrder: 'asc' },
		select: { id: true, slug: true, name: true, family: true, active: true }
	});
	return INSTRUMENT_FAMILIES.map((family) => ({
		family,
		instruments: instruments.filter((i) => i.family === family)
	}));
}

/** Genres parents et leurs sous-genres, dans l'ordre d'affichage. */
export async function listGenreTree(options: { includeInactive?: boolean } = {}) {
	const where = options.includeInactive ? {} : { active: true };
	return prisma.genre.findMany({
		where: { ...where, parentId: null },
		orderBy: { sortOrder: 'asc' },
		select: {
			id: true,
			slug: true,
			name: true,
			active: true,
			children: {
				where,
				orderBy: { sortOrder: 'asc' },
				select: { id: true, slug: true, name: true, active: true }
			}
		}
	});
}
