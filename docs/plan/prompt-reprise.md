# Prompt de reprise — après ONB-12c2

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot.
Lis CLAUDE.md et docs/plan/README.md §4. Travaille sur main, sans push :
l’utilisateur pousse. Commence par git status, git log et git ls-remote origin
refs/heads/main. Préserve commits et changements des autres sessions.
Ne modifie pas les issues GitHub sans instruction.

État au 17/11/2026 :

- DASH-07b (#37) commité localement (« (DASH-07b) ») ; ONB-12c2 (#26)
  commité localement (« (ONB-12c2) »), sans push. Vérifier avec
  git ls-remote ce que l'utilisateur a publié depuis.
- ONB-12c2 : les cartes historiques « Ingé son », « Producteur·rice » et
  « Organisateur·rice » de /@handle suivent les blocs D61, filtrées dans
  getPublicProfile par #lib/actors/craftCardVisibility (anonyme, membre
  inscrit, la personne). Tarifs en conditions : privés par défaut, y compris
  ceux déjà saisis (Q70, défaut appliqué). Références, crédits confirmés et
  rang restent publics. Découvrir tait les spécialités historiques d'un bloc
  d'intentions privé. Note « Qui voit quoi » sur /profil/son, /production,
  /organisateur. Postproduction : code du référentiel (spécialité et offre),
  sans migration ni enum SoundSpecialty.
- Résultats de recette : voir les fiches DASH-07b et ONB-12c du plan.
  #26, #37, #30 et #50 restent ouverts.

Lot suivant : ONB-12c3 (#26) — disponibilités, invitation à compléter un
champ au moment où il sert (candidature, annonce, sans bloquer), distinction
déclaré / confirmé / vérifié. Lis la fiche ONB-12c dans
docs/plan/fin-du-projet.md et la conception 06 §1.3. Portfolio, matériel,
logiciels et tarifs existent déjà : ne pas les dupliquer. Une disponibilité
est une donnée personnelle : export et anonymisation RGPD.

Restent aussi ONB-14 (#28, recette multirôle), la recette transverse #50 et
les extensions de #36 (membre avec accord, prestataire externe, autres étapes,
versions et validations). #70–#72 cadrent l’UX Metro/Carrière ; leur création
n’autorise pas une refonte globale pendant un lot fonctionnel.

Ne lance pas npm run check pendant les E2E ; ne régénère pas Prisma pendant
un E2E. Vérifie les processus via ps. Pas de prisma format ni migration
destructrice. Scripts db:nouvelle-migration, relecture, db:deploy et
db:deploy:e2e. Les deux timeouts de verrou 55P03 historiques sont documentés
comme reproduits sur le code d’origine ; le lint global garde les écarts des
scripts .shot-*. Termine par aide, démo, docs, plan et commit français sans push.
```
