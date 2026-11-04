# Localisation floutée

Module LinkMusician (lot P1-05). Invariant du projet : **aucune localisation
précise n'est stockée**.

## Ce qui est stocké

Pour un acteur, une ligne `actor_locations` : code INSEE, nom et
département de la commune, et un point PostGIS (`geography(Point,4326)`).
Ce point est le **centre de la commune aligné sur une grille d'environ
2 km** (`src/lib/geo/fuzz.ts`). Il ne dépend que de la commune choisie :
le navigateur n'envoie qu'un code INSEE, et le serveur relit la commune
auprès de geo.api.gouv.fr. Jamais d'adresse, jamais de position GPS.

Les distances s'affichent **par tranches** (`src/lib/geo/distance.ts` :
moins de 5 km, 5 à 10, 10 à 25, 25 à 50, 50 à 100, plus de 100 km).

## Code

| Fichier                              | Rôle                                                |
| ------------------------------------ | --------------------------------------------------- |
| `src/lib/geo/fuzz.ts`, `distance.ts` | Règles pures (testées)                              |
| `src/lib/server/geo/communes.ts`     | geo.api.gouv.fr (sans clé), mock sans réseau en e2e |
| `src/lib/server/geo/queries.ts`      | **Seul** fichier de SQL géographique (`$queryRaw`)  |
| `src/routes/api/communes/+server.ts` | Autocomplétion, comptes connectés seulement         |
| `src/routes/(app)/profil/ville/`     | Page « Ma ville »                                   |

En e2e (`SECRET_ADDRESS_SEARCH_MODE=e2e`), 5 communes fictives
(`src/lib/geo/communes-e2e.ts`) remplacent l'API.

## PostGIS et schéma `e2e`

PostGIS est installé une fois, dans `public`. Le SQL qualifie donc types
et fonctions (`public.geography`, `public.ST_DWithin`) : sans cela, ils
sont introuvables depuis le schéma `e2e`. La migration
`linkmusician_localisation` a été retouchée à la main pour la même raison.

## Test d'intégration

`GEO_INTEGRATION=1 npx vitest --run src/lib/server/geo` : 5 communes
connues dans le schéma `e2e`, recherche par rayon (`ST_DWithin`). Désactivé
par défaut.
