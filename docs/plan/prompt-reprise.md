# Prompt de reprise — après DASH-20b

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot :
DASH-20c (#50), recette transverse, troisième tranche : projet + prestataire
(session d'ingé son, crédit), et une concurrence dans un parcours.

Avant de coder :

1. Lis CLAUDE.md, docs/plan/README.md §4 (définition de terminé), l'issue
   #50 et la fiche DASH-20b dans docs/plan/fin-du-projet.md (« Reste pour
   DASH-20c »). Crée la fiche DASH-20c avant de coder si elle n'existe pas.
2. git status, git log -5 et git ls-remote origin refs/heads/main. Commits
   locaux attendus, sans push : « (ONB-14) », « (DASH-20a) » et
   « (DASH-20b) ». Note ce que l'utilisateur a publié depuis. Préserve les
   commits et changements des autres sessions.
3. Relis la couverture existante pour ne rien dupliquer :
   e2e/linkmusician/recette-transverse.spec.ts (DASH-20a et 20b : distance,
   carnet d'un·e mineur·e, manager + artiste, booker + groupe, groupe + lieu
   avec gestion retirée, export et effacement), collaborations-morceau.spec.ts,
   inge-son.spec.ts, production-autonome.spec.ts, et les intégrations de
   src/lib/server/collaborations et works. Aides : `person`, `newPage`,
   `forge`, `forgeOn`, `band`, `findKey` en tête de recette-transverse.spec.ts.

À faire :

- projet + prestataire : session d'ingé son sur un morceau, crédit unique,
  POST forgés d'un tiers et d'un MEMBER sans gestion, mineur·e, 390 px, axe ;
- une concurrence dans un parcours (deux acceptations ou deux réponses
  simultanées), sans dupliquer les tests d'intégration existants ;
- si le temps le permet, T10 (gdpr-data, voir a-trancher) dans un lot à part.

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
- Plateau d'un groupe (DASH-20b, Q72) : seule la gestion actuelle retire la
  candidature ; l'acceptation passe par l'expéditeur s'il gère encore, sinon
  par la gestion majeure restante (`bandContact`).
- Une page d'aide est sous `src/` : ne la modifie pas pendant un E2E.
- Instabilités connues : M1, T1, T2 et T10 dans docs/plan/a-trancher.md. Relancer
  seul un test qui échoue avant de conclure, et dire lequel.

Garde-fous : le serveur e2e est un `vite dev` : ne touche pas au code
source, ne lance pas npm run check et ne régénère pas Prisma pendant un
E2E ; vérifie les processus via ps. Pas de prisma format ni de migration
destructrice (scripts db:*, relecture, db:deploy et db:deploy:e2e).
Question ouverte : défaut appliqué et ligne Qn dans
docs/plan/a-trancher.md, sans interrompre (Q70, Q71 et Q72 attendent
l'utilisateur).

Fin de lot : fiche DASH-20c (livré, recette réelle avec les specs lancées),
tableau de docs/plan/README.md, prompt de reprise, e2e/README.md, aide et
démo si le comportement change. Commentaire sur l'issue #50 (commit local,
sans push, ce qui reste). Commit en français préfixé « (DASH-20c) », sans
push.

Restent ensuite : la suite de #26 (invitation à compléter dans la
recherche, expériences), les extensions de #36 et #37. #70–#72 cadrent
l'UX Metro/Carrière, sans refonte globale pendant un lot fonctionnel.
```
