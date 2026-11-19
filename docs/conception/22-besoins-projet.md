# 22 — Besoins d'un projet et intervenants proposés (U3b)

- **Statut : conception validée** (19/11/2026, lot **U3b-a**). La décision
  qui la porte, [D76](../decisions/README.md), est **Acceptée** par le
  fondateur le 19/11/2026, avec les défauts Q91 à Q99. Q96 et Q99 restent
  des pistes d'évolution produit (§14). **U3b-b** (modèle, services, RGPD,
  fiche minimale) : code livré le 19/11/2026, tests écrits à exécuter ;
  U3b-c à faire.
- Issues : [#71](https://github.com/Pierre-FABIEN/linkmusician/issues/71)
  (parcours Collab), [#36](https://github.com/Pierre-FABIEN/linkmusician/issues/36)
  (coordination), préparation de [#89](https://github.com/Pierre-FABIEN/linkmusician/issues/89)
  (Melokiva Assistant, non développé).
- Cadre : [D72](../decisions/D72-architecture-projets-collab.md) (projet
  qui référence sans posséder ni prouver), [conception 19](./19-architecture-cible-collab.md)
  §9.1 (capacités), [conception 20](./20-parcours-ux-collab.md) §7.3, §8.1,
  §8.2, §8.3, §12, [docs/projets](../projets/README.md) (P2, P4a, U3 livrés).

Légende : **[Livré]** existe dans le code ; **[Proposé]** conçu ici, à
valider ; **[Reporté]** hors U3b.

---

## 1. Objectif et scénarios

Un projet dit **ce qui lui manque** : un métier ou une intervention
recherchée, en une phrase. Ce besoin aide la gestion à s'organiser, et
mène ensuite vers les outils qui existent déjà : chercher quelqu'un
(`/decouvrir`), publier une annonce (`/annonces/nouvelle`), inviter une
personne connue (P4a). **Le besoin ne remplace aucun de ces outils et ne
donne aucun droit.**

Six notions, jamais fusionnées :

| Notion                      | Ce que c'est                                                          | Objet                                | État        |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------ | ----------- |
| **Besoin**                  | Un métier ou une intervention recherchée par le projet                | `ProjectNeed`                        | [Proposé]   |
| **Proposition**             | Un besoin soumis à la gestion par la coordination, en attente         | `ProjectNeed` à l'état `PROPOSED`    | [Proposé]   |
| **Invitation**              | Une demande adressée à une personne identifiée, qui doit consentir    | `ProjectParticipant` `INVITED`       | [Livré] P4a |
| **Participation**           | Une personne qui a accepté de rejoindre le projet                     | `ProjectParticipant` `ACTIVE`        | [Livré] P4a |
| **Travail attribué**        | Une tâche ou une étape confiée et acceptée                            | `WorkStep` (P13)                     | [Reporté]   |
| **Collaboration confirmée** | Une réalisation effective, confirmée des deux côtés, qui seule prouve | `Collaboration` `COMPLETED`, crédits | [Livré]     |

Scénarios de référence :

- **S1. Un groupe prépare un EP** et cherche un·e ingé son pour la prise de
  son. La gestion ajoute le besoin « Ingé son · Prise de son », phrase
  « Enregistrer cinq titres en janvier ». Elle ouvre « Trouver un pro »,
  écrit à une ingé son, puis l'invite une fois le contact accepté. Quand
  l'ingé son a rejoint le projet, la gestion marque le besoin pourvu, en la
  désignant.
- **S2. Un producteur cherche un bassiste** pour une session. Projet
  personnel : il ajoute « Musicien·ne · Basse » et publie l'annonce
  « Session » en un geste préparé ; l'annonce reste la source de vérité des
  candidatures.
- **S3. Une artiste organise une tournée** et cherche un·e booker. Le
  besoin mène à `/decouvrir?metier=booker`. Aucune annonce n'est possible
  pour ce métier aujourd'hui : l'écran ne la propose pas (§7.3).
- **S4. Un organisateur cherche des technicien·nes** pour un concert
  (projet porté par une organisation `PROMOTER`). Deux besoins : « Ingé son
  · Façade » et « Ingé son · Retours ». Annonce impossible pour ce porteur
  (§7.3) : la recherche et l'invitation restent.
- **S5. Une coordinatrice repère un manque.** Elle ajoute « Producteur·rice
  · Arrangement » : le besoin naît **proposé**. La gestion le voit dans « À
  traiter », l'ouvre sur la fiche, le valide (en retouchant la phrase) ou le
  refuse. Validé, il est exploitable comme en S1.

---

## 2. Audit de l'existant

| Domaine                 | Ce qui existe [Livré]                                                                                                                                                                                     | Ce que le besoin en réutilise                                    | Limite constatée                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Projet                  | `Project`, `ProjectItem` (morceaux seulement), `ProjectAct` (journal en ajout seul, trigger), quotas (Q76)                                                                                                | Conteneur, journal, états `ACTIVE` / `DONE` / `ABANDONED`        | Aucun objet « besoin » ; rien d'autre que des morceaux ne se range                                       |
| Accès                   | `projectAccess` (gestion relue, participation, capacités effectives, mineur·e), `projectReaderWhere`, `lockProjectContext` (`project:` puis verrou du porteur)                                            | Point de décision unique, relu sous verrou (I7, I12)             | —                                                                                                        |
| Capacités               | `COORDINATE` seule ; `PROPOSE`, `APPROVE` prévues en extension (conception 19 §9.1)                                                                                                                       | « Proposer un besoin » est déjà dans `COORDINATE`                | §9.1 et §7.3 de la conception 20 parlent d'« intervenant proposé » sans objet ni auteur possible (§6.4)  |
| Invitations             | `inviteParticipant`, personnes connues (contacts, membres du porteur), @identifiant pour une ou un adulte (Q81), quotas (Q79), consentement, mineur·es                                                    | Inviter depuis un besoin, rôle libre prérempli                   | Un·e pro trouvé·e par la recherche n'est pas « connu·e » : contact d'abord, ou @identifiant              |
| Annonces                | `Opportunity` (`RECRUIT_MEMBER`, `SESSION_WORK`), `targetTrack` + `targetSpecialty`, `instrumentId`, `workId`, préremplissage `/annonces/nouvelle?cible=&specialite=&morceau=&titre=&instrument=&groupe=` | Préparer l'annonce depuis le besoin, sans recopier sa vie propre | Émetteur : la personne ou un **groupe** géré seulement ; cibles : musicien·ne, ingé son, producteur·rice |
| Recherche               | `/decouvrir` (`parseFilters` : `metier`, `specialite`, `instrument`, `rayon`…), métiers musicien, ingé son, producteur, organisateur, manager, booker                                                     | « Trouver un pro » prérempli, sans envoi                         | XP hors tri (invariant)                                                                                  |
| « À traiter »           | `server/space/inbox.ts` (invitations, coordinations proposées), compteur `answers`, moteur N3 (`project.invitation`, `project.coordination` au rang 2)                                                    | Section « Projets », une règle N3 de plus                        | Pas de boutons dans « À traiter » pour la coordination (écart U3) : on garde ce choix                    |
| Notifications           | `NotificationType` dont `PROJECT_INVITE`, `PROJECT_JOINED`                                                                                                                                                | Aucune au lancement (Q91)                                        | Un type nouveau = migration d'enum et préférences                                                        |
| Métiers                 | `TrackKind`, `SOUND_SPECIALTIES` (prise de son, mixage, mastering, façade, retours), `PRODUCER_SPECIALTIES`, `TrackPicker` (réglages, inscription)                                                        | Vocabulaire du besoin                                            | —                                                                                                        |
| Collaborations, crédits | `Collaboration`, `WorkContributor`, `gig.held`…                                                                                                                                                           | Rien : le besoin n'y touche pas                                  | —                                                                                                        |

**À ne pas reconstruire** : ni une seconde annonce (le besoin n'a pas de
candidatures, d'expiration, de rayon ni de visibilité publique), ni une
seconde invitation (le besoin ne contacte personne), ni une capacité
nouvelle au lancement.

---

## 3. Modèle de données proposé [Proposé]

### 3.1 `ProjectNeed`

Une ligne par besoin, dans la section `LINKMUSICIAN` de `schema.prisma`.

```prisma
/// Un métier ou une intervention que le projet recherche (U3b, D76). Il ne
/// donne aucun droit, ne contacte personne, ne prouve rien (I1, I3).
model ProjectNeed {
  id            String            @id @default(cuid())
  projectId     String
  project       Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  status        ProjectNeedStatus
  /// Métier recherché (sous-ensemble de TrackKind, §3.3), précisé au besoin.
  track         TrackKind
  specialty     String?
  instrumentId  String?
  instrument    Instrument?       @relation(fields: [instrumentId], references: [id], onDelete: SetNull)
  /// Une phrase (280 caractères au plus). Vidée à l'effacement de l'auteur
  /// d'une proposition non retenue (§9.2).
  description   String?
  /// Qui l'a formulé ; qui l'a ouvert, refusé ou clos ; qui l'a pourvu.
  createdById   String?
  createdBy     Actor?            @relation("ProjectNeedAuthor", fields: [createdById], references: [id], onDelete: SetNull)
  decidedById   String?
  decidedBy     Actor?            @relation("ProjectNeedDecider", fields: [decidedById], references: [id], onDelete: SetNull)
  /// Facultatif : la participation active qui le pourvoit (jamais déduite).
  filledById    String?
  filledBy      Actor?            @relation("ProjectNeedFiller", fields: [filledById], references: [id], onDelete: SetNull)
  /// Annonce préparée depuis ce besoin (une au plus) ; l'annonce garde sa vie propre.
  opportunityId String?           @unique
  opportunity   Opportunity?      @relation(fields: [opportunityId], references: [id], onDelete: SetNull)
  decidedAt     DateTime?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  @@index([projectId, status])
  @@index([createdById])
  @@index([filledById])
  @@map("project_needs")
}

enum ProjectNeedStatus {
  PROPOSED
  OPEN
  FILLED
  DECLINED
  CANCELLED
}
```

**Pourquoi pas de table « proposition » séparée** : une proposition est un
besoin qui attend la gestion. Une seconde table doublerait le métier,
l'instrument, la phrase et les droits, et il faudrait recopier à la
validation. Un état suffit, et l'auteur·rice reste lisible.

**Pas de titre libre** : le libellé se déduit du métier (« Ingé son ·
Prise de son », comme `targetLabel` des annonces, étendu aux six métiers
dans `projects/needs.ts`), la phrase dit le reste. Moins de texte
libre, moins de modération.

### 3.2 Journal : `ProjectAct`

Le journal existant reçoit les actes du besoin, sans table nouvelle :

- colonne `needId String?` **sans clé étrangère** (comme `workId`) :
  l'acte survit au besoin et ne se montre qu'à qui voit le besoin ;
- valeurs additives de `ProjectActKind` : `NEED_PROPOSED`, `NEED_OPENED`
  (ajouté par la gestion, ou proposition validée), `NEED_DECLINED`,
  `NEED_UPDATED`, `NEED_FILLED`, `NEED_REOPENED`, `NEED_CANCELLED`,
  `NEED_LINKED` (annonce préparée).
- L'acte ne recopie ni la phrase ni le métier : il dit qui, quoi, quand.
  Le trigger `project_acts_append_only` couvre la colonne nouvelle.

### 3.3 Métiers d'un besoin

Les six métiers que la recherche sait trouver (`SEARCH_TRACKS`) :
musicien·ne (avec instrument facultatif), ingé son et producteur·rice
(avec spécialité facultative), organisateur·rice, manager, booker. Les
métiers `LABEL_PRO`, `PUBLISHER`, `MUSIC_COMMS` n'ont pas de recherche :
ils attendent #47 et #48 (Q95).

### 3.4 Ce que le modèle ne contient pas

- **Aucune localisation** : le besoin hérite de la commune du porteur au
  moment de la recherche ; rien n'est stocké.
- **Aucun lien vers une collaboration, un crédit ou une étape** : un besoin
  pourvu ne prouve rien. La seule preuve reste la collaboration confirmée.
- **Aucun lien vers un morceau** au lancement (Q94) : « les cinq titres de
  l'EP » se dit dans la phrase.
- **Aucun état « brouillon » stocké** (§11) : un brouillon vit dans le
  formulaire, jamais en base.

---

## 4. Cycle de vie [Proposé]

```text
                 ajouté par la gestion
   ┌──────────────────────────────────────────┐
   │                                          ▼
 (coordination)                         ┌──────────┐  marquer pourvu   ┌────────┐
 ajoute ──► PROPOSED ── valider ──────► │   OPEN   │ ────────────────► │ FILLED │
              │  │                      └──────────┘ ◄──── rouvrir ─── └────────┘
              │  └── refuser ──► DECLINED     │
              └── retirer, perte du droit,    └── annuler ──► CANCELLED
                  compte effacé ──► CANCELLED
```

| Transition                  | Qui                                                                                                          | Effet                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Créer → `OPEN`              | Gestion du porteur                                                                                           | Acte `NEED_OPENED`                                                                   |
| Créer → `PROPOSED`          | Coordination                                                                                                 | Acte `NEED_PROPOSED` ; ligne dans « À traiter » de la gestion                        |
| `PROPOSED` → `OPEN`         | Gestion (elle peut retoucher la phrase, le métier avant)                                                     | `decidedById`, `decidedAt` ; acte `NEED_OPENED`                                      |
| `PROPOSED` → `DECLINED`     | Gestion                                                                                                      | Sans motif obligatoire (Q92) ; l'auteur·rice voit « Non retenu » sur la fiche        |
| `PROPOSED` → `CANCELLED`    | L'auteur·rice ; ou le système quand elle ou il perd la coordination, quitte, est retiré·e, efface son compte | Acte `NEED_CANCELLED` (auteur : la personne ou la gestion qui retire)                |
| Modifier `PROPOSED`         | L'auteur·rice, ou la gestion                                                                                 | Acte `NEED_UPDATED`                                                                  |
| Modifier `OPEN`             | Gestion                                                                                                      | Acte `NEED_UPDATED` ; une annonce liée n'est **pas** modifiée                        |
| `OPEN` → `FILLED`           | Gestion ou coordination ; désigner une participation active est facultatif                                   | Acte `NEED_FILLED` ; **aucune** invitation, participation, tâche ni XP               |
| `FILLED` → `OPEN`           | Gestion ou coordination                                                                                      | `filledById` effacé ; acte `NEED_REOPENED`                                           |
| `OPEN` → `CANCELLED`        | Gestion                                                                                                      | Acte `NEED_CANCELLED` ; une annonce liée reste ouverte, la gestion la clôt elle-même |
| Préparer l'annonce (`OPEN`) | Gestion, porteur personne ou groupe (§7.3)                                                                   | `opportunityId` posé dans la transaction de création ; acte `NEED_LINKED`            |

`DECLINED` et `CANCELLED` sont terminaux : on crée un nouveau besoin. La
proposition refusée reste lisible par son auteur·rice et la gestion, pour
éviter de la reproposer à l'identique.

**« Demander une modification »** : pas d'état dédié au lancement (Q92).
La gestion retouche puis valide, ou refuse ; l'auteur·rice repropose.

**Projet clos** (`DONE`, `ABANDONED`) : les besoins se lisent, rien ne
change ; aucun n'est annulé d'office, pour qu'une réouverture les retrouve.
« À traiter » et les prochaines actions ignorent les projets clos.
**Porteur dissous ou effacé** : lecture seule, comme la fiche (§6.5 de la
conception 19).

**Aucune expiration** au lancement : un besoin ouvert ne vieillit pas
(Q93). L'annonce, elle, expire comme toutes les annonces.

---

## 5. Matrice des permissions [Proposé]

Rôles relus par `projectAccess` sous `project:` puis le verrou du porteur.
« Gestion » : la gestion du porteur (la personne, ou `OWNER`/`ADMIN` de
l'organisation). Un simple membre du groupe porteur n'a aucun droit s'il
n'est pas participant·e (I2).

| Action                                       | Gestion                        | Coordination                  | Participation simple       | Invité·e (pas accepté) | Extérieur·e |
| -------------------------------------------- | ------------------------------ | ----------------------------- | -------------------------- | ---------------------- | ----------- |
| Voir les besoins `OPEN` et `FILLED`          | ✔                              | ✔                             | ✔                          | —                      | — (404)     |
| Voir les propositions `PROPOSED`, `DECLINED` | ✔                              | Les siennes                   | —                          | —                      | —           |
| Ajouter un besoin                            | ✔ (`OPEN`)                     | ✔ (naît `PROPOSED`)           | —                          | —                      | —           |
| Retirer sa proposition, la modifier          | ✔                              | Les siennes                   | —                          | —                      | —           |
| Valider ou refuser une proposition           | ✔                              | —                             | —                          | —                      | —           |
| Modifier ou annuler un besoin ouvert         | ✔                              | —                             | —                          | —                      | —           |
| Marquer pourvu, rouvrir                      | ✔                              | ✔                             | —                          | —                      | —           |
| « Trouver un pro » (lien vers `/decouvrir`)  | ✔                              | ✔                             | ✔ (lecture, rien d'envoyé) | —                      | —           |
| Préparer une annonce liée au besoin          | ✔ (porteur personne ou groupe) | —                             | —                          | —                      | —           |
| Inviter une personne connue depuis le besoin | ✔                              | ✔ (participation simple, P4a) | —                          | —                      | —           |

Règles de lecture :

- **Participation simple** : voit ce qui manque au projet, pas les
  propositions internes. Elle peut chercher, mais n'envoie rien au nom du
  projet ; elle ne propose rien au lancement (Q96).
- **Invité·e** : l'aperçu d'invitation reste celui de P4a (nom, type,
  porteur, qui invite, rôle). Les besoins ne s'y montrent pas.
- **Mineur·e** : participant·e d'un projet de son groupe, elle ou il lit
  les besoins ; sans coordination (Q-G0-12), elle ou il ne propose pas.
- **Blocage** : l'auteur·rice bloqué·e devient « Une personne » ; une
  personne désignée comme ayant pourvu, bloquée, aussi.

**Invariants** (vérifiés par les tests, §12) :

- **N1** La coordination ne devient jamais gestion, ni du projet, ni du
  groupe, ni d'un morceau ; valider une proposition n'est pas dans
  `COORDINATE`.
- **N2** Une proposition ne devient jamais d'elle-même une invitation, une
  annonce ou une participation ; une validation ne crée qu'un besoin
  `OPEN`.
- **N3** Une invitation passe toujours par `inviteParticipant` (droits P4a,
  personne connue, quotas, consentement de la personne invitée).
- **N4** Aucun besoin, aucune proposition, aucun « pourvu » n'émet
  d'événement de progression, ne crédite, ne prouve, ne change la
  réputation ou le tri de recherche.
- **N5** Chaque écriture relit les droits sous `project:` puis le verrou du
  porteur ; le client envoie une intention (`propose`, `open`, `decline`,
  `fill`…), jamais un état ni un auteur.
- **N6** Confidentialité de D72 prioritaire : un besoin est privé au projet
  ; une annonce préparée est publique **sans** nommer le projet (Q97).

---

## 6. Propositions et validations [Proposé]

### 6.1 « Proposer à la gestion »

1. La coordination ouvre « Ajouter un besoin » ; le bouton final dit
   « Proposer à la gestion » (et non « Ajouter »), avec la phrase « La
   gestion de Lumière décidera de l'ouvrir. »
2. Le serveur crée un `ProjectNeed` `PROPOSED`, acte `NEED_PROPOSED`.
3. La gestion voit dans « À traiter », section Projets, une ligne
   « Besoin proposé par Sam dans EP Lumière : Ingé son · Mixage », qui mène
   à la fiche, bloc « Besoins » (même choix qu'U3 : on tranche sur la
   fiche). Le compteur `answers` l'inclut ; une règle N3 `project.need`
   la propose au rang 2.
4. Sur la fiche, la gestion lit la proposition et choisit **Ouvrir ce
   besoin** (`lm-btn`, après retouche éventuelle) ou **Ne pas retenir**
   (ghost, confirmation légère). Aucune notification au lancement (Q91) :
   la coordination voit l'état sur la fiche.

### 6.2 Révocation pendant une proposition (I12)

Retirer la coordination, retirer la participation, un départ ou un compte
effacé annulent les propositions **en attente** de la personne, dans la
transaction qui retire le droit (sous `project:`, déjà tenu par P4a). Les
besoins `OPEN` qu'elle a proposés restent : ils appartiennent au projet.
Une validation concurrente d'un retrait voit l'état d'après (barrière).

### 6.3 Quand la gestion perd la gestion

Rien ne change sur les besoins : la gestion se relit à chaque geste. La
nouvelle gestion du groupe hérite des propositions en attente.

### 6.4 Intervenant proposé [Reporté : U3c]

La conception 19 (§9.1) et la 20 (§7.3) citent une « proposition
d'intervenant » que la coordination validerait. Au lancement, personne ne
peut l'émettre : seule la coordination propose, et elle peut déjà inviter
une personne connue. Un objet dédié n'a de sens qu'avec la capacité
`PROPOSE` à la carte, ou si la participation simple peut suggérer (Q96).
Forme prévue, sans migration en U3b :

```text
ProjectNeedSuggestion : needId, personId (personne suggérée, connue de
l'auteur·rice), authorId, status PENDING → ACCEPTED (mène au geste
« Inviter », jamais à une invitation automatique) | DECLINED | CANCELLED
```

---

## 7. Relations avec les autres domaines

### 7.1 Sources de vérité

| Information                        | Possédée par                                     | Source de vérité                   |
| ---------------------------------- | ------------------------------------------------ | ---------------------------------- |
| Ce qui manque au projet            | Le projet (gestion du porteur)                   | `ProjectNeed`                      |
| Qui est dans l'équipe              | La personne (consentement) et la gestion         | `ProjectParticipant` (P4a)         |
| L'offre publique, ses candidatures | L'émetteur de l'annonce                          | `Opportunity`, `Application`       |
| Qui a fait quoi                    | La collaboration confirmée, la personne créditée | `Collaboration`, `WorkContributor` |
| Les tâches confiées                | La gestion de l'élément, la personne qui accepte | `WorkStep` (P13)                   |
| Qui gère le groupe                 | Le groupe                                        | `Membership`                       |

### 7.2 Besoin et invitation

« Inviter pour ce besoin » ouvre la feuille d'invitation de U3, rôle libre
prérempli (« Ingé son · Mixage ») ; rien n'est relié en base (Q98).
Accepter l'invitation **ne pourvoit pas** le besoin : la gestion ou la
coordination le marque pourvu, en désignant éventuellement la personne
parmi les participations actives. Une personne trouvée par la recherche
n'est pas « connue » (D37) : l'écran le dit (« Écris-lui d'abord, ou
invite-la par son @identifiant »).

### 7.3 Besoin et annonce

- « Préparer l'annonce » ouvre `/annonces/nouvelle` prérempli (`cible`,
  `specialite`, `instrument`, `groupe`, `titre`) **et** `besoin=<id>`.
  L'annonce se publie par le service existant ; si `besoin` est fourni, la
  même transaction relit sous `project:` la gestion, l'état `OPEN`, que
  l'émetteur est le porteur, et pose `opportunityId` (acte `NEED_LINKED`).
  Modification minimale de `createOpportunity`, marquée et testée.
- Possible seulement si le porteur peut émettre une annonce (la personne,
  ou un groupe qu'elle gère) **et** que le métier est une cible d'annonce
  (musicien·ne, ingé son, producteur·rice). Sinon le bouton n'existe pas,
  et une phrase dit pourquoi (P4) : « Les annonces de booker ne sont pas
  encore possibles : cherche plutôt dans Découvrir. » (Q95, Q99)
- L'annonce **garde sa vie propre** (expiration, places, clôture,
  modération). Le besoin lit son état en direct (« Annonce ouverte · 3
  candidatures ») pour la gestion ; une annonce `FILLED` suggère « Marquer
  le besoin pourvu », sans le faire.
- L'annonce publique ne nomme pas le projet (N6, Q97).

### 7.4 Besoin et recherche

« Trouver un pro » est un lien `/decouvrir?metier=…&specialite=…&instrument=…`.
La recherche garde ses règles (commune du porteur ou de la personne,
distances par tranches, XP hors tri). Aucun envoi automatique (P12).

### 7.5 Besoin, tâches (P13) et collaborations

Aucun lien direct. Une tâche confiée (P13) part d'un élément partagé en
`WORK`, pas d'un besoin. Une collaboration confirmée naît d'une
conversation entre deux personnes. Un besoin pourvu ne crée ni l'une ni
l'autre ; si P13 veut relier une tâche à un besoin, ce sera un événement
explicite (« Confier une étape à la personne qui pourvoit »), décidé alors.

### 7.6 Organisations et groupes

Le besoin d'un projet de groupe n'est ni une annonce de recrutement du
groupe (`RECRUIT_MEMBER`) ni une adhésion. Un simple membre du groupe qui
n'est pas participant·e ne le voit pas (I2).

---

## 8. UX [Proposé]

### 8.1 Bloc « Besoins » de la fiche

Tuile `md` de la fiche, après l'équipe pour un projet scénique, après les
éléments pour un projet enregistré (ordre de la famille, §7.2 de la
conception 20).

```text
┌ Besoins ────────────────────────────────────┐
│ Ingé son · Prise de son            Ouvert   │
│ « Enregistrer cinq titres en janvier »      │
│ [Trouver un pro] [Inviter] [Annonce ▸] ⋯    │
│─────────────────────────────────────────────│
│ Producteur·rice · Arrangement   Proposé     │
│ par Sam · [Ouvrir ce besoin] [Ne pas retenir]│
│─────────────────────────────────────────────│
│ Musicien·ne · Basse           Pourvu · Inès │
│                        [+ Ajouter un besoin]│
└─────────────────────────────────────────────┘
```

- État en **mot et icône**, jamais par la couleur seule.
- Le menu « ⋯ » porte les gestes rares (modifier, marquer pourvu, annuler).
- Plus de cinq besoins : les cinq premiers, puis « Voir les 8 besoins »
  (sous-écran `/projets/[id]/besoins`).
- Ordre : propositions (gestion) → ouverts → pourvus ; ni refusés ni
  annulés dans la tuile (ils restent dans le sous-écran, repliés).

### 8.2 Ajouter un besoin

`MetroSheet` « Ce qui manque à EP Lumière » :

1. **Métier** (`TrackPicker`, six métiers) ;
2. **Précision** selon le métier : spécialité (ingé son, producteur·rice)
   ou instrument (musicien·ne), facultative ;
3. **Une phrase** (280 caractères, compteur), facultative ;
4. Bouton : « Ajouter » (gestion) ou « Proposer à la gestion »
   (coordination), avec la phrase qui dit la suite.

Erreurs `MetroField` (`role="alert"`) ; envoi `aria-busy` ; saisie gardée
en cas d'erreur. Quota atteint : « 20 besoins ouverts ou proposés au plus :
marque-en un pourvu ou annule-le. »

### 8.3 États vides

| Qui                   | Phrase et action                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Gestion, coordination | « Il te manque quelqu'un ? Dis-le ici : tu pourras ensuite chercher, inviter ou publier une annonce. » [Ajouter un besoin] |
| Participation simple  | Tuile absente (rien à montrer, P5)                                                                                         |
| Projet clos           | Tuile en lecture, sans bouton ; vide : absente                                                                             |

### 8.4 « À traiter » et prochaine action

- Gestion : section Projets, « Besoins proposés » (une ligne par
  proposition, lien vers le bloc de la fiche, `#besoins`). Compteur
  `answers`. Règle N3 `project.need` (rang 2), filtrable comme les autres
  (N4).
- Prochaine action de la fiche (§7.3 de la conception 20) : gestion
  « proposition à trancher » avant « besoin sans annonce ni invitation » ;
  coordination « besoin ouvert sans personne invitée ».

### 8.5 Révocation, erreurs, accessibilité, mobile

- Droit retiré entre l'affichage et le geste : la page se recharge, toast
  « Tes droits sur ce projet ont changé. » (§8.3 de la conception 20).
- Proposition déjà tranchée par une autre personne de la gestion : « Cette
  proposition a déjà été traitée. »
- Annonce impossible : phrase d'explication, jamais un bouton désactivé
  sans raison.
- 390 px : une colonne, boutons en pile, cibles de 44 px, `MetroSheet` en
  bas ; focus piégé, Échap, retour du focus ; changements annoncés par
  `aria-live="polite"`. E2E avec `expectNoA11yViolations`.
- Tout le parcours marche sans assistant.

---

## 9. Confidentialité, RGPD, quotas, anti-abus

### 9.1 Confidentialité

Le besoin est **privé au projet** (projets privés au lancement, D72). Il ne
se montre ni sur le profil public, ni dans la recherche, ni dans le
journal d'un projet pour qui ne le voit pas. Pages en `private, no-store`.
Une annonce préparée est publique par nature, sans nom de projet.

### 9.2 RGPD

- **Export** : besoins formulés par la personne (projet, porteur, métier,
  phrase, état, dates) ; besoins où elle est désignée comme ayant pourvu
  (projet, métier, date) ; actes de besoin qu'elle a posés (comme P4a).
- **Anonymisation** : `createdById`, `decidedById`, `filledById` oubliés
  (`SetNull`) ; ses propositions `PROPOSED` passent `CANCELLED` ; la phrase
  de ses propositions `PROPOSED`, `DECLINED` ou `CANCELLED` est vidée (texte
  libre non retenu par la gestion) ; celle d'un besoin `OPEN` ou `FILLED`
  reste, validée par la gestion et propriété du projet. Auteur d'acte
  oublié (trigger existant).
- Projet personnel supprimé à l'effacement : ses besoins partent en
  cascade.

### 9.3 Quotas et anti-abus (défauts, Q93)

- 20 besoins `OPEN` + `PROPOSED` par projet ;
- 5 propositions en attente par personne et par projet ;
- 30 besoins créés par personne sur 24 h, tous projets confondus ;
- phrase de 280 caractères, sans lien cliquable (texte brut) ;
- aucun gain, aucun compteur public : rien à farmer. Le texte libre d'un
  projet privé n'a pas de signalement au lancement, comme sa description.

---

## 10. Architecture technique [Proposé]

| Couche            | Fichier                                     | Contenu                                                                                                                                                                                    |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Règles pures      | `src/lib/projects/needs.ts`                 | Métiers admis, libellés, transitions (`needTransition`), qui peut faire quoi (`needActions(role, status, isAuthor)`), quotas, lien d'annonce possible, liens de recherche                  |
| Schémas Zod       | `src/lib/schema/projects/need.ts`           | `projectNeedDraftSchema` (métier, précision, phrase), réutilisé par le formulaire **et** par #89 ; schémas d'intention                                                                     |
| Services          | `src/lib/server/projects/needs.ts`          | `addNeed`, `updateNeed`, `decideNeed` (open/decline), `withdrawNeed`, `fillNeed`, `reopenNeed`, `cancelNeed`, `linkNeedOpportunity` ; tous sous `lockProjectContext`, `projectAccess` relu |
| Révocation        | `server/projects/participants.ts`           | `cancelPendingNeeds(tx, projectId, personId, authorId)` appelée par retrait, départ, retrait de capacité                                                                                   |
| Lecture           | `server/projects/view.ts`                   | Besoins filtrés en base selon le rôle, dans `projectView` (une requête de plus au plus)                                                                                                    |
| « À traiter », N3 | `server/space/inbox.ts`, `lib/career/next/` | `pendingNeedProposals(personId)`, règle `project.need`                                                                                                                                     |
| Annonce           | `server/opportunities/service.ts`           | `createOpportunity` accepte `needId` (modification minimale), lien dans la transaction                                                                                                     |
| RGPD              | `server/projects/export.ts`, anonymisation  | §9.2                                                                                                                                                                                       |

**Verrous** : `project:` → verrou du porteur (`band:`/`studio:`/`org:`) ;
aucune clé `need:` (le besoin vit sous `project:`). L'annonce liée : la
création d'annonce prend `project:` avant ses propres écritures.

**Intentions serveur** (N5) : `add`, `update`, `withdraw`, `open`,
`decline`, `fill`, `reopen`, `cancel`, `link`. Le client n'envoie jamais
`status`, `createdById` ni `decidedById`.

---

## 11. Compatibilité avec Melokiva Assistant (#89)

Phrase cible : « Il nous manque un ingé son pour enregistrer les cinq
morceaux de notre EP. »

- L'assistant (plus tard) produira un **brouillon** au format
  `projectNeedDraftSchema` : `{ track: 'SOUND_ENGINEER', specialty:
'RECORDING', description: 'Enregistrer les cinq morceaux de l'EP' }`,
  plus le projet visé, qu'il ne choisit pas seul si l'ambiguïté existe.
- Le brouillon **ne s'enregistre pas** : il ouvre la même feuille
  « Ajouter un besoin » préremplie (adresse `/projets/[id]?besoin=nouveau&metier=inge-son&specialite=prise-de-son&phrase=…`),
  que la personne relit et confirme. Le bouton reste « Ajouter » ou
  « Proposer à la gestion » selon son rôle : l'assistant n'a **aucun droit
  propre**.
- Aucune mutation automatique, aucun appel de modèle, aucune voix dans
  U3b. Les services exposent des intentions nommées, réutilisables telles
  quelles par une future couche de commandes.

---

## 12. Migrations envisagées (non exécutées)

Une seule migration additive, en U3b-b :

1. `CREATE TYPE "ProjectNeedStatus"` ; table `project_needs` et ses index ;
   clé unique sur `opportunityId`.
2. Valeurs additives de `ProjectActKind` (`NEED_*`) ; colonne
   `project_acts.needId` nullable, sans clé étrangère, index
   `(projectId, needId)` si la lecture le demande.
3. Relations inverses sur `Project`, `Actor`, `Instrument`, `Opportunity`
   (aucune colonne du boilerplate).

À relire : Prisma proposera de supprimer les index SQL bruts connus
(`project_participants_open_key`, etc.) : `db:migrate -- --create-only`,
`db:nettoyer-migration`, `db:deploy`, `db:deploy:e2e`.

---

## 13. Stratégie de tests

- **Unitaires** (`projects/needs.test.ts`) : transitions autorisées et
  refusées ; `needActions` pour les cinq profils et chaque état ; métiers
  admis ; annonce possible selon porteur et métier ; liens de recherche ;
  quotas ; schéma de brouillon (accepte la phrase cible, refuse un état ou
  un auteur envoyé par le client).
- **Intégration** (`needs.integration.test.ts`) : matrice §5 par profil
  (dont simple membre du groupe non participant : 404, mineur·e) ;
  proposition → validation → `OPEN` sans invitation ni annonce (N2) ;
  refus ; retrait par l'auteur ; **courses à barrières** : validation ↔
  retrait de la coordination, validation par deux personnes de la gestion,
  pourvu ↔ départ de la personne désignée ; quotas ; projet clos (409) ;
  porteur dissous ; annonce liée (relecture sous verrou, émetteur ≠
  porteur refusé, métier non admis refusé) ; aucun `DomainEvent` ni
  `XpTransaction` (N4) ; journal en ajout seul ; RGPD export et
  anonymisation ; coût de `projectView` (requêtes constantes avec 0, 5, 20
  besoins).
- **E2E** (`projets-besoins.spec.ts`) : S5 au clavier (coordination
  propose, gestion valide depuis « À traiter ») ; S1 jusqu'à « pourvu » ;
  participant·e simple qui ne voit pas les propositions ; 390 px et axe.

---

## 14. Questions à arbitrer

Consignées avec leur défaut dans [a-trancher](../plan/a-trancher.md)
(Q91 à Q99). **Validées aux défauts le 19/11/2026** (D76). Q96 et Q99
restent des **pistes d'évolution produit** : suggestions de besoins par
les participant·es, annonces adaptées au métier des structures
professionnelles.

| #   | Question                                                                 | Défaut proposé                                                                                        |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Q91 | Notifier la gestion d'une proposition, l'auteur·rice de la décision ?    | Non : « À traiter » et la fiche suffisent ; aucun type nouveau                                        |
| Q92 | « Demander une modification » comme état distinct ? Motif de refus ?     | Non : retoucher puis valider, ou refuser sans motif obligatoire                                       |
| Q93 | Quotas, expiration d'un besoin ouvert                                    | 20 par projet, 5 propositions en attente par personne, 30/24 h ; pas d'expiration                     |
| Q94 | Relier un besoin à des morceaux rangés du projet ?                       | Non au lancement : la phrase le dit                                                                   |
| Q95 | Métiers sans recherche (label, édition, communication)                   | Exclus jusqu'à #47 et #48                                                                             |
| Q96 | La participation simple peut-elle proposer un besoin ou un intervenant ? | Non au lancement ; `PROPOSE` à la carte et `ProjectNeedSuggestion` en U3c                             |
| Q97 | L'annonce publique nomme-t-elle le projet ?                              | Non (projets privés, D72)                                                                             |
| Q98 | Relier l'invitation au besoin en base (`needId` sur la participation) ?  | Non : rôle prérempli ; « pourvu » reste un geste explicite                                            |
| Q99 | Annonce pour un porteur `PROMOTER`, `STUDIO`, `VENUE`                    | Pas en U3b : l'émetteur d'annonce reste la personne ou un groupe ; lot à part si le pilote le demande |

---

## 15. Découpage de l'implémentation

| Lot       | Contenu                                                                                                                                                                               | Dépendances            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **U3b-a** | Cette conception, D76 Acceptée, Q91 à Q99 (documentaire)                                                                                                                              | —                      |
| **U3b-b** | Migration additive ; règles pures, schémas, services (§10), révocation, RGPD, lecture dans `projectView` ; interface minimale sur la fiche ; tests unitaires et d'intégration (§13)   | D76 validée ou défauts |
| **U3b-c** | Écrans Metro complets (§8), sous-écran, « À traiter » et règle N3, « Préparer l'annonce » (lien `createOpportunity`), « Trouver un pro », « Inviter pour ce besoin », aide, démo, E2E | U3b-b                  |
| **U3c**   | [Reporté] Intervenants proposés (`ProjectNeedSuggestion`, `PROPOSE` à la carte), si Q96 l'ouvre                                                                                       | Pilote                 |

U3b n'est **pas livré** tant que U3b-b et U3b-c ne le sont pas.
