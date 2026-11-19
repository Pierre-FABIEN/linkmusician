# Melokiva Diagram — cartographie des flux

> Chantier **DIAGRAM** (décision [D80](../decisions/README.md)), issue GitHub
> dédiée : voir §7. Espace interne `/diagram`, réservé aux comptes
> autorisés : jamais public, aucune mutation métier.

Melokiva Diagram permet de suivre chaque action significative de son
déclenchement à ses conséquences : qui agit, sous quelles conditions,
quelles données sont lues et écrites, ce qui se passe ensuite — et ce qui
**ne** se passe **pas** (aucune XP, aucune invitation automatique…).

## 1. Ce qui existe

| Pièce                    | Où                                                 | Rôle                                                                                |
| ------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Inventaire des processus | `src/lib/server/diagram/inventory/`                | Une entrée par action de formulaire, endpoint, job, lecture clé, ou processus conçu |
| Diagrammes et étapes     | `src/lib/server/diagram/diagrams/`                 | Un angle d'étude par diagramme ; chaque étape = un nœud du `.drawio`                |
| Sources graphiques       | `docs/diagram/drawio/<domaine>/*.drawio`           | **Source éditable** (diagrams.net), XML non compressé                               |
| Domaines et acteurs      | `src/lib/server/diagram/taxonomy.ts`               | Issus de `TrackKind`, `OrgKind` et des droits relus par les services                |
| Catalogue                | `src/lib/server/diagram/catalog.ts`                | Menu, recherche, index inverses, couverture, contrôles                              |
| Références vérifiées     | `src/lib/server/diagram/generated/references.json` | Généré : fichiers, services, modèles, décisions, déclencheurs du code               |
| Inventaire lisible       | [inventaire.md](./inventaire.md)                   | Généré depuis l'inventaire                                                          |
| Couverture               | [coverage.md](./coverage.md)                       | Généré : chiffres par domaine et contrôles                                          |
| Conventions              | [conventions.md](./conventions.md)                 | Identifiants, styles `.drawio`, statuts, règles de rédaction                        |
| Interface                | `src/routes/diagram/`                              | Navigation, recherche, visualiseur, détail des nœuds, contrôle                      |

Trois couches, jamais recopiées : l'**inventaire** dit ce qui existe, le
**diagramme** dit comment le lire, l'**étape** détaille un nœud. Une étape
qui cite un processus (`process`) en hérite le statut, les tests et les
décisions.

## 2. Statuts

| Statut        | Signification           | Comment il est obtenu                                    |
| ------------- | ----------------------- | -------------------------------------------------------- |
| `TESTED`      | Implémenté et testé     | Le processus référence au moins un test **existant**     |
| `IMPLEMENTED` | Implémenté, non vérifié | Code présent, aucun test référencé                       |
| `DESIGNED`    | Conçu, non développé    | Conception ou décision écrite, aucun code (`planned.ts`) |
| `PLANNED`     | Prévu, non spécifié     | Issue ou plan seulement (`planned.ts`)                   |
| `DEPRECATED`  | Obsolète ou remplacé    | Remplacé dans le code ou à l'écran (`planned.ts`)        |

`TESTED` ne s'écrit jamais à la main pour un processus : il se déduit des
références. Il dit qu'un test **exerce** la route ou son service, pas que ce
test vient d'être rejoué (la synchronisation vérifie l'existence des
fichiers, pas leur résultat). Les rapports de recette restent la preuve
d'exécution.

## 3. Maintenance au quotidien

La règle : **un processus important qui change fait vérifier ses
diagrammes dans le même commit.** `npm run test:unit -- --run` le rappelle :

- une action ajoutée à un `+page.server.ts` sans entrée d'inventaire fait
  échouer `inventory.test.ts` ;
- un fichier, un service, une entité ou une décision cités qui disparaissent
  font échouer `inventory.test.ts` ;
