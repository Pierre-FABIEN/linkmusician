# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Mis à jour à chaque fin de lot (dernière : 07/11/2026, après P3-04).

---

```markdown
On reprend LinkMusician avec le lot **P3-05** (preuves et attestations).
Ne refais pas l'analyse du projet : CLAUDE.md est déjà chargé, tout ce qui
sert est ci-dessous.

## État (07/11/2026)

- **Phase 2 terminée et revue** ([docs/plan/revue-phase-2.md](./revue-phase-2.md)).
  Objectif D28 : lancement public à Toulouse début mars 2027. L'UX simple
  et agréable prime.
- **P3-01 à P3-03 et P3-11 livrés** ([docs/groupes](../groupes/README.md),
  [docs/morceaux](../morceaux/README.md), D35, D37 à D40).
- **P3-04 livré** ([docs/etapes](../etapes/README.md), D41) : étapes 1 à 6
  ouvertes ; `MilestoneDefinition` (seed `prisma/seed-data/milestones.js`,
  rejoué par `seed:referentiels`) et `Milestone` (une par groupe et par
  étape, `proof` `MilestoneProof`, `occurredAt`, `note`, `declaredById`,
  `workId`) ; service `src/lib/server/milestones/service.ts`
  (`recordFormation`, `syncComposition`, `declareMilestone`,
  `updateMilestoneDetails`, `bandMilestones`, `attest` privé qui calcule
  `memberIds` avec `membersAt`/`creditDate`) ; règles pures
  `src/lib/milestones/rules.ts` (`isUpgrade`, `PROOF_LABELS`, catalogue) ;
  section « Parcours du groupe » sur `/groupes/[handle]`, carte « Parcours »
  sur `/@handle`.
- **P3-05** : lire sa fiche (docs/plan/phase-2-3.md) et conception 02 §2.2
  (colonne « Preuve attendue ») et §4. Décision attendue en début de lot :
  pour chaque étape déclarable (répétition, enregistrement, démo publique,
  concert), ce qui la **corrobore** (attestation d'un membre ? d'un tiers
  hors groupe TL2 ? lien vérifiable ?) et ce qui la **vérifie** (souvent
  une organisation vérifiée : pas encore de studios ni de lieux
  vérifiés, D22). Pistes :
  - Règle de la fiche : pour les étapes 6 et plus, un membre du groupe ne
    corrobore jamais (unitaire et e2e « un concert corroboré uniquement par
    un membre reste `DECLARED` »).
  - `Evidence` (lien, média, référence externe) et `Attestation`
    (`@@id([milestoneId, attesterActorId])`, `revokedAt`) : voir
    conception 04 ; règles « qui peut corroborer quoi » pures dans
    `src/lib/milestones/`.
  - Passage de statut : réutiliser `attest(tx, { from, to, … })` du
    service (XP différentielle déjà calculée par `milestoneDelta`).
  - Demander une attestation à quelqu'un : notification (nouveau
    `NotificationType`), lien vers une page d'attestation ; mineur·es (D5).
  - Les lieux de l'annuaire (`Venue`, P2-14a) peuvent servir de tiers
    plus tard (P5), pas au lancement.
- Ordre prévu : P3-05, P3-06, P3-08, P3-09 → P3-12 à P3-14 (tableau §4 bis
  de docs/plan/README.md). P3-07 après le lancement.
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
src/lib/server/bands src/lib/server/opportunities src/lib/server/works
src/lib/server/milestones`
  pour les groupes, le recrutement, les morceaux et les étapes (modèle : `vi.mock('#lib/server', () => ({ prisma: db }))`
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
- Un formulaire d'annonce exige la ville de la personne : en e2e,
  `setCity(page)` avant d'ouvrir `/annonces/nouvelle`. Slugs
  d'instruments : `guitare-electrique`, `basse` (« Basse électrique »),
  `batterie`.
- Ne pas arrêter `npm run dev` de l'utilisateur. Commits sur `main`, en
  français, terminés par la ligne Co-Authored-By. L'utilisateur pousse.
```
