# Recherche de musicien·nes

Module LinkMusician (lot P2-01, conception 05 §3 phase 2). Page
`/decouvrir` de l'espace, réservée aux membres connectés.

## Filtres

Lus dans l'URL (partageable), validés par `src/lib/search/filters.ts`
(pur, testé) ; une valeur invalide est ignorée.

| Paramètre    | Effet                                                                                   |
| ------------ | --------------------------------------------------------------------------------------- |
| `instrument` | joue cet instrument (slug du référentiel)                                               |
| `niveau`     | niveau déclaré minimal (1 à 5), sur cet instrument ou n'importe lequel                  |
| `genre`      | ce genre ; **un genre parent inclut ses sous-genres**                                   |
| `rayon`      | 5, 10, 25 (défaut), 50 ou 100 km autour de **ma** commune                               |
| `recherche`  | « ce que je recherche » (jams, groupe, remplacements…)                                  |
| `statut`     | statut pro déclaré                                                                      |
| `reciproque` | seulement les personnes dont le rayon de déplacement me couvre aussi (25 km par défaut) |
| `page`       | 20 résultats par page, 10 pages au plus                                                 |

## Règles

- **Profils publics seulement** : ni anonymisé, ni masqué, ni suspendu, et
  onboarding terminé (mêmes règles que `publicActorWhere`, écrites en SQL).
- **Tri** (D33) : son réseau musical d'abord (P2-16), puis la tranche de
  distance affichée, puis, dans une même tranche, la réputation (score
  interne de P2-08), enfin la distance et l'identifiant. Jamais l'XP. Le
  score reste dans la sous-requête SQL : il n'est jamais sélectionné ni
  renvoyé.
- **Jamais de distance précise** vers le navigateur : seulement la tranche
  (`distanceBand`). D'où une pagination par numéro de page plutôt que par
  curseur (un curseur porterait la distance).
- **Anti-aspiration** : réservée aux membres connectés, limitée à 60
  recherches d'affilée puis une toutes les 2 s par personne
  (`RefillingTokenBucket`).
- Sans ville : invitation à l'indiquer (`/profil/ville`).
- Mobile d'abord : Instrument, Distance et Chercher visibles, les autres
  filtres repliés (ouverts d'office s'ils sont actifs).

## Code et tests

- Requête PostGIS paramétrée : `src/lib/server/search/musicians.ts`.
- Intégration (schéma e2e, communes connues) :
  `GEO_INTEGRATION=1 npx vitest --run src/lib/server/search`.
- E2E : `e2e/linkmusician/recherche.spec.ts` (sans ville, rayon, tranche,
  filtre par le formulaire, carte vers le profil public).
- Charge : `k6/search.js` (comptes de `npm run seed:demo`). Mesuré le
  05/11/2026 sur un serveur de dev : p95 = 438 ms, 0 % d'erreur.
