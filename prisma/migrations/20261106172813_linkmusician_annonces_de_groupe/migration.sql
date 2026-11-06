-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "postedById" TEXT;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

