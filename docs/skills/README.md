# Compétences : référentiels instruments et genres

Module LinkMusician (lot P1-04, décision D12). Les profils musicaux (P1-06)
s'appuient sur deux listes de référence, chargées en base.

## Où sont les listes

| Liste       | Fichier                           | Contenu                                         |
| ----------- | --------------------------------- | ----------------------------------------------- |
| Instruments | `prisma/seed-data/instruments.js` | 63 instruments en 9 familles, voix incluse      |
| Genres      | `prisma/seed-data/genres.js`      | 15 genres parents et 79 sous-genres (2 niveaux) |
| Familles    | `src/lib/skills/instruments.ts`   | Ordre et libellés des familles                  |

## Modifier une liste

1. Éditer le fichier dans `prisma/seed-data/`. Le `slug` d'une entrée
   publiée ne change jamais : des profils y font référence.
2. `npm run test:unit -- --run src/lib/skills` : contrôle d'intégrité
   (slugs uniques et bien formés, familles connues, deux niveaux).
3. `npm run seed:referentiels` en dev, puis sur chaque environnement
   (production comprise : ce ne sont pas des données de démo).

Le chargement est rejouable : chaque entrée est retrouvée par son `slug`.
Une entrée retirée de la liste est **désactivée** (`active = false`), jamais
supprimée. `npm run seed` (et donc `npm run reset`) l'appelle aussi.

## Consulter

`/admin/referentiels` : lecture seule, entrées désactivées barrées.

## Profil musical (P1-06)

Page `/profil/musical` (« Mon profil musical ») : 1 à 5 instruments avec un
niveau déclaré (D11, `src/lib/skills/levels.ts`) et exactement un instrument
principal, 1 à 5 genres, jusqu'à 10 influences en texte brut (une par ligne).
Règles pures dans `src/lib/skills/profile.ts`, dont `isProfileComplete`
(≥1 instrument, ≥1 genre, zone, bio), qui servira à émettre
`profile.completed` avec le registre d'événements (P1-07). Écriture :
`saveMusicalProfile` (`src/lib/prisma/skills/musicalProfile.ts`), seul point
d'écriture, qui refuse un instrument ou un genre désactivé. Export et
anonymisation RGPD couverts (`src/lib/prisma/actors/person.ts`).

## Code

- `src/lib/skills/` : familles, contrôle d'intégrité (pur, testé).
- `src/lib/prisma/skills/referentials.ts` : lecture (`listInstrumentsByFamily`,
  `listGenreTree`).
- `prisma/seed-referentials.js` : seul point d'écriture.
