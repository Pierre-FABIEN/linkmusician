-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "JamIncidentStatus" AS ENUM ('OPEN', 'DISMISSED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "JamIncidentReason" AS ENUM ('NO_JAM', 'VENUE_UNAWARE', 'VENUE_CLOSED', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "NotificationType" ADD VALUE 'JAM_REPORTED';
ALTER TYPE "NotificationType" ADD VALUE 'JAM_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'JAM_INCIDENT_CLOSED';

-- CreateTable
CREATE TABLE "jam_incidents" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "status" "JamIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "organizerResponse" TEXT,
    "organizerRespondedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jam_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jam_incident_reports" (
    "incidentId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "JamIncidentReason" NOT NULL,
    "wentThere" BOOLEAN NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jam_incident_reports_pkey" PRIMARY KEY ("incidentId","reporterId")
);

-- CreateTable
CREATE TABLE "jam_organizing_restrictions" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "incidentId" TEXT,
    "reason" TEXT NOT NULL,
    "until" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "liftedAt" TIMESTAMP(3),
    "liftedByUserId" TEXT,
    "liftNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jam_organizing_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jam_incidents_opportunityId_key" ON "jam_incidents"("opportunityId");

-- CreateIndex
CREATE INDEX "jam_incidents_status_createdAt_idx" ON "jam_incidents"("status", "createdAt");

-- CreateIndex
CREATE INDEX "jam_incident_reports_reporterId_idx" ON "jam_incident_reports"("reporterId");

-- CreateIndex
CREATE INDEX "jam_organizing_restrictions_actorId_liftedAt_idx" ON "jam_organizing_restrictions"("actorId", "liftedAt");

-- AddForeignKey
ALTER TABLE "jam_incidents" ADD CONSTRAINT "jam_incidents_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_incident_reports" ADD CONSTRAINT "jam_incident_reports_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "jam_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_incident_reports" ADD CONSTRAINT "jam_incident_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_organizing_restrictions" ADD CONSTRAINT "jam_organizing_restrictions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_organizing_restrictions" ADD CONSTRAINT "jam_organizing_restrictions_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "jam_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

