-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "VenueKind" AS ENUM ('BAR', 'CAFE_CONCERT', 'CONCERT_HALL', 'OPEN_STAGE', 'MJC', 'REHEARSAL_SPACE', 'STUDIO', 'MUSIC_STORE');

-- AlterEnum
ALTER TYPE "ReportTarget" ADD VALUE 'VENUE';

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "kind" "VenueKind" NOT NULL,
    "communeCode" TEXT NOT NULL,
    "communeName" TEXT NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdById" TEXT NOT NULL,
    "claimedByActorId" TEXT,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venues_departmentCode_idx" ON "venues"("departmentCode");

-- CreateIndex
CREATE INDEX "venues_createdById_idx" ON "venues"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "venues_communeCode_nameKey_key" ON "venues"("communeCode", "nameKey");

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_claimedByActorId_fkey" FOREIGN KEY ("claimedByActorId") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

