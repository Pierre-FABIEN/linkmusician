-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateTable
CREATE TABLE "blocks" (
    "blockerActorId" TEXT NOT NULL,
    "blockedActorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("blockerActorId","blockedActorId")
);

-- CreateIndex
CREATE INDEX "blocks_blockedActorId_createdAt_idx" ON "blocks"("blockedActorId", "createdAt");

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockerActorId_fkey" FOREIGN KEY ("blockerActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockedActorId_fkey" FOREIGN KEY ("blockedActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

