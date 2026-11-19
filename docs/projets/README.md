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

Code : règles pures `src/lib/projects/rules.ts` (et `overview.ts`, U2), schémas
`src/lib/schema/projects/project.ts`, services `src/lib/server/projects/`
(`service.ts` écritures, `view.ts` lectures, `overview.ts` « Mes
projets », `access.ts` gestion, `export.ts` RGPD). Routes : `/projets`, `/projets/nouveau`,
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

## « Mes projets » (P3, U2) — livré le 19/11/2026

Projection et présentation, **sans migration** ni nouvelle capacité.

### Projection (`server/projects/overview.ts`)

- `projectsOverview(personne)` : les projets dont je **gère le porteur**
  (le seul lecteur avant P4), triés, avec pour chacun : nom, type,
  famille, porteur (moi ou la structure), état, dates, **rôle réel**
  (`manage`, « Je gère » ; P4 ajoutera « je participe », « je coordonne »),
  nombre d'éléments **visibles**, ligne d'avancement, prochaine action,
  dernière activité visible, ma dernière action.
- Les éléments sont filtrés par les **mêmes prédicats** que `projectView`
  (I6) : un élément `NONE` d'autrui, ou d'une personne bloquée, ne compte
  pas et n'avance aucune date. Un acte sur un morceau retiré reste compté
  pour sa gestion, comme dans le journal de la fiche.
- **Coût** : 1 requête sans projet, sinon 6, plus 1 quand le journal cite
  un morceau qui n'est plus rangé. Jamais `projectView` par tuile ; la
  fiche, elle, garde `projectView`. Aucun cache : chaque lecture est celle
  de la requête.
- `outsideCount(personne)` (une requête) et `outsideProjects(personne)`
  (`career/service.ts:campaigns` réutilisé, plus deux lectures).

### Règles (`projects/overview.ts`, pures)

