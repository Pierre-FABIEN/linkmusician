-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "StudioService" AS ENUM ('REHEARSAL', 'RECORDING', 'MIXING', 'MASTERING');

-- AlterEnum
ALTER TYPE "OrgKind" ADD VALUE 'STUDIO';

-- CreateTable
CREATE TABLE "studio_profiles" (
    "orgId" TEXT NOT NULL,
    "services" "StudioService"[],
    "gear" TEXT NOT NULL DEFAULT '',
    "pricingNotes" TEXT NOT NULL DEFAULT '',
    "byAppointment" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_profiles_pkey" PRIMARY KEY ("orgId")
);

-- CreateTable
CREATE TABLE "studio_rooms" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "hourlyRate" INTEGER,
    "position" INTEGER NOT NULL,

    CONSTRAINT "studio_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_hours" (
    "studioId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "opensAt" INTEGER NOT NULL,
    "closesAt" INTEGER NOT NULL,

    CONSTRAINT "studio_hours_pkey" PRIMARY KEY ("studioId","weekday")
);

-- CreateIndex
CREATE INDEX "studio_rooms_studioId_position_idx" ON "studio_rooms"("studioId", "position");

-- AddForeignKey
ALTER TABLE "studio_profiles" ADD CONSTRAINT "studio_profiles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_rooms" ADD CONSTRAINT "studio_rooms_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studio_profiles"("orgId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_hours" ADD CONSTRAINT "studio_hours_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studio_profiles"("orgId") ON DELETE CASCADE ON UPDATE CASCADE;

