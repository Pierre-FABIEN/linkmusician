# Préparation technique de la phase 5

> Rédigé le 11/11/2026, après la revue de phase 4. Les sections des lots
> terminés (P5-01, P5-02, P5-03a, P5-03b, P5-05a, P5-05b, P5-06) ont été retirées ; la route complète est
> dans [fin-du-projet.md](./fin-du-projet.md).
> But : qu'une session de lot n'ait plus à explorer le code. Pour chaque
> lot : ce qui existe, le modèle à copier, le schéma proposé, les étapes,
> les tests et les pièges. Les **valeurs par défaut** proposées ici sont
> reportées dans [a-trancher.md](./a-trancher.md) (Q18 à Q24) ; on code
> avec elles sans attendre.
>
> Les fiches fonctionnelles sont dans [fin-du-projet.md](./fin-du-projet.md).
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

**Ordre conseillé** (restant) : P5-03d → P5-04 → P5-08 →
P5-07 → P5-11. Les concerts s'appuient sur l'organisateur et la fiche du
lieu, les jams publiques sur l'organisation du lieu.

---

## P5-03c et P5-03d — Lieux

**Existe (P5-03a, P5-03b)** : `Venue`, `VenueClaim`, organisation `VENUE`
(`claims.ts`, `managesVenueOrg`), `VenueProfile` et
`server/venues/profile.ts` (fiche, publication, `venueForManager`,
`publicVenueProfile`, `myVenues`), co-gestion commune
(`server/organizations/comanagement.ts`), dates publiées au nom du lieu
(`createGigSlot`, `requireIssuerOrg`), rang (`core/venueSummary.ts`).

**P5-03d — Photos** : copier `studioForPhotoUpload` et `deleteStudioPhoto`
(`server/studios/service.ts`) pour l'organisation `VENUE` ; la route
d'envoi des photos du studio et son composant ; galerie sur
`/lieux/[id]` (photos `PUBLISHED` seulement). Pièges : la photo est portée
par l'organisation (`Media.actorId`), pas par `Venue` ; l'export RGPD des
médias de la personne ne doit pas les inclure.

**P5-03c — Niveau 2 « Gérant vérifié »** : identité comparée aux
dirigeants (API Recherche d'entreprises, champ `dirigeants`), sinon
documents en modération. **Bloqué** par la réponse de la DINUM sur
ProConnect ; il n'est exigé que pour les outils payants (après le
lancement). On peut donc le **reporter après le lancement** (Q20).

**Pièges restants** : mineur·es (D5), l'`ageRule` du lieu s'ajoute au
filtre « fini avant 22 h » (`endsBeforeCurfew`) dans le mode jam (P5-04).
Un lieu n'est jamais mis en avant contre paiement dans le mode jam
(P5-09).

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
