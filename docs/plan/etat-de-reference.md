# État de référence du boilerplate (lot P0-01)

## Situation actuelle (03/11/2026, après synchro amont) ✅

Les quatre causes décrites plus bas ont été corrigées **en amont**, dans
`Boilerplate-Ecommerce` (PR `fix/sveltekit3-migration`). Le correctif a
été rapatrié ici avec les mises à jour Dependabot fusionnées ensuite
(`fe82121`). L'historique est désormais relié au boilerplate (merge
`d24aed5`) : une prochaine synchro se fera par `git fetch boilerplate &&
git merge boilerplate/main`.

| Vérification                 | Résultat                                  |
| ---------------------------- | ----------------------------------------- |
| `npm run check`              | ✅ 0 erreur, 0 avertissement              |
| `npm run lint`               | ✅ 0 erreur (12 avertissements existants) |
| `npm run test:unit -- --run` | ✅ 94 passés, 2 ignorés                   |
| `npx vite build`             | ✅ (adapter Vercel)                       |
| `npm run test:e2e`           | ⏸ toujours non mesuré (pas de base)       |

### Mise à jour du 08/11/2026

| Vérification                 | Résultat                                              |
| ---------------------------- | ----------------------------------------------------- |
| `npm run check`              | ✅ 0 erreur, 0 avertissement                          |
| `npm run lint`               | ✅ 0 erreur, 12 avertissements                        |
| `npm run test:unit -- --run` | ✅ 888 passés, 105 ignorés                            |
| `npm run test:e2e`           | ⏸ non lancé : `.env.test` absent, cible non confirmée |

P0-01 reste bloqué sur la mesure e2e. Aucun test e2e ni migration n'a été
lancé : sans `.env.test`, la cible dérivée de `.env` n'a pas été confirmée
comme base de test dédiée.

Le reste de ce document est l'**historique** du diagnostic initial.

---

Mesuré le 03/11/2026 sur le commit `7cd1137` (commit initial), après un
`npm ci` propre (Node 24.13, npm 11.11), avec un `.env` et un `.env.test`
locaux à secrets factices. Il sert de point de comparaison pour tous les
lots de la phase 0.

## Résultats

| Vérification                 | Résultat                       | Commentaire                                                                             |
| ---------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| `npm ci`                     | ✅                             | 35 vulnérabilités signalées par `npm audit` (déjà suivies, voir `RESTE_A_FAIRE.md` A.1) |
| `npm run test:unit -- --run` | ✅ 94 passés, 2 ignorés        | Conforme à l'état documenté                                                             |
| `npm run lint` (Prettier)    | ✅                             | Après formatage des docs de conception                                                  |
| `npm run lint` (ESLint)      | ❌ 1 erreur, 12 avertissements | `src/routes/+layout.svelte:22` : `page` importé mais inutilisé                          |
| `npm run check`              | ❌ **27 936 erreurs**          | Voir cause n°1                                                                          |
| `npx vite build`             | ❌                             | Voir causes n°2 et n°3                                                                  |
| `npm run test:e2e`           | ⏸ non mesuré                   | Pas de base PostgreSQL disponible (voir « Bloquant »)                                   |

**L'état « vert » décrit dans `RESTE_A_FAIRE.md` (12/10/2026) n'est plus
vrai.** La montée de version vers SvelteKit 3, TypeScript 6 et Better
Auth 1.7 a été faite à moitié.

## Origine : le boilerplate lui-même

Notre commit initial a **exactement le même arbre git** que la branche
`main` du dépôt [Boilerplate-Ecommerce](https://github.com/Pierre-FABIEN/Boilerplate-Ecommerce)
(commit `3e011d5` « upgrade », 19/10/2026). La copie n'est donc pas en
retard. C'est ce commit amont qui a fait passer SvelteKit 2 → 3,
TypeScript 5 → 6 et Vite 6 → 8 sans terminer l'adaptation du code. **La
CI du boilerplate est en échec depuis ce commit**, et rien n'a été
poussé sur `main` depuis. Le remote git `boilerplate` a été ajouté
localement pour pouvoir comparer.

## Causes identifiées

1. **`tsconfig.json` incompatible avec SvelteKit 3 et TypeScript 6.**
   - SvelteKit 3 ne génère plus de liste `include`. Le `tsconfig.json`
     n'en a pas non plus, donc TypeScript analyse tout le dépôt, y compris
     `static/tinymce` (copié à l'installation) et `k6/`.
   - TypeScript 6 ne résout pas les alias `#lib/*`, `#server/*`… déclarés
     dans `package.json` (`imports` sans extension), ce qui déclenche plus
     de 1 000 erreurs « Cannot find module » en cascade.
   - **Essai effectué** : ajouter `include` et `compilerOptions.paths` fait
     passer le nombre d'erreurs de 27 936 à **44**.
2. **Conflit Zod 3 / Zod 4 au build.** Le bundle serveur embarque
   `better-auth`, qui a besoin de Zod 4, mais laisse `import "zod"` en
   externe. À l'exécution, cet import se résout vers le Zod 3.25 de la
   racine, d'où `sessionSchema.loose is not a function`. **Essai
   effectué** : `ssr.external: ['better-auth', '@better-auth/core',
'better-call']` règle ce point.
3. **Stripe initialisé au chargement du module** avec
   `process.env.STRIPE_SECRET_KEY`. Cette variable est absente au moment
   de l'analyse des routes du build, d'où `Neither apiKey nor
config.authenticator provided`. Le problème disparaît avec le retrait
   du commerce (P0-04). Un import paresseux suffit dans l'intervalle.
4. **Migration de l'API SvelteKit 3 incomplète** (les 44 erreurs
   restantes) :
   - `Handle` et `HandleServerError` sont à importer depuis
     `@sveltejs/kit/hooks` ;
   - `$env/dynamic/*` est à remplacer par `$app/env/*` (avec déclaration
     dans `src/env.ts`) ;
   - `SubmitFunction` a changé de module ;
   - `goto({ keepFocus })` n'existe plus ;
   - quelques types de specs e2e de modules qui seront retirés.

Répartition des erreurs (avant correctif du `tsconfig`, hors `static/` et
`k6/`) : 882 dans des modules destinés à être retirés, 576 dans des
modules conservés.

## Bloquant pour terminer P0-01

Aucune base PostgreSQL n'est accessible depuis WSL : la commande
`docker` existe (Docker Desktop) mais **l'intégration WSL n'est pas
activée**. Il faut l'activer dans _Docker Desktop → Settings → Resources
→ WSL integration_. On lancera ensuite :

```bash
docker run -d --name linkmusician-db -p 5432:5432 \
  -e POSTGRES_USER=linkmusician -e POSTGRES_PASSWORD=linkmusician \
  -e POSTGRES_DB=linkmusician postgis/postgis:17-3.5
```

Les `.env` et `.env.test` locaux pointent déjà sur cette base (schémas
`public` et `e2e`).
