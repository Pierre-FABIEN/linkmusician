# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Mis à jour à chaque fin de lot (dernière : 07/11/2026, après P3-05).

---

```markdown
On reprend LinkMusician avec le lot **P3-16c** (discussions de groupe sur
invitation) ; P3-16a (trois messages avant une réponse) et P3-16b (onglet
Contacts, carnet, groupes de contacts, [docs/contacts](../contacts/README.md))
sont livrés. Ne refais pas l'analyse du projet :
CLAUDE.md est déjà chargé, tout ce qui sert est ci-dessous.

## État (07/11/2026)

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
- **P3-16c** (fiche dans docs/plan/phase-2-3.md, D45, D46) :
  - une discussion s'ouvre depuis un groupe de contacts (`ContactGroup`,
    `src/lib/server/contacts/service.ts`) ; chaque personne reçoit une
    **invitation** (Rejoindre, Non merci) et ne voit rien avant ; on peut
    quitter ; l'auteur peut inviter d'autres contacts (`isContact`) ;
  - **mineur·es exclu·es** des discussions de groupe au lancement, sans
    dire pourquoi (`isIndexable` de la date de naissance) ; pas d'invitation
    à travers un blocage avec l'auteur, ni de « Rejoindre » si un blocage
    existe avec un membre déjà présent ;
  - piste de modèle : tables à part (`GroupDiscussion`,
    `GroupDiscussionMember`, `GroupDiscussionMessage`) plutôt que
    `Conversation` (à deux, `pairKey` unique, requêtes qui supposent deux
    participants) ; ajouter les non-lus au badge (`unreadTotal`) et la
    liste « Discussions de groupe » dans Messages ; nouvelle notification
    d'invitation ; RGPD ;
  - fin de lot : remplacer l'encart « Bientôt » de l'aide `rencontrer`.
- **Décidé, plus tard** : P3-15 démarches (D42, conception 09).
- **P3-06** (après P3-16) : lire sa fiche (docs/plan/phase-2-3.md, avec la note P3-04 :
  retirer soi-même une étape déclarée par erreur) et conception 02 §4.
  Pistes :
  - `ReportTarget.MILESTONE` (enum à étendre) ; signaler depuis la page
    publique du groupe (carte « Parcours ») et depuis `/etapes/[id]` ;
  - geler l'étape (statut ou champ `frozenAt`) : elle ne s'affiche plus
    comme corroborée, aucune nouvelle preuve tant que c'est gelé ;
  - décision du modérateur (`/moderation`) : retenue → reprise de chaque
    gain lié par `reverseGain` (`progression/processor.ts`, transaction
    négative `reversesId`), retrouver les transactions par
    `sourceEventId` des événements `milestone.attested` de l'étape ;
    avertissement de confiance pour qui a déclaré et pour qui a confirmé ;
    rejetée → dégel ;
  - mêmes règles pour une confirmation mensongère (`MilestoneAttestation`).
- Ordre prévu : P3-16 → P3-06, P3-08, P3-09 → P3-12 à P3-14 → P3-15
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
