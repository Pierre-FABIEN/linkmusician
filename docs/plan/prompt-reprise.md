# Prompt de reprise de session

> À coller au début d'une nouvelle session Claude Code dans `linkmusician`.
> Tenu à jour à la fin de chaque session (dernière mise à jour : 05/11/2026,
> après P2-14a). Il évite de relire toute la conception : ne lire que ce
> qu'il cite.

---

```markdown
On reprend LinkMusician. Lis CLAUDE.md (consignes, invariants), puis
seulement :

- docs/plan/README.md §4 ter (feuille de route jusqu'au lancement, D28)
  et la ligne du lot dans le tableau §5 ;
- la fiche du lot dans docs/plan/phase-2-3.md ;
- docs/decisions/README.md : lignes D5, D26, D27 ;
- docs/conception/07-modes-de-jeu.md §6 (mode jam).

## Où on en est

- Phases 0 et 1 terminées ; phase 2 : P2-01 à P2-06, P2-11, P2-12,
  P2-12b, P2-13, P2-14a ✅.
- Objectif (D28) : lancement public à Toulouse début mars 2027, tous les
  acteurs de la scène locale, UX soignée. Environ 3 lots par semaine.
- Décision D27 : venir à une jam ne rapporte rien. « J'y étais » ouvre
  7 jours d'appréciations positives entre présents ; seules les
  appréciations rapportent (≈ 40 XP, `endorsement.received`). Une jam
  n'est plus une collaboration (`JAM` retiré de `COLLAB_KINDS`).
- P2-14a livré : modèle `Venue` (commune et centre aligné sur la grille,
  jamais d'adresse), `#lib/venues/rules`, `#server/venues/service`
  (`createVenue`, `searchVenues`, `venuesNear`, `getVenue`), pages
  `/lieux`, `/lieux/nouveau`, `/lieux/[id]`, `CommunePicker.svelte`,
  signalement `VENUE` et `removeVenue` en modération, export RGPD.
- La suite e2e complète n'a pas été relancée depuis P2-14a (seuls lieux,
  dispo, modes et modération) : la lancer en premier, en arrière-plan.

## Prochain lot : P2-14b — jams publiques

Fiche dans phase-2-3.md. En bref : une jam = annonce `JAM` enrichie
(`Opportunity`, `src/lib/server/opportunities/service.ts`) avec **lieu de
l'annuaire obligatoire** (`venueId`), début et fin (heure de Paris,
`parisToUtc` dans `#lib/jam/availability`), style, places souhaitées par
instrument ; l'auteur est l'hôte ; « Je viens » sans acceptation,
retirable ; « Trouve-moi une jam » ; mineur·es : jams finissant avant
22 h seulement ; jams à venir sur la fiche du lieu ; RGPD. Puis P2-15
(« J'y étais » et appréciations), P2-16 (carnet), P2-07 à P2-10.

## Rappels pratiques (déjà appris, ne pas redécouvrir)

- Migration : `npm run db:nouvelle-migration -- <nom>`, relire le SQL,
  `npm run db:deploy`, `npm run db:deploy:e2e`, `npx prisma generate`.
  Jamais `npx prisma migrate`, jamais `prisma format`.
- Vérifs : `npm run check`, `npm run lint` (12 warnings du boilerplate,
  normaux), `npm run test:unit -- --run`, `npm run test:e2e -- <specs>`.
  Rediriger la sortie e2e vers un fichier du scratchpad et lire la fin.
- E2E : aides dans `e2e/support/linkmusician.ts` (`createMusician`,
  `deleteMusicians`, `setCity` = Toulouse, `createOpportunity`,
  `createAvailability`, `skipOnboarding`) ; communes factices dans
  `src/lib/geo/communes-e2e.ts` (Toulouse, Blagnac, Muret, Montauban,
  Paris) ; exclusions a11y `.cartButton` (n° 14),
  `[data-sidebar="menu-button"]` (n° 15). Apostrophes typographiques (’)
  dans les libellés.
- Ne pas arrêter les processus de l'utilisateur (`npm run dev`).
- Commits sur `main`, en français, préfixés par l'ID du lot, terminés
  par la ligne Co-Authored-By. L'utilisateur pousse.
- Fin de lot : Définition de terminé (plan §4), ligne du tableau §5,
  `docs/jam/README.md`, et **mettre à jour ce prompt** (section « Où on
  en est » et « Prochain lot »).

Commence par P2-14b.
```
