-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "BandFormation" AS ENUM ('SOLO', 'DUO', 'TRIO', 'BAND');

-- CreateEnum
CREATE TYPE "BandRepertoire" AS ENUM ('COVERS', 'ORIGINALS', 'BOTH');

-- CreateTable
CREATE TABLE "band_profiles" (
    "orgId" TEXT NOT NULL,
    "formation" "BandFormation",
    "repertoire" "BandRepertoire",
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "band_profiles_pkey" PRIMARY KEY ("orgId")
);

-- AddForeignKey
ALTER TABLE "band_profiles" ADD CONSTRAINT "band_profiles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;


-- ONB-12c1 (D64) : ajout seul, aucune donnée existante modifiée.
-- Retour arrière manuel : DROP TABLE "band_profiles" ; DROP TYPE "BandRepertoire" ; DROP TYPE "BandFormation".
