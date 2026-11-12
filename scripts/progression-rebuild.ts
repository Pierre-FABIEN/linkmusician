// LINKMUSICIAN (P1-07) : reconstruit les projections de progression
// (`actor_progress`) depuis le registre `xp_transactions`, qui n'est jamais
// modifié. Sûr à relancer : la projection n'est pas une donnée source.
//
//   npm run progression:rebuild
import dotenv from 'dotenv';
import { createPrismaClient } from '../prisma/client.js';
import { rebuildAll } from '../src/lib/server/progression/projector';

dotenv.config({ quiet: true });
const prisma = createPrismaClient();

try {
	const result = await prisma.$transaction((tx) => rebuildAll(tx), { timeout: 120_000 });
	console.log(`Projections reconstruites : ${result.actors} acteur(s), ${result.rows} ligne(s).`);
} catch (error) {
	console.error('Échec de la reconstruction :', error);
	process.exitCode = 1;
} finally {
	await prisma.$disconnect();
}
