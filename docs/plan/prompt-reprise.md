# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Mis à jour à chaque fin de lot (dernière : 06/11/2026, après P2-17).

---

```markdown
On reprend LinkMusician au lot **P2-18** (suggestions de musicien·nes selon
styles et niveaux). Ne refais pas l'analyse du projet : CLAUDE.md est déjà
chargé, tout ce qui sert est ci-dessous. Lire la fiche « P2-18 » de
docs/plan/phase-2-3.md et la conception 07 §7.1.

## État (06/11/2026)

- Livrés et verts : P2-08 à P2-10, P2-17 (conseils en contexte). Reste en
  phase 2 : P2-18, puis la **revue de phase 2** (démo du parcours,
  calibrage du barème, relecture des fiches de phase 3, trancher D20).
  Objectif D28 : lancement public à Toulouse début mars 2027.
  L'utilisateur juge que tout se jouera sur une UX simple et agréable.
- Points ouverts hors lots : docs/plan/README.md §5 bis (à relire en
  début de session, à compléter en fin de lot).
- P2-18, points d'appui : recherche `src/lib/server/search/musicians.ts`
  (PostGIS, `publicActorWhere` en SQL, blocages, tri D33 : réseau puis
  tranche) ; réseau musical `musical_ties` (P2-16) ; mineur·es : D5 et
  `#lib/actors/visibility` (`adultBirthCutoff`) ; niveaux déclarés
  `person_instruments.declaredLevel` ; profil public
  `src/routes/@[handle]/` ; espace `src/routes/(app)/espace/`. Jamais
  l'XP ni le palier. « Pas intéressé·e » à mémoriser par personne.
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
- Ne pas arrêter `npm run dev` de l'utilisateur. Commits sur `main`, en
  français, terminés par la ligne Co-Authored-By. L'utilisateur pousse.
```
