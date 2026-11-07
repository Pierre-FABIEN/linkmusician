-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "AttesterRole" AS ENUM ('MEMBER', 'OUTSIDER');

-- CreateEnum
CREATE TYPE "AttestationStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'DECLINED');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('EVENT', 'LISTEN', 'RECORDING');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MILESTONE_ATTEST';

-- CreateTable
CREATE TABLE "milestone_attestations" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "attesterId" TEXT NOT NULL,
    "requestedById" TEXT,
    "role" "AttesterRole" NOT NULL,
    "status" "AttestationStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "milestone_attestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_evidence" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "url" TEXT NOT NULL,
    "addedById" TEXT,
    "status" "EvidenceStatus" NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "milestone_attestations_attesterId_status_idx" ON "milestone_attestations"("attesterId", "status");

-- CreateIndex
CREATE INDEX "milestone_attestations_requestedById_idx" ON "milestone_attestations"("requestedById");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_attestations_milestoneId_attesterId_key" ON "milestone_attestations"("milestoneId", "attesterId");

-- CreateIndex
CREATE INDEX "milestone_evidence_milestoneId_idx" ON "milestone_evidence"("milestoneId");

-- CreateIndex
CREATE INDEX "milestone_evidence_status_createdAt_idx" ON "milestone_evidence"("status", "createdAt");

-- CreateIndex
CREATE INDEX "milestone_evidence_addedById_idx" ON "milestone_evidence"("addedById");

-- AddForeignKey
ALTER TABLE "milestone_attestations" ADD CONSTRAINT "milestone_attestations_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_attestations" ADD CONSTRAINT "milestone_attestations_attesterId_fkey" FOREIGN KEY ("attesterId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_attestations" ADD CONSTRAINT "milestone_attestations_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_evidence" ADD CONSTRAINT "milestone_evidence_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_evidence" ADD CONSTRAINT "milestone_evidence_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

