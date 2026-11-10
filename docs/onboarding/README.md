# Onboarding

Module LinkMusician (lot P1-10, conception 05 §1, maquettes P1-02).

## Parcours (6 écrans après la vérification de l'email)

| #   | Écran            | Route                   | Enregistre                                                              |
| --- | ---------------- | ----------------------- | ----------------------------------------------------------------------- |
| 1   | Qui es-tu ?      | `/qui-es-tu`            | métiers (`PersonTrack`)                                                 |
| 2   | Instruments      | `/demarrer/instruments` | 1 à 3 instruments, niveau déclaré, principal                            |
| 3   | Genres           | `/demarrer/genres`      | 1 à 5 genres, influences                                                |
| 4   | Ville            | `/demarrer/ville`       | commune (floutée) et rayon de déplacement                               |
| 5   | Intention        | `/demarrer/intention`   | « ce que je recherche », **fin de l'onboarding** (`Person.onboardedAt`) |
| 6   | Premier résultat | `/demarrer/resultat`    | — (musiciens proches, 3 premiers objectifs)                             |

## Règles

- **L'étape se déduit du profil** (`src/lib/onboarding/steps.ts`) : la
  première information manquante. Seule la fin est mémorisée
  (`onboardedAt`), car « juste explorer » ne laisse aucune trace.
- **Reprise** : `/demarrer` et l'espace `(app)` renvoient à l'étape à faire.
  On peut revenir en arrière, pas sauter en avant (`guardStep`).
- **Premier résultat** : requête simple (`nearbyMusicians`, rayon de la
  personne ou 25 km), hors comptes supprimés ou suspendus. La recherche
  complète arrive en P2-01. État vide honnête : « tu es parmi les premiers ».
- L'XP arrive en chemin (`onProfileChanged` à chaque écran qui touche au
  profil).

## Tests

Règles pures (`steps.test.ts`). E2E `e2e/linkmusician/onboarding.spec.ts` :
6 écrans, reprise dans un second navigateur, contrôle d'accessibilité axe de
chaque écran. Les autres specs passent l'onboarding par
`skipOnboarding` (`e2e/support/linkmusician.ts`).

## Assistant d'inscription (P3-17)

Aide facultative « Décris ta situation avec tes mots » sur « Qui es-tu ? » :
voir [assistant.md](./assistant.md).
