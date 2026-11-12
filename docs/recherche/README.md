# Recherche de musicien·nes

Module LinkMusician (lot P2-01, conception 05 §3 phase 2). Page
`/decouvrir` de l'espace, réservée aux membres connectés.

## Filtres

Lus dans l'URL (partageable), validés par `src/lib/search/filters.ts`
(pur, testé) ; une valeur invalide est ignorée.

| Paramètre    | Effet                                                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `metier`     | ce métier (`musicien`, `inge-son`, `producteur`, `organisateur`, `manager`, `booker`) ; hors musicien·ne, **une offre cochée** est exigée (D62) |
| `specialite` | spécialité du métier (`person_track_specializations`, codes historiques recopiés)                                                               |
| `propose`    | une offre précise du métier (« Je propose », ONB-13a), en minuscules                                                                            |
| `a-distance` | ingé son, producteur·rice : travaille à distance (`CraftMobility`), **sans limite de rayon**                                                    |
| `references` | ingé son, producteur·rice : a des travaux en écoute pour ce métier (`CraftReference`)                                                           |
| `instrument` | joue cet instrument (slug du référentiel)                                                                                                       |
| `niveau`     | niveau déclaré minimal (1 à 5), sur cet instrument ou n'importe lequel                                                                          |
| `genre`      | ce genre ; **un genre parent inclut ses sous-genres**                                                                                           |
| `rayon`      | 5, 10, 25 (défaut), 50 ou 100 km autour de **ma** commune                                                                                       |
| `recherche`  | « ce que je recherche » (jams, groupe, remplacements…)                                                                                          |
| `statut`     | statut pro déclaré                                                                                                                              |
| `reciproque` | seulement les personnes dont le rayon de déplacement me couvre aussi (25 km par défaut)                                                         |
| `page`       | 20 résultats par page, 10 pages au plus                                                                                                         |

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
- **Par métier (ONB-13a, D62)** : une spécialité ne vaut pas une
  prestation. Hors musicien·ne, la personne doit avoir coché au moins une
  offre de ce métier. Un bloc « spécialités et intentions » privé (D61) ou
  « pas de sollicitations en ce moment » l'écarte ; une réponse non précisée
  ne l'écarte pas (Q66). « Envie de » (`lookingFor`) suit le bloc
  musicien·ne. Les résultats affichent ce qu'elle propose dans le métier
  cherché. Les pages historiques (`/profil/son`…) montrent la complétude et
  invitent à cocher une offre.
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

## Suggestions de musicien·nes (P2-18)

- **Où** : « Des musicien·nes pour toi » en tête de `/decouvrir` tant
  qu'aucun filtre n'est appliqué (six cartes ; Mon parcours n'en garde
  qu'un lien « Trouver des musicien·nes », pour rester sur l'essentiel,
  06/11/2026) et sur son propre profil public ; « Dans le même style » sur le
  profil d'un·e autre (trois cartes, membres connecté·es seulement).
- **Candidat·es** (`src/lib/server/discovery/suggestions.ts`) : PostGIS dans
  un rayon de 50 km autour de ma commune, les 200 plus proches, avec les
  garde-fous de la recherche (profils publics, onboarding fini, ni blocage
  ni suspension), sans les personnes écartées. **Un·e mineur·e n'est jamais
  suggéré·e à un adulte qui ne la connaît pas** (D5) : seulement si elle est
  dans son réseau musical. Une date de naissance inconnue vaut la règle des
  adultes.
- **Compatibilité** (`src/lib/discovery/compatibility.ts`, pur) : genres en
  commun (+2 chacun, +1 pour un genre voisin, 3 au plus), instrument
  complémentaire (+2 : un autre rôle que les miens parmi voix, harmonie,
  basse, rythmique, mélodie, électronique), niveau déclaré proche de mon
  instrument principal (+2 au même niveau, +1 à un cran, −1 à trois crans
  ou plus). Sans genre proche ni instrument complémentaire : pas de
  suggestion.
- **Ordre** : réseau musical d'abord, puis compatibilité, puis tranche de
  distance, puis distance. **Jamais l'XP ni le palier** (test : un million
  d'XP et TL3 ne changent rien). Seule la tranche de distance sort.
- **Chaque carte dit pourquoi** (« Rock en commun · batterie · niveau
  proche ») ; « Pas intéressé·e » (`POST /api/suggestions/dismiss`,
  `suggestion_dismissals`) la retire pour de bon. La personne reste
  trouvable par la recherche.
- **RGPD** : suggestions écartées dans l'export ; supprimées dans les deux
  sens à l'anonymisation.

### Piste d'évolution après le pilote

La compatibilité sert à classer, pas à décider qui a le droit de se
rencontrer : ne pas exclure une personne débutante des profils plus
expérimentés. Distinguer les contextes « rencontrer des pairs »,
« recruter pour un projet » et « apprendre/transmettre ». À terme, les
attentes pourront être explicitées des deux côtés — niveau requis ou
préféré, ouverture à accompagner ou à apprendre — pour que chaque
personne choisisse si la rencontre lui convient. Ne pas utiliser l'XP
comme preuve de compétence ; les années d'expérience peuvent être un
indice facultatif, jamais le seul critère de classement ou d'exclusion.
Cette piste reste à valider à partir des retours du pilote ; elle ne
change pas le fonctionnement actuel des suggestions.
