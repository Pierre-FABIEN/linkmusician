-- DASH-04a : extension additive ; préserver les accompagnements déjà consentis.
ALTER TABLE "representations"
 ADD COLUMN "startsAt" TIMESTAMP(3),
 ADD COLUMN "expiresAt" TIMESTAMP(3),
 ADD COLUMN "departmentCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 ADD COLUMN "allowedActions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "representations"
 SET "allowedActions" = CASE WHEN "kind" = 'BOOKER'
 THEN ARRAY['BOOKING_CREDIT']::TEXT[] ELSE ARRAY['CAREER_SUPPORT']::TEXT[] END;

ALTER TABLE "representations" ADD CONSTRAINT "representations_scope_dates_check"
 CHECK ("startsAt" IS NULL OR "expiresAt" IS NULL OR "startsAt" < "expiresAt");
ALTER TABLE "representations" ADD CONSTRAINT "representations_scope_actions_check"
 CHECK ("allowedActions" <@ CASE WHEN "kind" = 'BOOKER'
 THEN ARRAY['BOOKING_CREDIT']::TEXT[] ELSE ARRAY['CAREER_SUPPORT']::TEXT[] END);
-- Retour arrière manuel : supprimer les deux contraintes puis les quatre colonnes.
-- Les accompagnements, confirmations, fins et événements existants sont conservés.
