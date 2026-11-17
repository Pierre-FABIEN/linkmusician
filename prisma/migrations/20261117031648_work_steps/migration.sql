-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "WorkStepKind" AS ENUM ('RECORDING', 'MIXING', 'MASTERING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "WorkStepMode" AS ENUM ('SELF');

-- CreateEnum
CREATE TYPE "WorkStepPlace" AS ENUM ('HOME');

-- CreateEnum
CREATE TYPE "WorkStepStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "WorkStepActKind" AS ENUM ('CLAIMED', 'STARTED', 'FINISHED', 'RESET', 'REOPENED', 'RELEASED');

-- CreateTable
CREATE TABLE "work_steps" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "kind" "WorkStepKind" NOT NULL,
    "mode" "WorkStepMode",
    "assigneeId" TEXT,
    "place" "WorkStepPlace",
    "status" "WorkStepStatus" NOT NULL DEFAULT 'TODO',
    "startedAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_step_acts" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "authorId" TEXT,
    "assigneeId" TEXT,
    "kind" "WorkStepActKind" NOT NULL,
    "fromStatus" "WorkStepStatus",
    "toStatus" "WorkStepStatus",
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_step_acts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_steps_assigneeId_idx" ON "work_steps"("assigneeId");

-- CreateIndex
CREATE UNIQUE INDEX "work_steps_workId_kind_key" ON "work_steps"("workId", "kind");

-- CreateIndex
CREATE INDEX "work_step_acts_stepId_occurredAt_idx" ON "work_step_acts"("stepId", "occurredAt");

-- CreateIndex
CREATE INDEX "work_step_acts_authorId_idx" ON "work_step_acts"("authorId");

-- CreateIndex
CREATE INDEX "work_step_acts_assigneeId_idx" ON "work_step_acts"("assigneeId");

-- AddForeignKey
ALTER TABLE "work_steps" ADD CONSTRAINT "work_steps_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_steps" ADD CONSTRAINT "work_steps_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_step_acts" ADD CONSTRAINT "work_step_acts_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "work_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_step_acts" ADD CONSTRAINT "work_step_acts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_step_acts" ADD CONSTRAINT "work_step_acts_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- DASH-06a (D68) : dates cohérentes avec le statut, quel que soit le chemin d'écriture.
ALTER TABLE "work_steps" ADD CONSTRAINT "work_steps_status_dates_check" CHECK (
  ("status" = 'TODO' AND "startedAt" IS NULL AND "doneAt" IS NULL)
  OR ("status" = 'IN_PROGRESS' AND "startedAt" IS NOT NULL AND "doneAt" IS NULL)
  OR ("status" = 'DONE' AND "doneAt" IS NOT NULL)
);
-- Ajout seul, aucune donnée existante modifiée. Retour arrière manuel :
-- DROP TABLE "work_step_acts" ; DROP TABLE "work_steps" ; puis les cinq types WorkStep*.
