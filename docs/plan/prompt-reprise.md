# Prompt de reprise — après DASH-20a

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot :
DASH-20b (#50), recette transverse, deuxième tranche : groupe + lieu, puis
projet + prestataire si le temps le permet.

Avant de coder :

1. Lis CLAUDE.md, docs/plan/README.md §4 (définition de terminé), l'issue
   #50 (périmètre et critères) et la fiche DASH-20a dans
   docs/plan/fin-du-projet.md (« Reste pour DASH-20b »). Crée la fiche
   DASH-20b dans fin-du-projet.md avant de coder si elle n'existe pas.
2. git status, git log -5 et git ls-remote origin refs/heads/main. Commits
   locaux attendus, sans push : « (ONB-14) » et « (DASH-20a) ». Note ce que
   l'utilisateur a publié depuis. Préserve les commits et changements des
   autres sessions.
3. Relis la couverture existante pour ne rien dupliquer :
   e2e/linkmusician/recette-transverse.spec.ts (DASH-20a : distance par
   tranche, carnet d'un·e mineur·e, manager + artiste, booker + groupe),
   organisateur.spec.ts (plateau, candidature au nom du groupe),
   concerts.spec.ts, lieu-fiche.spec.ts, scene-ouverte.spec.ts,
   animation-lieu.spec.ts, collaborations-morceau.spec.ts. Aides :
   e2e/support/linkmusician.ts (createMusician, deleteMusicians,
   horizontalOverflow, skipOnboarding), admin.ts (signUpAndVerify,
   pageOrigin, sveltekitActionHeaders), et `person`, `newPage`, `forge`,
   `band` en tête de recette-transverse.spec.ts.

À faire :

- groupe + lieu : plateau d'un lieu ou d'une organisatrice, candidature au
  nom du groupe ; POST forgés d'un non-membre et d'un MEMBER sans gestion,
  règles des mineur·es du groupe, 390 px, axe ;
- projet + prestataire (session d'ingé son, crédit) : mêmes critères, si
  le temps le permet, sinon DASH-20c ;
- concurrence ou révocation pendant une attente, export et anonymisation
  dans un parcours (au moins un cas chacun), sans dupliquer les tests
  d'intégration existants.

Ne modifie le code que pour un défaut trouvé, avec un test qui le
reproduit, et consigne-le dans la fiche. Si le lot déborde, découpe-le.

Repères :

- `browser.newContext()` ne reçoit pas l'IP de la fixture : sans
  `X-Forwarded-For` propre (`makeClientIp`), la 4ᵉ inscription d'un test
  tombe sur le limiteur (429). Utiliser `newPage` de recette-transverse.
- Une page d'onboarding n'est accessible après `skipOnboarding` que si
  toutes les étapes sont remplies (instrument, genre, ville en base).
- Forger une action de formulaire simple : POST `form` avec l'en-tête
  `Origin` ; `fail(403)` répond 403. Superforms `dataType: 'json'` :
  `forgeTrackStep` dans inscription-transverse.spec.ts.
- Notifications : champ `recipientActorId`.
- Gestion d'un groupe : seule la gestion **majeure** répond et voit les
  propositions d'accompagnement (Q48, `adultAnswerersOf`, DASH-20a).
- Communes e2e : Toulouse, Blagnac, Muret, Montauban, Paris. Montauban isole
  un test des nombreux comptes toulousains laissés par les autres specs.
- Un scan axe juste après une action peut tomber sur un toast en fondu :
  attendre `[data-sonner-toast]` à 0.
- `preload_data_failed` sur `/jam/carnet` dans le journal : connu (T9),
  démontage de la fixture `account`, sans effet sur les tests.
- `npm run lint` global échoue pour des raisons extérieures au lot
  (`.shot-*.mjs`, `playwright-report/`) : lancer ESLint et Prettier sur les
  fichiers du lot. Tableaux Markdown : garder la largeur des colonnes.
- Instabilités connues : M1, T1, T2 dans docs/plan/a-trancher.md. Relancer
  seul un test qui échoue avant de conclure, et dire lequel.

Garde-fous : le serveur e2e est un `vite dev` : ne touche pas au code
source, ne lance pas npm run check et ne régénère pas Prisma pendant un
E2E ; vérifie les processus via ps. Pas de prisma format ni de migration
destructrice (scripts db:*, relecture, db:deploy et db:deploy:e2e).
Question ouverte : défaut appliqué et ligne Qn dans
docs/plan/a-trancher.md, sans interrompre (Q70 et Q71 attendent
l'utilisateur).

Fin de lot : fiche DASH-20b (livré, recette réelle avec les specs lancées),
tableau de docs/plan/README.md, prompt de reprise, e2e/README.md, aide et
démo si le comportement change. Commentaire sur l'issue #50 (commit local,
sans push, ce qui reste). Commit en français préfixé « (DASH-20b) », sans
push.

Restent ensuite : la suite de #26 (invitation à compléter dans la
recherche, expériences), les extensions de #36 et #37. #70–#72 cadrent
l'UX Metro/Carrière, sans refonte globale pendant un lot fonctionnel.
```
