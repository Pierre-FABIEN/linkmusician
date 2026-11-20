-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- RV-01 (#92, D81) : la présence est une déclaration personnelle ; plus
-- personne ne retire celle d'autrui. Les présences retirées par un hôte
-- (`removedAt`) ne sont pas supposées fausses : la colonne disparaît et
-- `attendedAt`, conservé, les rétablit. Les appréciations reprises alors
-- restent reprises (transactions négatives du registre, inchangées).
-- 0 ligne concernée en dev et en e2e au 20/11/2026.

-- AlterTable
ALTER TABLE "jam_attendances" DROP COLUMN "removedAt";

