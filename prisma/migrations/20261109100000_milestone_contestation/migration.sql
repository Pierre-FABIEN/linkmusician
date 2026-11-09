-- AlterEnum
ALTER TYPE "ReportTarget" ADD VALUE IF NOT EXISTS 'MILESTONE';

-- AlterTable
ALTER TABLE "milestones"
    ADD COLUMN IF NOT EXISTS "frozenAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "frozenByUserId" TEXT;

ALTER TABLE "milestone_attestations"
    ADD COLUMN IF NOT EXISTS "frozenAt" TIMESTAMP(3);
