-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "CollaborationAppreciationKind" AS ENUM ('GIVEN', 'REVOKED');

-- CreateTable
CREATE TABLE "collaboration_appreciation_acts" (
    "id" TEXT NOT NULL,
    "collaborationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "CollaborationAppreciationKind" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaboration_appreciation_acts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collaboration_appreciation_acts_collaborationId_occurredAt_idx" ON "collaboration_appreciation_acts"("collaborationId", "occurredAt");

-- CreateIndex
CREATE INDEX "collaboration_appreciation_acts_authorId_idx" ON "collaboration_appreciation_acts"("authorId");

-- AddForeignKey
ALTER TABLE "collaboration_appreciation_acts" ADD CONSTRAINT "collaboration_appreciation_acts_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "collaborations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_appreciation_acts" ADD CONSTRAINT "collaboration_appreciation_acts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

