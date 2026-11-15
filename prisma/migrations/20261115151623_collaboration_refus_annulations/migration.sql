-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterTable
ALTER TABLE "collaboration_participants" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "declinedAt" TIMESTAMP(3);

