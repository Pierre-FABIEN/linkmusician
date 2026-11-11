-- Organisations d'organisateur·rices (P5-05b) : OrgKind PROMOTER, fiche
-- promoter_org_profiles, notification ORG_INVITE (invitation à la co-gestion).
-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ORG_INVITE';

-- AlterEnum
ALTER TYPE "OrgKind" ADD VALUE 'PROMOTER';

-- CreateTable
CREATE TABLE "promoter_org_profiles" (
    "orgId" TEXT NOT NULL,
    "eventKinds" "PromoterEventKind"[],
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promoter_org_profiles_pkey" PRIMARY KEY ("orgId")
);

-- AddForeignKey
ALTER TABLE "promoter_org_profiles" ADD CONSTRAINT "promoter_org_profiles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

