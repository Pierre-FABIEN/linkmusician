-- Annonces par métier et liées à un morceau (P4-05).
-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "targetSpecialty" TEXT,
ADD COLUMN     "targetTrack" "TrackKind",
ADD COLUMN     "workId" TEXT;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE SET NULL ON UPDATE CASCADE;

