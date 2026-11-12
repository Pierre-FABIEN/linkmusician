-- ONB-01 (D56) : spécialités et intentions par métier.
-- Écrite à la main : seule l'addition de ces deux tables. La base de dev
-- porte 5 migrations absentes du dépôt (P5-04, P5-07, P5-11) ; un diff
-- généré proposait de supprimer leurs tables.

-- CreateEnum
CREATE TYPE "TrackIntentDirection" AS ENUM ('OFFER', 'NEED');

-- CreateTable
CREATE TABLE "person_track_specializations" (
    "personId" TEXT NOT NULL,
    "track" "TrackKind" NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_track_specializations_pkey" PRIMARY KEY ("personId","track","code")
);

-- CreateTable
CREATE TABLE "person_track_intents" (
    "personId" TEXT NOT NULL,
    "track" "TrackKind" NOT NULL,
    "direction" "TrackIntentDirection" NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_track_intents_pkey" PRIMARY KEY ("personId","track","direction","code")
);

-- AddForeignKey
ALTER TABLE "person_track_specializations" ADD CONSTRAINT "person_track_specializations_personId_track_fkey" FOREIGN KEY ("personId", "track") REFERENCES "person_tracks"("personId", "track") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_track_intents" ADD CONSTRAINT "person_track_intents_personId_track_fkey" FOREIGN KEY ("personId", "track") REFERENCES "person_tracks"("personId", "track") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recopie des spécialités des profils existants, seulement pour les
-- personnes qui ont encore le métier. Rejouable sans effet (ON CONFLICT).
INSERT INTO "person_track_specializations" ("personId", "track", "code")
SELECT p."personId", 'SOUND_ENGINEER', unnest(p."specialties")::text
FROM "sound_engineer_profiles" p
JOIN "person_tracks" t ON t."personId" = p."personId" AND t."track" = 'SOUND_ENGINEER'
ON CONFLICT DO NOTHING;

INSERT INTO "person_track_specializations" ("personId", "track", "code")
SELECT p."personId", 'PRODUCER', unnest(p."specialties")::text
FROM "producer_profiles" p
JOIN "person_tracks" t ON t."personId" = p."personId" AND t."track" = 'PRODUCER'
ON CONFLICT DO NOTHING;

INSERT INTO "person_track_specializations" ("personId", "track", "code")
SELECT p."personId", 'PROMOTER', unnest(p."eventKinds")::text
FROM "promoter_profiles" p
JOIN "person_tracks" t ON t."personId" = p."personId" AND t."track" = 'PROMOTER'
ON CONFLICT DO NOTHING;
