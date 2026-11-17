-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- DropForeignKey
ALTER TABLE "work_step_acts" DROP CONSTRAINT "work_step_acts_assigneeId_fkey";


-- DASH-06a : la suppression définitive d'un compte échouait (deux SET NULL vers
-- actors sur la même ligne d'acte, plus la cascade de l'étape). L'index et les
-- valeurs sont conservés ; l'anonymisation remet la colonne à NULL.
-- Retour arrière : recréer la contrainte après avoir mis à NULL les identifiants orphelins.
