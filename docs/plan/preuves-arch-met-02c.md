# ARCH-MET-02c — preuves locales du 16/11/2026

Issue [#58](https://github.com/Pierre-FABIEN/linkmusician/issues/58).
Base distante confirmée par `git ls-remote origin refs/heads/main` :
`cba0234caa3681e3ae26931de65ca28e48253e0e`. Préparation locale `aa9e043`
conservée, arbre initial propre. Les issues #55/#56/#57 sont closes.
Revérification pendant la recette : `aa9e04381d1cd8e0d036d5a2b6c3a83b34896992`
est désormais publié, référence actualisée par fetch ; le code 02c reste local.
Aucun push par l’agent ni déploiement de production effectué.

## Caractérisation avant correction

Le test conservé dans
`src/lib/server/collaborations/proposal.integration.test.ts`, cas « R3 : deux
propositions simultanées, une collaboration et une notification », a été
exécuté sur le service de `aa9e043` avant correction. La première transaction
est suspendue avant INSERT ; la seconde peut passer le count externe puis
terminer sa vraie transaction avant libération de la première. Aucun count,
INSERT ou moteur SQL simulé ; instrumentation par Proxy du TransactionClient.

```sh
PROGRESSION_INTEGRATION=1 npm run test:unit -- --run \
  src/lib/server/collaborations/proposal.integration.test.ts -t 'R3 :'
```

Résultat rouge initial : attendu 1, reçu **2 collaborations**.
Après renforcement des assertions du même test, contrôle sur le même service
initial (restauré ensuite avec la correction), extrait des trois échecs :

```text
AssertionError: expected [ { …(18) }, { …(18) } ] to have a length of 1 but got 2
  expect.soft(kept).toHaveLength(1);
AssertionError: expected 2 to be 1
  expect.soft(await notifications('2026-10-01')).toBe(1);
AssertionError: expected [ { status: 'fulfilled', …(1) }, …(1) ] to have a length of 1 but got 2
Tests  1 failed | 16 skipped (17)
```

Les trois assertions portent respectivement sur les lignes de collaboration,
les notifications COLLAB_TO_CONFIRM et les appels réussis. Les fixtures sont
supprimées après le test, sans modification des données de développement.

## Vérifications de la correction

Le même test impose l’attente de la seconde transaction : `pg_locks` confirme
le verrou consultatif non accordé avant libération de la première. Un simple
`Promise.all` ne décide pas l’ordonnancement. Les tests d’indépendance doivent
terminer la seconde proposition pendant que la première reste suspendue.
Tous les clients visent `e2e` et définissent aussi DATABASE_URL sur ce schéma ;
aucun secret n’est reproduit dans les preuves.

Les 17 cas couvrent :

- même intention, deux proposants, deux types et combinaison des deux ;
- dates et conversations distinctes indépendantes ;
- PROPOSED, ACCEPTED et COMPLETED, sans modification de l’ancien objet ;
- refus et annulation, nouvelle ligne avec actes/consentements séparés ;
- annulation non validée : refus, puis nouvel essai après commit ;
- annulation validée pendant l’attente sous la clé de proposition ;
- deux propositions concurrentes après annulation, ancienne ligne conservée ;
- échec après INSERT de notification et vraie erreur SQL de participant :
  aucune collaboration, participation ou notification orpheline ; nouvel essai ;
- course de finalisation de la proposition conservée, sous collaboration/work :
  un événement de fin, deux transactions XP pour les deux participants, un crédit
  automatique confirmé ; aucun acte humain reconstruit.

Les totaux de recette et limites sont consignés dans le
[suivi du lot](README.md#arch-met-02c--proposition-effective-58-16112026).
La garantie couvre les commandes applicatives du service ; aucun audit ni
nettoyage de doublons historiques. Aucune migration ou nouvelle donnée
personnelle ; aide, seed et RGPD existants restent applicables au même parcours.
Retour par revert applicatif conservant les données, avec réintroduction de R3.
R4 et SELF restent distincts.
