-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateTable
CREATE TABLE "actor_activity_days" (
    "actorId" TEXT NOT NULL,
    "day" DATE NOT NULL,

    CONSTRAINT "actor_activity_days_pkey" PRIMARY KEY ("actorId","day")
);

-- CreateIndex
CREATE INDEX "actor_activity_days_day_idx" ON "actor_activity_days"("day");

-- AddForeignKey
ALTER TABLE "actor_activity_days" ADD CONSTRAINT "actor_activity_days_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

