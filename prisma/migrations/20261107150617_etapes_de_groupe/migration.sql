-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "MilestoneProof" AS ENUM ('DECLARED', 'CORROBORATED', 'VERIFIED');

-- CreateTable
CREATE TABLE "milestone_definitions" (
    "id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestone_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "bandId" TEXT NOT NULL,
    "proof" "MilestoneProof" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "declaredById" TEXT,
    "workId" TEXT,
    "definitionVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "milestones_declaredById_idx" ON "milestones"("declaredById");

-- CreateIndex
CREATE INDEX "milestones_workId_idx" ON "milestones"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_bandId_definitionId_key" ON "milestones"("bandId", "definitionId");

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "milestone_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_declaredById_fkey" FOREIGN KEY ("declaredById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Reprise (écrite à la main, P3-04) : l'étape « Formation » était déjà
-- émise en événement (P3-01, XP versée) sans ligne `milestones`. On crée sa
-- définition (complétée par `npm run seed:referentiels`) et une ligne
-- vérifiée par groupe déjà formé, sans nouvel événement ni XP.
INSERT INTO "milestone_definitions" ("id", "ordinal", "label", "mode", "version", "updatedAt")
VALUES ('FORMATION', 1, 'Formation', 'formation', 1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "milestones" ("id", "definitionId", "bandId", "proof", "occurredAt", "definitionVersion", "updatedAt")
SELECT 'formation_' || md5(o."actorId"), 'FORMATION', o."actorId", 'VERIFIED', o."formedAt", 1, CURRENT_TIMESTAMP
FROM "organizations" o
WHERE o."formedAt" IS NOT NULL
ON CONFLICT ("bandId", "definitionId") DO NOTHING;
