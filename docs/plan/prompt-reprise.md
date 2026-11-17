# Prompt de reprise — après ONB-12c3

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot.
Lis CLAUDE.md et docs/plan/README.md §4. Travaille sur main, sans push :
l’utilisateur pousse. Commence par git status, git log et git ls-remote origin
refs/heads/main. Préserve commits et changements des autres sessions.
Ne modifie pas les issues GitHub sans instruction.

État au 17/11/2026 :

- Commits locaux sans push (vérifier avec git ls-remote ce qui est publié) :
  « (DASH-07b) », « (ONB-12c2) », « (ONB-12c3) ».
- ONB-12c2 : cartes historiques de /@handle sous les blocs D61
  (#lib/actors/craftCardVisibility), tarifs privés par défaut (Q70),
  postproduction sans migration.
- ONB-12c3 : disponibilités (availability_start, availability_rhythm) dans
  le catalogue des métiers hors musicien·ne, `stage: 'profile'` : ni
  demandées, ni acceptées, ni effacées par l'inscription (fieldsAt). Sur une
  annonce, critère « non précisé » → lien vers la page qui le règle
  (completeLinks) avec ?annonce=<id> et lien de retour (BackToAnnonce,
  identifiant seulement). « Déclaré / Confirmé / Vérifié » sur /@handle
  (#lib/actors/proofLevels). Q71 ouverte. Aucune migration.
- Résultats de recette : fiches DASH-07b et ONB-12c du plan. #26 reste
  ouvert (invitation dans la recherche, expériences) ; #37, #30, #50 aussi.

Lot suivant : ONB-14 (#28) — inscription, E2E transverse. Lis sa fiche
dans docs/plan/fin-du-projet.md (« Reste » : label, éditeur·rice,
communication ; booker programmateur contre booker d'artistes ;
organisateur·rice jam contre festival ; mutation refusée sur le métier
d'un autre compte et sur un métier non choisi ; codes d'un autre métier
refusés côté serveur ; 390 px ; non-régression assistant D47 et mineur·es).
Ajoute aussi un cas : les champs `stage: 'profile'` absents de
/demarrer/metier/[slug]. Lot de tests : ne corrige le code que pour un
défaut trouvé, consigné dans la fiche.

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
