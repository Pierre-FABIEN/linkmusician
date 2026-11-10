-- Profil d'ingé son et travaux en écoute (P4-02).
-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "SoundSpecialty" AS ENUM ('RECORDING', 'MIXING', 'MASTERING', 'LIVE_FOH', 'LIVE_MONITORS');

-- CreateEnum
CREATE TYPE "CraftMobility" AS ENUM ('OWN_PLACE', 'ON_SITE', 'REMOTE');

-- CreateTable
CREATE TABLE "sound_engineer_profiles" (
    "personId" TEXT NOT NULL,
    "specialties" "SoundSpecialty"[],
    "mobility" "CraftMobility"[],
    "gear" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sound_engineer_profiles_pkey" PRIMARY KEY ("personId")
);

-- CreateTable
CREATE TABLE "craft_references" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "track" "TrackKind" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "craft_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "craft_references_personId_track_position_idx" ON "craft_references"("personId", "track", "position");

-- AddForeignKey
ALTER TABLE "sound_engineer_profiles" ADD CONSTRAINT "sound_engineer_profiles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "craft_references" ADD CONSTRAINT "craft_references_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

