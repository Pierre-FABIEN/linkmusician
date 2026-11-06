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
- **P3-11** : lire sa fiche (docs/plan/phase-2-3.md) et **D35** :
  `Work` (porteur : personne ou groupe, via `Actor`), `WorkContributor`,
  maquette (`Media`) ; seul·e, composé déclaré sans XP ; à plusieurs,
  150 XP par contributeur confirmé × rendement décroissant par paire ×
  confiance (règle pure comme `collaborationCompleted`, persona « deux
  ami·es qui enchaînent les morceaux ») ; idée privée à l'équipe, composé
  public (profil, page de groupe) ; « Recruter » depuis un rôle à pourvoir
  (annonce ciblée, réutiliser la publication au nom d'un groupe) ;
  « Première composition » corroborée par un morceau composé du groupe
  (préparer pour P3-04) ; RGPD.
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
- Ne pas arrêter `npm run dev` de l'utilisateur. Commits sur `main`, en
  français, terminés par la ligne Co-Authored-By. L'utilisateur pousse.
```
