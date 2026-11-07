import { PrismaClient } from '@prisma/client';
import { DATABASE_URL } from '$app/env/private';
import { dev } from '$app/env';

// LINKMUSICIAN: Prisma et le SQL brut lisent cette variable via process.env,
// alors que SvelteKit l'expose par `$app/env/private`.
process.env.DATABASE_URL ??= DATABASE_URL;

// Le rechargement à chaud de Vite réévalue ce module : sans ce cache global,
// chaque itération ouvrirait un nouveau pool de connexions PostgreSQL.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: dev ? ['warn', 'error'] : ['error']
	});

if (dev) {
	globalForPrisma.prisma = prisma;
}
