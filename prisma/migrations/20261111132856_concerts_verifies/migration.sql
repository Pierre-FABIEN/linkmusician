-- Concerts vérifiés (P5-06) : groupe, lieu ou organisation hôte et commune
-- d'une collaboration GIG.
-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterTable
ALTER TABLE "collaborations" ADD COLUMN     "bandId" TEXT,
ADD COLUMN     "communeCode" TEXT,
ADD COLUMN     "hostOrgId" TEXT;

-- CreateIndex
CREATE INDEX "collaborations_bandId_kind_status_idx" ON "collaborations"("bandId", "kind", "status");

-- CreateIndex
CREATE INDEX "collaborations_hostOrgId_idx" ON "collaborations"("hostOrgId");

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "organizations"("actorId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_hostOrgId_fkey" FOREIGN KEY ("hostOrgId") REFERENCES "organizations"("actorId") ON DELETE SET NULL ON UPDATE CASCADE;

