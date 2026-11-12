# Onboarding

Module LinkMusician (lot P1-10, conception 05 §1, maquettes P1-02).

## Parcours (musicien·ne : 7 écrans après la vérification de l'email)

Les écrans dépendent des métiers (ONB-02, D57) : voir
[conception 05 §1](../conception/05-mvp-roadmap.md#1-onboarding).

| #   | Écran            | Route                     | Enregistre                                                      |
| --- | ---------------- | ------------------------- | --------------------------------------------------------------- |
| 1   | Qui es-tu ?      | `/qui-es-tu`              | métiers (`PersonTrack`)                                         |
| 2   | Instruments      | `/demarrer/instruments`   | 1 à 3 instruments, niveau déclaré, principal (musicien·ne)      |
| 3   | Genres           | `/demarrer/genres`        | 1 à 5 genres, influences                                        |
| 4   | Ville            | `/demarrer/ville`         | commune (floutée) et rayon de déplacement                       |
| —   | Un par métier    | `/demarrer/metier/[slug]` | spécialités, « Je propose », « Je recherche », champs du métier |
| 5   | Intention        | `/demarrer/intention`     | profil de musicien·ne, « Je propose » / « Je recherche »        |
| 6   | Récapitulatif    | `/demarrer/recapitulatif` | **fin de l'onboarding** (`Person.onboardedAt`, ONB-12a, D60)    |
| 7   | Premier résultat | `/demarrer/resultat`      | — (personnes proches, 3 premiers objectifs)                     |

## Règles

- **L'étape se déduit du profil** (`src/lib/onboarding/steps.ts`) : la
  première information manquante. Seule la fin est mémorisée
  (`onboardedAt`), car « juste explorer » ne laisse aucune trace.
- **Reprise** : `/demarrer` et l'espace `(app)` renvoient à l'étape à faire.
  On peut revenir en arrière, pas sauter en avant (`guardStep`).
- **Récapitulatif** (`src/lib/onboarding/recap.ts`, pur) : une section par
  écran rempli, « Modifier » y ramène ; une fois tout rempli, enregistrer un
  écran ramène au récapitulatif (`stepAfter`). Seul ce dernier termine
  l'onboarding (`finishOnboarding`, qui relit l'état).
- **Premier résultat** : requête simple (`nearbyMusicians`, rayon de la
  personne ou 25 km), hors comptes supprimés ou suspendus. La recherche
  complète arrive en P2-01. État vide honnête : « tu es parmi les premiers ».
- L'XP arrive en chemin (`onProfileChanged` à chaque écran qui touche au
  profil).

## Tests

Règles pures (`steps.test.ts`, `recap.test.ts`). E2E
`e2e/linkmusician/onboarding.spec.ts` : 7 écrans, reprise dans un second
navigateur, correction depuis le récapitulatif sans perte, contrôle
d'accessibilité axe de chaque écran ; `onboarding-metiers.spec.ts` : un,
deux et trois métiers (récapitulatif par métier). Les specs qui traversent
l'onboarding le terminent par `finishRecap`. Les autres specs passent l'onboarding par
`skipOnboarding` (`e2e/support/linkmusician.ts`).

## Assistant d'inscription (P3-17)

Aide facultative « Décris ta situation avec tes mots » sur « Qui es-tu ? » :
voir [assistant.md](./assistant.md).
