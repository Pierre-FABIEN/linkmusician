-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "GroupDiscussionMemberState" AS ENUM ('INVITED', 'ACTIVE', 'DECLINED', 'LEFT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'GROUP_DISCUSSION_INVITE';

-- CreateTable
CREATE TABLE "group_discussions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "contactGroupId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_discussions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_discussion_members" (
    "discussionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "state" "GroupDiscussionMemberState" NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "group_discussion_members_pkey" PRIMARY KEY ("discussionId","actorId")
);

-- CreateTable
CREATE TABLE "group_discussion_messages" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "senderActorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_discussion_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_discussions_creatorId_idx" ON "group_discussions"("creatorId");

-- CreateIndex
CREATE INDEX "group_discussion_members_actorId_state_idx" ON "group_discussion_members"("actorId", "state");

-- CreateIndex
CREATE INDEX "group_discussion_messages_discussionId_createdAt_idx" ON "group_discussion_messages"("discussionId", "createdAt");

-- CreateIndex
CREATE INDEX "group_discussion_messages_senderActorId_idx" ON "group_discussion_messages"("senderActorId");

-- AddForeignKey
ALTER TABLE "group_discussions" ADD CONSTRAINT "group_discussions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_discussion_members" ADD CONSTRAINT "group_discussion_members_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "group_discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_discussion_members" ADD CONSTRAINT "group_discussion_members_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_discussion_messages" ADD CONSTRAINT "group_discussion_messages_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "group_discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_discussion_messages" ADD CONSTRAINT "group_discussion_messages_senderActorId_fkey" FOREIGN KEY ("senderActorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

