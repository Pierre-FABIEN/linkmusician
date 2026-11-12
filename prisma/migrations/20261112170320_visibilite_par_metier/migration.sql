-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "TrackVisibility" AS ENUM ('PUBLIC', 'MEMBERS', 'PRIVATE');

-- AlterTable
ALTER TABLE "person_tracks" ADD COLUMN     "conditionsVisibility" "TrackVisibility" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "detailsVisibility" "TrackVisibility" NOT NULL DEFAULT 'MEMBERS',
ADD COLUMN     "offersVisibility" "TrackVisibility" NOT NULL DEFAULT 'MEMBERS',
ADD COLUMN     "openToRequests" BOOLEAN;


-- LINKMUSICIAN (ONB-12b, Q64) : « Je recherche » du métier musicien·ne est déjà
-- public sur `/@handle` (copie `lookingFor`, D58). Les métiers musicien·ne
-- existants gardent cette exposition ; les nouveaux prennent le défaut.
UPDATE "person_tracks" SET "offersVisibility" = 'PUBLIC' WHERE "track" = 'MUSICIAN';
