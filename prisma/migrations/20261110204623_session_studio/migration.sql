-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterTable
ALTER TABLE "collaborations" ADD COLUMN     "studioId" TEXT;

-- CreateIndex
CREATE INDEX "collaborations_studioId_idx" ON "collaborations"("studioId");

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "organizations"("actorId") ON DELETE SET NULL ON UPDATE CASCADE;

