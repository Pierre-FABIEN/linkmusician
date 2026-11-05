-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SENT', 'SEEN', 'SHORTLISTED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "applicantActorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SENT',
    "conversationId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "applications_applicantActorId_createdAt_idx" ON "applications"("applicantActorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "applications_opportunityId_applicantActorId_key" ON "applications"("opportunityId", "applicantActorId");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicantActorId_fkey" FOREIGN KEY ("applicantActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

