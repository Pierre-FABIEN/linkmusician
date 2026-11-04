-- LINKMUSICIAN (P1-04) : référentiels instruments et genres.
-- Lignes générées par Prisma retirées à la main (voir CLAUDE.md) : suppression
-- des index `transactions_*` et recréation de `blog_posts_published_createdAt_idx`,
-- index du boilerplate créés en SQL brut et absents de `schema.prisma`.

-- CreateEnum
CREATE TYPE "InstrumentFamily" AS ENUM ('VOICE', 'PLUCKED_STRINGS', 'BOWED_STRINGS', 'KEYBOARDS', 'DRUMS_PERCUSSION', 'BRASS', 'WOODWINDS', 'ELECTRONIC', 'WORLD');

-- CreateTable
CREATE TABLE "instruments" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "family" "InstrumentFamily" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instruments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instruments_slug_key" ON "instruments"("slug");

-- CreateIndex
CREATE INDEX "instruments_family_sortOrder_idx" ON "instruments"("family", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE INDEX "genres_parentId_sortOrder_idx" ON "genres"("parentId", "sortOrder");

-- AddForeignKey
ALTER TABLE "genres" ADD CONSTRAINT "genres_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
