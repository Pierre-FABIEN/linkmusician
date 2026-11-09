-- Compatibilité avec les schémas où la contestation P3-06 a déjà été appliquée.
-- La migration canonique est 20261108171139_contestation_des_etapes ; ces
-- opérations idempotentes gardent l'historique local antérieur réexécutable.
ALTER TYPE "ReportTarget" ADD VALUE IF NOT EXISTS 'MILESTONE';

ALTER TABLE "milestones"
    ADD COLUMN IF NOT EXISTS "frozenAt" TIMESTAMP(3);
