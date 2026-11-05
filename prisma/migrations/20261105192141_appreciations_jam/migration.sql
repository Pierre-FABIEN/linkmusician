-- LINKMUSICIAN (P2-15, D27) : « J'y étais », retrait d'un faux présent et
-- appréciations après une jam (une par paire et par jam).
-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "JamQuality" AS ENUM ('GROOVE', 'LISTENING', 'IMPRO', 'RELIABLE');

-- AlterTable
ALTER TABLE "jam_attendances" ADD COLUMN     "attendedAt" TIMESTAMP(3),
ADD COLUMN     "removedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "jam_endorsements" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "fromActorId" TEXT NOT NULL,
    "toActorId" TEXT NOT NULL,
    "quality" "JamQuality",
    "instrumentId" TEXT,
    "eventId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jam_endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jam_endorsements_toActorId_idx" ON "jam_endorsements"("toActorId");

-- CreateIndex
CREATE INDEX "jam_endorsements_fromActorId_idx" ON "jam_endorsements"("fromActorId");

-- CreateIndex
CREATE UNIQUE INDEX "jam_endorsements_opportunityId_fromActorId_toActorId_key" ON "jam_endorsements"("opportunityId", "fromActorId", "toActorId");

-- AddForeignKey
ALTER TABLE "jam_endorsements" ADD CONSTRAINT "jam_endorsements_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_endorsements" ADD CONSTRAINT "jam_endorsements_fromActorId_fkey" FOREIGN KEY ("fromActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_endorsements" ADD CONSTRAINT "jam_endorsements_toActorId_fkey" FOREIGN KEY ("toActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_endorsements" ADD CONSTRAINT "jam_endorsements_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

