# Prompt — réparer Boilerplate-Ecommerce après la montée SvelteKit 3

> À coller dans une session Claude Code ouverte **dans le dépôt
> `Boilerplate-Ecommerce`**. Diagnostic établi le 03/11/2026 depuis le
> projet `linkmusician`, dont le commit initial a un arbre identique à
> `Boilerplate-Ecommerce@3e011d5`.

---

````markdown
# Mission : remettre la CI de ce boilerplate au vert après le commit « upgrade »

## Contexte (vérifié, ne pas re-diagnostiquer de zéro)

Le commit `3e011d5` « upgrade » (19/10/2026) a fait passer SvelteKit 2.21 → 3.1,
TypeScript 5.9 → 6.0 et Vite 6.4 → 8.3, sans terminer la migration du code.
**La CI (`.github/workflows/ci.yml`) est en échec sur `main` depuis ce commit.**
`RESTE_A_FAIRE.md` affiche encore un état « vert » daté du 12/10, qui est faux.

État mesuré sur `3e011d5`, après `npm ci` propre (Node 24, `.env` à secrets factices) :

| Vérification            | Résultat                                                                 |
| ----------------------- | ------------------------------------------------------------------------ |
| `npx vitest run`        | ✅ 94 passés / 2 ignorés                                                 |
| `npm run lint` (ESLint) | ❌ 1 erreur : `src/routes/+layout.svelte:22`, `page` importé non utilisé |
| `npm run check`         | ❌ 27 936 erreurs                                                        |
| `npx vite build`        | ❌ échoue pendant « Analysing routes »                                   |
| e2e                     | non mesuré                                                               |

## Causes identifiées et correctifs déjà testés

### 1. `tsconfig.json` (≈ 27 900 erreurs sur 27 936)

- SvelteKit 3 génère `node_modules/$app/tsconfig.json` **sans `include`**, et le
  `tsconfig.json` n'en a pas non plus : TypeScript analyse tout le dépôt,
  y compris `static/tinymce/` (copié par le postinstall) et `k6/`.
- TypeScript 6 ne résout pas les alias `imports` de `package.json`
  (`"#lib/*": "./src/lib/*"`, cibles **sans extension**). Résultat : plus de
  1 000 erreurs « Cannot find module '#lib/…' » en cascade (trace :
  `Import specifier '#lib/server/rate-limit' does not exist in package.json scope`).
- **Testé** : ajouter ces deux blocs fait passer `svelte-check` de 27 936 à **44** erreurs :
  ```json
  "include": ["src", "e2e", "vite.config.ts", "sveltekit.config.ts", "playwright.config.ts", "vite-plugin-drop-stale-pwa.ts"],
  "compilerOptions": { "paths": {
    "#components/*": ["./src/lib/components/*"], "#lib/*": ["./src/lib/*"],
    "#server/*": ["./src/lib/server/*"], "#shadcn/*": ["./src/lib/components/shadcn/ui/*"],
    "#store/*": ["./src/lib/store/*"] } }
  ```
````

