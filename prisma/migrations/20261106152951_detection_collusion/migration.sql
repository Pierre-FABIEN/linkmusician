-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "CollusionStatus" AS ENUM ('OPEN', 'DISMISSED', 'CONFIRMED');

-- CreateTable
CREATE TABLE "collusion_cases" (
    "id" TEXT NOT NULL,
    "memberIds" TEXT[],
    "memberKey" TEXT NOT NULL,
    "interactions" INTEGER NOT NULL,
    "density" DOUBLE PRECISION NOT NULL,
    "sharedIps" INTEGER NOT NULL,
    "status" "CollusionStatus" NOT NULL DEFAULT 'OPEN',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledByUserId" TEXT,
    "handledAt" TIMESTAMP(3),
    "decisionNote" TEXT,

    CONSTRAINT "collusion_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collusion_cases_memberKey_key" ON "collusion_cases"("memberKey");

-- CreateIndex
CREATE INDEX "collusion_cases_status_sharedIps_idx" ON "collusion_cases"("status", "sharedIps");

