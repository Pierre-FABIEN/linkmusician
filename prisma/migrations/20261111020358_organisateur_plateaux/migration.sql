-- Organisateur·rice et plateaux (P5-05a) : profil, genres programmés, annonce GIG_SLOT
-- avec rang de groupe minimal, candidature envoyée au nom d'un groupe (sentById).
-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "PromoterEventKind" AS ENUM ('CONCERTS', 'CLUB_NIGHTS', 'FESTIVAL', 'TOURS', 'OPEN_STAGES');

-- AlterEnum
ALTER TYPE "OpportunityKind" ADD VALUE 'GIG_SLOT';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "sentById" TEXT;

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "minBandTier" TEXT;

-- CreateTable
CREATE TABLE "promoter_profiles" (
    "personId" TEXT NOT NULL,
    "eventKinds" "PromoterEventKind"[],
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promoter_profiles_pkey" PRIMARY KEY ("personId")
);

-- CreateTable
CREATE TABLE "promoter_genres" (
    "personId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "promoter_genres_pkey" PRIMARY KEY ("personId","genreId")
);

-- CreateIndex
CREATE INDEX "promoter_genres_genreId_idx" ON "promoter_genres"("genreId");

-- CreateIndex
CREATE INDEX "applications_sentById_idx" ON "applications"("sentById");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promoter_profiles" ADD CONSTRAINT "promoter_profiles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promoter_genres" ADD CONSTRAINT "promoter_genres_personId_fkey" FOREIGN KEY ("personId") REFERENCES "promoter_profiles"("personId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promoter_genres" ADD CONSTRAINT "promoter_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

