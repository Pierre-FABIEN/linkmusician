-- Collaborations liées au morceau et prestations du son (P4-06).
-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "CraftService" AS ENUM ('RECORDING', 'MIXING', 'MASTERING', 'LIVE_SOUND', 'PRODUCTION', 'ARRANGEMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "CollabKind" ADD VALUE 'MIXING';
ALTER TYPE "CollabKind" ADD VALUE 'MASTERING';
ALTER TYPE "CollabKind" ADD VALUE 'LIVE_SOUND';

-- AlterTable
ALTER TABLE "collaboration_participants" ADD COLUMN     "service" "CraftService";

-- AlterTable
ALTER TABLE "collaborations" ADD COLUMN     "workId" TEXT;

-- AlterTable
ALTER TABLE "works" ADD COLUMN     "masteredAt" TIMESTAMP(3),
ADD COLUMN     "mixedAt" TIMESTAMP(3),
ADD COLUMN     "producedAt" TIMESTAMP(3),
ADD COLUMN     "recordedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE SET NULL ON UPDATE CASCADE;

