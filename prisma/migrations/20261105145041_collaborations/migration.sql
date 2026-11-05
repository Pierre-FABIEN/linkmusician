-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "CollabKind" AS ENUM ('JAM', 'REHEARSAL', 'SESSION_WORK', 'RECORDING', 'PRODUCTION', 'GIG');

-- CreateEnum
CREATE TYPE "CollabStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "collaborations" (
    "id" TEXT NOT NULL,
    "kind" "CollabKind" NOT NULL,
    "status" "CollabStatus" NOT NULL DEFAULT 'PROPOSED',
    "title" TEXT NOT NULL,
    "happenedOn" DATE NOT NULL,
    "proposedById" TEXT NOT NULL,
    "opportunityId" TEXT,
    "conversationId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaborations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaboration_participants" (
    "collaborationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "confirmedCompletionAt" TIMESTAMP(3),

    CONSTRAINT "collaboration_participants_pkey" PRIMARY KEY ("collaborationId","actorId")
);

-- CreateIndex
CREATE INDEX "collaborations_conversationId_idx" ON "collaborations"("conversationId");

-- CreateIndex
CREATE INDEX "collaboration_participants_actorId_idx" ON "collaboration_participants"("actorId");

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_participants" ADD CONSTRAINT "collaboration_participants_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "collaborations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_participants" ADD CONSTRAINT "collaboration_participants_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

