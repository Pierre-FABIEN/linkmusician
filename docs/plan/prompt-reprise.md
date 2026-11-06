# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Mis à jour à chaque fin de lot (dernière : 06/11/2026, après P2-09b).

---

```markdown
On reprend LinkMusician au lot **P2-10** (confiance TL2 et détection de
collusion). Ne refais pas l'analyse du projet : CLAUDE.md est déjà chargé,
tout ce qui sert est ci-dessous. Lire la fiche « P2-10 » de
docs/plan/phase-2-3.md et la conception 02 §6 (anti-abus) et §7
(confiance).

## État (06/11/2026)

- Livrés et verts : P2-08 (réputation), P2-09a (notifications dans l'app),
  P2-09b (digest email). Restent en phase 2 : P2-10, P2-17, P2-18, puis la
  revue de phase 2. Objectif D28 : lancement public à Toulouse début mars 2027. L'utilisateur juge que tout se jouera sur une UX simple et
  agréable.
- Points ouverts hors lots : docs/plan/README.md §5 bis (à relire en
  début de session, à compléter en fin de lot).
- P2-10, points d'appui :
  - Condition TL2 déjà posée dans `src/lib/server/progression/core/trust.ts`
    (`collaborationsWithTrusted`, lu par `trustSummaryFor` dans
    `progression/trust.ts`) : vérifier qu'elle est complète.
  - Job nocturne : modèle `src/lib/server/jobs/reputation.ts` et sa route
    `src/routes/api/jobs/reputation/` (cron dans `vercel.json`). Graphe des
    collaborations : événements `collaboration.completed`
    (`participantIds`).
  - File de revue en modération : `src/lib/server/moderation/service.ts`
    et `/moderation` ; aucune sanction automatique.
  - Empreinte d'appareil existante (boilerplate) :
    `src/lib/server/deviceContext.ts`, `fraud.ts`.
- Le wifi public de l'utilisateur bloque le port 5432 (Neon injoignable) :
  dans ce cas, écrire la migration à la main et la vérifier ensuite avec
  `npm run db:nouvelle-migration -- verif` (diff vide attendu).
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
