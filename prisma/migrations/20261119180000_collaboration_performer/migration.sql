-- P8 (D77) : interprète d'un concert, groupe ou personne. Migration additive,
-- écrite à la main (aucune base joignable pendant la session) : à relire avec
-- `npm run db:status`, puis `npm run db:deploy` et `npm run db:deploy:e2e`.
-- Aucun index du boilerplate ni index partiel LinkMusician n'est touché.

-- AlterTable
ALTER TABLE "collaborations" ADD COLUMN "performerId" TEXT;

-- Recopie : chaque concert existant garde son groupe comme interprète.
-- Aucun crédit de groupe n'est transféré à une personne.
UPDATE "collaborations"
SET "performerId" = "bandId"
WHERE "kind" = 'GIG' AND "bandId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "collaborations_performerId_kind_status_idx" ON "collaborations"("performerId", "kind", "status");

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
