-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "ApplicationGrantActKind" AS ENUM ('REQUESTED', 'GRANTED', 'DECLINED', 'WITHDRAWN', 'REVOKED', 'USED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_GRANT';

-- CreateTable
CREATE TABLE "application_grants" (
    "id" TEXT NOT NULL,
    "representationId" TEXT NOT NULL,
    "kinds" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "requestedById" TEXT,
    "grantedAt" TIMESTAMP(3),
    "grantedById" TEXT,
    "endedAt" TIMESTAMP(3),
    "endedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_grant_acts" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "kind" "ApplicationGrantActKind" NOT NULL,
    "byId" TEXT,
    "applicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_grant_acts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_grants_representationId_endedAt_idx" ON "application_grants"("representationId", "endedAt");

-- CreateIndex
CREATE INDEX "application_grant_acts_grantId_createdAt_idx" ON "application_grant_acts"("grantId", "createdAt");

-- CreateIndex
CREATE INDEX "application_grant_acts_byId_idx" ON "application_grant_acts"("byId");

-- AddForeignKey
ALTER TABLE "application_grants" ADD CONSTRAINT "application_grants_representationId_fkey" FOREIGN KEY ("representationId") REFERENCES "representations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_grants" ADD CONSTRAINT "application_grants_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_grants" ADD CONSTRAINT "application_grants_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_grants" ADD CONSTRAINT "application_grants_endedById_fkey" FOREIGN KEY ("endedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_grant_acts" ADD CONSTRAINT "application_grant_acts_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "application_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_grant_acts" ADD CONSTRAINT "application_grant_acts_byId_fkey" FOREIGN KEY ("byId") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- DASH-07a (D71) : types couverts non vides, recrutement d'un groupe exclu.
ALTER TABLE "application_grants" ADD CONSTRAINT "application_grants_kinds_check" CHECK (
  cardinality("kinds") >= 1
  AND "kinds" <@ ARRAY['GIG_SLOT', 'JAM', 'SESSION_WORK']::TEXT[]
);
-- Ajout seul, aucune donnée existante modifiée. Retour arrière manuel :
-- DROP TABLE "application_grant_acts", "application_grants" ; DROP TYPE
-- "ApplicationGrantActKind" ; la valeur APPLICATION_GRANT de
-- "NotificationType" ne se retire qu'en reconstruisant l'enum après
-- suppression des notifications de ce type.
