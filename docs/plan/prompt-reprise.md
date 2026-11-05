# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Mis à jour à chaque fin de lot (dernière : 05/11/2026, après P2-14b).

---

```markdown
On reprend LinkMusician au lot P2-14c. Ne refais pas l'analyse du projet :
CLAUDE.md est déjà chargé, tout ce qui sert est ci-dessous. Ne lis que :
la fiche « P2-14c » de docs/plan/phase-2-3.md, et les fichiers de code
cités ici au moment de les modifier.

## État (05/11/2026)

- Livré jusqu'à P2-14b (tableau §5 de docs/plan/README.md). Objectif D28 :
  lancement public à Toulouse début mars 2027.
- D27 : une jam ne rapporte aucune XP ; seules les appréciations après la
  jam (P2-15) rapportent. Rien de P2-14c ne crée d'XP.
- Code jam existant :
  - `prisma/schema.prisma` (section LINKMUSICIAN, fin de fichier) :
    `Venue`, `Opportunity` (JAM : `venueId`, `startsAt`, `endsAt`,
    `jamSpots`, `attendances`), `JamSpot` (opportunityId, instrumentId,
    count), `JamAttendance` (opportunityId, actorId).
  - `src/lib/jam/publicJam.ts` (règles pures, `jamSchema`, créneau,
    couvre-feu 22 h) ; `src/lib/server/jam/publicJams.ts` (`createJam`,
    `getJam`, `upcomingJamsNear`, `upcomingJamsAt`, `comeToJam`,
    `notComingToJam`, carte `JamCard`).
  - Pages : `src/routes/(app)/jams/nouvelle/`, `src/routes/(app)/jams/[id]/`,
    `src/routes/(app)/lieux/[id]/`.
  - RGPD : `exportPersonData` et `personAnonymizationOps` dans
    `src/lib/prisma/actors/person.ts`.
  - E2E : `e2e/linkmusician/jams.spec.ts` (modèle à suivre).

## Avant P2-14c : la spec de sécurité du boilerplate

`npm run test:e2e -- e2e/admin/security.spec.ts` échoue (remontée n° 18).
Établir la cause (test obsolète sous SvelteKit 3, ou vrai trou d'accès à
l'admin). Un vrai trou se corrige tout de suite, marqué `LINKMUSICIAN:`.
Checklist complète de l'audit : fiche P3-10a.

## P2-14c à faire (proposition, à ajuster à la fiche)

0. **Validation des lieux** (D26) : un lieu ajouté par un compte TL0 est
   invisible et n'accueille aucune jam tant qu'un second membre ne l'a
   pas confirmé ou qu'un modérateur ne l'a pas validé (champ
   `Venue.validatedAt`, `Venue.confirmedById`).

1. Schéma : `Opportunity.leadActorId` (le lead, par défaut l'hôte) ;
   modèle `JamInvite` (opportunityId, actorId, instrumentId, statut
   INVITED/ACCEPTED/DECLINED) pour les places réservées ; matériel : enum
   `BacklineItem` (DRUMS, BASS_AMP, GUITAR_AMP, KEYBOARD, PA_MICS,
   CABLES) avec `Venue.backline BacklineItem[]` et
   `Opportunity.backline BacklineItem[]` (copie du lieu à la création,
   modifiable).
2. Règles pures : places ouvertes = souhaitées − invitations acceptées ;
   « quoi apporter » par instrument selon le matériel (test unitaire).
3. Service et pages : le lead invite depuis la fiche de la jam (par
   handle ou réseau), l'invité·e accepte ou refuse sur la fiche ; fiche
   du lieu : modifier le matériel ; fiche de la jam : « Apporte… ».
4. RGPD (invitations dans l'export, supprimées à l'anonymisation), e2e
   `jams.spec.ts` complété, `docs/jam/README.md`, tableau §5, ce prompt
   (prochain lot : P2-15).

## Rappels

- Migration : `npm run db:nouvelle-migration -- <nom>`, relire le SQL,
  `npm run db:deploy && npm run db:deploy:e2e && npx prisma generate`.
  Jamais `npx prisma migrate` ni `prisma format`.
- Vérifs : `npm run check`, `npm run lint` (12 warnings boilerplate
  normaux), `npm run test:unit -- --run`, puis à la fin seulement
  `npm run test:e2e -- e2e/linkmusician` (sortie redirigée dans le
  scratchpad, lire la fin). **Ne jamais modifier le code pendant une
  suite e2e** (le serveur recharge et fausse les résultats). Les specs
  hors `e2e/linkmusician` échouent sous SvelteKit 3 (remontée n° 18).
- La suite `e2e/linkmusician` complète n'a pas tourné depuis P2-14a :
  la lancer en fin de P2-14c.
- E2E : aides `e2e/support/linkmusician.ts` (`createMusician`,
  `deleteMusicians`, `setCity` = Toulouse, `skipOnboarding`) ; Blagnac
  `{ code: '31069', nom: 'Blagnac', dep: '31', lat: 43.6459, lng: 1.3785 }` ;
  a11y : exclure `.cartButton` ; libellés avec apostrophe typographique (’).
- Ne pas arrêter `npm run dev` de l'utilisateur. Commits sur `main`, en
  français, `feat(jam): … (P2-14c)`, terminés par la ligne Co-Authored-By.
  L'utilisateur pousse.
```
