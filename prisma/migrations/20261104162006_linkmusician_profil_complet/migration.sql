-- LINKMUSICIAN (P1-06b) : profil complet (bio, statut pro, recherche, matériel,
-- pratique, mobilité, liens). Lignes d'index du boilerplate générées par Prisma
-- retirées à la main (voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "ProStatus" AS ENUM ('AMATEUR', 'SEMI_PRO', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "LookingFor" AS ENUM ('BAND', 'REPLACEMENTS', 'JAMS', 'STUDIO_SESSIONS', 'LESSONS_GIVE', 'LESSONS_TAKE', 'COLLABORATION');

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('PA_SYSTEM', 'REHEARSAL_SPACE', 'VEHICLE', 'HOME_STUDIO');

-- CreateEnum
CREATE TYPE "LinkKind" AS ENUM ('SPOTIFY', 'YOUTUBE', 'BANDCAMP', 'SOUNDCLOUD', 'INSTAGRAM', 'WEBSITE');

-- AlterTable
ALTER TABLE "actors" ADD COLUMN     "bio" TEXT;

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "equipment" "Equipment"[],
ADD COLUMN     "lookingFor" "LookingFor"[],
ADD COLUMN     "practiceSince" INTEGER,
ADD COLUMN     "proStatus" "ProStatus",
ADD COLUMN     "travelRadiusKm" INTEGER;

-- CreateTable
CREATE TABLE "profile_links" (
    "personId" TEXT NOT NULL,
    "kind" "LinkKind" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_links_pkey" PRIMARY KEY ("personId","kind")
);

-- AddForeignKey
ALTER TABLE "profile_links" ADD CONSTRAINT "profile_links_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;
