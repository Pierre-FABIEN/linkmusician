# Moteur de progression

Module LinkMusician (lots P1-01 et P1-07). Les règles du jeu sont dans
[conception/02](../conception/02-progression.md), l'architecture dans
[conception/03 §2.4](../conception/03-architecture.md#24-moteur-de-progression).

## Chaîne de traitement

```
Page (intention) → service métier (écrit l'état)
  → emit(tx, événement)              src/lib/server/progression/events.ts
  → processEvent(tx, id)             processor.ts (même transaction au MVP)
      verrou par acteur, contexte    context.ts (historique relu en base)
      règles pures                   core/ (aucun import Prisma ni SvelteKit)
      registre                       ledger.ts (ajout seul, unicité)
      projections, succès            projector.ts → événements dérivés
```

- **Le client n'envoie jamais de valeur** d'XP, de niveau ou de palier.
- **Registre en ajout seul** (`xp_transactions`) : un déclencheur PostgreSQL
  refuse toute modification ou suppression (sauf la cascade depuis la
  suppression d'un acteur, en test). Une correction passe par
  `reverseGain` (ligne négative liée, projection recalculée).
- **Idempotence** : unicité (événement, règle, acteur, piste). Rejouer un
  événement n'ajoute rien.
- **Projection reconstructible** (`actor_progress`, une ligne par piste et
  une ligne `ACCOUNT` pour le niveau de compte) :
  `npm run progression:rebuild`.

## Événements émis aujourd'hui

| Événement           | Émis par                                                        | XP            |
| ------------------- | --------------------------------------------------------------- | ------------- |
| `profile.updated`   | chaque enregistrement du profil, du profil musical, de la ville | 0             |
| `profile.completed` | la première fois que `isProfileComplete` devient vrai           | 150, une fois |

Les autres événements (démos, conversations, groupes, collaborations,
endossements, étapes) sont prêts côté règles et seront émis par leurs
lots (médias, annonces, groupes…).

## Confiance (P1-09)

- Palier stocké sur l'acteur (`actors.trustLevel`), calculé par
  `core/trust.ts` à partir d'un résumé d'état (`trust.ts`) : ancienneté,
  email vérifié, profil complété, échanges réciproques, collaborations avec
  des membres de confiance, contreparties distinctes. **Jamais l'XP.**
- Recalculé après chaque événement traité (processeur) et chaque nuit
  (`/api/jobs/trust`, cron Vercel à 3 h 30) : l'ancienneté seule fait passer
  un palier. Rétrogradable. Changement tracé (`progress.trust_changed`).
- Les règles d'XP lisent la confiance des contreparties **avant** l'événement.
- Quotas (`src/lib/server/trust/quotas.ts`) : journaliers par limiteur
  `rate-limit.ts` (`quota-<nom>-tl<palier>`), de stock par comptage
  (`checkStockQuota`). Table dans `TRUST_PERMISSIONS`.
- `/reglages` : palier, conditions du suivant, limites.
- Sanctions et taux de signalement à 0 jusqu'à la modération (P1-12).

## Réputation (P2-08)

- Carte stockée dans `reputation_snapshots`, calculée par
  `core/reputation.ts` (pur) à partir des faits lus par `reputation.ts` :
  résumé musicien (événements), appréciations actives, délais de réponse
  aux demandes reçues. **Jamais l'XP** : un test fait échouer le calcul
  s'il touche au registre ou aux projections d'XP, un autre vérifie qu'un
  million d'XP ne change pas le score.
- Recalculée après chaque événement de `REPUTATION_EVENTS` (processeur),
  chaque nuit (`/api/jobs/reputation`, cron Vercel à 3 h 40 : la
  réactivité change sans événement) et à la demande (première lecture
  d'un profil qui n'a pas encore de carte).
- `internalScore` : tri de la recherche seulement (D33). Jamais lu par
  `getPublicReputation`, jamais sélectionné par la recherche, absent de
  l'export RGPD (calcul sur des faits déjà exportés). Les réponses JSON du
  profil et de la recherche sont inspectées en e2e.
- Anonymisation : la carte est supprimée et ne se recalcule plus.

## Provisoire

- **Paliers** : colonne `tier` non renseignée avant le tableau de bord
  (P1-11).
- Les profils déjà complets avant P1-07 recevront `profile.completed` à
  leur prochain enregistrement.

## Tests

- `core/` : tests en tables et personas de calibrage (`npm run test:unit`).
- Intégration (base réelle, schéma `e2e`) :
  `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/progression`
  — double traitement, ajout seul, 200 événements aléatoires (registre =
  projection = registre en mémoire), reconstruction identique, profil
  complété une seule fois, confiance (passage TL1, multiplicateur réel,
  rétrogradation).

## Célébrations (P2-11)

À chaque visite de l'espace, ce qui est neuf depuis la dernière fois se
fête en cartes non bloquantes, en bas de l'écran (au-dessus de la barre
d'onglets sur mobile), qui disparaissent seules :

- **gains** : « +100 XP » et la raison du registre ; au-delà de 3, une
  seule carte fait le total ;
- **niveau atteint**, **succès débloqué**, **montée de confiance** (jamais
  une baisse), lus dans les événements dérivés `progress.*`.

Règles :

- tout est calculé côté serveur (`core/celebrations.ts`, pur et testé ;
  lecture dans `celebrations.ts`) ;
- **une fois et une seule** : repère `Person.celebrationsSeenAt` (à défaut,
  la date d'inscription : les gains de l'onboarding se fêtent à l'arrivée
  dans l'espace). Le client renvoie seulement le repère `upTo` donné par le
  serveur (`POST /api/celebrations`), borné (jamais en arrière, jamais
  dans le futur) ;
- les messages des formulaires de l'espace ne répètent plus les gains ;
- animations coupées si l'appareil demande moins de mouvement ;
  `role="status"` pour les lecteurs d'écran.

E2E : `e2e/linkmusician/celebrations.spec.ts`.
