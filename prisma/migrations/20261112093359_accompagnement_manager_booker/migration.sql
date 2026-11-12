-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateEnum
CREATE TYPE "AgentKind" AS ENUM ('MANAGER', 'BOOKER');

-- CreateEnum
CREATE TYPE "RepresentationStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'ENDED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REPRESENTATION_REQUEST';

-- AlterTable
ALTER TABLE "collaborations" ADD COLUMN     "bookedById" TEXT;

-- CreateTable
CREATE TABLE "representations" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "kind" "AgentKind" NOT NULL,
    "status" "RepresentationStatus" NOT NULL DEFAULT 'PROPOSED',
    "message" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "endedAt" TIMESTAMP(3),
    "endedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "representations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_profiles" (
    "personId" TEXT NOT NULL,
    "pitch" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("personId")
);

-- CreateTable
CREATE TABLE "agent_genres" (
    "personId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "agent_genres_pkey" PRIMARY KEY ("personId","genreId")
);

-- CreateIndex
CREATE INDEX "representations_agentId_status_idx" ON "representations"("agentId", "status");

-- CreateIndex
CREATE INDEX "representations_artistId_status_idx" ON "representations"("artistId", "status");

-- CreateIndex
CREATE INDEX "agent_genres_genreId_idx" ON "agent_genres"("genreId");

-- CreateIndex
CREATE INDEX "collaborations_bookedById_idx" ON "collaborations"("bookedById");

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "representations" ADD CONSTRAINT "representations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "representations" ADD CONSTRAINT "representations_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "representations" ADD CONSTRAINT "representations_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "representations" ADD CONSTRAINT "representations_endedById_fkey" FOREIGN KEY ("endedById") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("actorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_genres" ADD CONSTRAINT "agent_genres_personId_fkey" FOREIGN KEY ("personId") REFERENCES "agent_profiles"("personId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_genres" ADD CONSTRAINT "agent_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

