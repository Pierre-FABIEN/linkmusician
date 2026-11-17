# Prompt de reprise — après DASH-07b

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot.
Lis CLAUDE.md et docs/plan/README.md §4. Travaille sur main, sans push :
l’utilisateur pousse. Commence par git status, git log et git ls-remote origin
refs/heads/main. Préserve commits et changements des autres sessions.
Ne modifie pas les issues GitHub sans instruction.

État au 17/11/2026 :

- origin/main confirmé à ad36147 au démarrage : ONB-13b, D71 et DASH-07a
  publiés. Les mentions « local » antérieures décrivent la livraison initiale.
- DASH-07b (#37) livré par le commit local « (DASH-07b) », sans push.
  Sur l’annonce, envoi pour un artiste avec droit actif relu après verrous
  lockGrantPair puis FOR UPDATE de l’annonce. Territoire du mandat, conditions
  de l’artiste, visibilité/blocages des deux parties, doublon direct/délégué,
  acte USED et notifications atomiques. Le recrutement reste exclu.
- Migration additive 20261117174550_delegated_applications appliquée en dev
  et e2e : marques delegated sur candidature et conversation, withdrawnAt,
  withdrawnById, notification APPLICATION_SENT. Client Prisma généré.
- Retraits et décisions utilisent le même verrou d’annonce, avec relecture.
  Artiste, gestion actuelle ou expéditeur peuvent retirer une candidature
  en attente ; auteur et date conservés, exportés et anonymisés.
- L’acceptation ouvre/réutilise une conversation avec l’agent. La marque
  delegated reste vraie, y compris après anonymisation ; aucune émission de
  progression à la réciprocité, aucun ancien gain repris. L’artiste reçoit
  une notification vers l’annonce, sans accès aux messages privés.
- Démo : après accord de Lucas pour la Fanfare Pirate, Élise peut candidater
  à « Scène ouverte aux projets accompagnés ». Le seed ne donne aucun accord
  et n’envoie aucune candidature.
- Résultats de recette : voir la section DASH-07b du plan, ne pas les déduire
  du seul nombre de tests présents. #37/#30/#50 restent ouverts.

Lot suivant : ONB-12c2 (#26) — informations avancées par métier. Lis sa fiche
dans docs/plan/fin-du-projet.md et la conception 06. Portfolio, matériel,
tarifs indicatifs en réutilisant /profil/son, /profil/production et
/profil/organisateur ; visibilité de rate/gear et spécialité postproduction.
Audite les modèles existants et la confidentialité avant de modifier le schéma.

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
