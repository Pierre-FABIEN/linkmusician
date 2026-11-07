# LinkMusician

La plateforme sociale et professionnelle de la musique, qui se vit comme
un **jeu** : trouve avec qui jouer près de chez toi, monte ton groupe,
enregistre, joue sur scène, et vois ta carrière avancer. Deux modes :
**carrière** (8 actes calqués sur l'industrie) et **jam** (jouer et se
rencontrer, dès ce soir). Mobile d'abord, installable comme une app (PWA).

## Pour s'y retrouver

| Besoin                                                  | Document                                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Vision, règles métier, modes de jeu, carrières par rôle | [docs/conception/](./docs/conception/README.md)                                        |
| Ordre de travail, fiches de lots, état d'avancement     | [docs/plan/](./docs/plan/README.md) (chemin pas à pas : §4 bis)                        |
| Décisions prises ou en attente                          | [docs/decisions/](./docs/decisions/README.md)                                          |
| Consignes de travail avec Claude Code                   | [CLAUDE.md](./CLAUDE.md)                                                               |
| Conventions et vérifications avant commit               | [CONTRIBUTING.md](./CONTRIBUTING.md)                                                   |
| Synchroniser avec le boilerplate                        | [docs/linkmusician/synchro-boilerplate.md](./docs/linkmusician/synchro-boilerplate.md) |

Modules LinkMusician : [compétences](./docs/skills/README.md) ·
[localisation](./docs/geo/README.md) · [médias](./docs/media/README.md) ·
[progression](./docs/progression/README.md) ·
[modération](./docs/moderation/README.md) ·
[onboarding](./docs/onboarding/README.md) ·
[profil public et tableau de bord](./docs/profil-public/README.md) ·
[indicateurs](./docs/indicateurs/README.md).

## Démarrer

```bash
npm install
cp .env.example .env          # une seule URL Neon (pooler), BETTER_AUTH_SECRET…
npm run db:deploy             # applique les migrations (connexion directe)
npm run seed:referentiels     # instruments et genres (rejouable, sans risque)
npm run seed:demo             # 13 musicien·nes fictifs et leurs scénarios (rejouable)
npm run dev                   # http://localhost:2000
```

- `npm run seed:demo` est **non destructif** : il ne crée que des comptes
  `<handle>@demo.linkmusician.test` (mot de passe `DemoPass!2026`, ou
  `SEED_DEMO_PASSWORD`) et ne touche pas au tien. Commune choisie :
  `npm run seed:demo -- --commune=<code INSEE>`.
- Il joue ensuite des **scénarios** ([prisma/seed-scenarios.ts](./prisma/seed-scenarios.ts))
  qui font vivre les fonctionnalités, avec leurs points calculés par le
  vrai moteur. Pour les voir, connecte-toi avec :

  | Compte                                   | Ce qu'il montre                                                                                                                                                   |
  | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `malik-batterie`                         | Responsable des **Rats du Mardi** : étapes vérifiée, corroborées et à prouver, démo en modération, une candidature reçue, contacts et groupe « Projet jazz-funk » |
  | `theo-basse`                             | Co-gestion du groupe, une confirmation d'enregistrement demandée à Samir, palier et succès bien remplis                                                           |
  | `samir-son`                              | Une **étape à confirmer** (notification, `/etapes/…`)                                                                                                             |
  | `clara-guitare`                          | **Lead** d'une jam à venir, une collaboration confirmée et appréciée                                                                                              |
  | `ines-chant`                             | Invitée sur une place de la jam à venir, un premier message de Kevin à lire                                                                                       |
  | `zoe-violon`, `lucas-sax`, `kevin-metal` | Carnet de jams (jam tardive : succès **Noctambule**), « Je suis dispo », une collaboration à confirmer (kevin)                                                    |
  | `hugo-dj`                                | **Trois messages envoyés** à Manon sans réponse (messagerie bloquée), invité dans **Néon Lagune**                                                                 |
  | `manon-ukulele`                          | Trois messages de Hugo à lire : répondre ouvre la conversation                                                                                                    |
  | `nora-prod`                              | Groupe **en formation**, idée de morceau avec une voix à pourvoir                                                                                                 |
  | `awa-clavier`                            | Atelier jam à la MJC, a confirmé le concert des Rats, a postulé, groupe « Remplaçant·es »                                                                         |
  | `jade-batterie`                          | **Mineure** (16 ans) : jams finies avant 22 h seulement, dispo jamais montrée                                                                                     |

  `npm run seed:demo -- --avec-moi` te mêle aux scénarios (ton compte : la
  dernière personne réelle avec une commune) : présent·e à la jam et
  apprécié·e, contacts et groupe « Projet funk », invitation dans les Rats,
  une étape à confirmer, un message de Zoé. Les scénarios ne se rejouent
  pas si le groupe « Les Rats du Mardi » existe déjà.

- `npm run seed` **vide toute la base** (jeu de démo du boilerplate) puis
  relance les deux seeds ci-dessus.
- Tests e2e : **arrêter `npm run dev`** avant (voir [e2e/README.md](./e2e/README.md)).

---

## Le socle : Boilerplate-core

LinkMusician est bâti sur le boilerplate SvelteKit (Svelte 5) `Boilerplate-Ecommerce` :
commerce, blog, administration et authentification sur PostgreSQL via
Prisma. Ses modules sont **conservés** (D6) : la boutique est mise en
veille par `PUBLIC_SHOP_ENABLED`, pas supprimée. Le code LinkMusician vit
dans ses propres fichiers ; une modification du socle est minimale et
marquée `LINKMUSICIAN:`.

