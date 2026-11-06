# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Mis à jour à chaque fin de lot (dernière : 06/11/2026, après P3-03).

---

```markdown
On reprend LinkMusician avec le lot **P3-11** (morceau minimal, D35). Ne
refais pas l'analyse du projet : CLAUDE.md est déjà chargé, tout ce qui
sert est ci-dessous.

## État (06/11/2026)

- **Phase 2 terminée et revue** ([docs/plan/revue-phase-2.md](./revue-phase-2.md)).
  Objectif D28 : lancement public à Toulouse début mars 2027. L'UX simple
  et agréable prime.
- **P3-01 à P3-03 livrés** ([docs/groupes](../groupes/README.md), D37 à
  D39) : groupes et adhésions (service `src/lib/server/bands/service.ts`,
  garde `requireManager`, `afterJoin`), page publique `/@handle` du groupe,
  fiche du groupe, recrutement au nom du groupe (`joinFromRecruitment`,
  `managesIssuer` dans `src/lib/server/opportunities/service.ts`).
- **P3-11** : lire sa fiche (docs/plan/phase-2-3.md), **D35**
  (docs/decisions/README.md) et conception 06 §4.2 à §4.5. En bref :
  `Work` (titre, état idée ou composé, genres, porteur : un `Actor`,
  personne ou groupe), `WorkContributor` (rôles, confirmation), maquette
  (un `Media`). Seul·e : composé « déclaré », sans XP. À plusieurs :
  composé « corroboré » quand ≥2 rôles sont confirmés et une maquette
  jointe ; 150 XP par contributeur confirmé, une fois par morceau,
  × rendement décroissant par paire de co-auteur·rices × confiance des
  autres ; qui confirme plus tard reçoit sa part à ce moment-là. Idée
  visible de son équipe seulement ; composé public (profil, page de
  groupe). Rôles à pourvoir et « Recruter » (annonce ciblée). Pas de
  `Collaboration.workId` ni de `WorkPitch` (phase 4).
- **Pistes de conception pour P3-11** (à confirmer en début de session) :
  - Moteur : nouvel événement dans `core/events.ts` (par exemple
    `work.composed` avec les contributeurs confirmés, puis
    `work.credit_confirmed` pour une confirmation tardive), règle pure
    dans `core/rules/` sur le modèle de `collaborationCompleted.ts` ;
    `RuleContext` a besoin d'un compteur « morceaux composés ensemble »
    (`core/types.ts`, `core/memory.ts`, `progression/context.ts`) ;
    persona dans `core/personas.test.ts` ; `actorIdsOf` et
    `REPUTATION_EVENTS` à compléter.
  - Droits : un morceau porté par un groupe se gère avec `requireManager`
    (`src/lib/server/bands/service.ts`) ; ajouter un·e contributeur·rice
    suit la règle des invitations de groupe pour les mineur·es (D37 :
    seulement une personne connue). Confirmer son rôle = consentement.
  - Maquette : un lien (comme les liens d'un groupe, `addExternalMedia`
    avec `trustActorId`), jamais une « démo » qui rapporte de l'XP
    musicien.
  - « Recruter » depuis un rôle à pourvoir : préremplir
    `/annonces/nouvelle` (`?groupe=` existe ; ajouter titre et
    instrument) ; type `RECRUIT_MEMBER` pour un groupe, `SESSION_WORK`
    pour une personne.
  - Notifications : un type pour « on te crédite sur un morceau, confirme
    ton rôle » (enum Prisma `NotificationType`, `#lib/notifications/types`,
    icônes de `/notifications`).
  - L'étape « Première composition » (P3-04) s'appuiera sur un morceau
    composé porté par le groupe : prévoir la lecture, sans créer encore
    `Milestone`.
- Ordre prévu : P3-11 → P3-04 à P3-09 → P3-12
  à P3-14 (tableau §4 bis de docs/plan/README.md).
- Points ouverts hors lots : docs/plan/README.md §5 bis.
- Le wifi public de l'utilisateur bloque le port 5432 (Neon injoignable) :
  dans ce cas, écrire la migration à la main et la vérifier ensuite avec
  `npm run db:nouvelle-migration -- verif` (diff vide attendu).

## Rappels

- Migration : `npm run db:nouvelle-migration -- <nom>`, relire le SQL,
  `npm run db:deploy && npm run db:deploy:e2e && npx prisma generate`.
  Jamais `npx prisma migrate` ni `prisma format`.
- Vérifs : `npm run check`, `npm run lint` (12 warnings boilerplate
  normaux ; supprimer `playwright-report/` s'il existe), `npm run
test:unit -- --run`, `PROGRESSION_INTEGRATION=1 npx vitest --run
src/lib/server/progression src/lib/server/collaborations` si on touche au
  moteur ou aux appréciations,
  `GEO_INTEGRATION=1 npx vitest --run src/lib/server/search` si on touche
  à la recherche, puis à la fin seulement `npm run test:e2e --
e2e/linkmusician` (sortie redirigée dans le scratchpad, lire la fin).
  **Ne jamais modifier le code pendant une suite e2e.**
- E2E : la confiance est recalculée après chaque événement de
  progression (un compte neuf redescend en TL0 : remettre `trustLevel`
  juste avant l'action qui l'exige) ; un lieu créé en base doit avoir
  `validatedAt: new Date()` ; `getByText` avec une chaîne (pas une regex)
  pour les textes que Prettier coupe ; `exact: true` pour un nom affiché.
  Deux comptes : `browser.newContext()` + `makeAccount()` (voir
  `jams.spec.ts`). Blagnac `{ code: '31069', nom: 'Blagnac', dep: '31',
lat: 43.6459, lng: 1.3785 }` ; a11y : exclure `.cartButton`.
- Tests d'intégration : `PROGRESSION_INTEGRATION=1 npx vitest --run
src/lib/server/bands src/lib/server/opportunities` pour les groupes et le
  recrutement (modèle : `vi.mock('#lib/server', () => ({ prisma: db }))`
  sur le schéma `e2e`). Un test qui passe par du SQL brut (villes,
  PostGIS) doit aussi faire `process.env.DATABASE_URL = url.toString()`
  (voir `recruitment.integration.test.ts`). Nettoyage : retrouver aussi
  les comptes anonymisés par leur email.
- Index partiel `memberships_open_key` (SQL brut) : protégé par
  `scripts/migration-clean.mjs`, vérifier qu'il n'apparaît pas en
  `DROP INDEX` dans une nouvelle migration.
- Réutiliser une fonction du profil d'une personne pour un groupe : en
  vérifier les règles (exemple : `saveGenres` exige un genre et efface
  les influences ; corrigé en P3-03).
- Ne pas arrêter `npm run dev` de l'utilisateur. Commits sur `main`, en
  français, terminés par la ligne Co-Authored-By. L'utilisateur pousse.
```
