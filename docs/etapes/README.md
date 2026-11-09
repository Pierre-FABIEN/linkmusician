# Étapes de groupe (P3-04, P3-05)

Les **étapes** sont les « premières fois » d'un groupe (conception 02 §2.2 et
§4) : formation, première répétition, premier concert… Chacune a un
**niveau de preuve** (déclarée, corroborée, vérifiée), et le passage de l'un
à l'autre rapporte la différence d'XP. P3-04 pose le référentiel, le modèle
et la déclaration (D41) ; les preuves et attestations arrivent avec P3-05,
la contestation avec P3-06.

- **Étapes ouvertes au lancement (D41)** : 1 à 6.
  - _Formation_ : automatique à la 2ᵉ adhésion active (P3-01), vérifiée.
  - _Première composition_ : suit les morceaux du groupe (P3-11). Elle naît au premier morceau composé, _déclarée_, ou _corroborée_ s'il l'est déjà. Elle devient _corroborée_ dès qu'un morceau du groupe l'est. Elle ne se déclare pas à la main.
  - _Première répétition_, _premier enregistrement_, _première démo publique_, _premier concert_ : **déclarées** par la gestion du groupe.
  - _Première tournée_, _premier EP_, _premier album_, _signature_ : annoncées (« Ensuite : … »), pas encore déclarables (preuves externes, P3-07, labels).
