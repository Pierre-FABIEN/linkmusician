-- LINKMUSICIAN (P2-14c) : lead et formation d'une jam (invitations), matériel
-- sur place, instrument de « Je viens », validation des lieux (D26).
-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "BacklineItem" AS ENUM ('DRUMS', 'BASS_AMP', 'GUITAR_AMP', 'KEYBOARD', 'PA_MICS', 'CABLES');

-- CreateEnum
CREATE TYPE "JamInviteStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "jam_attendances" ADD COLUMN     "instrumentId" TEXT;

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "backline" "BacklineItem"[] DEFAULT ARRAY[]::"BacklineItem"[],
ADD COLUMN     "leadActorId" TEXT;

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "backline" "BacklineItem"[] DEFAULT ARRAY[]::"BacklineItem"[],
ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "validatedAt" TIMESTAMP(3);

-- Les lieux ajoutés avant la règle de validation restent visibles.
UPDATE "venues" SET "validatedAt" = "createdAt" WHERE "validatedAt" IS NULL;

-- CreateTable
CREATE TABLE "jam_invites" (
    "opportunityId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "status" "JamInviteStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "jam_invites_pkey" PRIMARY KEY ("opportunityId","actorId")
);

-- CreateIndex
CREATE INDEX "jam_invites_actorId_status_idx" ON "jam_invites"("actorId", "status");

-- CreateIndex
CREATE INDEX "venues_validatedAt_idx" ON "venues"("validatedAt");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_leadActorId_fkey" FOREIGN KEY ("leadActorId") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_attendances" ADD CONSTRAINT "jam_attendances_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_invites" ADD CONSTRAINT "jam_invites_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_invites" ADD CONSTRAINT "jam_invites_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_invites" ADD CONSTRAINT "jam_invites_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

