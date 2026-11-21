# RV-02a — Carnet volontaire, indépendant des conversations (#99)

Sous-lot du [chantier Rencontre V1](rencontre-v1.md), terminé le 21/11/2026.
Décision [D82](../decisions/D82-carnet-volontaire.md). Travail local sur `main`,
non poussé et non déployé. #99 reste partielle : ce sous-lot ne clôture pas
Découvrir, Contacts et Discussions dans leur ensemble.

## Livré

- `SavedContact` : carnet privé, unilatéral, sans prérequis, notification ou
  réciprocité ; ajouter et retirer depuis les profils publics, y compris
  les structures. « Garder le contact » après une jam utilise ce même carnet.
- Migration additive `20261121141822_carnet_volontaire` : reprise idempotente
  des anciens liens et des membres de groupes, sans rien supprimer.
  `MusicalTie` reste en base mais n'est plus écrit par l'application.
- Contacts et conversations sont indépendants : enregistrer ne crée pas de
  conversation ; écrire n'ajoute pas au carnet ; retirer ne ferme pas la
  conversation. Export et anonymisation couvrent les nouvelles données.
- Le carnet ne donne aucun droit : demande de premier message, refus,
  blocages, quotas, mineur·es et confidentialité des activités restent
  applicables. Inviter dans une discussion de groupe ou présenter un
  contact exige aussi une conversation acceptée des deux côtés.
- Recherche, suggestions et pistes de collaboration utilisent le carnet
  pour classer les résultats. Ajouter un·e mineur·e ne le ou la fait plus
  réapparaître dans les suggestions ou le premier résultat d'un adulte.
  La recherche conserve sa règle existante : D5 ne lui impose pas cette
  exclusion générale.
- Libellés : « collaboration confirmée » et « même jam déclarée » sont
  distincts. Seules les présences visibles sont comptées (D81). Une jam
  déclarée ne prouve jamais que les personnes ont joué ensemble.
- Aide, conception, documentation métier et inventaire Diagram actualisés.
  La démo ajoute Samir au carnet de Zoé sans conversation préalable.

## Vérifications

- `npm run check` : 0 erreur, 0 avertissement.
- `npm run test:unit -- --run --maxWorkers=2` : **1 787 réussis**, 721
  conditionnels ignorés. Après la dernière synchronisation Diagram :
  **84 tests réussis** dans ce domaine.
- Intégration activée (`PROGRESSION_INTEGRATION=1`, `GEO_INTEGRATION=1`) :
  **87 tests réussis** sur les suites carnet, contacts, discussions,
  suggestions, recherche, présentations, coups de pouce, prochaines actions,
  choix, présences et confidentialité. Les suites sont exécutées en série
  (`--no-file-parallelism`) sur le schéma `e2e`.
- Recherche et contacts rejoués seuls : **18/18**, dont l'export du carnet
  et sa suppression dans les deux sens à l'anonymisation. Les premiers
  échecs de recherche venaient de deux anciens profils fictifs e2e, nettoyés
  avant la reprise ; aucune règle de recherche n'a été modifiée pour cela.
- Intégration U3 ciblée (`--testNamePattern='U3 :'`) : **2/2 réussis**,
  14 autres tests de cette suite non rejoués dans cette passe.
- E2E Chromium sur Neon : **13/13 scénarios concernés validés** (12 dans
  la passe principale, puis parrainage rejoué après correction du sélecteur).
  Fichiers : `carnet`, `contacts`, `discussions`, `inscription-transverse`,
  `coups-de-pouce`, `parrainage`, `prochaines-actions`, `projets-equipe-u3`.
  Le sélecteur du parrainage visait le titre dans un journal replié ; il
  vise désormais la carte dans la liste visible des collaborations.
- `npm run diagram:sync` : **396 déclencheurs, 309 inventoriés, 87 hors
  périmètre, aucun manquant**.
- `npm run db:status` : les 158 migrations sont appliquées en développement ;
  la préparation E2E applique aussi les migrations du schéma de test.
- `npm run seed:demo -- --commune=31555` : réussi, aucun compte recréé.
  Contrôle de la paire Zoé → Samir : **1 contact enregistré, 0 conversation,
  0 collaboration**.
- Formatage et ESLint des fichiers touchés : **aucune erreur** (23
  avertissements de navigation Svelte existants dans les fichiers concernés).
  `git diff --check` passe.

### Limites de la recette

Le lint global reste en échec sur des fichiers **hors du lot** : Prettier
signale 9 fichiers ; ESLint signale une variable inutilisée dans
`.shot-metro.mjs` (et 560 avertissements de navigation dans le dépôt).
Aucune de ces erreurs ne vient des fichiers modifiés.

La passe d'intégration étendue a atteint sa limite de trois minutes dans
`projects/participants` après cinq tests réussis : cette suite complète
n'est pas déclarée validée ici. Le parcours E2E U3 est validé ; les deux
tests d'intégration U3 qui utilisent le carnet ont réussi séparément (2/2).

## Suites

- **RV-02b** : Découvrir tous les acteurs publics ; actuellement la recherche
  porte encore sur les personnes. L'enregistrement d'une structure depuis
  son profil est déjà disponible.
- Compléter l'organisation et la navigation des trois espaces dans RV-02.
- #26 et #27 restent ouvertes ; #99 reste partielle. Aucun ticket n'a été
  fermé et aucune mise à jour GitHub n'a été publiée pendant cette reprise.
