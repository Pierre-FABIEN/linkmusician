// LINKMUSICIAN (P1-04) : chargement des référentiels instruments et genres.
//
// `npm run seed:referentiels` — rejouable à volonté, y compris en production
// (ce ne sont pas des données de démo) : chaque entrée est retrouvée par son
// `slug` et mise à jour, une entrée retirée de `prisma/seed-data/` est
// désactivée (`active = false`), jamais supprimée. Aussi appelé en fin de
// `prisma/seed.js`, donc par `npm run reset`.
import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { instrumentsByFamily } from './seed-data/instruments.js';
import { genreTree } from './seed-data/genres.js';

/** @param {PrismaClient} prisma */
async function seedInstruments(prisma) {
	const slugs = [];
	for (const [family, entries] of Object.entries(instrumentsByFamily)) {
		for (const [index, [slug, name]] of entries.entries()) {
			slugs.push(slug);
			const data = { name, family, sortOrder: index, active: true };
			await prisma.instrument.upsert({ where: { slug }, create: { slug, ...data }, update: data });
		}
	}
	const retired = await prisma.instrument.updateMany({
		where: { slug: { notIn: slugs }, active: true },
		data: { active: false }
	});
	return { total: slugs.length, retired: retired.count };
}

/** @param {PrismaClient} prisma */
async function seedGenres(prisma) {
	const slugs = [];
	for (const [index, parent] of genreTree.entries()) {
		slugs.push(parent.slug);
		const parentData = { name: parent.name, parentId: null, sortOrder: index, active: true };
		const saved = await prisma.genre.upsert({
			where: { slug: parent.slug },
			create: { slug: parent.slug, ...parentData },
			update: parentData
		});
		for (const [childIndex, [slug, name]] of parent.children.entries()) {
			slugs.push(slug);
			const data = { name, parentId: saved.id, sortOrder: childIndex, active: true };
			await prisma.genre.upsert({ where: { slug }, create: { slug, ...data }, update: data });
		}
	}
	const retired = await prisma.genre.updateMany({
		where: { slug: { notIn: slugs }, active: true },
		data: { active: false }
	});
	return { total: slugs.length, retired: retired.count };
}

/** Charge les deux référentiels. @param {PrismaClient} prisma */
export async function seedReferentials(prisma) {
	const instruments = await seedInstruments(prisma);
	const genres = await seedGenres(prisma);
	console.log(
		`Référentiels : ${instruments.total} instruments (${instruments.retired} désactivé(s)), ` +
			`${genres.total} genres (${genres.retired} désactivé(s)).`
	);
}

// Lancé directement (`node prisma/seed-referentials.js`), pas importé.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	dotenv.config();
	const prisma = new PrismaClient();
	seedReferentials(prisma)
		.catch((error) => {
			console.error('Échec du chargement des référentiels :', error);
			process.exitCode = 1;
		})
		.finally(() => prisma.$disconnect());
}
