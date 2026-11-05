-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "OpportunityKind" AS ENUM ('JAM', 'RECRUIT_MEMBER', 'SESSION_WORK');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'FILLED', 'CLOSED', 'EXPIRED', 'REMOVED');

-- AlterEnum
ALTER TYPE "ReportTarget" ADD VALUE 'OPPORTUNITY';

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "issuerActorId" TEXT NOT NULL,
    "kind" "OpportunityKind" NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instrumentId" TEXT,
    "minLevel" INTEGER,
    "genreSlug" TEXT,
    "minTier" TEXT,
    "radiusKm" INTEGER NOT NULL DEFAULT 25,
    "slots" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opportunities_status_expiresAt_idx" ON "opportunities"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "opportunities_issuerActorId_status_idx" ON "opportunities"("issuerActorId", "status");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_issuerActorId_fkey" FOREIGN KEY ("issuerActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

