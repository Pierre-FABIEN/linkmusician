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

## Provisoire

- **Confiance** : 0 pour tous (`PROVISIONAL_TRUST`, `context.ts`) jusqu'à
  son calcul (P1-09). Elle ne pèse que sur les collaborations.
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
  complété une seule fois.
