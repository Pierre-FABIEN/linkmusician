# LinkMusician — consignes pour Claude Code

Plateforme sociale et professionnelle de la musique, avec une progression
de type RPG. Le projet est bâti sur le boilerplate SvelteKit e-commerce
`Boilerplate-Ecommerce` (remote git `boilerplate`, historique relié). Ses
modules sont **conservés** : la boutique est mise en veille, pas
supprimée (décision D6).

## Où trouver quoi

| Besoin                                                | Document                                        |
| ----------------------------------------------------- | ----------------------------------------------- |
| Vision, règles métier, architecture                   | `docs/conception/` (commencer par `README.md`)  |
| **État d'avancement**, méthode, définition de terminé | `docs/plan/README.md` (§4, tableau §5)          |
| Route jusqu'à la fin, **fiche de chaque lot restant** | `docs/plan/fin-du-projet.md`                    |
| Décisions tranchées ou en attente                     | `docs/decisions/README.md`                      |
| Questions laissées pour plus tard (défauts appliqués) | `docs/plan/a-trancher.md`                       |
| Conventions de code et vérifications avant PR         | `CONTRIBUTING.md`                               |
| Reprendre une session sans tout relire                | `docs/plan/prompt-reprise.md`                   |
| Feuille de route de la startup (hors code)            | `docs/lancement/README.md` (`/admin/lancement`) |
| Données de démo : qui se connecte, quoi voir          | `docs/demo/README.md` (`npm run seed:demo`)     |
| Style Metro : règles, migration de chaque page        | `docs/design/README.md` (D55)                   |

## Méthode de travail

- **Une session = un lot** (`P5-05`…). Avant de coder : lire la fiche du
  lot dans `docs/plan/fin-du-projet.md` (et sa section de
  `preparation-phase-5.md` pour un lot P5), puis les sections de
  conception qu'elle cite. Vérifier que ses dépendances sont ✅ et que les décisions
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
  `blog_posts_published_createdAt_idx`, et l'index partiel LinkMusician
  `memberships_open_key`). Les retirer avant d'appliquer la
  migration : `npm run db:migrate -- --create-only --name <nom>`, puis
  `npm run db:nettoyer-migration`, relire, et `npm run db:deploy` (puis
  `db:deploy:e2e`).
- **Jamais `npx prisma migrate …` directement** : passer par les scripts
  `db:*`, qui utilisent une connexion directe. À travers le pooler Neon, une
  migration peut s'appliquer au mauvais schéma (constaté le 04/11/2026).
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
7 (adaptateur `pg`, client par `createPrismaClient`) et PostgreSQL (Neon, PostGIS), Better Auth, Zod et superforms,
shadcn-svelte et Tailwind 4, Cloudinary, Upstash (Redis pour le rate
limiting, QStash pour les jobs), déploiement Vercel. Organisation par
domaine : `src/lib/prisma/<domaine>/` (données),
`src/lib/schema/<domaine>/` (Zod), `src/lib/server/<domaine>/` (métier).
Alias d'import : `#lib/*`, `#server/*`, `#components/*`, `#shadcn/*`.

Vérifications : `npm run check`, `npm run lint`,
`npm run test:unit -- --run`, `npm run test:e2e` (base dédiée, voir
`e2e/README.md`).
