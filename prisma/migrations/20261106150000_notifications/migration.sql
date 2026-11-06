-- Notifications (P2-09a). Écrite à la main (base injoignable au moment du lot),
-- au format de `prisma migrate diff` ; vérifier avec `npm run db:nouvelle-migration`.

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CONTACT_REQUEST', 'APPLICATION_RECEIVED', 'APPLICATION_ACCEPTED', 'COLLAB_TO_CONFIRM', 'ENDORSEMENT', 'JAM_INVITE');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientActorId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "fromActorId" TEXT,
    "href" TEXT NOT NULL,
    "title" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "actorId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("actorId","type")
);

-- CreateIndex
CREATE INDEX "notifications_recipientActorId_readAt_idx" ON "notifications"("recipientActorId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_recipientActorId_createdAt_idx" ON "notifications"("recipientActorId", "createdAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientActorId_fkey" FOREIGN KEY ("recipientActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_fromActorId_fkey" FOREIGN KEY ("fromActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
