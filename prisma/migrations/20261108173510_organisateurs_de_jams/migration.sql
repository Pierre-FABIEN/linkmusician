-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "organizesJams" BOOLEAN NOT NULL DEFAULT false;


-- Les personnes qui ont déjà publié une jam restent organisatrices (D51).
UPDATE "persons" SET "organizesJams" = true
WHERE "actorId" IN (SELECT "issuerActorId" FROM "opportunities" WHERE "kind" = 'JAM');
