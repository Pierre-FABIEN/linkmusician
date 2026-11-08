-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "CareerAmbition" AS ENUM ('PLAY_BAND', 'STAGE', 'RECORD', 'PRO', 'SUPPORT');

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "ambition" "CareerAmbition";

