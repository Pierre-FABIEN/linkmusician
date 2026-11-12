-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "OpportunityAudience" AS ENUM ('PUBLIC', 'SCHOOL');

-- CreateEnum
CREATE TYPE "SchoolKind" AS ENUM ('MUSIC_SCHOOL', 'MJC', 'CONSERVATORY', 'ASSOCIATION');

-- AlterEnum
ALTER TYPE "OrgKind" ADD VALUE 'SCHOOL';

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "audience" "OpportunityAudience" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "school_profiles" (
    "orgId" TEXT NOT NULL,
    "kind" "SchoolKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_profiles_pkey" PRIMARY KEY ("orgId")
);

-- CreateTable
CREATE TABLE "school_invites" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_invites_tokenHash_key" ON "school_invites"("tokenHash");

-- CreateIndex
CREATE INDEX "school_invites_orgId_idx" ON "school_invites"("orgId");

-- AddForeignKey
ALTER TABLE "school_profiles" ADD CONSTRAINT "school_profiles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_invites" ADD CONSTRAINT "school_invites_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_invites" ADD CONSTRAINT "school_invites_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

