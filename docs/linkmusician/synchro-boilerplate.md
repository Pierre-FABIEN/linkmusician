# Synchroniser LinkMusician avec le boilerplate

LinkMusician est bâti sur `Boilerplate-Ecommerce` (remote git
`boilerplate`, historique relié, décisions D6 et D10). On récupère ses
corrections par un **merge**, jamais par copie de fichiers.

## Quand

- à chaque **fin de phase** ;
- dès que l'amont corrige une **faille de sécurité** ;
- avant de proposer en amont une amélioration faite ici
  ([remontées](../plan/remontees-boilerplate.md)), pour partir d'une base
  à jour.

## Procédure

1. **Partir d'un état propre et vert**

   ```bash
   git switch main && git status        # rien en cours
   npm run check && npm run lint && npm run test:unit -- --run
   ```

2. **Voir ce qui arrive**

   ```bash
   git fetch boilerplate --prune
   git log --oneline main..boilerplate/main   # commits à intégrer
   git diff --stat main...boilerplate/main    # fichiers touchés en amont
   ```

   Rien à intégrer (`git merge-base --is-ancestor boilerplate/main main`
   réussit) : la synchro est finie.

3. **Fusionner**

   ```bash
   git merge boilerplate/main
   ```

   Message du commit de merge : `chore(synchro): boilerplate jusqu'à <sha court>`.

4. **Résoudre les conflits** : ils tombent presque toujours sur les lignes
   marquées `LINKMUSICIAN:` (environ 165 marqueurs dans 120 fichiers).
   - garder **les deux** intentions : le correctif amont **et** notre
     ajout ; jamais supprimer un module du boilerplate (D6) ;
   - `prisma/schema.prisma` : la section `LINKMUSICIAN` en fin de fichier
     ne doit jamais bouger ; remettre à l'identique les lignes du
     boilerplate réalignées par `prisma format` ;
   - `src/lib/linkmusician/brand.ts` porte le nom du produit : si l'amont
     a centralisé le nom (remontée n° 16), brancher sa constante sur la
     nôtre.

5. **Migrations** : une nouvelle migration amont s'applique comme les
   nôtres, par les scripts (jamais `npx prisma migrate` en direct) :

   ```bash
   npm run db:deploy && npm run db:deploy:e2e
   npx prisma generate
   ```

   Relire chaque migration amont : si elle supprime ou recrée des index du
   socle créés en SQL brut, appliquer la même vigilance que pour les
   nôtres (CLAUDE.md).

6. **Vérifier**

   ```bash
   npm run check && npm run lint && npm run test:unit -- --run
   npx playwright test e2e/linkmusician   # arrêter `npm run dev` avant
   ```

   et, si l'amont a touché l'authentification, l'admin ou le SEO, les
   specs correspondants du boilerplate (`e2e/auth`, `e2e/admin`,
   `e2e/commerce/seo.spec.ts`).

7. **Tracer** : noter la synchro (date, commit amont) ci-dessous, et
   retirer de [remontees-boilerplate.md](../plan/remontees-boilerplate.md)
   les points que l'amont a corrigés.

## Historique

| Date       | Commit amont intégré | Remarque                                                      |
| ---------- | -------------------- | ------------------------------------------------------------- |
| 05/11/2026 | déjà intégré         | Synchro de test (P0-06) : rien à fusionner, procédure validée |
