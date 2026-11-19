# D78 — Plateaux par format et déclaration solo : révision partielle de D64 (P8b)

- **Statut : Proposée** (19/11/2026). **À valider par le fondateur** avant
  tout code de P8b. Rien de cette fiche n'est implémenté.
- Origine : D72, arbitrage **Q-G0-10 révisée** (« formats par plateau,
  plateaux existants inchangés, pas de candidature solo mineure ») et
  [conception 19 §9.4](../conception/19-architecture-cible-collab.md#94-artistes-solo-concerts-et-plateaux-q-g0-3-q-g0-10-révisées).
  D72 a validé l'orientation ; la conception 19 demande une **décision
  distincte révisant D64**, que voici.
- Lot : **P8b** ([#77](https://github.com/Pierre-FABIEN/linkmusician/issues/77),
  [#36](https://github.com/Pierre-FABIEN/linkmusician/issues/36)). Dépend de
  P8 ([D77](./D77-artiste-solo-sur-scene.md)).

## 1. Ce que D64 dit et ce qui change

D64 (Acceptée, 12/11/2026) : « Rien sur la personne : un·e musicien·ne
seul·e n'apparaît jamais comme un groupe prêt à jouer. »

Révision proposée, **limitée à trois points** :

1. **Déclaration solo sur le profil** : une personne majeure peut déclarer
   « je me produis en solo ». C'est la seule donnée nouvelle sur la
   personne (export et anonymisation RGPD).
2. **Recherche d'artistes solo** : la personne qui s'est déclarée apparaît
   dans une recherche « solo », **jamais** comme un « groupe prêt à jouer »
   (le reste de D64 est préservé).
3. **Formats acceptés par plateau** : l'organisateur coche solo, duo, trio,
   groupe (vocabulaire de D64). « Solo » accepte une personne déclarée solo
   ou un groupe `SOLO`.

## 2. Règles proposées

- **Plateaux existants inchangés** : ils restent « groupe » ; aucun n'est
  rouvert sans l'organisateur. Un nouveau plateau est proposé en
  « groupe » ; l'organisateur ajoute « solo » s'il le veut.
- **Candidature en son nom** : seulement si le plateau accepte « solo » et
  si la personne s'est déclarée solo. Une ou un mineur·e ne candidate pas
  seul·e au lancement.
- **Mandat** (D71) : `grantableKinds` d'une personne étendu à `GIG_SLOT`,
  accordé par l'artiste majeur·e.
- **Rien d'autre ne change** : conditions du plateau (rang de groupe,
  genre, zone), jamais l'XP.

## 3. Découpage proposé de P8b

| Lot   | Contenu                                                                                                                  | Migration                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| P8b-1 | Formats acceptés sur `Opportunity(GIG_SLOT)` (tableau d'énumération, défaut `BAND`) ; formulaire et affichage du plateau | Additive ; plateaux existants à `['BAND']`           |
| P8b-2 | Déclaration « je me produis en solo » (profil musicien·ne), recherche solo séparée, export et anonymisation              | Additive (champ ou table du profil)                  |
| P8b-3 | Candidature en son nom (`applicantActorId` = la personne), refus sur un plateau « groupe », refus mineur·e               | Aucune si le candidat est déjà un `Actor` (à relire) |
| P8b-4 | Mandat `GIG_SLOT` pour une personne (D71), candidature déléguée                                                          | Aucune attendue                                      |
| P8b-5 | E2E scénario B jusqu'à la date confirmée depuis un plateau « solo »                                                      | —                                                    |

## 4. Risques

- Un plateau rouvert par erreur (défaut « groupe » obligatoire, test).
- Une mineure seule (refus, test).
- Donnée personnelle nouvelle (export, anonymisation, test).

## 5. Décision demandée

Valider les trois points du §1 et les règles du §2. Sans validation, P8b
ne démarre pas ; P8 (D77) fonctionne sans elle : on joue en son nom, mais
on ne candidate pas encore en son nom.