### Documentation du socle

| Sujet                           | Document                                                 |
| ------------------------------- | -------------------------------------------------------- |
| Authentification                | [docs/auth/README.md](./docs/auth/README.md)             |
| Retirer l'authentification      | [docs/auth/retrait.md](./docs/auth/retrait.md)           |
| Administration                  | [docs/admin/README.md](./docs/admin/README.md)           |
| Retirer l'administration        | [docs/admin/retrait.md](./docs/admin/retrait.md)         |
| Catalogue produits              | [docs/products/README.md](./docs/products/README.md)     |
| Retirer le catalogue            | [docs/products/retrait.md](./docs/products/retrait.md)   |
| Commerce                        | [docs/commerce/README.md](./docs/commerce/README.md)     |
| Retirer le commerce             | [docs/commerce/retrait.md](./docs/commerce/retrait.md)   |
| Blog                            | [docs/blog/README.md](./docs/blog/README.md)             |
| Retirer le blog                 | [docs/blog/retrait.md](./docs/blog/retrait.md)           |
| Codes promo                     | [docs/promo/README.md](./docs/promo/README.md)           |
| Retirer les codes promo         | [docs/promo/retrait.md](./docs/promo/retrait.md)         |
| Contact                         | [docs/contact/README.md](./docs/contact/README.md)       |
| Retirer le contact              | [docs/contact/retrait.md](./docs/contact/retrait.md)     |
| Stockage & rotation des secrets | [docs/secrets-rotation.md](./docs/secrets-rotation.md)   |
| Déploiement Vercel              | [docs/deployment/README.md](./docs/deployment/README.md) |
| Tests end-to-end                | [e2e/README.md](./e2e/README.md)                         |
| Contribuer                      | [CONTRIBUTING.md](./CONTRIBUTING.md)                     |

### Structure

```
src/lib/lucia/        module d'authentification (retirable, voir docs/auth)
src/lib/admin/        gardes du back-office (retirable, voir docs/admin)
src/lib/products/     lecture publique du catalogue (retirable, voir docs/products)
src/lib/blog/         lecture publique du blog (retirable, voir docs/blog)
src/lib/contact/      formulaire de contact (retirable, voir docs/contact)
src/lib/commerce/     panier / checkout (retirable, voir docs/commerce)
src/lib/prisma/promo/ codes promo (retirable, voir docs/promo)
src/lib/prisma/       accès aux données, un dossier par domaine
src/lib/components/   composants partagés, dont shadcn-svelte
src/lib/server/       utilitaires serveur (Stripe, Cloudinary, quotas de débit)
src/routes/auth/      parcours d'authentification
src/routes/admin/     espace d'administration (réservé au rôle ADMIN)
prisma/               schéma, migrations et seed
e2e/                  parcours Playwright
```

### Commandes

```bash
npm run dev                 # Vite (:2000) + Prisma Studio (:5555) + stripe listen (webhooks)
npm run dev:vite            # Vite seul
npm run build               # build de production
npm run test:unit           # tests unitaires (Vitest)
npm run test:e2e            # parcours Playwright (auth + admin + produits + commerce + blog + promo + contact)
npm run check               # vérification des types
npm run lint                # prettier --check + eslint
npm run db:studio           # Prisma Studio seul (schéma de dev, http://localhost:5555)
npm run db:studio:e2e       # Prisma Studio (schéma e2e, http://localhost:5556)
npm run stripe:listen       # CLI Stripe → POST http://localhost:2000/api/webhooks
```

### CI

`.github/workflows/ci.yml` tourne sur push/PR vers `main`, deux jobs :

- **`lint-and-check`** : `npm ci`, `prettier --check` (bloquant), `eslint`
  (bloquant sur les erreurs — `svelte/require-each-key`,
  `svelte/prefer-svelte-reactivity`, `svelte/prefer-writable-derived` ;
  le reste de la dette pré-existante, `no-explicit-any`/`no-at-html-tags`,
  reste en `warn`, visible mais non-bloquant), `svelte-check` (bloquant),
  tests unitaires Vitest avec couverture (bloquant sur des tests rouges,
  pas sur le taux de couverture, aucun seuil configuré), `knip` (non-bloquant,
  dette de dépendances/fichiers inutilisés en cours de triage).
- **`e2e`** : Postgres jetable en service container (aucun secret réel
  requis, toutes les intégrations externes tournent en mode mock), suite
  Playwright complète hors `e2e/live/**` (specs appelant de vrais services
  externes). Non-bloquant pour l'instant (première itération), à rendre
  bloquant une fois la stabilité confirmée sur plusieurs runs.

Sécurité des dépendances : `.github/workflows/osv-scanner.yml` (scan OSV.dev
à chaque push sur `main` + hebdomadaire, résultats dans Security > Code
scanning) et `.github/dependabot.yml` (PRs de mise à jour groupées,
hebdomadaires) — remplacent l'ancien step `npm audit`, dont l'endpoint était
cassé côté npm (voir [RESTE_A_FAIRE.md](./RESTE_A_FAIRE.md) §1).

Voir [RESTE_A_FAIRE.md](./RESTE_A_FAIRE.md) pour l'état détaillé et la
feuille de route (dette ESLint, sécurité des dépendances, etc.).
