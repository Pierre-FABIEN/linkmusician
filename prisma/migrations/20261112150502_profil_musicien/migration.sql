-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "PracticeExperience" AS ENUM ('SOLO', 'WITH_OTHERS', 'STAGE');

-- CreateEnum
CREATE TYPE "MusicCommitment" AS ENUM ('OCCASIONAL', 'REGULAR', 'PROFESSIONAL_PROJECT');

-- CreateTable
CREATE TABLE "person_track_attributes" (
    "personId" TEXT NOT NULL,
    "track" "TrackKind" NOT NULL,
    "field" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_track_attributes_pkey" PRIMARY KEY ("personId","track","field","code")
);

-- CreateTable
CREATE TABLE "musician_profiles" (
    "personId" TEXT NOT NULL,
    "practiceExperience" "PracticeExperience",
    "commitment" "MusicCommitment",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "musician_profiles_pkey" PRIMARY KEY ("personId")
);

-- AddForeignKey
ALTER TABLE "person_track_attributes" ADD CONSTRAINT "person_track_attributes_personId_track_fkey" FOREIGN KEY ("personId", "track") REFERENCES "person_tracks"("personId", "track") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "musician_profiles" ADD CONSTRAINT "musician_profiles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;


-- Recopie de `persons.lookingFor` vers « Je propose » / « Je recherche » du
-- métier musicien·ne (correspondance `LOOKING_FOR_INTENTS`,
-- src/lib/musician/profile.ts), seulement pour qui a ce métier. Rejouable
-- sans effet (ON CONFLICT).
INSERT INTO "person_track_intents" ("personId", "track", "direction", "code")
SELECT p."actorId", 'MUSICIAN', m.direction::"TrackIntentDirection", m.code
FROM "persons" p
JOIN "person_tracks" t ON t."personId" = p."actorId" AND t."track" = 'MUSICIAN'
CROSS JOIN (VALUES
    ('BAND', 'NEED', 'FIND_BAND'),
    ('REPLACEMENTS', 'OFFER', 'DO_REPLACEMENTS'),
    ('JAMS', 'NEED', 'FIND_JAMS'),
    ('STUDIO_SESSIONS', 'NEED', 'FIND_STUDIO'),
    ('LESSONS_GIVE', 'OFFER', 'GIVE_LESSONS'),
    ('LESSONS_TAKE', 'NEED', 'TAKE_LESSONS'),
    ('COLLABORATION', 'NEED', 'CO_WRITING')
) AS m(looking_for, direction, code)
WHERE m.looking_for = ANY(p."lookingFor"::text[])
ON CONFLICT DO NOTHING;
