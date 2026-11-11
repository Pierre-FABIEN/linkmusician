# Préparation technique de la phase 5

> Rédigé le 11/11/2026, après la [revue de phase 4](./revue-phase-4.md).
> But : qu'une session de lot n'ait plus à explorer le code. Pour chaque
> lot : ce qui existe, le modèle à copier, le schéma proposé, les étapes,
> les tests et les pièges. Les **valeurs par défaut** proposées ici sont
> reportées dans [a-trancher.md](./a-trancher.md) (Q18 à Q24) ; on code
> avec elles sans attendre.
>
> Les fiches fonctionnelles restent dans [phase-4-6.md](./phase-4-6.md).
> Ce document dit **comment** faire, pas quoi.

## 0. Modèles à copier (déjà dans le dépôt)

| Besoin                                | Modèle                                  | Fichiers de référence                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ouvrir un métier (piste)              | Producteur·rice, P4-04 (`609c5b0`)      | `src/lib/actors/tracks.ts` (`available: true`), `src/lib/crafts/producer.ts` + test, `src/lib/prisma/crafts/producerProfile.ts` + intégration, `src/lib/schema/crafts/producerProfileSchema.ts`, `routes/(app)/profil/production/`, `crafts/ProducerCard.svelte`, `search/filters.ts`, `server/search/musicians.ts`, `core/craftQuests.ts`, `espace/objectifs`, `server/actors/publicProfile.ts`, export et anonymisation dans `prisma/actors/person.ts`, `e2e/linkmusician/producteur.spec.ts` |
| Organisation gérée à plusieurs        | Studio, P4-03a/b (`542549c`, `4ccf1d8`) | `src/lib/studios/rules.ts` (schémas, publication, `publicationGaps`), `src/lib/server/studios/service.ts` (verrou `lockStudio`, `requireManager`, co-gestion, photos `uploadedById`, `getPublicStudio`), `routes/(app)/studios/`, `studios/StudioPublic.svelte`, branche dans `routes/@[handle]/+page.server.ts`                                                                                                                                                                                |
| Rangs lus dans les faits              | Studio, P4-03c (`752c03e`)              | `studioSessionStats` (une session ne compte que confirmée par un·e client·e hors gestion), `rankOf`, `STUDIO_TIERS` dans `progression/core/tiers.ts`, couleurs dans `TierBadge.svelte`                                                                                                                                                                                                                                                                                                          |
| Barème et personas                    | P4-01 (`71fbf1a`)                       | `core/bareme.ts`, `core/crafts.ts`, `core/rules/*` + `rules/index.ts`, `core/events.ts`, `core/personas-son.test.ts` (classe `Pro` + `MemoryLedger`)                                                                                                                                                                                                                                                                                                                                            |
| Étape vérifiée par une organisation   | P4-09 (`a8eb432`)                       | `verifyRecordingFromCollaboration` (`server/milestones/service.ts`), appelé dans `settle` (`server/collaborations/service.ts`) ; test `milestones/recording.integration.test.ts`                                                                                                                                                                                                                                                                                                                |
| Rattacher une collaboration à une org | P4-03c                                  | `studiosOfPair`, `Collaboration.studioId`, select « Au studio » dans `routes/(app)/messages/[id]/+page.svelte`                                                                                                                                                                                                                                                                                                                                                                                  |
| Acte jouable de la carte              | P4-10 (`efc1075`)                       | `src/lib/career/map.ts` (`ACTS`, `CareerFacts`), `server/career/map.ts` (`careerEvidence`), test `map.test.ts`, page `espace/carte`                                                                                                                                                                                                                                                                                                                                                             |
| Succès sans XP                        | P4-07b, P4-13b                          | `core/achievements.ts`, événement dédié dans `core/events.ts` + `actorIdsOf` (`server/progression/events.ts`)                                                                                                                                                                                                                                                                                                                                                                                   |
| Vérification SIRET                    | P2-14d (lieux), P3-09 (organisations)   | `src/lib/venues/siret.ts`, `server/venues/establishments.ts` (table + API Recherche d'entreprises, débit limité, mode e2e sans réseau) ; `server/organizations/verification.ts` (demande, file de modération, approbation)                                                                                                                                                                                                                                                                      |

**Rappels de méthode** (CLAUDE.md) : migration par
`npm run db:nouvelle-migration -- <nom>`, relue, puis `db:deploy` et
`db:deploy:e2e`. **Jamais `prisma format`** sur tout le schéma : il réaligne
le boilerplate (constaté le 11/11). Après chaque migration :
`npx prisma generate`. Toute page nouvelle est déclarée dans
`src/lib/linkmusician/breadcrumbs.ts`. Un hub reste un menu (D50). Dans
les e2e : fermer le bandeau cookies (« Compris ») avant un bouton collé en
bas, attendre la fin des toasts avant `expectNoA11yViolations`, et lire
la carte par `:scope > li`.

**Ordre conseillé** : P5-01 → P5-02 → P5-03a → P5-05 → P5-06 → P5-04 →
P5-08 → P5-07 → P5-11. P5-05 passe avant P5-04, parce que les jams
publiques d'un lieu s'appuient sur l'organisation du lieu, et les
concerts sur l'organisateur.

---

## P5-01 — Personas et barème de la scène

**Existe** : pistes `PROMOTER`, `BOOKER` et `MANAGER` (`TrackKind`),
`available: false`. Aucune règle d'XP ni aucun rang pour la scène.

**À faire** (aucune migration) :

1. `core/tiers.ts` : `PROMOTER_TIERS` (Premier événement → Programmateur
   régulier ≥5 → Scène locale ≥20 et ≥30 groupes → Festival : un
   événement de ≥10 groupes vérifié), `AGENT_TIERS`, partagé par manager
   et booker (Premier artiste → Développeur : ≥1 artiste qui franchit 2
   rangs → Agence, Q21), `VENUE_TIERS` (Lieu ouvert → Scène ouverte ≥3
   dates confirmées → Lieu de la scène locale ≥20 dates et ≥15 groupes →
   Lieu culte ≥50 dates et ≥5 groupes passés Tournée). Chaque série a sa
   fonction `xxxTier(summary)`, sur le modèle de `studioTier`.
2. `core/events.ts` : `gig.held` (`gigId`, `organizerIds`,
   `performerIds`, `venueOrgId?`, `firstDateIds` : artistes dont c'est la
   toute première date, `verified`). `management.confirmed` (`managerId`,
   `artistId`, `kind: 'MANAGER' | 'BOOKER'`). `actorIdsOf` à compléter.
3. `core/crafts.ts` et `bareme.ts` : barème 08 §8-10, **à calibrer** :
   événement tenu 200 et première date d'un groupe 100 pour la piste
   `PROMOTER` ; date bookée et jouée 150 pour `BOOKER` ;
   accompagnement confirmé 200 pour `MANAGER`. Le lieu gagne un **rang**,
   pas d'XP (comme le studio, Q13). La « part de 10 % sur un rang
   franchi » est reportée (Q21).
4. `core/rules/gigHeld.ts` et `managementConfirmed.ts`, enregistrés dans
   `rules/index.ts`. Rendements décroissants par paire, comme
   `collaboration.completed`.
5. `core/personas-scene.test.ts`, copié de `personas-son.test.ts` :
   bar à scène ouverte, café-concert, MJC, association organisatrice,
   booker indépendant, manager débutant. Assertions : semaine d'atteinte
   de chaque rang dans une fourchette crédible.
6. Consigner le barème en conception 02 §2.2 et §5, et 08 §8 à §10 et
   §14.

**Pièges** : les musicien·nes d'un concert gagnent déjà par la
collaboration. `gig.held` ne doit pas leur redonner d'XP, seulement à
qui organise ou booke. Un concert vérifié leur rapporte par l'étape
`FIRST_GIG` (P5-06).

---

## P5-02 — Organisations vérifiées

**Existe** : `OrganizationVerification` (SIRET et lien officiel, statut,
motif), `requestVerification` et `approveVerification` dans
`server/organizations/verification.ts`, file `/moderation`, badge sur le
groupe. La demande ne s'ouvre que depuis
`routes/(app)/groupes/[handle]/+page.svelte` (section ~l. 725).
L'annuaire a son propre SIRET (`Venue.siret`, `verifyVenueSiret`).

**À faire** :

1. Composant `OrgVerificationCard.svelte`, extrait de la page du groupe
   et posé aussi sur `studios/[handle]`, puis plus tard sur la fiche du
   lieu et de l'organisateur.
2. Contrôle automatique avant la modération, dans `requestVerification` :
   chercher le SIRET avec `establishments.ts` (table puis API) et le
   refuser s'il est **inconnu ou fermé** (`active: false`). Joindre à la
   demande le nom et le code NAF trouvés. Il faut deux colonnes
   (`foundName`, `naf`) sur `OrganizationVerification`, donc une migration.
3. Droits liés : `isVerifiedOrg(orgId)` dans `server/organizations/`,
   qui sert à P5-06 (concert `VERIFIED`) et P5-11.
4. Retrait : `revokeVerification(orgId, by, reason)` pour la
   modération. `verifiedAt` repasse à `null` et l'action est journalisée
   (`moderation.*`, libellé obligatoire, testé). Les étapes déjà
   vérifiées **restent** (Q22).
5. Tests : `verification.integration.test.ts` (SIRET fermé refusé,
   retrait), e2e « un studio demande sa vérification, la modération
   l'accepte ».

**Fin de fiche** : « seule une organisation vérifiée peut faire passer
un concert `VERIFIED` ». Ce critère se teste dans P5-06 ; P5-02 livre
`isVerifiedOrg`.

---

## P5-03 — Lieux (à découper : a, b, c)

**Existe** : `Venue` (annuaire : type `VenueKind`, commune, SIRET
vérifié, `backline`, `claimedByActorId` jamais renseigné), `/lieux`,
`/lieux/[id]`, `server/venues/service.ts`. Les jams publiques pointent sur
`Opportunity.venueId`. Q11 : le studio et le lieu restent deux fiches.

**Schéma proposé** (migration `lieux`) :

- `OrgKind` ajoute `VENUE`.
- `VenueProfile` (sur le modèle de `StudioProfile`) : `orgId` @id,
  `capacity Int?`, `stage String` (scène, sono), `conditions
VenueCondition[]` (`FEE`, `HAT`, `EXPENSES`), `days Int[]` (jours
  d'ouverture 1 à 7), `ageRule` (`ALL_AGES`, `ADULTS`, `DAYTIME_MINORS`),
  `publishedAt`.
- `VenueClaim` : `id`, `venueId`, `orgId`, `requestedById`, `level`
  (1 ou 2), `code` (aléatoire, 8 caractères), `proofUrl` (bio Instagram
  ou Facebook, site), `status` (`PENDING`, `APPROVED`, `REJECTED`),
  `reviewedAt`, `reason`.
- `Venue.claimedByActorId` pointe sur l'**acteur de l'organisation
  `VENUE`**, pas sur une personne.

**P5-03a — Revendication niveau 1 (D31)** : bouton « C'est mon lieu »
sur `/lieux/[id]`. Il crée l'organisation `VENUE`, gérée par la
personne (OWNER), et affiche le code à publier. La personne colle le lien
où le code est publié, puis la modération contrôle et approuve. Une fois
approuvé : `claimedByActorId` est renseigné et le badge « Géré par le
lieu » s'affiche. Réutiliser la file de `/moderation` (nouvel onglet ou
type). e2e « un bar revendique sa fiche avec le code publié sur son
compte » (la modération approuve en base ou par l'interface admin).

**P5-03b — Fiche et agenda** : `/lieux/[id]/gerer`, copié de
`studios/[handle]`, avec fiche, publication (`publicationGaps`),
photos, co-gestion et horaires. Page publique : `/lieux/[id]` enrichi,
**pas** de `/@handle` pour un lieu (Q19). Agenda public du lieu : jams
(`upcomingJamsAt`) et concerts (P5-06). Rang `VENUE_TIERS`, lu dans les
faits. Quêtes d'apprentissage (licence, GUSO, SACEM) : liens vers les
fiches `/demarches`, rien n'est géré. e2e « un bar crée sa fiche et
publie une date ».

**P5-03c — Niveau 2 « Gérant vérifié »** : identité comparée aux
dirigeants (API Recherche d'entreprises, champ `dirigeants`), sinon
documents en modération. **Bloqué** par la réponse de la DINUM sur
ProConnect ; il n'est exigé que pour les outils payants (après le
lancement). On peut donc le **reporter après le lancement** (Q20).

**Pièges** : mineur·es (D5), l'`ageRule` du lieu s'ajoute au filtre
« fini avant 22 h » (`endsBeforeCurfew`). Un lieu n'est jamais mis en
avant contre paiement dans le mode jam (P5-09). RGPD : les demandes de
revendication vont dans l'export (`requestedById`).

---

## P5-04 — Jams publiques des lieux

**Existe** : jams publiques (`Opportunity` kind `JAM`, `venueId`,
`startsAt`, `endsAt`), lead et formation (P2-14c : `jamInvites`,
`setJamLead`), appréciations (D27), calendrier. Tout se trouve dans
`server/jam/publicJams.ts`.

**À faire** :

1. Récurrence : `JamSeries` (`venueId`, `orgId`, `weekday`, `startTime`,
   `endTime`, `until?`, `leadId?`). Un job quotidien (QStash, sur le
   modèle des jobs de `server/jobs/`) génère les jams des **4 prochaines
   semaines** avec `seriesId`. Ainsi, rien ne change pour le calendrier,
   « Je viens » ou les appréciations.
2. Animateur·rices affilié·es : `VenueHost` (`orgId`, `personId`,
   `since`) ; le lieu invite, la personne accepte (comme la co-gestion).
3. « Prêt·e à animer une jam » : booléen `canLeadJams` sur `Person`,
   réglé depuis `/jam/dispos` ou le profil musical, visible du seul lieu.
4. Suggestions de leads : `suggestJamLeads(orgId)`. Personnes prêtes à
   animer, à moins de 30 km, triées par **appréciations reçues** et
   **jams animées** (faits), jamais par l'XP. Elles excluent les
   mineur·es pour un lieu `ADULTS` et les personnes bloquées.
5. e2e « je trouve la scène ouverte du jeudi dans le mode jam ».

**Pièges** : D27, aucune XP pour une jam, seules les appréciations
comptent. Pas de notification de masse pour une série : seule la
formation invitée reçoit une notification.

---

## P5-05 — Organisateur·rice

**Existe** : piste `PROMOTER` (`available: false`). Aucune annonce de
plateau : `OpportunityKind` ne contient que `JAM`, `RECRUIT_MEMBER` et
`SESSION_WORK`.

**À faire** (suivre la liste d'ouverture de P4-04) :

1. `PromoterProfile` (`personId`, genres, zone, ce qu'il organise, lien
   vers une organisation `PROMOTER` facultative). `OrgKind` ajoute
   `PROMOTER` pour les associations et collectifs, gérés comme un
   studio.
2. `OpportunityKind` ajoute `GIG_SLOT` (plateau). Champs : date, lieu
   (`venueId`), nombre de groupes, conditions d'éligibilité `minBandTier`
   (rang de groupe), `genreIds` et `radiusKm`. **Jamais l'XP.** La
   candidature réutilise `applications.ts` (P2-03). Le contrôle
   d'éligibilité est **pur** dans `src/lib/opportunities/eligibility.ts`
   et testé : « un groupe hors conditions ne peut pas candidater ».
3. Festivals : jams « off » publiées comme des jams (P2-14b) dans les
   lieux du festival ; rien de nouveau côté données.
4. Stages et masterclasses : reportés avec P5-11 (une `Opportunity`
   `WORKSHOP` éventuelle).
5. `available: true`, carte « Organisateur·rice » du profil public,
   recherche `?metier=organisateur`, objectifs (`craftQuests`), RGPD,
   e2e.

---

## P5-06 — Concerts vérifiés

**Existe** : `CollabKind` contient `GIG`, mais `COLLAB_KINDS` (proposable,
`src/lib/collaborations/rules.ts`) l'exclut. Les étapes `FIRST_GIG` et
`FIRST_TOUR` sont corroborées par l'attestation d'une personne
extérieure (P3-05). Le modèle « vérifié par une organisation » existe
pour l'enregistrement (P4-09).

**À faire** :

1. Remettre `GIG` dans `COLLAB_KINDS` avec un **lieu ou un organisateur
   obligatoire** : `Collaboration.venueOrgId` ou `promoterOrgId`, comme
   `studioId` (migration). Le select « Où » ne s'affiche que pour `GIG`.
2. `verifyGigFromCollaboration(tx, collab, now)` dans
   `milestones/service.ts`, copié de `verifyRecordingFromCollaboration`.
   Si la collaboration est terminée et confirmée par la gestion d'une
   organisation **vérifiée** (`isVerifiedOrg`, P5-02), `FIRST_GIG` passe
   à `VERIFIED` pour le groupe des musicien·nes présents. À appeler dans
   `settle`.
3. Tournée : `FIRST_TOUR` devient `VERIFIED` avec ≥3 concerts vérifiés
   dans ≥3 communes en 30 jours. Calcul **pur** dans
   `src/lib/milestones/tour.ts`, testé ; communes lues dans
   `Venue.communeCode`.
4. Émettre `gig.held` (P5-01) pour l'organisateur et le lieu.
5. Tests d'intégration : un concert avec un lieu **non vérifié** reste
   `CORROBORATED` (critère P5-02) ; trois villes en 30 jours vérifient la
   tournée.

**Pièges** : pas de double XP pour l'étape (la différence d'XP se
calcule déjà selon le niveau de preuve). Un concert contesté suit P3-06.

---

## P5-07 — Booker et manager

**Existe** : pistes `BOOKER` et `MANAGER` (`available: false`).

**À faire** :

1. `Representation` (`agentId`, `artistId` : personne ou groupe, `kind`
   `MANAGER` ou `BOOKER`, `status` `PROPOSED`, `CONFIRMED` ou `ENDED`,
   dates). L'agent propose, l'artiste confirme (pour un groupe : sa
   gestion). Notification `REPRESENTATION_REQUEST`. **Un
   accompagnement non confirmé ne rapporte rien** : critère de fin,
   testé.
2. Confirmation : `management.confirmed` (P5-01) est émis.
3. Dates bookées : sur une collaboration `GIG` (P5-06), le champ
   « Booké par » prend un booker confirmé de l'artiste ; `gig.held` le
   crédite.
4. Profils légers (zone, genres, artistes accompagnés, avec les seuls
   accompagnements confirmés visibles), ouverture des deux pistes, e2e.

**Report** : la « part de 10 % sur un rang franchi par l'artiste » exige
un événement `tier.crossed`. Ce n'est pas nécessaire au lancement (Q21).

---

## P5-08 — Carte : acte V

**À faire** : dans `src/lib/career/map.ts`, acte V `playable: true`,
`passed: (f) => f.verifiedGigs >= 1`. Le fait `verifiedGigs`
(`FIRST_GIG` `VERIFIED` d'un groupe dont on était membre) se calcule dans
`server/career/map.ts`, comme `recordings`. La tournée (`FIRST_TOUR`
vérifiée) donne une 2ᵉ épreuve affichée, pas bloquante. Déblocage : le
radar des pros, « bientôt » (P4-11 vient après le lancement). Carte
souvenir du concert : `server/career/souvenir.ts` (P3-14). e2e de l'acte
V, avec un concert vérifié préparé en base.

---

## P5-11 — Écoles, MJC, conservatoires (D29)

**À faire** :

1. `OrgKind` ajoute `SCHOOL`, géré comme un studio (le ou la prof ou
   responsable en OWNER). La vérification (P5-02) est recommandée, pas
   exigée.
2. Invitation des élèves : lien signé (`SchoolInvite` : jeton haché,
   expiration 30 jours, plafond d'usages). La personne qui le suit
   devient `MEMBER` de l'école (`Membership`). **Aucune liste d'élèves
   publique.**
3. Ateliers jam : des jams (P2-14b) publiées par l'école, `lead` = le
   prof, réservées aux membres (champ `audience: 'SCHOOL'` sur
   `Opportunity`). Mineur·es : seulement les ateliers finis avant 22 h
   (règle existante `endsBeforeCurfew`, testée).
4. Quête « De l'atelier à la scène » (`craftQuests` ou objectifs du
   musicien) : premier atelier, puis première jam publique.
5. _Passeur_ : un prof qui présente des élèves l'obtient déjà par P4-13b
   s'il est Pilier local. Sinon, Q23 : ouvrir le parrainage aux
   responsables d'école vérifiée.
6. e2e « la prof invite un élève, il rejoint l'atelier puis une jam
   publique ».

---

## Valeurs par défaut proposées (reportées dans a-trancher)

| #   | Question                                                | Par défaut                                                     |
| --- | ------------------------------------------------------- | -------------------------------------------------------------- |
| Q18 | Piste `VENUE_HOST` ?                                    | Non (organisation gérée comme un studio)                       |
| Q19 | Page publique d'un lieu : `/@handle` ou `/lieux/[id]` ? | `/lieux/[id]`, déjà indexée et liée aux jams                   |
| Q20 | Revendication niveau 2 avant le lancement ?             | Non : après le lancement, avec les outils payants (D31)        |
| Q21 | Part de 10 % au manager ou booker sur un rang franchi   | Reportée après le lancement (événement `tier.crossed` à créer) |
| Q22 | Retrait de vérification : que deviennent les étapes ?   | Elles restent vérifiées ; seules les suivantes changent        |
| Q23 | Parrainage par les responsables d'école vérifiée ?      | Non au lancement (Pilier local seulement, Q16)                 |
| Q24 | Le lieu gagne-t-il de l'XP ?                            | Non : un rang (comme le studio, Q13) ; l'XP va aux personnes   |
