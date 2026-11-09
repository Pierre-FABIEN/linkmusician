-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterEnum
ALTER TYPE "ReportTarget" ADD VALUE 'MILESTONE';

-- AlterTable
ALTER TABLE "milestones" ADD COLUMN     "frozenAt" TIMESTAMP(3);

