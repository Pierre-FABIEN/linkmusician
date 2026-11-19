# Conventions de Melokiva Diagram

## Identifiants

| Objet     | Forme                                | Exemple                              | Stabilité                                        |
| --------- | ------------------------------------ | ------------------------------------ | ------------------------------------------------ |
| Processus | `<route-slug>.<action>`              | `projets-id.besoin-ajouter`          | Suit la route et le nom réel de l'action         |
| Endpoint  | `<route-slug>.<méthode>`             | `api-jobs-trust.post`                | Idem                                             |
| Lecture   | `<route-slug>.load`                  | `decouvrir.load`                     | Idem                                             |
| Conçu     | `<domaine>.<sujet>`                  | `besoins.intervenant-propose`        | Choisi une fois, ne change plus                  |
| Diagramme | kebab-case, préfixé par son type     | `parcours-groupe-ep`, `etats-besoin` | Sert d'URL : ne jamais renommer sans redirection |
| Étape     | kebab-case, unique dans le diagramme | `need-fill`, `df-lock-project`       | = `id` de la cellule `.drawio`                   |
| Arête     | `e-<source>-<cible>`                 | `e-need-add-need-search`             | Libre, mais unique                               |

Le slug de route retire les groupes (`(app)`), les crochets et `@` :
`/(app)/projets/[id]` → `projets-id`, `/@[handle]` → `handle`.

## Fichiers `.drawio`

- Un fichier par diagramme, `docs/diagram/drawio/<dossier>/<id>.drawio`,
  une seule page (`<diagram>`). Dossiers : `global`, `acteurs`, `projets`,
  `rencontre`, `annonces`, `collaborations`, `scene`, `carriere`,
  `permissions`, `donnees`.
- **XML non compressé** (diagrams.net : Fichier → Propriétés → « Compressé »
  décoché) : lisible en revue de code. Le format compressé est lu, mais à
  éviter.
- Coordonnées libres ; les enfants d'un conteneur sont rendus en absolu.

### Clés de style Melokiva

| Clé                               | Valeurs                                                                     | Effet                                                 |
| --------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| `lm`                              | `step`, `lane`, `group`, `note`, `edge`                                     | Rôle du nœud ; `step` et `lane` = étapes du catalogue |
| `lmTone`                          | `violet`, `rose`, `blue`, `orange`, `amber`, `lime`, `cyan`, `ink`, `paper` | Ton Metro du nœud (sens, pas décor)                   |
| `lmShape`                         | `entity`                                                                    | Entité d'un modèle de données                         |
| `ellipse`, `rhombus`, `rounded=1` | —                                                                           | Début ou fin, décision, action                        |
| `dashed=1`                        | —                                                                           | Alternative, échec, relation calculée                 |

Tons par sens (un ton = un rôle, pas une page) : gestion `violet`,
coordination `blue`, personne invitée ou pro `rose`, musicien·ne et groupe
`orange`, structures `lime`, écriture en base `amber`, système et refus
`paper`.

## Rédaction d'une étape

- **Titre** : une action à l'indicatif, avec un exemple fictif quand c'est
  un parcours (« Inès invite Sam au projet »).
- **Préconditions** : l'état requis. **Entrées** : ce que le client envoie
  (jamais une valeur de progression, un état ou un auteur). **Validations** :
  Zod, règles pures, relectures sous verrou.
- **Lectures / écritures** : noms de modèles Prisma, rien d'autre.
- **Effets** : écrire aussi ce qui ne se passe pas (« Aucune XP »).
- **Transitions** : `Entité : A → B`. **Permissions** : qui peut, avec le
  vocabulaire des rôles (`gestion`, `coordination`…).
- **Erreurs** : le code HTTP et ce que voit la personne ; une raison tue
  (blocage, âge) reste tue dans la documentation aussi.
- Aucune donnée réelle, aucun identifiant de compte, aucun chemin de
  contournement d'un contrôle.

## Diagrammes de données

`next` = clés étrangères **physiques** sortantes (trait plein, libellé :
cardinalité, `Cascade` ou `SetNull`, unicité). `alternatives` = relations
**calculées** ou colonnes **sans clé étrangère** (pointillé). Les index
partiels créés en SQL brut (`project_participants_open_key`…) se citent
dans la description de l'entité.

## Machines à états

Un nœud par état, un nœud de départ (ellipse) ; chaque arête porte qui
déclenche la transition. `transitions` et `permissions` de l'état disent la
même chose en texte, pour la recherche et le rendu alternatif.
