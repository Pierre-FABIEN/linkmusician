-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "ReportTarget" AS ENUM ('ACTOR', 'MEDIA');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE', 'HARASSMENT', 'IMPERSONATION', 'NOT_MINE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "SanctionKind" AS ENUM ('WARNING', 'SUSPENSION');

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporterActorId" TEXT NOT NULL,
    "targetType" "ReportTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetActorId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "handledByUserId" TEXT,
    "handledAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sanctions" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "kind" "SanctionKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "until" TIMESTAMP(3),
    "reportId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "liftedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sanctions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_status_createdAt_idx" ON "reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "reports_targetActorId_status_idx" ON "reports"("targetActorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reporterActorId_targetType_targetId_key" ON "reports"("reporterActorId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "sanctions_actorId_kind_idx" ON "sanctions"("actorId", "kind");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterActorId_fkey" FOREIGN KEY ("reporterActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_targetActorId_fkey" FOREIGN KEY ("targetActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

