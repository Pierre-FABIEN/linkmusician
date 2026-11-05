# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Mis à jour à chaque fin de lot (dernière : 05/11/2026, après P2-15a).

---

```markdown
On reprend LinkMusician au lot P2-15b, puis P2-16. Ne refais pas
l'analyse du projet : CLAUDE.md est déjà chargé, tout ce qui sert est
ci-dessous. Ne lis que : les fiches « P2-15 » (note de découpage) et
« P2-16 » de docs/plan/phase-2-3.md, la section « Après la jam » de
docs/jam/README.md, et les fichiers de code cités ici au moment de les
modifier.

## État (05/11/2026)

- Livré jusqu'à P2-15a (tableau §5 de docs/plan/README.md). Objectif D28 :
  lancement public à Toulouse début mars 2027. L'utilisateur juge que tout
  se jouera sur une UX simple et agréable : soigner chaque écran.
- D27 : une jam ne rapporte rien ; seules les appréciations rapportent
  (règle `endorsement.received` : 40, 20, 10 puis 0 par paire sur 12 mois).
  Les **succès fun de P2-15b ne rapportent aucune XP**.
- D30 (P2-14d) : lieux vérifiés par SIRET, table `establishments` de
  Toulouse Métropole (`npm run seed:etablissements`).
- Code jam (voir `docs/jam/README.md`) :
  - Schéma (fin de `prisma/schema.prisma`) : `Venue`, `Opportunity` JAM,
    `JamSpot`, `JamAttendance` (« Je viens », `instrumentId`,
    `attendedAt` = « J'y étais », `removedAt` = retiré par l'hôte),
    `JamInvite`, `JamEndorsement`, `Establishment`.
  - Pur : `src/lib/jam/publicJam.ts`, `lineup.ts`, `afterJam.ts`.
  - Services : `src/lib/server/jam/publicJams.ts`, `afterJam.ts`
    (`whoWasThere`, `iWasThere`, `endorse`, `removeFromJam`,
    `myRecentJams`, `endorsementsReceived`).
  - Pages : `src/routes/(app)/jams/[id]/` et `presents/`, `(app)/jam/`
    (hub : invitations, « Tes dernières jams »), `@[handle]` (appréciations).
  - Succès existants : `src/lib/server/progression/core/achievements.ts`
    (modèle pour les succès fun, sans XP).
  - RGPD : `exportPersonData` et `personAnonymizationOps` dans
    `src/lib/prisma/actors/person.ts`.
  - E2E : `e2e/linkmusician/jams.spec.ts` (3 tests, deux comptes via
    `browser.newContext()` + `makeAccount()`).

## P2-15b à faire (petit lot)

Succès fun sans XP (_Noctambule_ : jam finie après minuit ;
_Touche-à-tout_ : 3 instruments différents en jam ; _Brise-glace_ :
première appréciation donnée ; _Chef d'orchestre_ : lead d'une jam avec
formation complète) ; « Rejouer ensemble » prérempli (même lieu, mêmes
invité·es proposé·es).

## P2-16 ensuite

Carnet de jams (jams où l'on était, personnes, instruments, styles,
communes) ; réseau musical (gens avec qui l'on a vraiment joué : présence
commune à une jam, collaboration confirmée) ; « Garder le contact » ;
réseau proposé en premier dans la recherche et les invitations
(`networkHandles` de `publicJams.ts` à remplacer) ; RGPD.

## Rappels

- Migration : `npm run db:nouvelle-migration -- <nom>`, relire le SQL,
  `npm run db:deploy && npm run db:deploy:e2e && npx prisma generate`.
  Jamais `npx prisma migrate` ni `prisma format`.
- Vérifs : `npm run check`, `npm run lint` (12 warnings boilerplate
  normaux ; supprimer `playwright-report/` s'il existe), `npm run
test:unit -- --run`, `PROGRESSION_INTEGRATION=1 npx vitest --run
src/lib/server/progression` si on touche au moteur, puis à la fin
  seulement `npm run test:e2e -- e2e/linkmusician` (sortie redirigée dans
  le scratchpad, lire la fin). **Ne jamais modifier le code pendant une
  suite e2e.**
- E2E : la confiance est recalculée après chaque gain d'XP (un compte
  neuf redescend en TL0) ; un lieu créé en base doit avoir
  `validatedAt: new Date()` ; `getByText` avec une chaîne (pas une regex)
  pour les textes que Prettier coupe ; `exact: true` pour un nom affiché.
  Aides `e2e/support/linkmusician.ts` ; Blagnac `{ code: '31069', nom:
'Blagnac', dep: '31', lat: 43.6459, lng: 1.3785 }` ; a11y : exclure
  `.cartButton`.
- Ne pas arrêter `npm run dev` de l'utilisateur. Commits sur `main`, en
  français, terminés par la ligne Co-Authored-By. L'utilisateur pousse.
```
