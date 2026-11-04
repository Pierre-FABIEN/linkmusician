# LinkMusician — consignes pour Claude Code

Plateforme sociale et professionnelle de la musique, avec une progression
de type RPG. Le projet est bâti sur le boilerplate SvelteKit e-commerce
`Boilerplate-Ecommerce` (remote git `boilerplate`, historique relié). Ses
modules sont **conservés** : la boutique est mise en veille, pas
supprimée (décision D6).

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
- **On travaille directement sur `main`**, toujours à jour : pas de branche
  de lot ni de PR (décision de l'utilisateur, 04/11/2026). Un commit par
  étape cohérente, préfixé par l'ID du lot dans le message
  (`feat(geo): … (P1-05)`). L'utilisateur pousse `main` depuis VS Code.
- Fin de lot : appliquer la « Définition de terminé »
  (`docs/plan/README.md` §4), puis mettre à jour le tableau §5.
- Un lot qui déborde est découpé (`P1-05a`, `P1-05b`), pas prolongé.
- Une règle métier qui change met à jour `docs/conception/` dans le même
  commit. Une décision prise est consignée dans `docs/decisions/`.
- Documentation et messages de commit en **français**.

## Cohabitation avec le boilerplate

- Le code LinkMusician vit dans ses propres fichiers (dossiers de domaine,
  groupe de routes `(app)`, section `LINKMUSICIAN` en fin de
  `schema.prisma`).
- Une modification d'un fichier du boilerplate est **minimale** et marquée
  d'un commentaire `LINKMUSICIAN:`. On ne supprime aucun module du
  boilerplate.
- Une amélioration générique se propose plutôt en amont, puis se
  rapatrie avec `git fetch boilerplate && git merge boilerplate/main`.
- **Relire chaque migration générée** (`prisma migrate dev`) : Prisma
  propose de supprimer ou recréer des index du boilerplate créés en SQL
  brut et absents de `schema.prisma` (`transactions_*`,
  `blog_posts_published_createdAt_idx`). Les retirer avant d'appliquer la
  migration : `prisma migrate dev --create-only`, puis
  `npm run db:nettoyer-migration`, puis relire.
- **SQL brut** : nommer le schéma (`qualifiedTable`, `src/lib/server/db-schema.ts`).
  À travers le pooler Neon, `?schema=e2e` ne s'applique pas au SQL brut.
- `prisma format` réaligne parfois des lignes du boilerplate : remettre
  ces lignes à l'identique pour limiter les conflits.

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
