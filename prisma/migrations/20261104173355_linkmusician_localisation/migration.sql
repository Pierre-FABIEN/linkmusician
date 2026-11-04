-- LINKMUSICIAN (P1-05) : localisation floutée (centre de commune sur grille ~2 km).
-- Modifié à la main (voir CLAUDE.md) :
--   - lignes d'index du boilerplate retirées (`transactions_*`,
--     `blog_posts_published_createdAt_idx`) ;
--   - type qualifié `public.geography` : PostGIS vit dans `public`, et la
--     migration doit aussi passer dans le schéma `e2e` (`?schema=e2e`).

-- CreateTable
CREATE TABLE "actor_locations" (
    "actorId" TEXT NOT NULL,
    "communeCode" TEXT NOT NULL,
    "communeName" TEXT NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "point" public.geography(Point,4326) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actor_locations_pkey" PRIMARY KEY ("actorId")
);

-- CreateIndex
CREATE INDEX "actor_locations_point_idx" ON "actor_locations" USING GIST ("point");

-- AddForeignKey
ALTER TABLE "actor_locations" ADD CONSTRAINT "actor_locations_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
