# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Mis à jour à chaque fin de lot (dernière : 05/11/2026, après P2-14c).

---

```markdown
On reprend LinkMusician au lot P2-15. Ne refais pas l'analyse du projet :
CLAUDE.md est déjà chargé, tout ce qui sert est ci-dessous. Ne lis que :
la fiche « P2-15 » de docs/plan/phase-2-3.md, D27 dans
docs/decisions/README.md, et les fichiers de code cités ici au moment de
les modifier.

## État (05/11/2026)

- Livré jusqu'à P2-14d (tableau §5 de docs/plan/README.md). Objectif D28 :
  lancement public à Toulouse début mars 2027. L'utilisateur juge que tout
  se jouera sur une UX simple et agréable : soigner chaque écran.
- D27 : « J'y étais » ne rapporte rien ; seules les appréciations
  rapportent (≈ 40 XP, `endorsement.received`, rendements décroissants
  par paire, TL1 requise pour en donner, une par paire et par jam,
  7 jours après la jam). Faux présent retiré par l'hôte : appréciations
  reprises par **transaction négative liée** (`reversesId`), jamais
  d'UPDATE ni de DELETE sur `XpTransaction`.
- D30 (P2-14d) : un lieu peut être vérifié par SIRET (table
  `establishments` de Toulouse Métropole, `npm run seed:etablissements`) ;
  vérifié, il est validé tout de suite.
- Code jam existant (voir `docs/jam/README.md`) :
  - Schéma (fin de `prisma/schema.prisma`) : `Venue` (`validatedAt`,
    `confirmedById`, `backline`), `Opportunity` JAM (`venueId`,
    `startsAt`, `endsAt`, `leadActorId`, `backline`), `JamSpot`,
    `JamAttendance` (« Je viens », `instrumentId` facultatif),
    `JamInvite` (place réservée par le lead, INVITED/ACCEPTED/DECLINED).
  - Pur : `src/lib/jam/publicJam.ts`, `src/lib/jam/lineup.ts`
    (`spotBoard`, `whatToBring`, `leadOf`).
  - Service : `src/lib/server/jam/publicJams.ts` (`getJam`, `comeToJam`,
    `inviteToJam`, `respondToJamInvite`…). Les présent·es attendu·es d'une
    jam = `attendances` + invitations ACCEPTED.
  - Pages : `src/routes/(app)/jams/[id]/` (fiche), `src/routes/(app)/jam/`
    (hub, invitations), `src/routes/(app)/lieux/`.
  - Progression : moteur pur `src/lib/server/progression/core/`, règles
    d'XP et projection dans `src/lib/server/progression/` (chercher
    `conversation.reciprocated` comme modèle d'événement).
  - RGPD : `exportPersonData` et `personAnonymizationOps` dans
    `src/lib/prisma/actors/person.ts`.
  - E2E : `e2e/linkmusician/jams.spec.ts` (deux comptes :
    `browser.newContext()` + `makeAccount()`, voir le 2e test).

## P2-15 à faire (proposition, à ajuster à la fiche)

1. Schéma : « J'y étais » (`JamAttendance.attendedAt`, ou un modèle
   dédié si l'invité·e de la formation doit pouvoir le dire aussi) ;
   `JamEndorsement` (jam, de, à, qualité ou instrument, `@@unique` par
   paire et par jam) ; retrait d'un faux présent par l'hôte.
2. Règles pures (tests) : fenêtre « J'y étais » (après le début) et
   appréciation (7 jours après la fin) ; appréciation impossible sans
   présence commune ; TL1 pour donner.
3. XP : événement `endorsement.received` dans le moteur pur, rendements
   décroissants par paire ; reprise par transaction négative liée.
4. Écrans : « Qui était là ? » (grille de photos, initiales et
   instrument sinon), un toucher pour apprécier ; « Rejouer ensemble »,
   « Garder le contact » ; appréciations sur le profil ; succès fun sans
   XP (à découper en P2-15b si ça déborde).
5. RGPD, e2e « deux présents, l'une apprécie l'autre, ses points
   montent », `docs/jam/README.md`, tableau §5, ce prompt.

## Rappels

- Migration : `npm run db:nouvelle-migration -- <nom>`, relire le SQL,
  `npm run db:deploy && npm run db:deploy:e2e && npx prisma generate`.
  Jamais `npx prisma migrate` ni `prisma format`.
- Vérifs : `npm run check`, `npm run lint` (12 warnings boilerplate
  normaux ; supprimer `playwright-report/` s'il existe, sinon le lint
  remonte des milliers d'erreurs), `npm run test:unit -- --run`, puis à
  la fin seulement `npm run test:e2e -- e2e/linkmusician` (sortie
  redirigée dans le scratchpad, lire la fin). **Ne jamais modifier le
  code pendant une suite e2e** (le serveur recharge et fausse les
  résultats).
- `e2e/admin/security.spec.ts` passe de nouveau (05/11/2026) : les routes
  `/admin/*` redirigent bien un visiteur non connecté.
- E2E : aides `e2e/support/linkmusician.ts` (`createMusician`,
  `deleteMusicians`, `setCity` = Toulouse, `skipOnboarding`) ; un lieu
  créé en base doit avoir `validatedAt: new Date()` pour être visible ;
  Blagnac `{ code: '31069', nom: 'Blagnac', dep: '31', lat: 43.6459,
lng: 1.3785 }` ; a11y : exclure `.cartButton` ; libellés avec
  apostrophe typographique (’).
- Ne pas arrêter `npm run dev` de l'utilisateur. Commits sur `main`, en
  français, `feat(jam): … (P2-15)`, terminés par la ligne Co-Authored-By.
  L'utilisateur pousse.
```
