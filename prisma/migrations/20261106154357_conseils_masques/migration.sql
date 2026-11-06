-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "tipsDismissed" TEXT[] DEFAULT ARRAY[]::TEXT[];

