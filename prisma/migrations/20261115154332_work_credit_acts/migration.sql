-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "WorkCreditActKind" AS ENUM ('CREATOR_CREDITED', 'ASSIGNED', 'SELF_ASSIGNED', 'CONFIRMED', 'DECLINED', 'LEFT', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "work_credit_acts" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "authorId" TEXT,
    "kind" "WorkCreditActKind" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_credit_acts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_credit_acts_personId_occurredAt_idx" ON "work_credit_acts"("personId", "occurredAt");

-- CreateIndex
CREATE INDEX "work_credit_acts_authorId_idx" ON "work_credit_acts"("authorId");

-- CreateIndex
CREATE INDEX "work_credit_acts_workId_idx" ON "work_credit_acts"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "work_credit_acts_periodId_kind_key" ON "work_credit_acts"("periodId", "kind");

-- AddForeignKey
ALTER TABLE "work_credit_acts" ADD CONSTRAINT "work_credit_acts_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_credit_acts" ADD CONSTRAINT "work_credit_acts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_credit_acts" ADD CONSTRAINT "work_credit_acts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

