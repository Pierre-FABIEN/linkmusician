-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateTable
CREATE TABLE "suggestion_dismissals" (
    "ownerId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggestion_dismissals_pkey" PRIMARY KEY ("ownerId","actorId")
);

-- AddForeignKey
ALTER TABLE "suggestion_dismissals" ADD CONSTRAINT "suggestion_dismissals_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion_dismissals" ADD CONSTRAINT "suggestion_dismissals_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

