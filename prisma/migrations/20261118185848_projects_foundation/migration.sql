-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('SINGLE', 'EP', 'ALBUM', 'PRODUCTION', 'CONCERT', 'TOUR', 'FESTIVAL', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'DONE', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ProjectShare" AS ENUM ('NONE', 'SUMMARY', 'WORK');

-- CreateEnum
CREATE TYPE "ProjectActKind" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'ITEM_ADDED', 'ITEM_REMOVED', 'SHARE_CHANGED');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ProjectKind" NOT NULL,
    "description" TEXT,
    "startsOn" DATE,
    "dueOn" DATE,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_items" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "share" "ProjectShare" NOT NULL,
    "workingTitle" TEXT,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_acts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT,
    "kind" "ProjectActKind" NOT NULL,
    "workId" TEXT,
    "fromShare" "ProjectShare",
    "toShare" "ProjectShare",
    "fromStatus" "ProjectStatus",
    "toStatus" "ProjectStatus",
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_acts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_ownerId_status_idx" ON "projects"("ownerId", "status");

-- CreateIndex
CREATE INDEX "project_items_workId_idx" ON "project_items"("workId");

-- CreateIndex
CREATE INDEX "project_items_addedById_idx" ON "project_items"("addedById");

-- CreateIndex
CREATE UNIQUE INDEX "project_items_projectId_workId_key" ON "project_items"("projectId", "workId");

-- CreateIndex
CREATE INDEX "project_acts_projectId_occurredAt_idx" ON "project_acts"("projectId", "occurredAt");

-- CreateIndex
CREATE INDEX "project_acts_authorId_idx" ON "project_acts"("authorId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_acts" ADD CONSTRAINT "project_acts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_acts" ADD CONSTRAINT "project_acts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- I8 (D72) : journal de projet en ajout seul. Seul l'oubli de l'auteur
-- (anonymisation, ou SET NULL quand l'acteur disparaît) modifie une ligne ;
-- une suppression ne vient que de la cascade du projet (ou d'un acteur porteur).
CREATE OR REPLACE FUNCTION linkmusician_project_acts_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW."authorId" IS NULL
       AND NEW."id" = OLD."id"
       AND NEW."projectId" = OLD."projectId"
       AND NEW."kind" = OLD."kind"
       AND NEW."workId" IS NOT DISTINCT FROM OLD."workId"
       AND NEW."fromShare" IS NOT DISTINCT FROM OLD."fromShare"
       AND NEW."toShare" IS NOT DISTINCT FROM OLD."toShare"
       AND NEW."fromStatus" IS NOT DISTINCT FROM OLD."fromStatus"
       AND NEW."toStatus" IS NOT DISTINCT FROM OLD."toStatus"
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

CREATE TRIGGER project_acts_append_only
  BEFORE UPDATE OR DELETE ON "project_acts"
  FOR EACH ROW EXECUTE FUNCTION linkmusician_project_acts_append_only();
