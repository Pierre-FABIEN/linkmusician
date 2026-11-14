-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "MembershipDecisionKind" ADD VALUE 'JOIN_REQUESTED';
ALTER TYPE "MembershipDecisionKind" ADD VALUE 'REQUEST_ACCEPTED';
ALTER TYPE "MembershipDecisionKind" ADD VALUE 'REQUEST_DECLINED';
ALTER TYPE "MembershipDecisionKind" ADD VALUE 'REQUEST_WITHDRAWN';
ALTER TYPE "MembershipDecisionKind" ADD VALUE 'REQUEST_CLOSED';
ALTER TYPE "MembershipDecisionKind" ADD VALUE 'RECRUITMENT_ACCEPTED';

