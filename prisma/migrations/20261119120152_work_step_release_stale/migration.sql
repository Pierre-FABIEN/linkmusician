-- P1 (E10, #36) : réparer les étapes déjà laissées au nom d'une personne qui ne
-- gère plus le morceau (départ, retrait ou rétrogradation antérieurs à P1), et
-- celles qu'une ancienne suppression de compte a laissées « En cours » sans
-- responsable. Même règle que `planAccessLossRelease` : une étape non terminée
-- est libérée avec un acte `AUTO_RELEASED` ; une étape terminée reste intacte.
-- Gestion = `manageableOwnerWhere` : porteur personnel vivant, ou OWNER/ADMIN
-- actif d'un groupe vivant. Migration séparée : une valeur d'enum ajoutée ne
-- s'utilise pas dans la transaction qui l'ajoute. Une seule instruction (Prisma
-- n'enveloppe pas la migration dans une transaction). Rejouable sans effet.

WITH stale AS (
SELECT s."id", s."status", CASE WHEN a."deletedAt" IS NULL THEN s."assigneeId" END AS "assigneeId"
FROM "work_steps" s
JOIN "works" w ON w."id" = s."workId"
JOIN "actors" o ON o."id" = w."ownerId"
LEFT JOIN "actors" a ON a."id" = s."assigneeId"
WHERE s."status" <> 'DONE'
  AND (
    (s."assigneeId" IS NULL AND (s."status" <> 'TODO' OR s."mode" IS NOT NULL))
    OR (
      s."assigneeId" IS NOT NULL
      AND NOT (
        a."deletedAt" IS NULL AND o."deletedAt" IS NULL AND (
          (o."kind" = 'PERSON' AND o."id" = s."assigneeId")
          OR (o."kind" = 'ORGANIZATION' AND EXISTS (
            SELECT 1
            FROM "organizations" g
            JOIN "memberships" m ON m."orgId" = g."actorId"
            WHERE g."actorId" = o."id" AND g."kind" = 'BAND' AND g."dissolvedAt" IS NULL
              AND m."personId" = s."assigneeId" AND m."status" = 'ACTIVE'
              AND m."role" IN ('OWNER', 'ADMIN')
          ))
        )
      )
    )
  )
), acts AS (
  INSERT INTO "work_step_acts" ("id", "stepId", "authorId", "assigneeId", "kind", "fromStatus", "toStatus", "occurredAt")
  SELECT gen_random_uuid()::text, "id", NULL, "assigneeId", 'AUTO_RELEASED', "status", 'TODO', now()
  FROM stale
)
UPDATE "work_steps"
SET "status" = 'TODO', "assigneeId" = NULL, "startedAt" = NULL, "doneAt" = NULL,
    "mode" = NULL, "place" = NULL, "revision" = "revision" + 1, "updatedAt" = now()
WHERE "id" IN (SELECT "id" FROM stale);
