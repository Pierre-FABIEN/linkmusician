-- LINKMUSICIAN (P2-14d, D30) : SIRET vérifié d'un lieu, table de référence des
-- établissements (Toulouse Métropole), sans nom de personne ni adresse.
-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "siret" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "establishments" (
    "siret" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "naf" TEXT NOT NULL,
    "communeCode" TEXT NOT NULL,
    "communeName" TEXT NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishments_pkey" PRIMARY KEY ("siret")
);

-- CreateIndex
CREATE INDEX "establishments_communeCode_nameKey_idx" ON "establishments"("communeCode", "nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "venues_siret_key" ON "venues"("siret");

