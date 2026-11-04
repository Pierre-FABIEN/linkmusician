-- LINKMUSICIAN (P1-07) : outbox, registre XP (ajout seul), projection, succès.
-- Lignes d'index du boilerplate générées par Prisma retirées à la main (voir CLAUDE.md).

-- CreateTable
CREATE TABLE "domain_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "actorIds" TEXT[],
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_transactions" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "multiplier" DECIMAL(4,3) NOT NULL,
    "reason" TEXT NOT NULL,
    "reversesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actor_progress" (
    "actorId" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "tier" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actor_progress_pkey" PRIMARY KEY ("actorId","track")
);

-- CreateTable
CREATE TABLE "actor_achievements" (
    "actorId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actor_achievements_pkey" PRIMARY KEY ("actorId","achievementId")
);

-- CreateIndex
CREATE INDEX "domain_events_processedAt_idx" ON "domain_events"("processedAt");

-- CreateIndex
CREATE INDEX "domain_events_type_occurredAt_idx" ON "domain_events"("type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "xp_transactions_reversesId_key" ON "xp_transactions"("reversesId");

-- CreateIndex
CREATE INDEX "xp_transactions_actorId_createdAt_idx" ON "xp_transactions"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "xp_transactions_actorId_ruleId_createdAt_idx" ON "xp_transactions"("actorId", "ruleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "xp_transactions_sourceEventId_ruleId_actorId_track_key" ON "xp_transactions"("sourceEventId", "ruleId", "actorId", "track");

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_sourceEventId_fkey" FOREIGN KEY ("sourceEventId") REFERENCES "domain_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "xp_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_progress" ADD CONSTRAINT "actor_progress_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_achievements" ADD CONSTRAINT "actor_achievements_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Registre en ajout seul : toute modification ou suppression d'une ligne est
-- refusée par la base, sauf la suppression en cascade d'un acteur (jeux de
-- test). Une correction est une transaction négative liée (`reversesId`).
CREATE OR REPLACE FUNCTION linkmusician_xp_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'xp_transactions est en ajout seul (UPDATE refusé)';
  END IF;
  IF pg_trigger_depth() > 1 THEN
    RETURN OLD; -- cascade depuis la suppression d'un acteur
  END IF;
  RAISE EXCEPTION 'xp_transactions est en ajout seul (DELETE refusé)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER xp_transactions_append_only
  BEFORE UPDATE OR DELETE ON "xp_transactions"
  FOR EACH ROW EXECUTE FUNCTION linkmusician_xp_append_only();
