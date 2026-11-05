# Indicateurs produit

Module LinkMusician (lot P1-13, décision D13 : mesure maison, aucun outil
tiers). Page réservée aux administrateurs : `/admin/indicateurs`.

## Indicateurs

Définitions et seuils de la conception 05 §2 (hypothèse du MVP). Chaque
taux ne compte que les personnes qui ont assez de recul.

| Indicateur                                          | Définition                                                        | Objectif                | Mesurable depuis |
| --------------------------------------------------- | ----------------------------------------------------------------- | ----------------------- | ---------------- |
| Onboarding terminé                                  | `Person.onboardedAt` renseigné                                    | ≥ 60 % (repère interne) | P1-10            |
| Conversation réciproque dans les 14 jours           | Premier `conversation.reciprocated` ≤ J+14                        | ≥ 30 %                  | P2-04            |
| Collaboration confirmée ou groupe dans les 60 jours | Premier `collaboration.completed` ou `membership.accepted` ≤ J+60 | ≥ 10 %                  | P2-06            |
| Rétention à 30 jours                                | Venu au moins un jour entre J+30 et J+36                          | ≥ 25 %                  | P1-13            |
| Rétention à 30 jours, palier « En réseau »          | Idem, parmi ceux qui ont franchi « En réseau »                    | ≥ 25 %                  | P2-04            |
| Comptes signalés pour spam                          | Au moins un signalement « spam » reçu                             | < 2 %                   | P1-12            |

S'y ajoutent les inscriptions par semaine (8 dernières) et la **demande
par métier** (principal et secondaire), qui sert à décider quand ouvrir
un métier (conception 06 §2).

Un indicateur dont la fonctionnalité n'existe pas encore affiche « Pas
encore mesurable » plutôt qu'un 0 % trompeur : passer
`INDICATOR_AVAILABILITY` (`src/lib/server/indicators/indicators.ts`) à
`true` avec la messagerie (P2-04) et les collaborations (P2-06).

## Relevé d'activité

`ActorActivityDay` : une ligne par personne et par jour (heure de Paris)
où elle est venue dans son espace (`(app)/+layout.server.ts`). Rien
d'autre n'est tracé : ni page, ni durée, ni appareil. Un cache par
instance évite une écriture par requête. Exporté (`jours_de_visite`) et
effacé à l'anonymisation (RGPD).

## Code

- Calcul pur, testé : `src/lib/metrics/indicators.ts`.
- Lecture des faits (agrégats seulement) : `src/lib/server/indicators/`.
- E2E : `e2e/linkmusician/indicateurs.spec.ts`.
