# Phase 0 — Préparer le socle pour LinkMusician

**But** : installer LinkMusician **à côté** des modules du boilerplate,
sans les supprimer (décision D6 du 03/11/2026 : « gardons les outils, ils
seront peut-être utiles ensuite »). La boutique est mise en veille et
disparaît de l'interface, mais son code, ses tests et ses migrations
restent intacts et fonctionnels.

**Principe directeur : rester synchronisable avec le boilerplate.**
L'historique est relié à `Boilerplate-Ecommerce` (remote `boilerplate`).
Chaque fichier du boilerplate qu'on modifie est une source de conflit à
la prochaine synchro (`git merge boilerplate/main`). D'où les règles
suivantes :

1. Le code LinkMusician vit dans **ses propres fichiers** : les dossiers
   de domaine de [conception/03 §2.3](../conception/03-architecture.md#23-arborescence-cible)
   et le groupe de routes `(app)`.
2. Toute modification d'un fichier du boilerplate est **minimale** et
   marquée d'un commentaire `LINKMUSICIAN:` (la liste s'obtient avec
   `rg "LINKMUSICIAN:"`). C'est la même convention que les marqueurs
   `*-PLUGIN` existants.
3. Une amélioration **générique**, utile à tout projet dérivé (par
   exemple un interrupteur global de la boutique), se fait de préférence
   **en amont** dans le boilerplate, puis se rapatrie par merge.
4. Les modèles Prisma de LinkMusician sont regroupés **à la fin** de
   `schema.prisma`, dans une section délimitée. Les migrations
   s'ajoutent à la suite des 48 migrations existantes (D10 : on garde
   l'historique).

**Fin de phase** :

- `check`, `lint`, `test:unit` et **toute la suite e2e du boilerplate**
  au vert (la boutique restant testée, interrupteur activé en e2e) ;
- base dédiée avec PostGIS ;
- un visiteur voit l'accueil LinkMusician, et non la boutique ;
- un utilisateur connecté atterrit dans la coquille `(app)`.

---

## P0-01 — Environnement local et état de référence

- **Objectif** : pouvoir lancer et tester le projet tel quel, avant toute
  modification.
- **Tâches** :
  - `npm install`, `.env` et `.env.test` depuis les exemples.
  - Base Postgres : branche Neon dédiée (voir P0-04) ou conteneur PostGIS
    local.
  - `npm run db:deploy && npm run seed`.
  - Lancer `check`, `lint`, `test:unit` et e2e (hors `e2e/live/**`).
  - Consigner l'état de référence ([etat-de-reference.md](./etat-de-reference.md)).
- **Fin** : le projet démarre sur `:2000`, et l'état de référence e2e est
  écrit. Sans lui, on ne saurait pas distinguer une régression d'un échec
  déjà présent.

## P0-01b — Rapatrier la réparation du socle ✅

Fait le 03/11/2026 : la réparation SvelteKit 3 a été faite en amont
([prompt](./prompt-reparation-boilerplate.md)), puis synchronisée
jusqu'à `fe82121`, et l'historique a été relié (`d24aed5`). Détail dans
[etat-de-reference.md](./etat-de-reference.md).

## P0-02 — Trancher les décisions de lancement

- **Objectif** : fermer les décisions qui conditionnent la phase 0 et la
  phase 1.
- **Décisions** : D1 à D9 (D6 et D10 sont déjà tranchées). Voir le
  [registre](../decisions/README.md).
- **Fin** : chaque décision est au statut **Acceptée** ou **Rejetée**,
  avec une ligne de justification.
- **Pas de code.**

## P0-03 — Mettre la boutique en veille

- **Objectif** : la boutique disparaît de l'expérience LinkMusician, mais
  reste réactivable par un seul interrupteur et reste couverte par les
  tests.
