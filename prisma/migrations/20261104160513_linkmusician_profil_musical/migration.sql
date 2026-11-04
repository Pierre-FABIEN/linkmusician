-- LINKMUSICIAN (P1-06) : profil musical (instruments joués, genres, influences).
-- Lignes générées par Prisma retirées à la main (voir CLAUDE.md) : suppression
-- des index `transactions_*` et recréation de `blog_posts_published_createdAt_idx`.

-- CreateTable
CREATE TABLE "person_instruments" (
    "personId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "declaredLevel" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_instruments_pkey" PRIMARY KEY ("personId","instrumentId")
);

-- CreateTable
CREATE TABLE "actor_genres" (
    "actorId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actor_genres_pkey" PRIMARY KEY ("actorId","genreId")
);

-- CreateTable
CREATE TABLE "influences" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "influences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "person_instruments_instrumentId_idx" ON "person_instruments"("instrumentId");

-- CreateIndex
CREATE INDEX "actor_genres_genreId_idx" ON "actor_genres"("genreId");

-- CreateIndex
CREATE INDEX "influences_actorId_sortOrder_idx" ON "influences"("actorId", "sortOrder");

-- AddForeignKey
ALTER TABLE "person_instruments" ADD CONSTRAINT "person_instruments_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_instruments" ADD CONSTRAINT "person_instruments_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_genres" ADD CONSTRAINT "actor_genres_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_genres" ADD CONSTRAINT "actor_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influences" ADD CONSTRAINT "influences_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
