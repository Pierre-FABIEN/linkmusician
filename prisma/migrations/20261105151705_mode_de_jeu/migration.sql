-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "PlayMode" AS ENUM ('CAREER', 'JAM');

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "preferredMode" "PlayMode";

