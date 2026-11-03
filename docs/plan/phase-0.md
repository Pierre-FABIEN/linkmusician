# Phase 0 — Assainir le boilerplate

**But** : partir d'un socle propre. On ne garde que l'authentification,
l'admin, le contact, le blog et l'outillage transverse. La suite e2e
restante doit être au vert, et la base doit être prête pour PostGIS.

**Pourquoi d'abord** : les modèles e-commerce (`Order`, `Product`…) sont
couplés à `User`. Les garder, c'est traîner du code mort dans chaque
migration, chaque export RGPD et chaque test.

**Fin de phase** : `npm run check`, `lint`, `test:unit` et e2e (auth,
admin, contact, blog) au vert. Le schéma Prisma ne contient plus que
l'identité, l'admin, le blog et le contact. Une page d'accueil
« LinkMusician » s'affiche.

---

## P0-01 — Environnement local et état de référence

- **Objectif** : pouvoir lancer et tester le projet tel quel, avant toute
  modification.
- **Tâches** :
  - `npm install`, `.env` et `.env.test` depuis les exemples.
  - Base Postgres locale, ou branche Neon `dev` et `e2e`.
  - `npm run db:deploy && npm run seed`.
  - Lancer `check`, `lint`, `test:unit` et e2e (hors `e2e/live/**`).
  - Consigner l'état de référence dans la PR : nombre de tests, échecs
    éventuels **déjà présents**.
- **Fin** : le projet démarre sur `:2000`, et l'état de référence est
  écrit. Sans cela, on ne saurait pas distinguer une régression causée
  par le retrait d'un échec qui existait déjà.

## P0-01b — Réparer le socle

> **Décision (03/11/2026)** : la réparation se fait **en amont**, dans
> `Boilerplate-Ecommerce`, avec le prompt
> [prompt-reparation-boilerplate.md](./prompt-reparation-boilerplate.md).
> Ce lot consiste alors à **rapatrier** la PR fusionnée en amont : on
> applique ses commits ici, ce qui passe sans conflit puisque l'arbre de
> départ est identique, puis on vérifie les critères ci-dessous. Les
> tâches suivantes restent la référence de ce qu'il faut obtenir.

- **Pourquoi** : l'état de référence ([etat-de-reference.md](./etat-de-reference.md))
  montre un projet qui ne passe ni `check` ni `build`. Sans filet vert, les
  retraits P0-03 à P0-05 ne peuvent pas détecter leurs propres régressions.
- **Tâches** :
  - `tsconfig.json` : ajouter `include` (`src`, `e2e`, fichiers de config
    racine) et `compilerOptions.paths` pour les alias `#…/*`, ou passer
    les cibles `imports` de `package.json` en `.ts` explicite.
  - `vite.config.ts` : `ssr.external` pour `better-auth`, afin de régler
    le conflit Zod 3 / Zod 4.
  - Migrer les 44 erreurs restantes vers l'API SvelteKit 3
    (`@sveltejs/kit/hooks`, `$app/env/*`, `SubmitFunction`,
    `keepFocus`). Celles des modules à retirer sont simplement ignorées :
    elles disparaîtront avec eux.
  - Initialisation paresseuse de Stripe, pour que le build passe jusqu'à
    P0-04.
  - Corriger l'erreur ESLint de `src/routes/+layout.svelte`.
  - Mettre `RESTE_A_FAIRE.md` à jour (l'état « vert » du 12/10 est
    obsolète).
- **Fin** : `check` ne contient plus aucune erreur hors des modules à
  retirer. `vite build` passe. `lint` est à 0 erreur. `test:unit` est
  inchangé. `vite dev` démarre, et les pages d'accueil et de connexion
  répondent.

## P0-02 — Trancher les décisions de lancement

- **Objectif** : fermer les décisions qui conditionnent la phase 0 et la
  phase 1.
- **Décisions** : D1 à D8, plus D9 (nom et domaine) et D10 (nouvelle base
  de migrations). Voir le [registre](../decisions/README.md).
- **Fin** : chaque décision est au statut **Acceptée** ou **Rejetée**,
  avec une ligne de justification.
- **Pas de code.**

## P0-03 — Retirer les codes promo

- **Guide** : [docs/promo/retrait.md](../promo/retrait.md), trajectoire
  « Tout retirer ».
- **Pourquoi en premier** : le module promo est accroché au checkout. Le
  retirer d'abord rend le retrait du commerce plus simple.
- **Fin** : `rg "PROMO-PLUGIN"` ne renvoie rien. Les specs `e2e/promo/**`
  sont supprimées. Le reste est au vert.

## P0-04 — Retirer le commerce et ses satellites

- **Guide** : [docs/commerce/retrait.md](../commerce/retrait.md),
  trajectoire « Tout retirer ».
