# D77 — Artiste solo sur scène : la personne interprète d'un concert (P8)

- **Statut : Acceptée** (19/11/2026), **dans le périmètre validé par
  [D72](./D72-architecture-projets-collab.md)** le 18/11/2026 (arbitrage
  **Q-G0-3**, « une personne seule joue en son nom » ;
  [conception 19 §9.4](../conception/19-architecture-cible-collab.md#94-artistes-solo-concerts-et-plateaux-q-g0-3-q-g0-10-révisées)).
  Cette fiche consigne la règle telle qu'implémentée ; elle **ne révise pas
  D64** (voir §3). Les points que D72 ne tranche pas sont des questions
  au défaut (Q101 à Q105, [a-trancher](../plan/a-trancher.md)), pas des
  décisions.
- La partie « plateaux par format et déclaration solo sur le profil »
  (Q-G0-10 révisée), qui **révise D64**, est une décision distincte,
  **Proposée** : [D78](./D78-plateaux-par-format-revision-D64.md) (lot P8b).
- Lot : **P8** ([#36](https://github.com/Pierre-FABIEN/linkmusician/issues/36),
  [#72](https://github.com/Pierre-FABIEN/linkmusician/issues/72)). Code livré
  le 19/11/2026, **tests écrits et non exécutés**.

## 1. Contexte

Avant P8, un concert (`Collaboration(GIG)`) exigeait un groupe (`bandId`)
dont l'une des deux personnes était membre active. Une chanteuse qui joue
seule devait créer un groupe « Solo » fictif pour faire reconnaître sa
date et franchir « La scène » (écart E5 de l'audit). D72 a validé que la
personne peut être l'interprète d'un concert (Q-G0-3) et que le groupe
reste une structure **facultative** distincte de la personne.

## 2. Règle retenue

1. **Interprète** : un concert a un interprète (`Collaboration.performerId`,
   un `Actor`), le groupe **ou** la personne, jamais les deux (DC4,
   conception 21). Les concerts existants gardent leur groupe (recopie de
   `bandId`) ; rien n'est transféré à une personne.
2. **Qui peut jouer en son nom** : l'une des deux personnes de la
   conversation, avec le métier musicien·ne sur son profil (Q104). Aucun
   groupe à créer.
3. **Preuve inchangée** : la gestion (`OWNER`, `ADMIN`) d'un lieu
   revendiqué ou d'une organisation `PROMOTER`, **distincte** de la
   personne interprète, confirme. On ne s'accueille pas soi-même. Les deux
   confirment, la date passée. Sans tiers, rien.
4. **Effets** : la collaboration terminée rapporte comme avant
   (`collaboration.completed`, barème inchangé). `gig.held` crédite qui
   organise et le booker confirmé de la personne, jamais l'interprète.
   « Premier concert » **personnel** : vérifié par une organisation
   vérifiée, corroboré sinon ; « Première tournée » personnelle : trois
   concerts vérifiés en son nom dans trois communes en 30 jours.
5. **Pas de barème nouveau** : une étape personnelle n'émet pas
   `milestone.attested` (qui verserait de l'XP de groupe et des parts de
   membre). Elle est un fait, lu par la carte et la fiche, jamais par l'XP.
6. **Séparation personne / groupe (DC4)** : un concert du groupe ne
   franchit **pas** le « Premier concert » personnel de ses membres ; un
   concert en son nom ne crée **aucune** étape de groupe et ne compte pas
   dans la tournée du groupe. La carte compte les deux sources, chacune
   par sa clé : une même soirée n'est jamais comptée deux fois.
7. **Aucun droit nouveau** : reconnaître un concert joué ne donne aucun
   pouvoir de représentation ; aucune gestion n'est créée.
8. **Données personnelles** : l'étape personnelle et l'interprète sont
   exportés (`etapes_de_scene_personnelles`, `collaborations[].interprete`) ;
   à l'anonymisation, les étapes personnelles sont effacées, le registre
   d'XP reste (ajout seul).

## 3. Compatibilité avec D64

[D64](./README.md) (formation et répertoire, **Acceptée** le 12/11/2026)
dit : un duo ou un groupe de reprises est une organisation `BAND` qui
déclare sa formation ; « rien sur la personne : un·e musicien·ne seul·e
n'apparaît jamais comme un groupe prêt à jouer ».

P8 **respecte** D64 : rien n'est ajouté au profil de la personne, elle
n'apparaît dans aucune recherche de groupe, et un concert joué ne la
présente pas comme « prête à jouer ». Le groupe `SOLO` reste possible (nom
de scène distinct) ; les groupes `SOLO` existants ne sont pas migrés.

Ce que D64 **interdit encore** et que la conception 19 prévoit : la
déclaration « je me produis en solo » sur le profil, la recherche
d'artistes solo et la candidature en son nom aux plateaux « solo ». C'est
la révision partielle de D64, portée par **D78 (Proposée)** et le lot P8b.

## 4. Modèle et code

- Migration additive `20261119180000_collaboration_performer` : colonne
  `performerId` (clé étrangère `actors`, `SET NULL`), index
  `(performerId, kind, status)`, recopie depuis `bandId` pour les concerts.
  **Écrite à la main et non appliquée** (dev, e2e, production).
- `Milestone` inchangée : sa colonne `bandId` référence déjà un `Actor` ;
  une étape personnelle a pour porteur la personne. Verrou `band:<id>`
  du porteur, comme pour un groupe.
- Règles pures : `checkGigParties`, `gigPerformerHandle`, `gigSplitOk`,
  `gigWitnesses` (`#lib/collaborations/rules`) ; `PERSONAL_MILESTONE_KEYS`,
  `personalGigProof` (`#lib/milestones/rules`).
- Services : `gigPartiesOfPair` (personnes musiciennes de la paire),
  `proposeCollaboration`, `settle`, `verifySoloGigFromCollaboration`,
  `personalMilestones` ; lecture N1 (`PERFORMER`), carte souvenir, fiche.
- Contestation : une étape personnelle ne passe pas par la contestation
  des étapes de groupe (Q102).

## 5. Ce qui reste

- **P8b** : formats acceptés par plateau, candidature en son nom,
  déclaration solo, mandat `GIG_SLOT` d'une personne (D78, Proposée).
- **N6** : « Le studio » franchissable par une personne (Q-NL-2).
- Tests P8 et U6 : écrits, **à exécuter**.
