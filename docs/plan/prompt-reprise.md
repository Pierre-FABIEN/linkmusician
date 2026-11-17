# Prompt de reprise — après ONB-12c3

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot :
ONB-14 (#28), inscription multirôle, E2E transverse.

Avant de coder :

1. Lis CLAUDE.md, docs/plan/README.md §4 (définition de terminé) et la fiche
   ONB-14 dans docs/plan/fin-du-projet.md (« Déjà couvert », « Reste »,
   « Limites de la machine »).
2. git status, git log -5 et git ls-remote origin refs/heads/main. Commits
   locaux attendus, sans push : « (DASH-07b) », « (ONB-12c2) »,
   « (ONB-12c3) ». Note ce que l'utilisateur a publié depuis. Préserve les
   commits et changements des autres sessions.
3. Relis la couverture existante pour ne rien dupliquer :
   e2e/linkmusician/onboarding-metiers.spec.ts (ingé son seul·e, musicien·ne
   - producteur·rice + booker, métier « bientôt », manager tour management,
     organisateur·rice seul·e, producteur·rice), onboarding.spec.ts,
     assistant-inscription.spec.ts (D47), profil-metiers.spec.ts,
     profil-avance.spec.ts. Aides : e2e/support/linkmusician.ts
     (skipOnboarding, setCity, finishRecap, createMusician), admin.ts
     (signUpAndVerify), account.ts (makeAccount), a11y.ts, flows.ts.

À faire (la liste « Reste » de la fiche) :

- parcours label, éditeur·rice et communication (métiers « bientôt » :
  rien d'exigé, D15) ;
- booker programmateur contre booker d'artistes ; organisateur·rice jam
  contre festival : champs conditionnels différents (`when` du catalogue) ;
- POST forgé : mutation du métier d'un autre compte et d'un métier non
  choisi refusées ; codes d'un autre métier refusés côté serveur ;
- parcours complet à 390 px (pas de défilement horizontal), clavier, axe ;
- non-régression de l'assistant D47 et des règles des mineur·es ;
- cas ajouté par ONB-12c3 : les champs `stage: 'profile'` (disponibilités
  `availability_start`, `availability_rhythm`) absents de
  /demarrer/metier/[slug], et une disponibilité saisie sur
  /profil/metier/[slug] intacte après un nouvel enregistrement de l'étape
  d'inscription.

C'est un lot de tests : ne modifie le code que pour un défaut trouvé, avec
un test qui le reproduit, et consigne-le dans la fiche. Si le lot déborde,
découpe-le (ONB-14a, ONB-14b) plutôt que de le prolonger.

Repères de la session précédente :

- Un scan axe juste après une action peut tomber sur un toast en fondu
  (contraste faux sur `div[data-title]`) : attendre
  `[data-sonner-toast]` à 0, comme studio.spec.ts et candidatures.spec.ts.
- Un champ dans un `<details>` replié est attaché mais pas visible :
  `toBeAttached()`.
- `getByLabel` avec une regex : pas d'ancre `$`, le texte du label porte
  des espaces.
- Tableaux Markdown : une cellule plus large que sa colonne fait réaligner
  tout le tableau par Prettier ; garder la largeur des colonnes.
- `npm run lint` global échoue pour des raisons extérieures au lot
  (`.shot-*.mjs`, `playwright-report/`) : lancer ESLint et Prettier sur les
  fichiers du lot.
- Instabilités connues de la machine : M1, T1, T2 dans
  docs/plan/a-trancher.md. Relancer seul un test qui échoue avant de
  conclure, et dire lequel a été relancé.

Garde-fous : ne lance pas npm run check pendant les E2E ; ne régénère pas
Prisma pendant un E2E ; vérifie les processus via ps. Pas de prisma format
ni de migration destructrice (scripts db:*, relecture, db:deploy et
db:deploy:e2e). Question ouverte : défaut appliqué et ligne Qn dans
docs/plan/a-trancher.md, sans interrompre (Q70 et Q71 attendent
l'utilisateur).

Fin de lot : fiche ONB-14 (livré, recette réelle avec les specs lancées),
tableau §5 de docs/plan/README.md, prompt de reprise, aide et démo si le
comportement change. Commentaire sur l'issue #28 (commit local, sans push,
ce qui reste). Commit en français préfixé « (ONB-14) », sans push.

Après ONB-14 restent : la recette transverse #50, la suite de #26
(invitation à compléter dans la recherche, expériences), les extensions de
#36 et #37. #70–#72 cadrent l'UX Metro/Carrière, sans refonte globale
pendant un lot fonctionnel.
```
