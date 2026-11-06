-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "NotificationType" ADD VALUE 'MESSAGES';
ALTER TYPE "NotificationType" ADD VALUE 'PROGRESS';

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "digestSentAt" TIMESTAMP(3);

