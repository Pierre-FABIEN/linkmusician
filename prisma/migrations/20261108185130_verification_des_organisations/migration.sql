-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "OrgVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "organization_verifications" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "requestedById" TEXT,
    "siret" TEXT NOT NULL,
    "officialUrl" TEXT NOT NULL,
    "status" "OrgVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reason" TEXT,

    CONSTRAINT "organization_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_verifications_status_createdAt_idx" ON "organization_verifications"("status", "createdAt");

-- CreateIndex
CREATE INDEX "organization_verifications_orgId_createdAt_idx" ON "organization_verifications"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "organization_verifications_siret_idx" ON "organization_verifications"("siret");

-- AddForeignKey
ALTER TABLE "organization_verifications" ADD CONSTRAINT "organization_verifications_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_verifications" ADD CONSTRAINT "organization_verifications_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

