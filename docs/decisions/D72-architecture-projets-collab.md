# D72 — Architecture métier Collab : groupes, projets, œuvres, collaborations

- Statut : **Proposée** (18/11/2026). En attente des arbitrages du fondateur
  (§8). Rien n'est implémenté.
- Lot concerné : G0-02 ([#83](https://github.com/Pierre-FABIEN/linkmusician/issues/83)).
  Alimente #71, #72, #36 et #40.
- Détail complet (modèle, droits, scénarios, lots) :
  [conception 19 — architecture cible Collab](../conception/19-architecture-cible-collab.md).
- Faits de départ : [audit structurel G0-01](../conception/audit-structurel-collab.md)
  (#84), base `main` à `9eac062`.

## 1. Contexte et problème

Melokiva doit représenter durablement des **groupes**, des **projets**, des
**œuvres**, des **événements** et des **collaborations**, pour des artistes
seul·es, des groupes et des professionnel·les (ingé son, producteur,
organisateur, manager, booker), sans imposer de configuration aux
débutant·es.

L'audit G0-01 a vérifié dans le code que le modèle actuel représente bien
les groupes, les morceaux, les crédits consentis et les actes confirmés à
deux. Il a aussi relevé 14 écarts. Les principaux :

- **aucun regroupement** de plusieurs morceaux, concerts ou intervenants
  en une initiative (E1). La « campagne » de l'interface est un seul
  morceau ;
- un·e **artiste solo** doit créer un groupe « Solo », qui ne sera jamais
  formé, pour jouer un concert (E5) ;
- un morceau **ne change jamais de porteur** (E2) : composé avant le
  groupe, il doit être recréé en doublon ;
- une collaboration porte **un seul morceau**, et une seule est permise
  **par conversation et par jour** (E3, E4) ;
- supprimer un morceau ou un compte **efface les crédits confirmés
  d'autrui** (E6), et un groupe dissous fait disparaître les crédits publics
  de ses contributeur·rices externes (E7) ;
- œuvre, enregistrement et sortie sont **confondus** dans `Work` (E8).

Le besoin produit, exprimé dans #71, #72 et la mission G0-02, est
explicite : **un groupe porte plusieurs projets distincts** (un EP, une
tournée, un album en composition), chacun avec ses réalisations, ses
intervenants et ses dates. Un·e artiste solo, un producteur ou un
organisateur porte un projet **sans appartenir à un groupe**.

## 2. Invariants validés à préserver

Ils viennent de `CLAUDE.md` et des décisions acceptées. Cette proposition
n'en modifie aucun.

- Le client n'envoie jamais de valeur de progression ; `XpTransaction` est
  en ajout seul ; l'XP n'entre ni dans la réputation, ni dans la confiance,
  ni dans la recherche.
- Une action unilatérale ne rapporte pas d'XP ; la valeur dépend de la
  preuve (déclarée, corroborée, vérifiée).
- **Crédité ≠ membre** ; **gestion ≠ métier déclaré** (D66) ; **mandat ≠
  propriété** (D65, D71).
- Un crédit confirmé ne se retire que par la personne elle-même (D40).
- Un groupe a toujours une personne responsable ; ses périodes d'adhésion
  et ses actes sont historisés (D37, D38).
- Les étapes de groupe sont des « premières fois » sans ordre imposé ; leur
  contestation suit D49.
- Les droits sont relus côté serveur, en transaction, sous verrou, dans
  l'ordre `collaboration:` → `work:` → `band:` → acteurs (ARCH-MET-02a).
- La progression ne bloque jamais l'usage de base : on crée un morceau, on
  rejoint une jam, on collabore sans rien configurer.
- Toute nouvelle donnée personnelle entre dans l'export et l'anonymisation
  RGPD.

## 3. Options étudiées

1. **A — Modèle existant, corrections ciblées** : libérer les étapes au
   départ d'un membre, aligner le droit de déclarer un concert, assouplir
   l'unicité par jour. Simple, mais les scénarios multi-projets, solo et
   œuvre préexistante restent faux.
2. **B — Relations enrichies et projection** : lever les contraintes
   artificielles (transfert de porteur, collaboration multi-morceaux, solo
   sur scène, archivage des réalisations) et calculer une vue « Mes
   projets » par porteur, sans table. Corrige les défauts vérifiés, mais ne
   peut pas distinguer deux initiatives d'un même porteur.
3. **C — Projet autonome léger** : un objet `Project` facultatif, porté par
   un acteur, qui **référence** des réalisations existantes et réunit des
   participant·es, sans rien posséder. Répond au besoin de regroupement,
   mais ne corrige aucune contrainte artificielle.
4. **Variantes de C écartées** : projet = organisation (C1), étiquette sur
   les morceaux (C2), projet propriétaire de ses morceaux (C3), projets
   hiérarchiques (C4), co-portage par plusieurs structures (C5). Motifs dans
   la [conception 19, §3.4](../conception/19-architecture-cible-collab.md#34-variantes-de-c-examinées-et-écartées).

## 4. Comparaison argumentée

- **B seule ne suffit pas.** « Ces quatre morceaux forment l'EP, ces trois
  l'album » est une **intention de l'utilisateur**, pas un fait calculable.
  Une projection par porteur met tous les morceaux du groupe ensemble. Dès
  qu'on stocke ce regroupement, on a un objet persistant ; autant lui
  donner une seule responsabilité claire. L'audit posait cette condition
  (Q-G0-1 : « si des utilisateurs demandent à regrouper ») : l'énoncé du
  besoin la remplit.
- **C seule ne suffit pas.** Ranger un mauvais modèle dans une boîte ne le
  corrige pas : sans les corrections de B, le solo garde son groupe
  fantôme, l'œuvre préexistante son doublon, et les preuves d'autrui
  restent supprimables.
- **B n'est pas un prérequis de C**, contrairement à ce que suggérait
  l'audit. Les deux chantiers sont indépendants et peuvent avancer dans
  n'importe quel ordre.
- **Coût** : B + C ajoute 5 à 6 tables. Chacune a une seule responsabilité,
  et le projet n'introduit **aucun nouveau système de droits** : sa gestion
  est celle de son porteur.

Matrice des huit scénarios (détail en
[conception 19, §8](../conception/19-architecture-cible-collab.md#8-les-huit-scénarios-rejoués)) :

| Scénario                  | A              | B       | C seule        | **B + C**              |
| ------------------------- | -------------- | ------- | -------------- | ---------------------- |
| A EP + tournée            | Non            | Partiel | Oui            | **Oui**                |
| B Artiste solo            | Groupe fantôme | Oui     | Groupe fantôme | **Oui**                |
| C Ingé son, 2 morceaux    | 2 jours requis | Oui     | 2 jours requis | **Oui**                |
| D Sortie multi-structures | Non            | Non     | Partiel        | **Partiel** (#40, #47) |
| E Festival                | Non            | Non     | Partiel        | **Partiel** (G3)       |
| F Départ du fondateur     | Partiel        | Oui     | Partiel        | **Oui**                |
| G Œuvre préexistante      | Doublon        | Oui     | Doublon        | **Oui**                |
| H Parcours non linéaire   | Linéaire       | Oui     | Linéaire       | **Oui**                |

## 5. Architecture recommandée

**Recommandation : option B + C.** Les corrections de B, et un projet
léger qui référence sans posséder. Ce choix n'est **pas** une décision
approuvée.

Cinq relations distinctes, chacune portée par un seul objet :

| Relation     | Objet                                                |
| ------------ | ---------------------------------------------------- |
| Appartenance | `Membership` (inchangé)                              |
| Portage      | `Work.ownerId` (transférable), `Project.ownerId`     |
| Crédit       | `WorkContributor`, `WorkRole` (inchangés)            |
| Acte prouvé  | `Collaboration` (N morceaux, interprète acteur)      |
| Regroupement | **`Project`** (nouveau), qui référence sans posséder |

**Le projet** : un objectif situé (EP, album, single, tournée, concert,
festival, production, campagne) porté par **un seul acteur** (une personne
ou une organisation). Il référence 0..N morceaux, collaborations et
annonces (plus tard événements, enregistrements, sorties), réunit des
participant·es invité·es, et garde un historique en ajout seul. Un même
morceau peut être dans plusieurs projets. Il n'existe ni sous-projet, ni
co-portage.

**Invariants nouveaux proposés** (détail §5.4 de la conception 19) :

- **I1** Le projet ne possède rien : le clore ou le supprimer ne touche
  aucune réalisation.
- **I2** La participation ne donne **aucun droit** sur les réalisations,
  ni l'adhésion au groupe porteur.
- **I3** Le projet ne prouve rien : aucune XP, aucune étape, aucune
  corroboration. Son avancement est calculé à la lecture.
- **I4** Le projet est **facultatif** : tout geste existant reste possible
  sans lui.
- **I5** On ne range dans un projet que ce à quoi l'on est partie.
- **I6** Une réalisation liée se lit avec **ses propres** droits.
- **I7** La gestion du projet est celle de son porteur, relue à chaque
  écriture ; rien n'est stocké.
- **I8** Historique en ajout seul.
- **I9** Crédit ≠ portage ≠ propriété intellectuelle.
- **I10** Une réalisation qui porte un crédit confirmé d'autrui survit à
  son porteur (archivage).

**Corrections associées** (chacune dans son ticket) :

- transfert consenti d'un morceau d'une personne vers un groupe (#40) ;
- archivage d'un morceau qui porte des crédits d'autrui ; crédits publics
  conservés après dissolution (#40) ;
- collaboration sur plusieurs morceaux, unicité par jour **et** par morceau
  (#36) ;
- concert joué par une **personne** interprète, étapes de scène portées par
  la personne ; le groupe `SOLO` reste pour un nom de scène (#36, #72) ;
- étapes de production libérées au départ d'un membre (#36) ;
- carte de carrière à épreuves parallèles (#72) ;
- principe œuvre → enregistrement → sortie, réalisé dans #40.

**Verrous** : `project:` se place en tête de l'ordre existant. La
finalisation d'une collaboration ne le prend jamais (I3).

## 6. Conséquences

**Positives**

- Un groupe porte plusieurs projets en parallèle ; un·e solo, un
  producteur ou un organisateur porte les siens sans groupe.
- Plus de groupe fantôme ni de morceau en doublon ; les preuves d'un tiers
  ne disparaissent plus par le geste d'un autre.
- Les deuxièmes EP et tournées existent comme projets terminés, sans
  toucher aux étapes « premières fois ».
- Un point d'accroche unique pour les chantiers futurs : sortie (#40),
  événement (G3), label (#47), mandat de projet (#44, #45).
- Aucun nouveau système de droits à sécuriser.

**Négatives**

- Cinq à six tables de plus, et un objet de plus à expliquer dans
  l'interface.
- Deux notions proches à distinguer dans les textes : **groupe** (le
  collectif) et **projet** (l'objectif). Le mot « campagne » actuel doit
  disparaître (#71).
- Un projet abandonné reste dans l'historique ; il faut une interface de
  rangement (états `DONE`, `ABANDONED`).
- Deux recopies de données (liaison morceaux, interprète du concert) et un
  changement de règle visible (suppression → archivage).

**Ce que la décision interdit**

- Créer un projet automatiquement, ou l'exiger pour créer un morceau,
  collaborer ou rejoindre une jam.
- Dériver un droit, un crédit, une XP ou une preuve d'une participation ou
  d'un rangement dans un projet.
- Faire porter un morceau par un projet.

## 7. Risques

| Risque                                                                     | Type          | Mitigation                                                                                  |
| -------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| Ranger le morceau d'autrui dans son projet pour le lire (IDOR)             | Sécurité      | I5 et I6 ; tests de POST forgés à chaque lot                                                |
| Participation utilisée comme droit d'accès                                 | Sécurité      | I2 ; aucun prédicat existant ne lit la participation                                        |
| Interblocage entre projet, morceau et groupe                               | Concurrence   | Ordre `project:` → `collaboration:` → `work:` → `band:` ; tests à barrières                 |
| Spam d'invitations, mineur·es                                              | Sécurité      | Quotas comme D66 ; règles de D37 et D46 ; Q-G0-12                                           |
| Titre d'un morceau co-crédité conservé après suppression du compte porteur | RGPD          | Avis à consigner dans le lot d'archivage ; maquette retirée ; « Compte supprimé »           |
| Double comptage d'une étape de scène (personne et groupe le même soir)     | Progression   | Règles distinctes, tests dédiés dans le lot solo                                            |
| Projet perçu comme obligatoire                                             | UX            | I4 ; tuile « Hors projet » ; aucun formulaire ne l'exige                                    |
| Migration de `Collaboration.workId` et `bandId`                            | Migration     | Recopie idempotente, ancienne colonne lue pendant la transition, retrait dans un lot séparé |
| Index partiels SQL supprimés par Prisma                                    | Migration     | Ajoutés à la liste de `db:nettoyer-migration`                                               |
| Tests existants qui attendent la suppression des morceaux                  | Compatibilité | Réécrits dans le lot d'archivage ; changement de règle consigné dans la conception          |

## 8. Questions nécessitant une validation produit

Le détail et les défauts sont dans la
[conception 19, §9](../conception/19-architecture-cible-collab.md#9-questions-à-trancher-par-le-fondateur).
Les plus structurantes :

1. **Q-G0-1** — Adopter un projet persistant léger dès le lancement
   (recommandé : **oui**, contrairement au défaut de l'audit) ?
2. **Q-G0-3** — Une personne seule peut-elle être interprète d'un concert et
   franchir « Premier concert » sans groupe (recommandé : oui ; demande une
   révision partielle de D64) ?
3. **Q-G0-4** — Transfert d'un morceau d'une personne vers un groupe, sans
   co-portage (recommandé : oui) ?
4. **Q-G0-5** — Archivage au lieu de suppression quand des crédits d'autrui
   existent (recommandé : oui) ?
5. **Q-G0-11** — Un·e participant·e voit le titre et l'état des
   réalisations du projet, rien d'autre (recommandé : oui) ?

Les autres : porteur unique (Q-G0-2), œuvre/master dans #40 (Q-G0-6),
concert engagé par un membre (Q-G0-7), mandat de projet plus tard
(Q-G0-8), carte non linéaire (Q-G0-9), plateaux ouverts aux solos
(Q-G0-10), mineur·es (Q-G0-12), porteurs admis (Q-G0-13), vocabulaire
(Q-G0-14).

Une fois les arbitrages rendus, cette fiche passe en **Acceptée**, avec
les réponses. Une question rejetée modifie la fiche avant son acceptation,
pas après.
