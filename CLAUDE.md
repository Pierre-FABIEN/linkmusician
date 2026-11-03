# LinkMusician — consignes pour Claude Code

Plateforme sociale et professionnelle de la musique, avec une progression
de type RPG. Le projet est bâti sur un boilerplate SvelteKit e-commerce,
en cours d'assainissement.

## Où trouver quoi

| Besoin                                                  | Document                                       |
| ------------------------------------------------------- | ---------------------------------------------- |
| Vision, règles métier, architecture                     | `docs/conception/` (commencer par `README.md`) |
| Ordre de travail, fiches de lots, **état d'avancement** | `docs/plan/README.md` (tableau §5)             |
| Décisions tranchées ou en attente                       | `docs/decisions/README.md`                     |
| Conventions de code et vérifications avant PR           | `CONTRIBUTING.md`                              |

## Méthode de travail

- **Une session = un lot** (`P1-05`…). Avant de coder : lire la fiche du
  lot dans `docs/plan/phase-N.md` et les sections de conception qu'elle
  cite. Vérifier que ses dépendances sont ✅ et que les décisions
  qu'elle référence ne sont plus « Proposée ».
- Branche `lot/<ID>-<slug>`, une PR par lot, titre `[<ID>] Intitulé`.
- Fin de lot : appliquer la « Définition de terminé »
  (`docs/plan/README.md` §4), puis mettre à jour le tableau §5.
- Un lot qui déborde est découpé (`P1-05a`, `P1-05b`), pas prolongé.
- Une règle métier qui change met à jour `docs/conception/` dans la même
  PR. Une décision prise est consignée dans `docs/decisions/`.
- Documentation et messages de commit en **français**.

## Invariants à ne jamais violer

- **Le client n'envoie jamais de valeur de progression** (XP, niveau,
  palier, confiance). Il envoie des intentions, et le serveur calcule.
- `src/lib/server/progression/core/` est **pur** : aucun import de
  Prisma, `$app/*` ou `$env/*`.
- `XpTransaction` est un registre en **ajout seul**. Une correction est
  une transaction négative liée (`reversesId`), jamais un `UPDATE` ou un
  `DELETE`. `ActorProgress` est une projection reconstructible.
- L'XP n'entre dans aucun calcul de réputation, de confiance ou de tri de
  recherche.
- Aucune **localisation précise** n'est stockée : uniquement le
  centroïde de commune ou un point de grille. Les distances affichées
  sont arrondies par tranches.
- Toute nouvelle donnée personnelle est couverte par l'export et
  l'anonymisation RGPD.

## Stack et conventions (rappel)

SvelteKit et Svelte 5 en **runes uniquement**, TypeScript strict, Prisma
5.22 et PostgreSQL (Neon, PostGIS), Better Auth, Zod et superforms,
shadcn-svelte et Tailwind 4, Cloudinary, Upstash (Redis pour le rate
limiting, QStash pour les jobs), déploiement Vercel. Organisation par
domaine : `src/lib/prisma/<domaine>/` (données),
`src/lib/schema/<domaine>/` (Zod), `src/lib/server/<domaine>/` (métier).
Alias d'import : `#lib/*`, `#server/*`, `#components/*`, `#shadcn/*`.

Vérifications : `npm run check`, `npm run lint`,
`npm run test:unit -- --run`, `npm run test:e2e` (base dédiée, voir
`e2e/README.md`).
