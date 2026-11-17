-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "OpportunityPay" AS ENUM ('PAID', 'EXPENSES', 'HAT', 'VOLUNTEER', 'EXCHANGE', 'TO_DISCUSS');

-- CreateEnum
CREATE TYPE "OpportunityCommitment" AS ENUM ('ONE_OFF', 'REGULAR');

-- CreateEnum
CREATE TYPE "OpportunityPresence" AS ENUM ('ON_SITE', 'REMOTE');

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "commitment" "OpportunityCommitment",
ADD COLUMN     "formation" "BandFormation",
ADD COLUMN     "pay" "OpportunityPay",
ADD COLUMN     "payMaxEuros" INTEGER,
ADD COLUMN     "payMinEuros" INTEGER,
ADD COLUMN     "presence" "OpportunityPresence",
ADD COLUMN     "repertoire" "BandRepertoire";


-- ONB-13b : fourchette positive et ordonnée (garde-fou du service).
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_pay_range_check" CHECK (
  ("payMinEuros" IS NULL OR "payMinEuros" >= 0)
  AND ("payMaxEuros" IS NULL OR "payMaxEuros" >= 0)
  AND ("payMinEuros" IS NULL OR "payMaxEuros" IS NULL OR "payMinEuros" <= "payMaxEuros")
);
-- Ajout seul, aucune donnée existante modifiée. Retour arrière manuel :
-- ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_pay_range_check", puis
-- DROP COLUMN des sept colonnes, puis DROP TYPE des trois enums.