- **Modèle** :
  - `MilestoneDefinition` : le référentiel (clé du moteur, rang, libellé, mode `formation`, `work`, `declare` ou `later`, `version`, `active`). Il est chargé par `npm run seed:referentiels`, rejouable : `prisma/seed-data/milestones.js`. Changer un libellé ou un mode : incrémenter `MILESTONES_VERSION`. Une étape retirée est désactivée, jamais supprimée ;
  - `Milestone` : une par groupe et par étape (`@@unique([bandId, definitionId])`). Elle porte `proof` (`MilestoneProof`), `occurredAt` (le jour de l'étape, à midi UTC), une précision publique facultative `note` (80 caractères), `declaredById`, `workId` (le morceau qui porte la composition) et `definitionVersion`.
  - Le **barème** reste dans le moteur (`progression/core/bareme.ts`), pas dans la table : une seule source pour l'XP.
- **Règles pures** : `src/lib/milestones/rules.ts` (catalogue, libellés de
  preuve, `isUpgrade`, `compositionProof`, `membersAt`, `creditDate`,
  `declareBlocker`, formulaires). Le test `referential.test.ts` vérifie que
  le seed, le catalogue et le moteur parlent la même langue.
- **Service** : `src/lib/server/milestones/service.ts`, seul point
  d'écriture, sous le verrou du groupe (le même que les adhésions).
  - `recordFormation` est appelé par `afterJoin` (groupes) ;
  - `syncComposition` est appelé par « C'est composé », par la corroboration d'un morceau et par la formation : un groupe qui a composé avant d'être formé reçoit l'étape en se formant ;
  - `declareMilestone` et `updateMilestoneDetails` servent la page du groupe.
- **Droits** : déclarer ou corriger une étape, c'est la gestion du groupe
  (OWNER ou ADMIN actifs). Le groupe doit être **formé** : seul·e, rien ne
  rapporte (D40). Seules les étapes déclarées se corrigent (date, précision).
- **Progression** : chaque création ou renforcement émet
  `milestone.attested` (`from`, `to`, `memberIds`).
  - Le groupe reçoit la différence d'XP du barème. Une étape déclarée rapporte 30 à 50 XP.
  - Chaque membre présent à la date de l'étape reçoit 25 % (`milestone.member`).
  - Une étape antérieure à la formation sur la plateforme (un groupe qui existait avant) est créditée à l'effectif de la formation : l'historique d'avant est inconnu (`creditDate`).
  - Corriger la date ne change pas l'XP déjà versée (registre en ajout seul). Une étape fausse se conteste (P3-06).
  - Les groupes formés avant P3-04 ont reçu leur ligne « Formation » par la migration, sans nouvel événement ni XP.
- **Pages** :
  - section « Parcours du groupe » de `/groupes/[handle]` (membres actifs) : étapes 1 à 6, « C'est fait » pour déclarer (date, précision, XP annoncée), « Modifier » pour corriger, étapes suivantes citées ;
  - carte « Parcours » de `/@handle` du groupe, publique : étapes franchies avec leur niveau de preuve, mois et précision. Elle est masquée tant que seule la formation y figure, déjà dite en tête de page.
- **RGPD** : l'export liste les étapes que la personne a déclarées ; à
  l'anonymisation, l'étape reste au groupe et `declaredById` est oublié.

## Preuves (P3-05, D43)

- **Ce qui corrobore** (une seule corroboration par étape, règles pures
  `src/lib/milestones/proofs.ts`, testées) :
  - _Répétition_ : un autre membre, présent à la date, confirme ;
  - _Enregistrement_ : une personne hors groupe qui y a participé confirme (un lien vers un extrait est facultatif) ;
  - _Démo publique_ : un lien d'écoute public (YouTube, SoundCloud, Bandcamp, Spotify, Deezer, Apple Music, Tidal, Audiomack), **relu par la modération** même si la personne est de confiance ;
  - _Concert_ : un lien vers l'événement ou l'affiche (`https`) **et** une personne hors groupe qui y était.
- **Personne hors groupe** : confiance TL1 au moins (au lieu de TL2, faute
  de TL2 au début du pilote, D43), jamais membre ni ancien membre, pas de
  blocage, un·e mineur·e seulement si la gestion le ou la connaît (règle
  des invitations, D5). Les conditions se revérifient au moment de
  confirmer. L'appartenance au groupe est dite d'abord (la gestion connaît
  ses membres) ; le blocage et l'âge ne le sont jamais.
- **Modèle** : `MilestoneAttestation` (une par étape et par personne,
  `role` `MEMBER` ou `OUTSIDER`, `status` `REQUESTED`, `CONFIRMED`,
  `DECLINED`, `requestedById`) et `MilestoneEvidence` (`kind` `EVENT`,
  `LISTEN`, `RECORDING`, `status` `PENDING`, `ACCEPTED`, `REJECTED`, revue
  par qui et pourquoi). 5 demandes en attente et 3 liens au plus par étape.
- **Service** : `src/lib/server/milestones/proofs.ts`, sous le verrou du
  groupe : `requestAttestation`, `answerAttestation`, `addEvidence`,
  `reviewEvidence` (modération), `evaluate` qui passe l'étape à
  « corroborée » dès que la règle est remplie (`milestone.attested`,
  différence d'XP : +20 répétition, +150 enregistrement, +250 démo, +350
  concert, et 25 % aux membres présents).
- **Cercles fermés** : une confirmation émet
  `milestone.attestation_confirmed` (sans XP) ; la détection nocturne
  (`jobs/collusion.ts`) y lit la paire « qui confirme, qui a demandé ».
- **Écrans** :
  - panneau « Prouver » sous chaque étape déclarée (`/groupes/[handle]`) : ce qu'il manque, liens et demandes avec leur état, formulaires ;
  - `/etapes/[id]` : la personne sollicitée voit l'étape, les liens, et répond (**Je confirme, j'y étais** ou **Je n'y étais pas**). 404 pour toute autre personne ;
  - notification `MILESTONE_ATTEST` (préférence « Étapes de groupe à confirmer ») ;
  - `/moderation` : « Preuves de démo à vérifier » (accepter, refuser avec un motif, journal d'audit).
- **RGPD** : l'export liste les confirmations demandées à la personne et
  les liens qu'elle a joints ; à l'anonymisation, ses demandes en attente
  sont supprimées, ses réponses restent (l'étape du groupe en dépend),
  `requestedById` et `addedById` sont oubliés.
- **Contester** une étape : voir ci-dessous (P3-06).
- **Tests** :
  - `src/lib/milestones/rules.test.ts` et `referential.test.ts` ;
  - intégration `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/milestones` ;
  - `src/lib/milestones/proofs.test.ts` ;
  - intégration `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/milestones` (dont `proofs.integration.test.ts`) ;
  - e2e `e2e/linkmusician/etapes.spec.ts` (déclarer ; un membre ne corrobore pas le concert, une personne extérieure si).

## Contestation et retrait (P3-06, D49)

- **Qui se conteste** : les étapes déclarées par le groupe (mode
  `declare`) ; ni la formation ni la composition. Règles pures
  `src/lib/milestones/disputes.ts` (testées).
- **Contester** : sur `/@handle` du groupe, carte « Parcours », « Une étape
  te semble fausse ? » (personne connectée, pas membre actif, explication
  de 10 caractères au moins). Signalement `ReportTarget.MILESTONE`
  (`reason` `OTHER`, l'explication en `details`), anonyme pour le groupe.
- **Gel** (`Milestone.frozenAt`) : seulement si la personne a la confiance 1
  au moins. Gelée, l'étape s'affiche « En vérification » (page publique et
  gestion), ne reçoit plus ni demande, ni confirmation, ni lien, ne se
  corrige ni ne se retire ; `evaluate` ne la corrobore pas.
- **Modération** (`/moderation`, « Étapes contestées », `disputeQueue`) :
  - **Retenir** (`upholdContest`, motif obligatoire) : chaque gain des
    événements `milestone.attested` de l'étape est repris (`reverseGain`,
    `reversesId`), `milestone.revoked` (`reason: contested`) la retire des
    paliers (`musicianSummary`), la ligne est supprimée avec ses preuves ;
    avertissement (`sanction` WARNING, 30 jours, confiance recalculée) pour
    qui l'a déclarée et chaque personne qui l'a confirmée ; signalements
    `ACTIONED` ; journal d'audit ;
  - **Rejeter** (`dismissContest`) : signalements `DISMISSED`, dégel,
    réévaluation des preuves acceptées entre-temps.
- **Retrait par la gestion** (`retractMilestone`) : « Retirer l'étape »
  dans le formulaire « Modifier » ; même reprise (`reason: retracted`),
  sans avertissement ; l'étape peut être redéclarée.
- **Limites** : une confirmation mensongère se juge avec l'étape qu'elle
  corrobore (pas de signalement séparé) ; le groupe n'est pas notifié du gel
  ni de la décision (à ajouter avec les notifications de modération).
- **Tests** : `src/lib/milestones/disputes.test.ts`, résumé
  `progression/core/summary.test.ts`, intégration
  `src/lib/server/milestones/disputes.integration.test.ts`.

## Rangs de groupe et part des membres (P3-08)

- **Rang** (`bandTierOf`, `src/lib/server/milestones/service.ts`) : la
  dernière étape du parcours au niveau corroboré ou plus (la formation
  compte toujours), règle pure `bandTier` (`progression/core/tiers.ts`) ;
  une étape gelée (D49) ne compte pas. Libellés : Projet, Répète, Compose,
  Enregistre, Démo, Live, Tournée, EP, Album, Signé. Public (un fait
  prouvé) : badge `TierBadge` sur `/@handle` du groupe, `/groupes/[handle]`
  et `/groupes`.
- **Part des membres** : déjà fixée par `attest` (P3-04) à chaque
  `milestone.attested` : `memberIds` = membres présents à la date de l'étape
  (`membersAt`, `creditDate` pour une étape d'avant la formation), 25 % de
  l'XP du groupe (`milestone.member`). Un membre arrivé après l'étape n'en
  reçoit rien, même quand elle se corrobore plus tard.
- **Tests** : `src/lib/server/milestones/tiers.integration.test.ts`.
