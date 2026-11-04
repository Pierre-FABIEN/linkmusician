-- LINKMUSICIAN (P1-09) : palier de confiance des acteurs.
-- Lignes d'index du boilerplate générées par Prisma retirées à la main (voir CLAUDE.md).

-- AlterTable
ALTER TABLE "actors" ADD COLUMN     "trustComputedAt" TIMESTAMP(3),
ADD COLUMN     "trustLevel" INTEGER NOT NULL DEFAULT 0;

