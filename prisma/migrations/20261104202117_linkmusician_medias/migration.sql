-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('AUDIO', 'VIDEO', 'IMAGE', 'EXTERNAL_LINK');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MediaProvider" AS ENUM ('CLOUDINARY', 'YOUTUBE', 'SOUNDCLOUD', 'BANDCAMP');

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "status" "MediaStatus" NOT NULL,
    "provider" "MediaProvider" NOT NULL,
    "providerId" TEXT,
    "externalUrl" TEXT,
    "title" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "durationSec" INTEGER,
    "bytes" INTEGER,
    "instrumentId" TEXT,
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_actorId_status_idx" ON "media"("actorId", "status");

-- CreateIndex
CREATE INDEX "media_status_createdAt_idx" ON "media"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

