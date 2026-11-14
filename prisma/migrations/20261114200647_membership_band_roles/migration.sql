-- DASH-05h : remplacement atomique ; aucune reprise des actes existants.
BEGIN;

-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "MembershipDecisionKind" ADD VALUE 'BAND_ADMIN_GRANTED';
ALTER TYPE "MembershipDecisionKind" ADD VALUE 'BAND_MEMBER_SET';
ALTER TYPE "MembershipDecisionKind" ADD VALUE 'BAND_OWNERSHIP_GIVEN';
ALTER TYPE "MembershipDecisionKind" ADD VALUE 'BAND_OWNERSHIP_RECEIVED';

-- DropIndex
DROP INDEX "membership_decisions_membershipId_kind_key";

-- CreateIndex
CREATE INDEX "membership_decisions_membershipId_occurredAt_idx" ON "membership_decisions"("membershipId", "occurredAt");

-- Les douze actes déjà livrés restent uniques par période/type.
-- Les quatre nouveaux actes BAND_* sont répétables sous verrou métier band:.

COMMIT;