- **Tâches** :
  - Interrupteur `SHOP_ENABLED` (variable d'environnement, `false` par
    défaut, déclarée dans `src/env.ts`). Proposer de préférence cet
    interrupteur **en amont** dans le boilerplate (règle 3), puisqu'il est
    générique.
  - Garde serveur : un handle dans un fichier dédié, branché dans
    `hooks.server.ts` avec un marqueur `LINKMUSICIAN:`, qui renvoie une
    404 sur les routes de vitrine (`/products`, `/checkout`,
    `/suivi-commande`, `/cgv`) et sur les API de boutique (`/api/save-cart`,
    `/api/wishlist`, `/api/promo`, `/api/gift-cards`, `/api/stock-alerts`,
    `/api/bundles`) quand l'interrupteur est coupé. Les webhooks Stripe
    et Sendcloud restent ouverts (inoffensifs sans commande).
  - Interface : entrées de boutique masquées dans la navigation, le pied
    de page, le menu admin et le `sitemap.xml` quand la boutique est
    coupée.
  - Crons de `vercel.json` (relance de panier, export comptable, relances
    d'avis, vus récemment) : vérifier qu'ils ne font rien quand leurs
    interrupteurs `StoreSettings` sont désactivés (c'est le cas par
    défaut). Sinon, les rendre conditionnels à `SHOP_ENABLED`.
  - `.env.test` : `SHOP_ENABLED=true`, pour que la suite e2e du
    boilerplate continue de tester la boutique.
- **Fin** :
  - avec l'interrupteur coupé, `/products` et `/checkout` renvoient une
    404 et aucun lien de boutique n'apparaît (nouveau spec e2e
    `e2e/linkmusician/shop-off.spec.ts`, qui coupe l'interrupteur) ;
  - avec l'interrupteur activé (e2e), toute la suite existante reste au
    vert ;
  - `rg "LINKMUSICIAN:"` liste les points de modification du
    boilerplate, et il y en a peu.

## P0-04 — Base dédiée, PostGIS, rôle MODERATOR

- **Base** : LinkMusician a **son propre projet Neon** (branches
  `production`, `dev` et `e2e`), distinct de la base du boilerplate. On
  applique les 48 migrations existantes (D10 : on garde l'historique),
  puis les nôtres à la suite.
- **Tâches** :
  - Migration `…_linkmusician_postgis` :
    `CREATE EXTENSION IF NOT EXISTS postgis;`.
  - CI : l'image `postgis/postgis` remplace `postgres` dans
    `.github/workflows/ci.yml` (fichier du boilerplate, avec un marqueur
    ou une proposition en amont).
  - Rôle `MODERATOR` : ajouter une valeur à l'enum `Role` (modification
    d'une ligne du schéma du boilerplate, avec marqueur), plus une garde
    `requireModerator` dans `src/lib/server/moderation/`.
  - Ouvrir la section `// ═══ LINKMUSICIAN ═══` en fin de
    `schema.prisma` (vide pour l'instant).
- **Fin** : `npm run reset` fonctionne sur une base vide.
  `SELECT postgis_version();` répond en dev, en e2e et en CI. La suite e2e
  est au vert sur l'image PostGIS.

## P0-05 — Coquille de l'application et identité visuelle de base

- **Objectif** : un visiteur découvre LinkMusician, et un membre connecté
  a son espace.
- **Tâches** :
  - Groupe de routes `(app)` (zone connectée) avec son propre layout et
    sa navigation (Découvrir, Annonces, Messages, Mon parcours, Profil).
    Il ne réutilise pas `Navigation.svelte` de la boutique.
  - Accueil public provisoire LinkMusician avec inscription à la liste
    d'attente. `src/routes/+page.svelte` est un fichier du boilerplate :
    on garde le changement minimal, par exemple en affichant l'accueil
    LinkMusician quand la boutique est coupée et l'accueil boutique
    sinon.
  - Redirection après connexion vers `(app)`.
  - Jetons de design (couleurs, typographies, rayons, ombres) dans une
    feuille LinkMusician importée par le layout `(app)`, avec un thème
    sombre par défaut dans l'esprit « tableau de bord RPG ». Les maquettes
    P1-02 affineront.
  - SEO et image OG LinkMusician.
- **Fin** : un utilisateur connecté atterrit sur `(app)` avec des pages
  vides marquées « bientôt ». Le test a11y (`e2e/support/a11y.ts`) passe
  sur l'accueil et la coquille. La suite e2e du boilerplate reste au vert.

## P0-06 — Documentation et synchro amont outillée

- **Tâches** :
  - `README.md` racine : présenter LinkMusician en premier, et le socle
    boilerplate ensuite.
  - `docs/linkmusician/synchro-boilerplate.md` : procédure de synchro
    (`git fetch boilerplate`, merge, points `LINKMUSICIAN:` à vérifier,
    vérifications), avec un rythme proposé (à chaque fin de phase, ou
    quand l'amont corrige une faille).
  - Seed : ajouter des données LinkMusician minimales à côté du seed
    existant (fichier séparé, appelé à la fin de `prisma/seed.js`).
- **Fin** : une synchro de test (`git merge boilerplate/main` sans
  changement amont) se déroule en suivant la procédure.