- un nœud `.drawio` sans étape (ou l'inverse), une arête non déclarée font
  échouer `catalog.test.ts` ;
- des fichiers générés périmés font échouer `sync.test.ts` : lancer
  `npm run diagram:sync`.

### 3.1 Ajouter un métier ou une structure

1. Une ligne dans `ACTORS` (`taxonomy.ts`) : `id` court, libellé, `kind`
   (`metier`, `structure`, `role`), valeur Prisma réelle si elle existe.
2. L'ajouter aux `actors` des processus et diagrammes concernés.
3. `npm run diagram:sync`. Le menu, les compteurs et la recherche suivent ;
   tant qu'aucun parcours ne le cite, la vue de contrôle le signale.

### 3.2 Ajouter un processus

1. Une action de formulaire : dans le groupe de sa route
   (`inventory/routes.ts`), `nomDeLAction: 'Titre'` ou un objet avec
   `services`, `entities`, `errors`, `tests`. Un endpoint ou un job :
   `inventory/endpoints.ts`. Un processus seulement conçu :
   `inventory/planned.ts`, avec ses documents.
2. Citer les tests qui l'exercent (`e2e('nom-de-spec')`,
   `it('domaine/fichier.integration.test.ts')`).
3. `npm run diagram:sync`, puis relire `inventaire.md`.

### 3.3 Dessiner un nouveau diagramme

1. Créer `docs/diagram/drawio/<domaine>/<id>.drawio` dans diagrams.net
   (**Fichier → Propriétés → décocher « Compressé »**).
2. Chaque nœud métier : **Modifier le style** et ajouter `lm=step;` (un
   couloir `lm=lane;`, un cadre de transaction `lm=group;`), puis
   **Modifier les données** (Ctrl+M) pour poser l'identifiant (`ID`) stable,
   en kebab-case (`need-propose`).
3. Les arêtes : pleines pour le chemin nominal, pointillées (`dashed=1`)
   pour une alternative ou un échec.
4. Déclarer le diagramme dans `diagrams/<id>.ts` (étapes dans l'ordre de
   lecture, `next` et `alternatives` = arêtes sortantes), l'ajouter à
   `diagrams/index.ts`, relier `parents` et `children` dans les deux sens.
5. `npm run test:unit -- --run src/lib/server/diagram` puis
   `npm run diagram:sync`.

### 3.4 Référencer une entité

Le nom exact du modèle de `schema.prisma` (`ProjectNeed`, jamais
`project_needs`), dans `entities` (processus, diagramme) ou `reads` /
`writes` (étape). La page `/diagram/entites/<Modèle>` liste alors tous les
processus, diagrammes et étapes qui l'utilisent.

### 3.5 Lier plusieurs diagrammes

`parents` / `children` (réciproques, vérifiés), `related` (libre), et sur
une étape `goto: { diagram }` ou `goto: { domain }` pour ouvrir un
sous-diagramme ou un domaine depuis un nœud.

### 3.6 Documenter une permission

Sur l'étape : `permissions` (qui peut), `preconditions` (dans quel état),
`errors` (ce que voit qui ne peut pas : 404, 403, 409). Toute étape qui a
des `transitions` doit avoir des `permissions` : la vue de contrôle le
vérifie. Ne pas décrire le détail des verrous ou des contournements
possibles au-delà de ce que dit le code et la conception.

### 3.7 Faire évoluer un processus

Modifier le service, puis dans le même commit : l'entrée d'inventaire
(titre, entités, erreurs), les étapes qui le citent, le `.drawio` si un
chemin change. Un processus livré passe de `planned.ts` à `routes.ts`.
Un processus remplacé passe en `DEPRECATED` : la vue de contrôle signale
les étapes qui le présentent encore comme actif.

### 3.8 Vérifier la couverture