- **Périmètre** : checkout, panier, `Order`, `Transaction`, Stripe
  (webhooks, cartes enregistrées, litiges), Sendcloud, factures, avoirs,
  export comptable, cartes cadeaux, retours, fidélité, parrainage,
  relance de panier, détection de fraude **au paiement**. Les crons
  associés sont retirés de `vercel.json` et `scripts/register-*`.
- **À garder** :
  - `src/lib/server/stripe.ts`, isolé et non branché, pour la phase 5.
    Si ça complique `knip`, on le supprime : on le récupérera dans
    l'historique git.
  - `fraud/disposableEmailDomains.ts` et l'empreinte d'appareil, utiles
    pour l'anti-collusion (P2-10).
  - `qstash.ts`, `job-attempts.ts`, `lock.ts`, `cronAuth.ts`, pour les
    futurs jobs.
- **Fin** : `rg -i "stripe|sendcloud|invoice|order" src/` ne renvoie que
  les éléments gardés explicitement. Le reste est au vert.
- **Risque** : c'est le plus gros lot de la phase. On le **découpe** s'il
  dépasse 2 jours : P0-04a pour le tunnel et Stripe, P0-04b pour la
  logistique et la comptabilité, P0-04c pour la fidélité et les cartes
  cadeaux.

## P0-05 — Retirer le catalogue produits

- **Guide** : [docs/products/retrait.md](../products/retrait.md),
  trajectoire « Retirer aussi le commerce ».
- **Périmètre** : produits, variantes, lots, taxonomies produit, avis,
  questions, liste de souhaits, alertes de stock, vus récemment, ventes
  flash, relances d'avis.
- **À garder** : `TaxonomyValuePicker` seulement si on prévoit de le
  réutiliser pour les genres. Sinon, on le supprime.
- **Fin** : le dossier `src/routes/products` n'existe plus. Le reste est
  au vert.

## P0-06 — Nettoyage transverse

- **Périmètre** :
  - Navigation et pied de page.
  - Pages légales : supprimer `/cgv` et `/suivi-commande`, garder
    `/cgu`, `/confidentialite`, `/mentions-legales` (leur contenu sera
    réécrit en P3-10).
  - Tableau de bord admin (`/admin/metrics`, `/admin/tva`,
    `/admin/livraison`, `/admin/identite`…).
  - `StoreSettings` : réduire aux réglages utiles, ou supprimer.
  - Seed et helpers e2e.
  - Scripts k6.
  - Dépendances npm devenues inutiles (`jspdf`, `stripe-js`, `tinymce`
    si le blog n'en a plus besoin…), vérifiées **une par une**
    (convention de CONTRIBUTING.md).
  - `README.md` racine, `RESTE_A_FAIRE.md` (archiver la partie
    e-commerce).
- **Fin** : `npm run lint:knip` ne signale aucun fichier nouvellement
  mort. Le README décrit LinkMusician.

## P0-07 — Nouvelle base de migrations, PostGIS, rôle MODERATOR

- **Décision préalable** : D10. S'il n'existe **aucune base de
  production**, on remplace les 40 migrations e-commerce par une
  migration initiale unique (`prisma migrate diff` du schéma nettoyé).
  S'il en existe une, on écrit une migration de suppression classique.
- **Tâches** :
  - Migration initiale.
  - `CREATE EXTENSION IF NOT EXISTS postgis;` (vérifier la disponibilité
    sur la branche Neon et en CI : utiliser l'image `postgis/postgis` dans
    `ci.yml`).
  - Ajouter `MODERATOR` à l'enum `Role` et une garde `requireModerator`
    à côté des gardes admin.
- **Fin** : `npm run reset` fonctionne depuis une base vide. La CI e2e
  tourne sur l'image PostGIS. `SELECT postgis_version();` répond en dev et
  en CI.

## P0-08 — Coquille de l'application et identité visuelle de base

- **Objectif** : remplacer l'apparence de boutique par une coquille
  d'application vide mais cohérente.
- **Tâches** :
  - Groupe de routes `(app)` (zone connectée) avec un layout
    (navigation : Découvrir, Annonces, Messages, Mon parcours, Profil).
  - Page d'accueil publique provisoire avec inscription à la liste
    d'attente.
  - Jetons de design (couleurs, typographies, rayons, ombres) dans
    `app.css`, avec un thème sombre par défaut, cohérent avec l'esprit
    « tableau de bord RPG ». Les maquettes P1-02 affineront.
  - Mise à jour du SEO et de l'image OG.
- **Fin** : un utilisateur connecté atterrit sur `(app)` avec des pages
  vides marquées « bientôt ». Le test a11y (`e2e/support/a11y.ts`) passe
  sur l'accueil et la coquille.
