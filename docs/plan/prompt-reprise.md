# Prompt de reprise — après ONB-14

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot :
DASH-20a (#50), recette transverse, première tranche : confidentialité et
parcours entre métiers.

Avant de coder :

1. Lis CLAUDE.md, docs/plan/README.md §4 (définition de terminé), l'issue
   #50 (périmètre et critères) et la fiche ONB-14 dans
   docs/plan/fin-du-projet.md (« Pistes laissées à #50 »). Crée la fiche
   DASH-20a dans fin-du-projet.md avant de coder si elle n'existe pas.
2. git status, git log -5 et git ls-remote origin refs/heads/main. Commit
   local attendu, sans push : « (ONB-14) ». Note ce que l'utilisateur a
   publié depuis. Préserve les commits et changements des autres sessions.
3. Relis la couverture existante pour ne rien dupliquer :
   e2e/linkmusician/inscription-transverse.spec.ts (ONB-14 : métiers
   « bientôt », champs `when`, POST forgés, 390 px, D5 au premier
   résultat), onboarding-metiers.spec.ts, suggestions.spec.ts,
   recherche.spec.ts, mobile.spec.ts. Aides : e2e/support/linkmusician.ts
   (createMusician, deleteMusicians, horizontalOverflow, skipOnboarding),
   admin.ts (signUpAndVerify, pageOrigin, sveltekitActionHeaders).

À faire :

- pistes d'ONB-14 : le premier résultat (`nearbyMusicians`,
  /demarrer/resultat) envoie la distance en mètres dans les données de la
  page : n'envoyer que la tranche, comme les suggestions, avec un test qui
  lit la réponse ; `preload_data_failed` (Internal Error) sur /jam/carnet
  vu dans le journal pendant le test de la mineure : reproduire, trouver la
  cause ;
- parcours entre métiers de #50 encore absents : manager + artiste,
  booker + organisateur, groupe + lieu (choisir les deux plus courts,
  découper le reste en DASH-20b) ;
- dans chaque parcours : POST forgés avec l'identifiant d'un autre compte,
  règles des mineur·es, 390 px, axe.

Ne modifie le code que pour un défaut trouvé, avec un test qui le
reproduit, et consigne-le dans la fiche. Si le lot déborde, découpe-le.

Repères :

- Forger une action superforms `dataType: 'json'` : `stringify` de
  `devalue` dans `__superform_json`, avec `sveltekitActionHeaders` ; la
  réponse JSON porte `type` (`failure`, `redirect`, `success`) et `status`
  (voir `forgeTrackStep` dans inscription-transverse.spec.ts).
- Une page d'onboarding reste accessible après l'inscription
  (`canVisit` : tout est fait) ; l'étape d'un métier ne charge que les
  champs de l'inscription (correctif ONB-14).
- Communes e2e : Toulouse, Blagnac, Muret, Montauban, Paris. Montauban isole
  un test des nombreux comptes toulousains laissés par les autres specs.
- Sur /demarrer/intention, sans rien dans « Je recherche », le bouton est
  « Juste explorer », pas « Continuer ».
- Un scan axe juste après une action peut tomber sur un toast en fondu :
  attendre `[data-sonner-toast]` à 0.
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

Fin de lot : fiche DASH-20a (livré, recette réelle avec les specs lancées),
tableau §5 de docs/plan/README.md, prompt de reprise, aide et démo si le
comportement change. Commentaire sur l'issue #50 (commit local, sans push,
ce qui reste). Commit en français préfixé « (DASH-20a) », sans push.

Restent ensuite : la suite de #26 (invitation à compléter dans la
recherche, expériences), les extensions de #36 et #37. #70–#72 cadrent
l'UX Metro/Carrière, sans refonte globale pendant un lot fonctionnel.
```
