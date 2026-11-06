-- Réputation (P2-08). Écrite à la main (base injoignable au moment du lot),
-- au format de `prisma migrate diff` ; vérifier avec `npm run db:status`.

-- CreateTable
CREATE TABLE "reputation_snapshots" (
    "actorId" TEXT NOT NULL,
    "confirmedCollabs" INTEGER NOT NULL,
    "distinctCounterparts" INTEGER NOT NULL,
    "corroboratedGigs" INTEGER NOT NULL,
    "verifiedReleases" INTEGER NOT NULL,
    "bands" INTEGER NOT NULL,
    "distinctEndorsers" INTEGER NOT NULL,
    "endorsementsByKind" JSONB NOT NULL,
    "responseBucket" TEXT,
    "internalScore" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reputation_snapshots_pkey" PRIMARY KEY ("actorId")
);

-- CreateIndex
CREATE INDEX "reputation_snapshots_internalScore_idx" ON "reputation_snapshots"("internalScore");

-- AddForeignKey
ALTER TABLE "reputation_snapshots" ADD CONSTRAINT "reputation_snapshots_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
