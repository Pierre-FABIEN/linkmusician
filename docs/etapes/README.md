# Étapes de groupe (P3-04)

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
  - Corriger la date ne change pas l'XP déjà versée (registre en ajout seul). Une étape fausse se contestera (P3-06).
  - Les groupes formés avant P3-04 ont reçu leur ligne « Formation » par la migration, sans nouvel événement ni XP.
- **Pages** :
  - section « Parcours du groupe » de `/groupes/[handle]` (membres actifs) : étapes 1 à 6, « C'est fait » pour déclarer (date, précision, XP annoncée), « Modifier » pour corriger, étapes suivantes citées ;
  - carte « Parcours » de `/@handle` du groupe, publique : étapes franchies avec leur niveau de preuve, mois et précision. Elle est masquée tant que seule la formation y figure, déjà dite en tête de page.
- **RGPD** : l'export liste les étapes que la personne a déclarées ; à
  l'anonymisation, l'étape reste au groupe et `declaredById` est oublié.
- **Tests** :
  - `src/lib/milestones/rules.test.ts` et `referential.test.ts` ;
  - intégration `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/milestones` ;
  - e2e `e2e/linkmusician/etapes.spec.ts`.
