-- Animateur·rices affilié·es aux lieux et lead par défaut des scènes ouvertes (P5-04b).

-- CreateEnum
CREATE TYPE "VenueHostStatus" AS ENUM ('INVITED', 'ACTIVE');

-- AlterTable
ALTER TABLE "jam_series" ADD COLUMN     "leadId" TEXT;

-- CreateTable
CREATE TABLE "venue_hosts" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" "VenueHostStatus" NOT NULL DEFAULT 'INVITED',
    "invitedById" TEXT,
    "since" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_hosts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venue_hosts_personId_status_idx" ON "venue_hosts"("personId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "venue_hosts_orgId_personId_key" ON "venue_hosts"("orgId", "personId");

-- AddForeignKey
ALTER TABLE "jam_series" ADD CONSTRAINT "jam_series_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_hosts" ADD CONSTRAINT "venue_hosts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_hosts" ADD CONSTRAINT "venue_hosts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_hosts" ADD CONSTRAINT "venue_hosts_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
