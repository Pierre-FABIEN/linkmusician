-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "WorkState" AS ENUM ('IDEA', 'COMPOSED');

-- CreateEnum
CREATE TYPE "WorkProof" AS ENUM ('DECLARED', 'CORROBORATED');

-- CreateEnum
CREATE TYPE "WorkRoleKind" AS ENUM ('INSTRUMENT', 'COMPOSITION', 'LYRICS', 'ARRANGEMENT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'WORK_CREDIT';

-- CreateTable
CREATE TABLE "works" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "state" "WorkState" NOT NULL DEFAULT 'IDEA',
    "proof" "WorkProof",
    "demoMediaId" TEXT,
    "composedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_genres" (
    "workId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "work_genres_pkey" PRIMARY KEY ("workId","genreId")
);

-- CreateTable
CREATE TABLE "work_contributors" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "invitedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_contributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_roles" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "kind" "WorkRoleKind" NOT NULL,
    "instrumentId" TEXT,
    "contributorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "works_ownerId_state_idx" ON "works"("ownerId", "state");

-- CreateIndex
CREATE INDEX "work_genres_genreId_idx" ON "work_genres"("genreId");

-- CreateIndex
CREATE INDEX "work_contributors_personId_idx" ON "work_contributors"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "work_contributors_workId_personId_key" ON "work_contributors"("workId", "personId");

-- CreateIndex
CREATE INDEX "work_roles_workId_idx" ON "work_roles"("workId");

-- CreateIndex
CREATE INDEX "work_roles_contributorId_idx" ON "work_roles"("contributorId");

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_demoMediaId_fkey" FOREIGN KEY ("demoMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_genres" ADD CONSTRAINT "work_genres_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_genres" ADD CONSTRAINT "work_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_contributors" ADD CONSTRAINT "work_contributors_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_contributors" ADD CONSTRAINT "work_contributors_personId_fkey" FOREIGN KEY ("personId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_contributors" ADD CONSTRAINT "work_contributors_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_roles" ADD CONSTRAINT "work_roles_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_roles" ADD CONSTRAINT "work_roles_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_roles" ADD CONSTRAINT "work_roles_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "work_contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

