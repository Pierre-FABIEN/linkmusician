# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Mis à jour à chaque fin de lot (dernière : 06/11/2026, P2-08 en cours).

---

```markdown
On reprend LinkMusician pour **finir P2-08** (réputation), puis P2-09.
Ne refais pas l'analyse du projet : CLAUDE.md est déjà chargé, tout ce qui
sert est ci-dessous.

## État (06/11/2026)

- Livré jusqu'à P2-16 et P2-07. P2-08 est 🟡 : code, docs et tests écrits
  et commités (`npm run check`, lint, unitaires verts), mais la base Neon
  était injoignable depuis la session (port 5432, IPv6 seulement). Restent
  en phase 2 : finir P2-08, puis P2-09, P2-10, P2-17, P2-18, et la revue de
  phase 2. Objectif D28 : lancement public à Toulouse début mars 2027.
  L'utilisateur juge que tout se jouera sur une UX simple et agréable.
- Pour finir P2-08, dans l'ordre :
  1. `npm run db:status`, puis `npm run db:deploy && npm run
db:deploy:e2e && npx prisma generate`. La migration
     `20261106120000_reputation_snapshots` est **écrite à la main** :
     vérifier ensuite avec `npm run db:nouvelle-migration -- verif` que le
     diff est vide (supprimer le dossier généré s'il l'est).
  2. `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/progression
src/lib/server/collaborations` (nouveau : `reputation.integration.test.ts`)
     et `GEO_INTEGRATION=1 npx vitest --run src/lib/server/search` (nouveau
     cas : tri D33).
  3. `npm run test:e2e -- e2e/linkmusician` (nouvelle étape 6 de
     `recherche.spec.ts` : carte remplie, score absent des `__data.json`).
  4. Définition de terminé, P2-08 ✅ au tableau §5, prompt de reprise.
- Ce que P2-08 a posé : `core/reputation.ts` (pur : réactivité par
  médiane, score `ln(1+n)` pondéré, `publicReputation`),
  `progression/reputation.ts` (faits lus dans la transaction, jamais l'XP ;
  `recomputeReputation` appelé par le processeur pour `REPUTATION_EVENTS` ;
  `getPublicReputation` calcule à la demande), job `/api/jobs/reputation`
  (cron 3 h 40), carte du profil (`publicProfile.ts`, `confirmed`, avec
  « Répond généralement sous 24/48 h » et sorties vérifiées), tri de
  recherche D33 (réseau, tranche, réputation, distance ; score jamais
  sélectionné), RGPD (export sans score, suppression à l'anonymisation).
- P2-09 (notifications) : lire sa fiche dans docs/plan/phase-2-3.md.
- D30/D31 : lieux vérifiés par SIRET ; revendication en deux niveaux
  (P5-03, raccordement ProConnect à demander à la DINUM).

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
- Ne pas arrêter `npm run dev` de l'utilisateur. Commits sur `main`, en
  français, terminés par la ligne Co-Authored-By. L'utilisateur pousse.
```
