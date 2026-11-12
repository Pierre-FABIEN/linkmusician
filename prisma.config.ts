// LINKMUSICIAN: configuration de la CLI Prisma 7 (DT-01a). Prisma 7 ne lit
// plus l'URL dans `schema.prisma` ni `.env` tout seul.
//
// `DATABASE_URL` est l'URL du pooler Neon. Les commandes de migration passent
// par `scripts/prisma-direct.mjs`, qui remplace `DATABASE_URL` par l'URL
// directe avant de lancer la CLI : `dotenv` ne réécrit pas une variable déjà
// définie, c'est donc bien l'URL directe qui arrive ici.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: { path: 'prisma/migrations' },
	// `prisma generate` (postinstall, build Vercel) n'a pas besoin de base :
	// pas de `env()`, qui échouerait si la variable manque.
	datasource: { url: process.env.DATABASE_URL ?? '' }
});
