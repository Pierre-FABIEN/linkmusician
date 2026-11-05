-- LINKMUSICIAN (P2-16) : réseau musical (« Garder le contact »).
-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateTable
CREATE TABLE "musical_ties" (
    "ownerId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "musical_ties_pkey" PRIMARY KEY ("ownerId","contactId")
);

-- CreateIndex
CREATE INDEX "musical_ties_contactId_idx" ON "musical_ties"("contactId");

-- AddForeignKey
ALTER TABLE "musical_ties" ADD CONSTRAINT "musical_ties_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "musical_ties" ADD CONSTRAINT "musical_ties_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

