# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Mis à jour à chaque fin de lot (dernière : 10/11/2026, après P3-15a).

---

```markdown
On reprend LinkMusician avec le lot **P3-15b** (documents préremplis :
bulletin de partage d'un morceau, programme des œuvres d'un concert) ;
P3-15a (fiches et déclencheurs, [docs/demarches](../demarches/README.md))
est livré, en 🟡 tant que son e2e n'est pas lancé. Reste à revoir le
vocabulaire « projet » (§5 bis).
Navigation : pages-menus (D50) et fil d'Ariane en badges (D52) à respecter
sur toute nouvelle page ; organisateurs de jams (D51). **D'abord**, si
Chromium a ses dépendances (`sudo npx playwright install-deps chromium`,
il manquait `libnspr4`) : lancer `npm run test:e2e --
e2e/linkmusician/discussions.spec.ts e2e/linkmusician/demarches.spec.ts`,
puis passer P3-16c et P3-15a à ✅ dans le tableau §5. Ne refais pas
l'analyse du projet : CLAUDE.md est déjà chargé, tout ce qui sert est
ci-dessous.

## État (10/11/2026)

- **P3-12 à P3-14 livrés** (carrière, carte, fiche et cartes souvenirs).
- **P3-15a livré** : `src/lib/demarches/catalog.ts` (fiches, en-tête
  `verifie`/`relue`/`sources`, `OFFICIAL_HOSTS`), fiches Markdown dans
  `src/lib/demarches/fiches/`, rendu `src/lib/server/demarches/render.ts`
  (moteur de l'aide), déclencheurs purs `src/lib/demarches/triggers.ts`,
  service `src/lib/server/demarches/service.ts` (« J'ai compris » =
  `demarche:<id>` dans `tipsDismissed`), carte `DemarcheCard.svelte` sur
  `/morceaux/[id]`, `/groupes/[handle]`, `/annonces/[id]`. P3-15b : le
  bulletin s'appuie sur les crédits confirmés (`workPage`) ; le programme
  sur `bandWorks`. Les fiches `ecrire-a-plusieurs` et `premier-concert`
  ont un encart « 🔜 Bientôt » à remplacer par le lien de téléchargement.
- Erreurs préexistantes, hors lots : `npm run check` signale 2 erreurs
  dans `metro/Panorama.svelte` (maquette `_lab`) ; `audit.test.ts` échoue
  (`moderation.milestone.reject` sans libellé, commit 787ac61) ; Prettier
  signale 9 fichiers (Metro, modération, `milestones/verification`).

- **Phase 2 terminée et revue** ([docs/plan/revue-phase-2.md](./revue-phase-2.md)).
  Objectif D28 : lancement public à Toulouse début mars 2027. L'UX simple
  et agréable prime.
- **P3-01 à P3-05 et P3-11 livrés** ([docs/groupes](../groupes/README.md),
  [docs/morceaux](../morceaux/README.md), [docs/etapes](../etapes/README.md),
  D35, D37 à D41, D43).
- **P3-05** : `MilestoneAttestation` (role `MEMBER` ou `OUTSIDER`, status
  `REQUESTED`, `CONFIRMED`, `DECLINED`) et `MilestoneEvidence` (status
  `PENDING`, `ACCEPTED`, `REJECTED`) ; service
  `src/lib/server/milestones/proofs.ts` (`evaluate` passe une étape à
  « corroborée » en XP différentielle via `attest`) ; règles pures
  `src/lib/milestones/proofs.ts` ; `/etapes/[id]` ; événement
  `milestone.attestation_confirmed` (sans XP, cercles fermés).
- **Centre d'aide** livré (`/aide`, contenu dans `src/lib/aide/pages/*.md`,
  voir [docs/aide](../aide/README.md)) : toute fonction qui change un
  parcours met à jour sa page d'aide (Définition de terminé).
- **P3-16 livré** (a, b, c ; [docs/contacts](../contacts/README.md)) :
  discussions de groupe = `GroupDiscussion`, `GroupDiscussionMember`
  (`INVITED`, `ACTIVE`, `DECLINED`, `LEFT`), `GroupDiscussionMessage` ;
  service `src/lib/server/discussions/service.ts`, règles
  `src/lib/discussions/rules.ts`, page `/messages/groupes/[id]`.
- **Décidé, plus tard** : P3-15 démarches (D42, conception 09).
- **P3-06 livré** : `src/lib/server/milestones/disputes.ts`
  (`contestMilestone`, `upholdContest`, `dismissContest`,
  `retractMilestone`, `disputeQueue`), `Milestone.frozenAt`, événement
  `milestone.revoked` (sans XP, retiré des paliers dans `musicianSummary`).
- Ordre prévu : P3-15b → P3-17 (D47 proposée) → P3-10
  (tableau §4 bis de docs/plan/README.md). P3-07 après le lancement.
- Points ouverts hors lots : docs/plan/README.md §5 bis (dont l'e2e
  « quota TL0 » instable en suite complète, les tests d'intégration qui
  se gênent en parallèle, la mémoire de `svelte-check`).
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
src/lib/server/milestones src/lib/server/contacts src/lib/server/discussions
src/lib/server/demarches`
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
