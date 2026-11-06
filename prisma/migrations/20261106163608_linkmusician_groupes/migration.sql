-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "OrgKind" AS ENUM ('BAND');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'REQUESTED', 'ACTIVE', 'LEFT', 'REMOVED', 'DECLINED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "NotificationType" ADD VALUE 'BAND_INVITE';
ALTER TYPE "NotificationType" ADD VALUE 'BAND_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'BAND_JOINED';

-- CreateTable
CREATE TABLE "organizations" (
    "actorId" TEXT NOT NULL,
    "kind" "OrgKind" NOT NULL,
    "formedAt" TIMESTAMP(3),
    "dissolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("actorId")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "title" TEXT,
    "status" "MembershipStatus" NOT NULL,
    "invitedById" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "memberships_orgId_status_idx" ON "memberships"("orgId", "status");

-- CreateIndex
CREATE INDEX "memberships_personId_status_idx" ON "memberships"("personId", "status");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_personId_fkey" FOREIGN KEY ("personId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- LINKMUSICIAN (P3-01) : au plus une adhésion ouverte (invitation, demande ou
-- en cours) par personne et par groupe. Index partiel, absent de
-- schema.prisma (Prisma 5 ne sait pas le décrire) : protégé par
-- scripts/migration-clean.mjs.
CREATE UNIQUE INDEX "memberships_open_key" ON "memberships"("orgId", "personId")
  WHERE "status" IN ('INVITED', 'REQUESTED', 'ACTIVE');
