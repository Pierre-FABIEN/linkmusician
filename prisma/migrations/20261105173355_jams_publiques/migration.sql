-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "venueId" TEXT;

-- CreateTable
CREATE TABLE "jam_spots" (
    "opportunityId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "jam_spots_pkey" PRIMARY KEY ("opportunityId","instrumentId")
);

-- CreateTable
CREATE TABLE "jam_attendances" (
    "opportunityId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jam_attendances_pkey" PRIMARY KEY ("opportunityId","actorId")
);

-- CreateIndex
CREATE INDEX "jam_attendances_actorId_idx" ON "jam_attendances"("actorId");

-- CreateIndex
CREATE INDEX "opportunities_venueId_startsAt_idx" ON "opportunities"("venueId", "startsAt");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_spots" ADD CONSTRAINT "jam_spots_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_spots" ADD CONSTRAINT "jam_spots_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_attendances" ADD CONSTRAINT "jam_attendances_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_attendances" ADD CONSTRAINT "jam_attendances_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

