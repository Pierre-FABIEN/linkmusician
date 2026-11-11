-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "VenueClaimStatus" AS ENUM ('AWAITING_PROOF', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "OrgKind" ADD VALUE 'VENUE';

-- CreateTable
CREATE TABLE "venue_claims" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "orgId" TEXT,
    "requestedById" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "proofUrl" TEXT,
    "status" "VenueClaimStatus" NOT NULL DEFAULT 'AWAITING_PROOF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reason" TEXT,

    CONSTRAINT "venue_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venue_claims_status_submittedAt_idx" ON "venue_claims"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "venue_claims_venueId_status_idx" ON "venue_claims"("venueId", "status");

-- CreateIndex
CREATE INDEX "venue_claims_requestedById_idx" ON "venue_claims"("requestedById");

-- AddForeignKey
ALTER TABLE "venue_claims" ADD CONSTRAINT "venue_claims_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_claims" ADD CONSTRAINT "venue_claims_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("actorId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_claims" ADD CONSTRAINT "venue_claims_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