`/diagram/controle` (ou [coverage.md](./coverage.md)) : processus sans
diagramme, références cassées, acteurs sans parcours, relations
asymétriques, processus sans cas d'erreur, transitions sans permission,
« testé » sans test, décisions encore proposées, obsolètes présentés comme
actifs, désaccords nœuds/étapes. **Le catalogue n'est pas déclaré
exhaustif** tant que « Processus implémentés sans diagramme détaillé »
n'est pas vide ; l'**inventaire**, lui, couvre tout le code du périmètre
(0 déclencheur manquant, vérifié par le test).

## 4. Accès et sécurité

- `/diagram` et chacune de ses lectures appellent `requireDiagramReader`
  (`src/lib/server/diagram/access.ts`) : anonyme → connexion ; compte non
  autorisé → 404, comme une page inexistante.
- Autorisés : le rôle `ADMIN`, et les identifiants de compte listés dans la
  variable d'environnement serveur `DIAGRAM_READER_IDS` (séparés par des
  virgules), pour un collaborateur technique sans droits d'administration.
- Aucune donnée personnelle réelle : le catalogue ne lit **jamais** la base.
  Les exemples (Inès, Malik, Sam, « Lumière ») sont fictifs.
- Le catalogue vit sous `src/lib/server/` : rien n'est servi par `static/`.
  Les pages sont en `cache-control: private, no-store` et `noindex`.
- Le SVG est **reconstruit** depuis la géométrie (liste blanche d'éléments,
  texte échappé, aucun lien ni script) : rien n'est recopié du `.drawio`.

## 5. Interface

- **Menu latéral** : Vue globale, Métiers, Structures, Rôles et droits,
  Domaines, Vues (parcours, dataflows, permissions, données, états,
  événements, évolutions), Inventaire et contrôle. Repliable, filtrable,
  compteurs, élément courant conservé, tiroir sur mobile. Un groupe fermé
  ne rend pas ses entrées.
- **Recherche globale** : métier, action, entité, service, permission,
  événement, issue (`#71`), décision (`D76`), mot libre ; dans les titres
  et dans le corps des étapes. Filtres combinables par domaine, acteur,
  statut, type de diagramme et type de résultat.
- **Visualiseur** : zoom, déplacement, ajustement, plein écran, sélection
  d'un nœud (clavier compris), mise en évidence des relations directes,
  filtre par acteur, panneau de détail, lien partageable
  `/diagram/d/<slug>?noeud=<id>`, export SVG, rendu textuel alternatif.

## 6. Plan de production des diagrammes restants

Ordre proposé (un lot = un domaine, un parcours vertical d'abord) :

| Lot         | Contenu                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------- |
| DIAGRAM-04a | Groupes : recrutement, demandes, rôles, transmission, départ, dissolution (états `Membership`) |
| DIAGRAM-04b | Annonces et candidatures : publication, candidature en son nom, d'un groupe, déléguée          |
| DIAGRAM-04c | Collaborations et morceaux : proposition, confirmation, crédits, rôles du son, étapes          |
| DIAGRAM-04d | Scène : lieux, revendication, plateaux, concert reconnu (D79), scènes ouvertes                 |
| DIAGRAM-04e | Rencontre et jams : dispos, recherche, jam publique, présence, appréciations                   |
| DIAGRAM-04f | Métiers pros : accompagnement, droit de candidater, délégations, agences, écoles, studios      |
| DIAGRAM-05a | Progression : événements, registre d'XP, projection, confiance, réputation, anti-abus          |
| DIAGRAM-05b | Sécurité et RGPD : authentification, blocage, modération, export, anonymisation                |
| DIAGRAM-05c | ERD par domaine (groupes, scène, morceaux, progression)                                        |
| DIAGRAM-06  | Contrôles en CI, couverture minimale par domaine, revue de maintenance                         |

Chaque lot fait baisser « Processus implémentés sans diagramme détaillé »
et « Acteurs sans parcours » dans [coverage.md](./coverage.md).

## 7. Suivi

Lots DIAGRAM-01 à DIAGRAM-06 : issue GitHub dédiée au chantier. Ajouter un
diagramme ne ferme aucun ticket métier.
