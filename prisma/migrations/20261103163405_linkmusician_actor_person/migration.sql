-- LINKMUSICIAN: Actor, Person, PersonTrack et rôle MODERATOR.
-- Prisma proposait aussi de supprimer 3 index `transactions_*` et de recréer
-- `blog_posts_published_createdAt_idx` (sans son DESC) : ce sont des index du
-- boilerplate créés en SQL brut et absents de schema.prisma. Ces lignes ont été
-- retirées à la main. Ne jamais les laisser passer dans une migration
-- LinkMusician (vérifier chaque migration générée).

-- CreateEnum
CREATE TYPE "ActorKind" AS ENUM ('PERSON', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "TrackKind" AS ENUM ('MUSICIAN', 'PRODUCER', 'SOUND_ENGINEER', 'MANAGER', 'BOOKER', 'PROMOTER', 'LABEL_PRO', 'PUBLISHER', 'MUSIC_COMMS');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MODERATOR';

-- CreateTable
CREATE TABLE "actors" (
    "id" TEXT NOT NULL,
    "kind" "ActorKind" NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "actors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "actorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "birthDate" DATE,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("actorId")
);

-- CreateTable
CREATE TABLE "person_tracks" (
    "personId" TEXT NOT NULL,
    "track" "TrackKind" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_tracks_pkey" PRIMARY KEY ("personId","track")
);

-- CreateIndex
CREATE UNIQUE INDEX "actors_handle_key" ON "actors"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "persons_userId_key" ON "persons"("userId");

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_tracks" ADD CONSTRAINT "person_tracks_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;
