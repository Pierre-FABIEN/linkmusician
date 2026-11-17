-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_SENT';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "delegated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "withdrawnAt" TIMESTAMP(3),
ADD COLUMN     "withdrawnById" TEXT;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "delegated" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_withdrawnById_fkey" FOREIGN KEY ("withdrawnById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

