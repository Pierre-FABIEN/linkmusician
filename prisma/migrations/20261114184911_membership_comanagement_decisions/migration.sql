-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "MembershipDecisionKind" AS ENUM ('ACCEPTED', 'DECLINED', 'WITHDRAWN', 'LEFT', 'REMOVED', 'RESPONSIBILITY_RECEIVED');

-- CreateTable
CREATE TABLE "membership_decisions" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "kind" "MembershipDecisionKind" NOT NULL,
    "authorId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membership_decisions_authorId_idx" ON "membership_decisions"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_decisions_membershipId_kind_key" ON "membership_decisions"("membershipId", "kind");

-- AddForeignKey
ALTER TABLE "membership_decisions" ADD CONSTRAINT "membership_decisions_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_decisions" ADD CONSTRAINT "membership_decisions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

