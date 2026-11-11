-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'INTRODUCTION';

-- CreateTable
CREATE TABLE "introductions" (
    "id" TEXT NOT NULL,
    "introducerId" TEXT NOT NULL,
    "firstId" TEXT NOT NULL,
    "secondId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "succeededAt" TIMESTAMP(3),
    "collaborationId" TEXT,

    CONSTRAINT "introductions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "introductions_firstId_secondId_idx" ON "introductions"("firstId", "secondId");

-- CreateIndex
CREATE INDEX "introductions_introducerId_createdAt_idx" ON "introductions"("introducerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "introductions_introducerId_firstId_secondId_key" ON "introductions"("introducerId", "firstId", "secondId");

-- AddForeignKey
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_introducerId_fkey" FOREIGN KEY ("introducerId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_firstId_fkey" FOREIGN KEY ("firstId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_secondId_fkey" FOREIGN KEY ("secondId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

