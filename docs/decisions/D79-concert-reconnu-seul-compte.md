# D79 — Seul un concert reconnu compte comme date (Q106)

- **Statut : Acceptée** (19/11/2026), validée explicitement par le
  fondateur au démarrage du lot P1d, avec le critère de tournée « hôte
  vérifié aujourd'hui » (§4).
- Lot concerné : **P1d** ([#36](https://github.com/Pierre-FABIEN/linkmusician/issues/36)).
- Question d'origine : [Q106](../plan/a-trancher.md), relevée par P1c
  (scénario D de [D75](./D75-concert-engage-par-un-membre.md) §8).
- **Portée** : code et tests, **aucune migration**, aucun barème nouveau,
  aucun événement réécrit.

## 1. Constat

Une collaboration `GIG` peut se terminer (`COMPLETED`) sans que le concert
soit reconnu : la personne qui l'a proposée a quitté le groupe avant la
confirmation (D75 §8), ou la gestion de l'hôte n'est plus en place quand
l'hôte confirme. Dans ces cas, `verifyGigFromCollaboration` (groupe) et
`verifySoloGigFromCollaboration` (en son nom, P8) n'émettent pas
`gig.held` et ne touchent aucune étape. Le code en tirait pourtant deux
conséquences :

1. **Bonus de première date** : la collaboration était comptée comme une
   date antérieure. La vraie première date suivante n'avait donc pas
   `firstDateIds`, et l'hôte perdait « Artiste programmé pour sa toute
   première date » (`gig.first_dates`, 100 × confiance).
2. **Tournée** : si l'hôte était une organisation vérifiée, la
   collaboration entrait dans le calcul de « Première tournée »
   (`firstTour`). Une date jamais confirmée pouvait donc compléter une
   tournée.

L'hôte affiché sur le souvenir de l'acte V (`firstVerifiedGig`) pouvait
aussi être celui d'une collaboration non reconnue.

## 2. Cinq états à ne pas confondre

| État                | Ce qui l'établit                                                                                                                    | Ce qu'il produit                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1. Proposée         | `Collaboration` `PROPOSED` ou `ACCEPTED`                                                                                            | Rien                                                                                 |
| 2. Terminée         | Tous les participants ont confirmé : `COMPLETED`                                                                                    | `collaboration.completed` (gain de musicien·ne, inchangé)                            |
| 3. Tenue (reconnue) | `gig.held` émis : une personne qui joue (membre actif ou soi-même) **et** une gestion distincte de l'hôte, relues à la confirmation | Gains d'organisation et de booking, rang du lieu, date antérieure, entrée en tournée |
| 4. Corroborée       | `gig.held` avec `verified: false` (hôte non vérifié)                                                                                | « Premier concert » `CORROBORATED`                                                   |
| 5. Vérifiée         | `gig.held` avec `verified: true` (organisation vérifiée)                                                                            | « Premier concert » `VERIFIED`, entrée possible en tournée                           |

**Une collaboration terminée (2) n'est pas un concert reconnu (3).**

## 3. Règle retenue

> Seul un concert **reconnu**, c'est-à-dire une collaboration `GIG` dont
> l'événement `gig.held` nomme l'interprète dans `performerIds`, compte
> comme **date antérieure** (bonus de première date de l'hôte) et dans le
> calcul de la **tournée**, pour un groupe comme pour une personne en son
> nom. Une collaboration terminée sans `gig.held` garde ses gains de
> collaboration et ne prouve aucun concert.

Source de vérité par calcul :

| Calcul                                            | Source                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Date antérieure (`firstDateIds`)                  | `gig.held` antérieurs de l'interprète, ou étape « Premier concert » existante (déclarée comprise) |
| « Premier concert » corroboré ou vérifié          | Le `gig.held` en cours (inchangé)                                                                 |
| « Première tournée » (groupe et personne)         | Collaborations reconnues de l'interprète, hôte vérifié, avec commune (`firstTour`)                |
| Tournée bookée (`tour.booked`)                    | Les `gig.held` où le booker est crédité (inchangé, déjà conforme)                                 |
| Rangs d'organisation, de lieu, quêtes de métier   | Les `gig.held` (inchangé, déjà conformes)                                                         |
| Hôte du souvenir de l'acte V (`firstVerifiedGig`) | Premier concert reconnu chez un hôte vérifié                                                      |
| Gain de musicien·ne de la collaboration           | `collaboration.completed` (inchangé)                                                              |

L'interprète est lu dans `performerIds`, jamais dans `actorIds` seul.
Une personne nommée dans un `gig.held` parce qu'elle confirme ou organise
le concert d'un groupe n'y gagne aucune date en son nom (DC4, D77). Les
calculs du groupe et ceux de la personne restent ainsi distincts.

## 4. Tournée : « hôte vérifié aujourd'hui »

Le critère de vérification de la tournée ne change pas. Il lit l'état
**actuel** de l'hôte (`verifiedAt`), et non le drapeau `verified` figé
dans `gig.held`. D79 ajoute seulement la condition « concert reconnu ».
Une organisation vérifiée après coup peut donc encore faire entrer ses
dates reconnues antérieures dans une tournée, comme avant. L'autre option,
« vérifié le jour du concert », a été écartée (changement plus large que
Q106).

## 5. Ce qui ne change pas

- `collaboration.completed` et ses gains, pour toutes les collaborations
  terminées, reconnues ou non.
- Le registre : aucun `gig.held`, aucune XP ni aucune étape passés ne sont
  réécrits ni annulés. Une date historique qui avait perdu à tort son
  `firstDateIds` reste telle quelle : la correction vaut pour les
  confirmations à venir. `progression:rebuild` rejoue les payloads tels
  qu'ils ont été émis.
- Les données de démo : `seed:demo` émet un `gig.held` pour chaque concert
  terminé.

## 6. Mise en œuvre (P1d)

- `recognizedGigIds` (`src/lib/server/milestones/recognized-gigs.ts`) :
  identifiants des concerts reconnus d'un interprète, lus dans les
  `gig.held`.
- `verifyGigFromCollaboration` et `verifySoloGigFromCollaboration` : date
  antérieure et tournée filtrées sur ces identifiants.
- `firstVerifiedGig` (`src/lib/server/career/map.ts`) : même filtre.
- Tests (écrits, non exécutés) : `describe` « P1d » de
  `gigs.integration.test.ts` et de `solo-gigs.integration.test.ts`.
