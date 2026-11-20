-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "ActivityShare" AS ENUM ('PRIVATE', 'SELECTED', 'PUBLIC');

-- CreateTable
CREATE TABLE "activity_visibility_preferences" (
    "actorId" TEXT NOT NULL,
    "past" "ActivityShare" NOT NULL DEFAULT 'PRIVATE',
    "future" "ActivityShare" NOT NULL DEFAULT 'PRIVATE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_visibility_preferences_pkey" PRIMARY KEY ("actorId")
);

-- CreateTable
CREATE TABLE "activity_visibility_grants" (
    "ownerId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_visibility_grants_pkey" PRIMARY KEY ("ownerId","viewerId")
);

-- CreateTable
CREATE TABLE "activity_visibility_exclusions" (
    "ownerId" TEXT NOT NULL,
    "excludedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_visibility_exclusions_pkey" PRIMARY KEY ("ownerId","excludedId")
);

-- CreateTable
CREATE TABLE "jam_discovery_sessions" (
    "opportunityId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jam_discovery_sessions_pkey" PRIMARY KEY ("opportunityId","actorId")
);

-- CreateIndex
CREATE INDEX "activity_visibility_grants_viewerId_idx" ON "activity_visibility_grants"("viewerId");

-- CreateIndex
CREATE INDEX "activity_visibility_exclusions_excludedId_idx" ON "activity_visibility_exclusions"("excludedId");

-- CreateIndex
CREATE INDEX "jam_discovery_sessions_opportunityId_expiresAt_idx" ON "jam_discovery_sessions"("opportunityId", "expiresAt");

-- CreateIndex
CREATE INDEX "jam_discovery_sessions_expiresAt_idx" ON "jam_discovery_sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "activity_visibility_preferences" ADD CONSTRAINT "activity_visibility_preferences_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_visibility_grants" ADD CONSTRAINT "activity_visibility_grants_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_visibility_grants" ADD CONSTRAINT "activity_visibility_grants_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_visibility_exclusions" ADD CONSTRAINT "activity_visibility_exclusions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_visibility_exclusions" ADD CONSTRAINT "activity_visibility_exclusions_excludedId_fkey" FOREIGN KEY ("excludedId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_discovery_sessions" ADD CONSTRAINT "jam_discovery_sessions_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jam_discovery_sessions" ADD CONSTRAINT "jam_discovery_sessions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

