-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "CollabQuality" AS ENUM ('RELIABLE', 'ON_TIME', 'PREPARED', 'GOOD_VIBE');

-- CreateTable
CREATE TABLE "collab_endorsements" (
    "id" TEXT NOT NULL,
    "collaborationId" TEXT NOT NULL,
    "fromActorId" TEXT NOT NULL,
    "toActorId" TEXT NOT NULL,
    "quality" "CollabQuality",
    "instrumentId" TEXT,
    "eventId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collab_endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collab_endorsements_toActorId_idx" ON "collab_endorsements"("toActorId");

-- CreateIndex
CREATE INDEX "collab_endorsements_fromActorId_idx" ON "collab_endorsements"("fromActorId");

-- CreateIndex
CREATE UNIQUE INDEX "collab_endorsements_collaborationId_fromActorId_toActorId_key" ON "collab_endorsements"("collaborationId", "fromActorId", "toActorId");

-- AddForeignKey
ALTER TABLE "collab_endorsements" ADD CONSTRAINT "collab_endorsements_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "collaborations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_endorsements" ADD CONSTRAINT "collab_endorsements_fromActorId_fkey" FOREIGN KEY ("fromActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_endorsements" ADD CONSTRAINT "collab_endorsements_toActorId_fkey" FOREIGN KEY ("toActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_endorsements" ADD CONSTRAINT "collab_endorsements_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

