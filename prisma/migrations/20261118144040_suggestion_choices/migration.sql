-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "SuggestionChoiceKind" AS ENUM ('LATER', 'NOT_FOR_ME');

-- CreateTable
CREATE TABLE "suggestion_choices" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" "SuggestionChoiceKind" NOT NULL,
    "target" TEXT NOT NULL,
    "version" TEXT,
    "until" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suggestion_choices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suggestion_choices_ownerId_kind_target_key" ON "suggestion_choices"("ownerId", "kind", "target");

-- AddForeignKey
ALTER TABLE "suggestion_choices" ADD CONSTRAINT "suggestion_choices_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

