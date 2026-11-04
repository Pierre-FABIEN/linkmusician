-- LINKMUSICIAN (P0-04) : PostGIS, pour la localisation floutée (P1-05).
--
-- Une extension ne s'installe qu'une fois par base. On la place donc toujours
-- dans `public`, y compris quand la migration tourne pour le schéma `e2e`
-- (`?schema=e2e`) : là, l'instruction ne fait rien si `public` l'a déjà.
-- Conséquence pour les requêtes géographiques : depuis un autre schéma que
-- `public`, qualifier les types et fonctions (`public.geography`,
-- `public.ST_DWithin`…). Prisma ignore les extensions (pas de preview
-- `postgresqlExtensions`) : `migrate dev` ne proposera pas de la supprimer.
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
