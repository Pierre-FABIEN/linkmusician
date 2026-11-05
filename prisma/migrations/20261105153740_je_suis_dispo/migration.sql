-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "AvailabilitySlot" AS ENUM ('TONIGHT', 'TOMORROW', 'WEEKEND');

-- CreateTable
CREATE TABLE "availabilities" (
    "actorId" TEXT NOT NULL,
    "slot" "AvailabilitySlot" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availabilities_pkey" PRIMARY KEY ("actorId")
);

-- CreateIndex
CREATE INDEX "availabilities_endsAt_idx" ON "availabilities"("endsAt");

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

