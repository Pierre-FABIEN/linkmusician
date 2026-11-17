-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterTable
ALTER TABLE "work_steps" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0;


-- DASH-06a : ajout seul ; les étapes existantes partent de la révision 0.
-- Retour arrière : ALTER TABLE "work_steps" DROP COLUMN "revision".
