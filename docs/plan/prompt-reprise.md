# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Mis à jour à chaque fin de lot (dernière : 06/11/2026, après P3-11).

---

```markdown
On reprend LinkMusician avec le lot **P3-04** (étapes : définitions et
déclaration). Ne refais pas l'analyse du projet : CLAUDE.md est déjà
chargé, tout ce qui sert est ci-dessous.

## État (06/11/2026)

- **Phase 2 terminée et revue** ([docs/plan/revue-phase-2.md](./revue-phase-2.md)).
  Objectif D28 : lancement public à Toulouse début mars 2027. L'UX simple
  et agréable prime.
- **P3-01 à P3-03 livrés** ([docs/groupes](../groupes/README.md), D37 à
  D39) : groupes et adhésions (`src/lib/server/bands/service.ts`, garde
  `requireManager`, `afterJoin`, `canInviteMinor` exporté), page publique
  `/@handle` du groupe, recrutement au nom du groupe.
- **P3-11 livré** ([docs/morceaux](../morceaux/README.md), D35, D40) :
  `Work`, `WorkContributor`, `WorkRole` (à pourvoir) ; service
  `src/lib/server/works/service.ts` ; événements `work.composed` et
  `work.credit_confirmed` (règle `core/rules/workComposed.ts`, compteurs
  `priorCoWorks` et `creditedOnWork` dans `RuleContext`) ; maquette d'une
  idée cachée des listes publiques (`notIdeaDemo`) ; pages `/morceaux`,
  `/morceaux/nouveau`, `/morceaux/[id]` ; carte « Morceaux » sur `/@handle`.
- **P3-04** : lire sa fiche (docs/plan/phase-2-3.md) et conception 02 §2.2
  et §4 (étapes, niveaux de preuve). Décision attendue en début de lot :
  liste finale des étapes et preuves recevables. Pistes :
  - Le moteur sait déjà tout : `milestone.attested` (from, to, memberIds),
    règles `milestoneBand` et `milestoneMember`, XP différentielle
    (`milestoneDelta`), barème `BAREME.milestones`. L'étape `FORMATION`
    est déjà émise par `afterJoin` (sans table `Milestone`).
  - Modèle : `MilestoneDefinition` versionnée (seed rejouable) et
    `Milestone` (groupe, étape, statut de preuve, date) ; reprendre
    `FORMATION` (déjà vérifiée en événement) dans la table, sans
    réémettre d'XP.
  - « Première composition » : `firstComposedWork(bandId)` (works/service)
    donne le premier morceau composé du groupe et sa preuve (`DECLARED` ou
    `CORROBORATED`) ; décider si l'étape suit le morceau automatiquement
    (à `markComposed` et à la corroboration) ou se déclare.
  - `memberIds` : membres actifs à la date de l'étape (historique
    `Membership.startedAt`/`endedAt`).
  - Droits : déclarer une étape = gestion du groupe (`requireManager`).
- Ordre prévu : P3-04 à P3-09 → P3-12 à P3-14 (tableau §4 bis de
  docs/plan/README.md).
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
src/lib/server/bands src/lib/server/opportunities src/lib/server/works`
  pour les groupes, le recrutement et les morceaux (modèle : `vi.mock('#lib/server', () => ({ prisma: db }))`
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
