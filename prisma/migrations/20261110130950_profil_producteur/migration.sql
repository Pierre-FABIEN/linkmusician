-- Profil de producteur·rice et styles produits (P4-04).
-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "ProducerSpecialty" AS ENUM ('PRODUCTION', 'ARRANGEMENT', 'BEATMAKING');

-- CreateTable
CREATE TABLE "producer_profiles" (
    "personId" TEXT NOT NULL,
    "specialties" "ProducerSpecialty"[],
    "mobility" "CraftMobility"[],
    "software" TEXT NOT NULL DEFAULT '',
    "rate" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producer_profiles_pkey" PRIMARY KEY ("personId")
);

-- CreateTable
CREATE TABLE "producer_genres" (
    "personId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "producer_genres_pkey" PRIMARY KEY ("personId","genreId")
);

-- CreateIndex
CREATE INDEX "producer_genres_genreId_idx" ON "producer_genres"("genreId");

-- AddForeignKey
ALTER TABLE "producer_profiles" ADD CONSTRAINT "producer_profiles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producer_genres" ADD CONSTRAINT "producer_genres_personId_fkey" FOREIGN KEY ("personId") REFERENCES "producer_profiles"("personId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producer_genres" ADD CONSTRAINT "producer_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

