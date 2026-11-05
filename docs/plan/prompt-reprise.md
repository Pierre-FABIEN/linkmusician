# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Mis à jour à chaque fin de lot (dernière : 06/11/2026, après P2-07).

---

```markdown
On reprend LinkMusician au lot P2-08. Ne refais pas l'analyse du projet :
CLAUDE.md est déjà chargé, tout ce qui sert est ci-dessous. Ne lis que :
la fiche « P2-08 » de docs/plan/phase-2-3.md, `ReputationSnapshot` dans
docs/conception/04-modele-donnees.md (§ réputation), et les fichiers de
code cités ici au moment de les modifier.

## État (06/11/2026)

- Livré jusqu'à P2-16 et P2-07 (tableau §5 de docs/plan/README.md).
  Restent en phase 2 : P2-08, P2-09, P2-10, P2-17, P2-18, puis la revue
  de phase 2. Objectif D28 : lancement public à Toulouse début mars 2027.
  L'utilisateur juge que tout se jouera sur une UX simple et agréable.
- P2-08 : `ReputationSnapshot` recalculé par job nocturne et à la
  demande, carte publique de signaux, `internalScore` pour le tri de
  recherche **jamais exposé** (test qui inspecte les payloads JSON), et
  l'XP n'entre pas dans le calcul (test). Points d'appui :
  - Jobs : `src/lib/server/jobs/trust.ts` et sa route
    `src/routes/api/jobs/trust/` (QStash) comme modèle.
  - Faits déjà lus : `getMusicianTier` / `musicianSummary`
    (`src/lib/server/progression/read.ts`, `core/summary.ts`) ;
    « Ce que d'autres confirment » sur le profil
    (`src/lib/server/actors/publicProfile.ts`, `confirmed`).
  - Appréciations (jams `JamEndorsement`, collaborations
    `CollabEndorsement`, D32) : `src/lib/server/endorsements/service.ts`
    (`endorsementsReceived`, `endorsersByInstrument`). Une appréciation
    reprise a `revokedAt` et un événement `endorsement.revoked`.
  - Tri de la recherche : `src/lib/server/search/musicians.ts`
    (`ORDER BY "inNetwork" DESC, meters ASC`) ; le score de réputation
    vient s'y ajouter sans jamais remonter dans la réponse.
  - Temps de réponse (« répond sous 48 h ») : messagerie
    `src/lib/server/messaging/service.ts`.
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