Alternative à évaluer : déclarer les alias dans `kit.alias` (ils seraient alors
générés dans le `paths` du tsconfig parent, aujourd'hui vide), ce qui éviterait
la duplication avec `package.json`. Vérifier aussi que Vite, Vitest et Playwright
résolvent toujours les alias.

### 2. Conflit Zod 3 / Zod 4 au build

- `better-auth@1.7` dépend de Zod 4 (installé dans `node_modules/better-auth/node_modules/zod`).
  Le projet impose Zod 3.25 à la racine (pour superforms et `zod-v3-to-json-schema`).
- Le bundle serveur embarque le code de better-auth, mais laisse `import "zod"` en
  externe. À l'exécution, cet import se résout vers le Zod 3 de la racine, d'où
  `TypeError: sessionSchema.loose is not a function` (`.svelte-kit/output/server/chunks/auth.js`).
- **Testé** : dans `vite.config.ts`, `ssr: { external: ['better-auth', '@better-auth/core', 'better-call'] }`
  règle ce point. Alternative de fond : passer le projet en Zod 4
  (superforms 3 a un adaptateur `zod4`). Choisir et justifier.

### 3. Stripe initialisé au chargement du module

- Une fois le point 2 réglé, le build échoue sur
  `Error: Neither apiKey nor config.authenticator provided` : `src/lib/server/stripe.ts`
  crée le client au chargement du module avec `process.env.STRIPE_SECRET_KEY`, absent
  pendant l'analyse des routes au build.
- Plus largement, environ 25 accès à `process.env.*` subsistent (Sendcloud, SMTP,
  QStash, Redis, Cloudinary, `CRON_SECRET`, `APP_URL`…), alors que `src/env.ts`
  (`defineEnvVars`) ne déclare que 5 variables. **Vérifier** comment SvelteKit 3
  expose les variables : sont-elles présentes dans `process.env` en `vite dev`, en
  `vite build` et sur Vercel ? Ensuite, soit déclarer chaque variable dans
  `src/env.ts` et lire via `$app/env/private`, soit initialiser les clients de
  façon paresseuse au premier appel. L'objectif est qu'**aucun SDK ne soit
  instancié au chargement d'un module**.

### 4. API SvelteKit 3 non migrée (les 44 erreurs restantes après le point 1)

- `Handle` et `HandleServerError` : importer depuis `@sveltejs/kit/hooks`, et non
  `@sveltejs/kit` (`src/hooks.server.ts`, 35 erreurs dont la plupart en cascade,
  par exemple « Binding element 'event' implicitly has an 'any' type »).
- `$env/dynamic/private` et `$env/dynamic/public` n'existent plus : passer à
  `$app/env/*`, avec déclaration dans `src/env.ts`.
- `SubmitFunction` a changé de module. `goto(..., { keepFocus })` n'existe plus (3 occurrences).
- Types e2e : `e2e/admin/exports.spec.ts:119` (`product` sur `never`),
  `e2e/products/review-reminder.spec.ts` (`reviewReminderEnabled` absent du type
  `StoreSettings`), `tailwind.config.ts` (`fontFamily`, `darkMode: ['class']`).
- Consulter le guide de migration officiel SvelteKit 2 → 3 pour les changements
  qui ne remonteraient pas en erreur de types.

## Méthode

1. Branche `fix/sveltekit3-migration` depuis `main`. Regarder d'abord la branche
   Dependabot `dependabot/npm_and_yarn/sveltejs/kit-3.1.1` : l'intégrer si elle est
   triviale.
2. Mesurer de nouveau l'état de référence ci-dessus et signaler tout écart.
3. Corriger dans l'ordre 1 → 2 → 3 → 4, **un commit par cause**, en relançant
   `check` et `build` après chacun.
4. Ne **pas** revenir à SvelteKit 2 ni à TypeScript 5, ne pas baisser le niveau
   de strictness, ne pas exclure de dossiers de `src/` pour masquer des erreurs.
   Ne pas ajouter de `// @ts-ignore` ni de `any` sans justification écrite.
5. Respecter `CONTRIBUTING.md` (runes Svelte 5, conventions des modules, mise à
   jour des `docs/*/README.md` concernés).

## Critères de fin

- `npm run check` : 0 erreur. `npm run lint` : 0 erreur. `npx vitest run` : au
  moins 94 passés.
- `npx vite build` passe avec des secrets factices.
- `npm run dev` démarre, et `/`, `/auth/login`, `/products` et `/admin` (connecté
  en admin) répondent.
- e2e (hors `e2e/live/**`) au vert localement, ou liste précise des specs en échec
  avec leur cause.
- La CI `lint-and-check` est verte sur la PR.
- `RESTE_A_FAIRE.md` mis à jour : nouvel état de référence daté, et entrée
  décrivant cette réparation.
- `MIGRATION_BETTER_AUTH.md` / `RECOMMANDATIONS_SVELTEKIT.md` corrigés s'ils
  affirment un état faux.

## Livrable

Une PR vers `main`. Ne rien pousser ni fusionner sans me le demander. Le
résumé final doit lister, pour chaque cause : le correctif retenu, les
alternatives écartées et pourquoi, et les commits qui la corrigent (pour que je
puisse les rapporter dans les projets dérivés du boilerplate).

```

```
