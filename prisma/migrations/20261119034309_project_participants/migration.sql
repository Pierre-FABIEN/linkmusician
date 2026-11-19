-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "ProjectCapability" AS ENUM ('COORDINATE');

-- CreateEnum
CREATE TYPE "ProjectParticipantStatus" AS ENUM ('INVITED', 'ACTIVE', 'DECLINED', 'LEFT', 'REMOVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "ProjectActKind" ADD VALUE 'INVITED';
ALTER TYPE "ProjectActKind" ADD VALUE 'JOINED';
ALTER TYPE "ProjectActKind" ADD VALUE 'DECLINED';
ALTER TYPE "ProjectActKind" ADD VALUE 'LEFT';
ALTER TYPE "ProjectActKind" ADD VALUE 'REMOVED';
ALTER TYPE "ProjectActKind" ADD VALUE 'CAPABILITY_GRANTED';
ALTER TYPE "ProjectActKind" ADD VALUE 'CAPABILITY_REVOKED';

-- AlterTable
ALTER TABLE "project_acts" ADD COLUMN     "capability" "ProjectCapability",
ADD COLUMN     "subjectId" TEXT;

-- CreateTable
CREATE TABLE "project_participants" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" "ProjectParticipantStatus" NOT NULL DEFAULT 'INVITED',
    "role" TEXT,
    "capabilities" "ProjectCapability"[] DEFAULT ARRAY[]::"ProjectCapability"[],
    "proposedCapabilities" "ProjectCapability"[] DEFAULT ARRAY[]::"ProjectCapability"[],
    "asMember" BOOLEAN NOT NULL DEFAULT false,
    "invitedById" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_participants_projectId_status_idx" ON "project_participants"("projectId", "status");

-- CreateIndex
CREATE INDEX "project_participants_personId_status_idx" ON "project_participants"("personId", "status");

-- CreateIndex
CREATE INDEX "project_participants_invitedById_idx" ON "project_participants"("invitedById");

-- CreateIndex
CREATE INDEX "project_acts_subjectId_idx" ON "project_acts"("subjectId");

-- AddForeignKey
ALTER TABLE "project_acts" ADD CONSTRAINT "project_acts_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_participants" ADD CONSTRAINT "project_participants_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_participants" ADD CONSTRAINT "project_participants_personId_fkey" FOREIGN KEY ("personId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_participants" ADD CONSTRAINT "project_participants_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- P4a : une seule participation ouverte (invitée ou active) par personne et
-- par projet. Index partiel absent de schema.prisma : protégé par
-- scripts/migration-clean.mjs (voir CLAUDE.md).
CREATE UNIQUE INDEX "project_participants_open_key"
  ON "project_participants"("projectId", "personId")
  WHERE "status" IN ('INVITED', 'ACTIVE');

-- I8 (D72) : le journal reste en ajout seul. P4a ajoute la personne
-- concernée (`subjectId`) et la capacité : seul l'oubli de l'auteur ou de la
-- personne concernée (anonymisation, ou SET NULL quand l'acteur disparaît)
-- modifie une ligne ; une suppression ne vient que d'une cascade.
CREATE OR REPLACE FUNCTION linkmusician_project_acts_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW."authorId" IS NULL OR NEW."authorId" IS NOT DISTINCT FROM OLD."authorId")
       AND (NEW."subjectId" IS NULL OR NEW."subjectId" IS NOT DISTINCT FROM OLD."subjectId")
       AND NEW."id" = OLD."id"
       AND NEW."projectId" = OLD."projectId"
       AND NEW."kind" = OLD."kind"
       AND NEW."workId" IS NOT DISTINCT FROM OLD."workId"
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
