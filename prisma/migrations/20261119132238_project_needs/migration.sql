-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "ProjectNeedStatus" AS ENUM ('PROPOSED', 'OPEN', 'FILLED', 'DECLINED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "ProjectActKind" ADD VALUE 'NEED_PROPOSED';
ALTER TYPE "ProjectActKind" ADD VALUE 'NEED_OPENED';
ALTER TYPE "ProjectActKind" ADD VALUE 'NEED_DECLINED';
ALTER TYPE "ProjectActKind" ADD VALUE 'NEED_UPDATED';
ALTER TYPE "ProjectActKind" ADD VALUE 'NEED_FILLED';
ALTER TYPE "ProjectActKind" ADD VALUE 'NEED_REOPENED';
ALTER TYPE "ProjectActKind" ADD VALUE 'NEED_CANCELLED';
ALTER TYPE "ProjectActKind" ADD VALUE 'NEED_LINKED';

-- AlterTable
ALTER TABLE "project_acts" ADD COLUMN     "needId" TEXT;

-- CreateTable
CREATE TABLE "project_needs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "ProjectNeedStatus" NOT NULL,
    "track" "TrackKind" NOT NULL,
    "specialty" TEXT,
    "instrumentId" TEXT,
    "description" TEXT,
    "createdById" TEXT,
    "decidedById" TEXT,
    "filledById" TEXT,
    "opportunityId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_needs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_needs_opportunityId_key" ON "project_needs"("opportunityId");

-- CreateIndex
CREATE INDEX "project_needs_projectId_status_idx" ON "project_needs"("projectId", "status");

-- CreateIndex
CREATE INDEX "project_needs_createdById_createdAt_idx" ON "project_needs"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "project_needs_filledById_idx" ON "project_needs"("filledById");

-- CreateIndex
CREATE INDEX "project_needs_decidedById_idx" ON "project_needs"("decidedById");

-- AddForeignKey
ALTER TABLE "project_needs" ADD CONSTRAINT "project_needs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_needs" ADD CONSTRAINT "project_needs_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_needs" ADD CONSTRAINT "project_needs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_needs" ADD CONSTRAINT "project_needs_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_needs" ADD CONSTRAINT "project_needs_filledById_fkey" FOREIGN KEY ("filledById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_needs" ADD CONSTRAINT "project_needs_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- LINKMUSICIAN (U3b) : le journal reste en ajout seul, colonne `needId` comprise.
-- Seuls l'auteur et la personne concernée peuvent être oubliés (RGPD).
CREATE OR REPLACE FUNCTION linkmusician_project_acts_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW."authorId" IS NULL OR NEW."authorId" IS NOT DISTINCT FROM OLD."authorId")
       AND (NEW."subjectId" IS NULL OR NEW."subjectId" IS NOT DISTINCT FROM OLD."subjectId")
       AND NEW."id" = OLD."id"
       AND NEW."projectId" = OLD."projectId"
       AND NEW."kind" = OLD."kind"
       AND NEW."workId" IS NOT DISTINCT FROM OLD."workId"
       AND NEW."needId" IS NOT DISTINCT FROM OLD."needId"
       AND NEW."fromShare" IS NOT DISTINCT FROM OLD."fromShare"
       AND NEW."toShare" IS NOT DISTINCT FROM OLD."toShare"
       AND NEW."fromStatus" IS NOT DISTINCT FROM OLD."fromStatus"
       AND NEW."toStatus" IS NOT DISTINCT FROM OLD."toStatus"
       AND NEW."capability" IS NOT DISTINCT FROM OLD."capability"
       AND NEW."occurredAt" = OLD."occurredAt" THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'project_acts est en ajout seul (UPDATE refusé)';
  END IF;
  IF pg_trigger_depth() > 1 THEN
    RETURN OLD; -- cascade depuis la suppression du projet
  END IF;
  RAISE EXCEPTION 'project_acts est en ajout seul (DELETE refusé)';
END;
$$ LANGUAGE plpgsql;
