-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "WorkRoleActKind" AS ENUM ('ADDED');

-- CreateTable
CREATE TABLE "work_role_acts" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "kind" "WorkRoleActKind" NOT NULL,
    "roleKind" "WorkRoleKind" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_role_acts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_role_acts_personId_occurredAt_idx" ON "work_role_acts"("personId", "occurredAt");

-- CreateIndex
CREATE INDEX "work_role_acts_workId_idx" ON "work_role_acts"("workId");

-- AddForeignKey
ALTER TABLE "work_role_acts" ADD CONSTRAINT "work_role_acts_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_role_acts" ADD CONSTRAINT "work_role_acts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

