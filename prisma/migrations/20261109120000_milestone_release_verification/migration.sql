-- P3-07 : conserver la référence et la source MusicBrainz de la sortie vérifiée.
ALTER TABLE "milestones"
    ADD COLUMN IF NOT EXISTS "releaseReferenceKind" TEXT,
    ADD COLUMN IF NOT EXISTS "releaseReference" TEXT,
    ADD COLUMN IF NOT EXISTS "releaseUrl" TEXT;

ALTER TYPE "EvidenceStatus" ADD VALUE IF NOT EXISTS 'VERIFIED';