-- Fiche d'un lieu revendiqué (P5-03b) : venue_profiles (jauge, scène, conditions,
-- jours, accueil des mineur·es, publication), notification VENUE_CLAIM (Q29).
-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "VenueCondition" AS ENUM ('FEE', 'HAT', 'EXPENSES');

-- CreateEnum
CREATE TYPE "VenueAgeRule" AS ENUM ('ALL_AGES', 'DAYTIME_MINORS', 'ADULTS');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'VENUE_CLAIM';

-- CreateTable
CREATE TABLE "venue_profiles" (
    "orgId" TEXT NOT NULL,
    "capacity" INTEGER,
    "stage" TEXT NOT NULL DEFAULT '',
    "conditions" "VenueCondition"[],
    "days" INTEGER[],
    "ageRule" "VenueAgeRule" NOT NULL DEFAULT 'ALL_AGES',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_profiles_pkey" PRIMARY KEY ("orgId")
);

-- AddForeignKey
ALTER TABLE "venue_profiles" ADD CONSTRAINT "venue_profiles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

