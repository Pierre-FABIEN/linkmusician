-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'JAM_CANCELLED';

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" TEXT;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

