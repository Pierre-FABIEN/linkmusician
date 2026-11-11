-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "heldAt" TIMESTAMP(3),
ADD COLUMN     "seriesId" TEXT;

-- CreateTable
CREATE TABLE "jam_series" (
    "id" TEXT NOT NULL,
    "issuerActorId" TEXT NOT NULL,
    "postedById" TEXT,
    "venueId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "genreSlug" TEXT,
    "spots" JSONB NOT NULL DEFAULT '[]',
    "stoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jam_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jam_series_issuerActorId_stoppedAt_idx" ON "jam_series"("issuerActorId", "stoppedAt");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_seriesId_startsAt_key" ON "opportunities"("seriesId", "startsAt");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "jam_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_series" ADD CONSTRAINT "jam_series_issuerActorId_fkey" FOREIGN KEY ("issuerActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_series" ADD CONSTRAINT "jam_series_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_series" ADD CONSTRAINT "jam_series_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