| Règle              | Contenu                                                                                                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Famille            | **Enregistré** (single, EP, album, production), **scène** (concert, tournée, festival), **autre** (campagne). Seul l'ordre des blocs de la fiche change : scène = dates d'abord                                                                     |
| Prochaine action   | Clos ou sans gestion → consulter ; une idée que je gère, rangée ici → la reprendre ; un morceau à moi pas encore rangé → ranger ; scène sans date → poser des dates ; vide → créer un morceau ; sans date ni objectif → compléter ; sinon continuer |
| Jamais proposé     | Inviter (P4), confier une tâche (P13), programmer un concert, publier une annonce liée : dits « bientôt », sans bouton                                                                                                                              |
| Tri                | En cours, atteints, laissés de côté ; puis **ma** dernière action, la dernière activité visible, la création, l'identifiant. Aucun métier ni XP en entrée                                                                                           |
| Projet principal   | Le premier projet en cours de ce tri (UX-3, **défaut**, rien n'est enregistré)                                                                                                                                                                      |
| Accueil            | Trois projets au plus en tout, le principal compris quand il est le héros                                                                                                                                                                           |
| Ligne d'avancement | Seulement ce qui se calcule : « 3 morceaux rangés, dont 2 composés », la prochaine date posée ; jamais « 2 mixés sur 4 » (P9, P13)                                                                                                                  |
| **Hors projet**    | Un morceau **que je gère** (`manageableOwnerWhere`) qu'**aucun projet que je peux ouvrir** ne range. Un projet clos range encore ; un projet d'autrui ne compte jamais (sinon il se révélerait)                                                     |

Un morceau crédité ou d'un groupe dont je suis simple membre n'est jamais
« hors projet » pour moi : il reste listé (« Gérés par d'autres »), sans
action. Un morceau dans deux de mes projets est « déjà rangé » une seule
fois, avec les deux noms.

### Écrans

- `/projets` « Mes projets » : projets en cours en tuiles (`ProjectTile`),
  « Créer un projet », « Hors projet » (compteur), atteints et laissés de
  côté repliés. État vide : facultatif.
- `/projets/[id]` : en-tête (type, porteur, état, « Je gère », dates,
  avancement), **une** prochaine action (`project-next`), blocs morceaux,
  dates, journal dans l'ordre de la famille, « Bientôt dans un projet »
  sans bouton. `?ranger=<morceau>` présélectionne un morceau s'il est
  rangeable ici (rien d'autre n'est lu de l'adresse).
- `/espace/campagnes` « Hors projet » (adresse conservée) : rangés nulle
  part (« Ranger dans un projet » ouvre la fiche du projet choisi, où se
  décide le partage), déjà rangés (dans quels projets), gérés par d'autres.
- Accueil Collab (`CollabAdvance`, donc aussi `RoleSpace`) : sans demande
  du moteur N3, le héros est le **projet principal** et sa prochaine action
  (`ProjectHero`, D74 étape 2) ; « Mes projets » (`ProjectsHome`) : l'entrée,
  trois projets au plus, « Créer un projet », « Hors projet » dès qu'il y a
  des morceaux.

Aucune donnée nouvelle : U2 ne stocke rien (ni préférence de projet
principal, ni ordre). Export et anonymisation RGPD inchangés.

### Mesures (schéma e2e, Neon, `overview.perf.integration.test.ts`)

Lecture de `/projets` (projection et compteur « Hors projet », en parallèle) :

| Cas                                      | Projets | Requêtes | Médiane |  Volume |
| ---------------------------------------- | ------: | -------: | ------: | ------: |
| Compte neuf                              |       0 |        2 |   49 ms |   0 Kio |
| Un projet (3 éléments)                   |       1 |        7 |   97 ms | 0,6 Kio |
| 8 projets (5 éléments chacun)            |       8 |        7 |   98 ms | 4,8 Kio |
| Un projet de 200 éléments                |       1 |        7 |  103 ms | 0,6 Kio |
| Groupe multirôle : 6 projets, invisibles |       6 |        8 |  122 ms | 3,6 Kio |

L'accueil `/espace` ajoute ces lectures à son `Promise.all` (en parallèle des
autres) : 2 requêtes sans projet, 7 à 8 sinon.

## Limites de P2 et suites

- **U2, écarts** : tuiles en menu plutôt qu'en mosaïque `sm`/`band` ;
  « Mes projets » sous « À traiter » et l'agenda ; ordre non figé pendant
  la session (P11) ; projets non groupés par porteur dans `/projets` (le
  porteur est sur chaque tuile) ; pas de tuile « Pour démarrer » ni de
  `ShareLevelChoice` (le partage garde le formulaire P2) ; « Créer un
  morceau » n'en revient pas avec le morceau rangé. Type « Autre » : UX-2
  ouvert, l'enum n'est pas étendu.
- **P4 / U3** : le métier est livré par P4a (ci-dessous) ; restent les
  écrans complets de l'équipe (U3).
- **P5 / U4** : partager le morceau d'autrui (initiative côté morceau),
  mention « Partagé dans… » sur la fiche du morceau.
- **P13** : tâches et livrables d'un élément en `WORK`.
- Seuls des **morceaux** se rangent ; collaborations et annonces suivront
  (colonnes nullables, migration additive).
- Groupe porteur dissous : plus personne ne gère son projet ; depuis P4a,
  ses participant·es actif·ves le lisent encore, en lecture seule (Q77).

## Participant·es et capacités (P4a) — livré le 19/11/2026

Métier de la fiche P4 ([conception 19 §10](../conception/19-architecture-cible-collab.md),
§6.2, §6.3, §6.5, §9.1, §9.3), avec une interface minimale de validation ;
les écrans complets viennent avec U3. Fiche du lot :
[fin-du-projet, « P4a »](../plan/fin-du-projet.md).

### Données

| Objet                | Table                  | Contenu                                                                                                                                                                                     |
| -------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProjectParticipant` | `project_participants` | Personne, état (invitée, active, refusée, partie, retirée), rôle libre (libellé sans droit), capacités en vigueur et proposées (`COORDINATE`), reçues « comme membre », qui invite, dates   |
| `ProjectAct`         | `project_acts`         | Actes `INVITED`, `JOINED`, `DECLINED`, `LEFT`, `REMOVED`, `CAPABILITY_GRANTED`, `CAPABILITY_REVOKED`, avec la personne concernée (`subjectId`) et la capacité ; trigger d'ajout seul étendu |

Index partiel `project_participants_open_key` : une participation ouverte
(invitée ou active) par personne et par projet, protégé par
`scripts/migration-clean.mjs`. Migrations additives `project_participants`
et `project_notifications` (types `PROJECT_INVITE`, `PROJECT_JOINED`),
appliquées en dev et e2e, pas en production.

### Accès

- `projectAccess(projet, personne)` (`server/projects/access.ts`) : gestion,
  participation, capacités **en vigueur**, relues sous `project:` puis le
  verrou du porteur à chaque écriture. Une capacité ne vaut que sur une
  participation active, d'un porteur vivant ; reçue comme membre, seulement
  tant que la personne reste membre active ; jamais pour un·e mineur·e.
- `projectReaderWhere(personne)` : les lectures (fiche, « Mes projets »,
  « Hors projet ») ouvrent un projet à sa gestion et à ses participant·es
  actif·ves. Une personne invitée, un simple membre du groupe, un·e ancien·ne
  participant·e et un tiers reçoivent la même 404.
- `readerAccess` calcule le même accès sans requête de plus pour les
  lectures, à partir de la ligne du projet ; aucune écriture ne s'en sert.

### Droits (matrice §6.2, partie P4a)

| Geste                                          | Gestion  | Coordination        | Participation | Sinon                                 |
| ---------------------------------------------- | -------- | ------------------- | ------------- | ------------------------------------- |
| Lire la fiche, l'équipe, les résumés partagés  | ✔        | ✔                   | ✔             | 404                                   |
| Voir les invitations en attente de l'équipe    | ✔        | ✔                   | ✗             | —                                     |
| Modifier dates et phrase d'objectif            | ✔        | ✔                   | 403           | 404                                   |
| Renommer, changer le type ou l'état, supprimer | ✔        | 403                 | 403           | 404                                   |
| Ranger sa propre réalisation                   | ✔        | ✔                   | 403           | 404                                   |
| Retirer un élément                             | ✔        | Ceux qu'il a rangés | 403           | 404 ; la gestion du morceau, toujours |
| Inviter (participation simple)                 | ✔        | ✔                   | 403           | 404                                   |
| Proposer la coordination, la retirer           | ✔        | 403                 | 403           | 404                                   |
| Retirer une personne, annuler une invitation   | ✔        | 403                 | 403           | 404                                   |
| Accepter, refuser, quitter                     | Pour soi | Pour soi            | Pour soi      | 404                                   |

Le partage d'un élément reste à la gestion **du morceau** (P2). Aucune
participation ni capacité n'ouvre `/morceaux/[id]`, un crédit, une adhésion
ou la gestion d'une réalisation (I2, I11) : démontré par
`participants.integration.test.ts`.

### Règles

- **Consentement** : les capacités proposées figurent dans l'invitation et
  valent à l'acceptation ; une coordination ajoutée plus tard s'accepte
  aussi. Un retrait ne demande rien.
- **Mineur·es** (D37, D46, Q-G0-12, Q81) : seulement dans un projet d'un
  groupe dont elles ou ils sont membres actifs, jamais pour coordonner ; le
  refus ne dit pas pourquoi.
- **Blocages** dans les deux sens : invitation impossible (même réponse
  qu'un identifiant inconnu) ; une invitation reçue d'une personne bloquée
  ensuite n'est plus montrée ; une personne bloquée n'apparaît pas dans
  l'équipe, et devient « Une personne » dans le journal.
- **Quotas** (Q79) : 20 invitations en attente, 50 participations ouvertes
  par projet ; pas de réinvitation dans les 30 jours d'un refus.
- **Projet clos** (`DONE`, `ABANDONED`) ou **porteur dissous** : ni
  invitation, ni acceptation, ni capacité nouvelle, ni écriture de la
  coordination. Quitter, retirer et révoquer restent possibles.
- **Départ du groupe porteur** : les capacités reçues comme membre ne
  valent plus dès le départ (relu), et un acte `CAPABILITY_REVOKED` est écrit
  juste après la transaction du départ (`leaveBand`, `removeMember`,
  `leaveOrRemoveManager`), qui tient `band:`/`org:`, verrou pris après
  `project:`. La participation reste. Une personne extérieure garde sa
  capacité.
- **Révocation (I12)** : retirer une capacité ou une participation prend
  `project:`, comme toute écriture qui s'appuie dessus ; testé à barrières
  (retrait avant le verrou : l'écriture échoue ; pendant : le retrait
  attend et l'écriture se termine strictement avant ; départ du groupe
  pendant l'écriture : refus).
- **Notifications** (§9.3, Q80) : l'invitation (nom du projet seulement) et
  l'acceptation, à la personne qui a invité.

### Interface minimale

- `/projets` : bloc **Invitations** (nom, type, porteur, qui invite, rôle,
  ce qui est proposé ; rien d'autre), Accepter ou Non merci.
- `/projets/[id]` : rôle réel (« Je gère », « Je coordonne », « Je
  participe ») ; bloc **Équipe** (personnes actives, invitations pour la
  gestion et la coordination, proposer ou retirer la coordination, retirer,
  quitter, inviter) ; la coordination ne voit que dates et phrase dans
  « Modifier le projet », ni état ni suppression.

### RGPD

- **Export** : `participations` (projet, porteur, état, rôle, capacités,
  reçue comme membre, qui a invité, dates) et `actes_me_concernant` ; rien
  des éléments ni des autres personnes.
- **Anonymisation** : participations ouvertes closes (« partie »), rôle et
  capacités effacés (Q82) ; oubliée comme personne concernée et comme
  autrice d'une invitation ; le journal dit « Compte supprimé ». Les
  projets personnels supprimés emportent leurs participations.

### Coût

`projectView` : **6 requêtes** (5 avant P4a ; la lecture de l'équipe en
ajoute une), 7 quand le journal cite des morceaux invisibles ; inchangé avec
20 participant·es, lu par la gestion ou par une participante (240 à 265 ms
de médiane sur Neon le 19/11/2026, réseau plus lent que lors de la mesure
P2). « Mes projets » : inchangé sans participation, une requête de plus
quand on participe à un projet (majorité, pour les capacités).

### Laissé à U3 et après

- **U3** : écrans complets de l'équipe, « À traiter » étendu (invitations),
  « Inviter les membres du groupe » (UX-8), « Transformer en projet »,
  besoins et intervenants proposés (`PROPOSE`, sans objet avant U3).
- **P13** : tâches confiées ; leur libération à la révocation (§9.1).
- **Structure participante** (studio, label) : prévue par le modèle, pas
  livrée.
- Le résumé quotidien par courriel ne réévalue pas encore une invitation
  retirée entre-temps : il ne porte que le nom du projet.
