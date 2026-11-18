# Projets — socle (P2, D72)

> Lot P2 de [D72](../decisions/D72-architecture-projets-collab.md) (révision 2),
> issue [#71](https://github.com/Pierre-FABIEN/linkmusician/issues/71). Détail
> métier : [conception 19](../conception/19-architecture-cible-collab.md) §2.3,
> §5.4, §6.2, §6.7, §9.3 ; parcours : [conception 20](../conception/20-parcours-ux-collab.md)
> §7 et §9. Livré le 19/11/2026.

Un projet est un **objectif** (un EP, une tournée, une production) porté par
un seul acteur. Il **référence** des réalisations existantes sans les
posséder, ne prouve rien et reste facultatif.

## Ce qui existe

| Objet         | Table           | Contenu                                                                                                           |
| ------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Project`     | `projects`      | Porteur (`ownerId`), nom, type, phrase d'objectif, début, échéance (dates), état, création, mise à jour           |
| `ProjectItem` | `project_items` | Un morceau (`workId`), niveau de partage, titre de travail, auteur du rangement ; unique par (projet, morceau)    |
| `ProjectAct`  | `project_acts`  | Journal : acte, auteur, morceau (sans clé étrangère), partage et état avant/après, date ; ni titre ni texte libre |

- **Types** : single, EP, album, production, concert, tournée, festival,
  campagne. « Autre » attend UX-2.
- **Porteurs** : la personne, ou une organisation `BAND`, `PROMOTER`,
  `STUDIO`, `VENUE` vivante (Q-G0-13). Ni école, ni agence.
- **États** : en cours → atteint ou laissé de côté ; un projet clos se
  rouvre. Clos, il se lit sans changer ; seul l'abaissement d'un partage et
  le retrait par la gestion du morceau restent possibles.
- **Partage** : `NONE` (rien, ni titre ni existence), `SUMMARY` (titre ou
  titre de travail, état), `WORK` (le résumé ; tâches et livrables viendront
  avec P13). Proposé au rangement : morceau composé (public) → résumé, idée
  → rien ; `WORK` jamais par défaut.

Code : règles pures `src/lib/projects/rules.ts`, schémas
`src/lib/schema/projects/project.ts`, services `src/lib/server/projects/`
(`service.ts` écritures, `view.ts` lectures, `access.ts` gestion,
`export.ts` RGPD). Routes : `/projets`, `/projets/nouveau`,
`/projets/[id]`.

## Droits (matrice de la conception 19 §6.2, partie P2)

| Geste                    | Qui                                                         | Sinon                    |
| ------------------------ | ----------------------------------------------------------- | ------------------------ |
| Créer                    | Gestion du porteur choisi                                   | 403                      |
| Lire la fiche            | Gestion du porteur                                          | 404, comme un inexistant |
| Modifier, changer l'état | Gestion du porteur (modifier : projet en cours)             | 404 / 409                |
| Supprimer                | Gestion du porteur                                          | 404                      |
| Ranger un morceau        | Gestion du projet **et** du morceau ; projet en cours       | 404 (morceau d'autrui)   |
| Choisir le partage       | Gestion **du morceau** ; élargir suppose un projet en cours | 403 (gestion du projet)  |
| Retirer un élément       | Gestion du projet (en cours) ou du morceau (toujours)       | 404 / 409                |

« Gestion du porteur » : la personne elle-même, ou une adhésion `ACTIVE`
`OWNER`/`ADMIN` de l'organisation vivante, relue par `structureAccess` sous
verrou à chaque écriture. Un simple membre ne gère pas le projet de son
groupe et ne le lit pas (I2). « Gestion du morceau » : le prédicat de
`manageableOwnerWhere` (comme `loadManagedWork`).

**Verrous** : `project-owner:` (quota) → `project:` → `work:` →
`band:` / `studio:` / `org:` (triés). Aucun `collaboration:` en P2.

## Confidentialité (`projectView`)

- Une seule requête décide de l'accès : projet inexistant ou inaccessible
  renvoient la même 404.
- Les éléments sont filtrés **en base** : la gestion du morceau voit le sien
  (avec son lien et son partage) ; sinon seul un partage `SUMMARY` ou `WORK`
  montre le titre de travail (ou le titre) et l'état, si le porteur est
  vivant et qu'aucun blocage ne sépare le lecteur du porteur. Jamais
  d'identifiant de morceau, de lien vers `/morceaux/[id]`, de crédit ni de
  maquette pour un élément d'autrui.
- Compteurs et journal sur les seuls éléments visibles ; un acte sur un
  élément invisible est omis ; un auteur bloqué devient « Une personne », un
  auteur effacé « Compte supprimé ».
- Pages en `cache-control: private, no-store`. Aucun projet sur le profil
  public.

Au lancement de P2, seule la gestion du porteur lit un projet. Le cas d'un
élément non géré par le lecteur existe déjà : un projet de groupe où une
autre personne de la gestion range son morceau personnel, ou un projet dont
le lecteur a perdu la gestion d'un morceau rangé.

## Ce que le projet ne fait pas (I1, I3, I9)

Créer, ranger, partager, clore ou supprimer un projet ne donne aucune XP,
n'émet aucun événement de progression, n'écrit aucune étape, ne crée ni ne
retire aucun crédit, ne confirme aucune collaboration et ne change aucun
porteur. Supprimer un projet supprime ses liens et son journal, jamais un
morceau ; supprimer un morceau retire ses liens, pas les projets.

## Quotas (défauts, Q76)

20 projets en cours et 200 au total par porteur (la réouverture repasse par
le quota), 200 éléments par projet.

## RGPD

- **Export** : projets portés en son nom (avec ses éléments : titre de ses
  propres morceaux, titre affiché, partage), et actes posés dans les projets
  d'une structure (type, projet, porteur, date), sans titre d'un morceau
  qu'on ne porte pas.
- **Anonymisation** : projets personnels supprimés (conteneurs) ; dans les
  projets d'une structure, l'auteur des actes et des rangements est oublié.
- **Journal** : ajout seul garanti par trigger (`project_acts_append_only`) :
  un `UPDATE` n'est permis que pour oublier l'auteur, un `DELETE` seulement
  par cascade. Il disparaît avec son projet (Q77).

## Coût de la fiche

Mesuré sur le schéma e2e (Neon), `view.perf.integration.test.ts` :

| Cas                                      | Éléments vus | Requêtes |        Médiane |
| ---------------------------------------- | -----------: | -------: | -------------: |
| Projet vide                              |            0 |        5 |         160 ms |
| 10 éléments                              |           10 |        5 |         165 ms |
| 100 éléments                             |          100 |        5 |         165 ms |
| Deux projets partageant 5 morceaux       |       5 et 5 |        5 |         160 ms |
| Groupe : 50 invisibles + 10 résumés      |           10 |        6 |         186 ms |
| 10 lectures indépendantes (`workAccess`) |           10 |       20 | 912 ms (total) |

Le coût ne dépend pas du nombre d'éléments ; des actes sur des morceaux
invisibles ajoutent une seule requête.

## Limites de P2 et suites

- **P3 / U2** : « Mes projets » en tuiles, fiche par famille, prochaine
  action, « Hors projet », tuiles de l'accueil, `ShareLevelChoice` ; la
  liste `/projets` actuelle est minimale.
- **P4 / U3** : participant·es, coordination, invitations. Rien ne lit
  encore une participation ; la fiche n'a donc qu'un lecteur, la gestion.
- **P5 / U4** : partager le morceau d'autrui (initiative côté morceau),
  mention « Partagé dans… » sur la fiche du morceau.
- **P13** : tâches et livrables d'un élément en `WORK`.
- Seuls des **morceaux** se rangent ; collaborations et annonces suivront
  (colonnes nullables, migration additive).
- Groupe porteur dissous : plus personne ne gère son projet, qui devient
  invisible jusqu'aux participant·es de P4 (Q77).
