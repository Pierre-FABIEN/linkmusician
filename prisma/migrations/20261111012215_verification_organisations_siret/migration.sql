-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterEnum
ALTER TYPE "OrgVerificationStatus" ADD VALUE 'REVOKED';

-- AlterTable
ALTER TABLE "organization_verifications" ADD COLUMN     "foundName" TEXT,
ADD COLUMN     "naf" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3);

