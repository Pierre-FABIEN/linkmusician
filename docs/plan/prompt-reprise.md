# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Mis à jour à chaque fin de lot (dernière : 05/11/2026, après P2-16).

---

```markdown
On reprend LinkMusician au lot P2-07. Ne refais pas l'analyse du projet :
CLAUDE.md est déjà chargé, tout ce qui sert est ci-dessous. Ne lis que :
la fiche « P2-07 » de docs/plan/phase-2-3.md, D27 dans
docs/decisions/README.md, la section « Après la jam » de
docs/jam/README.md, et les fichiers de code cités ici au moment de les
modifier.

## État (05/11/2026)

- Livré jusqu'à P2-16 (tableau §5 de docs/plan/README.md). Restent en
  phase 2 : P2-07, P2-08, P2-09, P2-10, P2-17, P2-18, puis la revue de
  phase 2. Objectif D28 : lancement public à Toulouse début mars 2027.
  L'utilisateur juge que tout se jouera sur une UX simple et agréable.
- P2-07 étend aux **collaborations confirmées** le modèle d'appréciation
  né pour les jams (P2-15a) :
  - Jam : `JamEndorsement` (une par paire et par jam, qualité
    `JamQuality` ou instrument, `eventId`, `revokedAt`) ;
    `src/lib/server/jam/afterJam.ts` (`endorse`, `revokeEndorsementsOf`
    avec `reverseGain`, `endorsementsReceived` pour le profil).
  - Règle `endorsement.received` (`src/lib/server/progression/core/rules/
endorsementReceived.ts`) : 40, 20, 10 puis 0 par paire sur 12 mois
    (`priorEndorsements`), `jamId` facultatif dans l'événement. La fiche
    P2-07 dit « un par compétence et par paire » : à concilier avec ces
    rendements décroissants (proposer, ne pas trancher seul).
  - Collaborations : `src/lib/server/collaborations/service.ts`
    (statut `COMPLETED`, participants `CollaborationParticipant`).
  - Réseau musical : `src/lib/server/network/service.ts`
    (`playedTogether` couvre déjà jam et collaboration).
  - Profil public : `src/routes/@[handle]/` (« Apprécié·e après des
    jams » dans « Ce que d'autres confirment »).
- Point ouvert : `distinctEndorsers` (`core/summary.ts`, palier
  Référence) compte aussi les endossements repris ; à corriger avec
  P2-07 ou P2-08.
- D30/D31 : lieux vérifiés par SIRET ; revendication en deux niveaux
  (P5-03, raccordement ProConnect à demander à la DINUM).

## Rappels

- Migration : `npm run db:nouvelle-migration -- <nom>`, relire le SQL,
  `npm run db:deploy && npm run db:deploy:e2e && npx prisma generate`.
  Jamais `npx prisma migrate` ni `prisma format`.
- Vérifs : `npm run check`, `npm run lint` (12 warnings boilerplate
  normaux ; supprimer `playwright-report/` s'il existe), `npm run
test:unit -- --run`, `PROGRESSION_INTEGRATION=1 npx vitest --run
src/lib/server/progression` si on touche au moteur,
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
