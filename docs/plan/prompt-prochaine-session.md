# Prompt de reprise — session du 03/11/2026 → session suivante

> À coller au début de la prochaine session Claude Code, dans le dépôt
> `linkmusician`. Il complète `CLAUDE.md` (lu automatiquement) avec l'état
> exact laissé en fin de session. Une fois la session lancée, ce fichier
> peut être supprimé ou remplacé par le suivant.

---

```markdown
# Reprise LinkMusician — état au 03/11/2026 et prochain lot

## À lire avant toute action

1. `CLAUDE.md` : méthode (un lot = une branche = une PR), règles de cohabitation
   avec le boilerplate (marqueurs `LINKMUSICIAN:`), invariants.
2. `docs/plan/README.md` §5 (tableau de suivi) et `docs/plan/phase-1.md`, fiche **P1-03b**.
3. `docs/decisions/README.md` : D5, D6, D10, D14, D15 et D16 sont **acceptées**. D1-D4 et
   D7-D9 restent « Proposée » (ne pas les considérer comme tranchées).

## Ce qui a été fait pendant la dernière session

- Conception complète : `docs/conception/` (vision, progression, architecture, modèle de données, MVP).
- Socle réparé en amont dans `Boilerplate-Ecommerce` (migration SvelteKit 3), puis synchronisé
  jusqu'à `fe82121`. L'historique est **relié** au boilerplate (remote `boilerplate`) : une synchro
  se fait par `git fetch boilerplate && git merge boilerplate/main`.
- **D6 : on garde tous les modules du boilerplate.** La boutique est mise en veille (P0-03),
  pas supprimée. Plus tard, LinkMusician vendra ses propres services : l'interrupteur devra alors
  être adapté (ne pas l'étendre sans en parler).
- **P0-03 ✅** : `PUBLIC_SHOP_ENABLED` (absente = `false`), garde via `reroute` dans `src/hooks.ts`,
  logique pure dans `src/lib/shop/gate.ts`, menu compte `src/lib/components/linkmusician/AccountMenu.svelte`.
- **P1-03a ✅** : inscription avec date de naissance (16 ans minimum) et CGU. `Actor` et `Person`
  sont créés à l'inscription (`src/lib/prisma/actors/person.ts`). Règles pures dans
  `src/lib/actors/{age,handle}.ts`. Écran `/bienvenue` pour les comptes sans personne. Garde de la
  zone `src/routes/(app)/+layout.server.ts`, page provisoire `/espace`. Rôle `MODERATOR` ajouté.
  RGPD : export et anonymisation étendus.

## État git (rien n'est fusionné dans `main`)

Les branches sont **empilées** : chacune contient la précédente.

- `main` = `3cada18` (poussé).
- `lot/P0-02-decisions` (`09163ed`) → `lot/P0-03-boutique-en-veille` (`f430e13`, `32cfeea`, poussée
  sauf le dernier commit) → `lot/P1-03a-inscription` (`32267b4`, non poussée).
- Le terminal de Claude n'a **pas d'identifiants GitHub** (`git push` échoue) et `gh` n'est pas
  installé : c'est l'utilisateur qui pousse depuis VS Code. Demander s'il faut d'abord fusionner
  `lot/P1-03a-inscription` dans `main` (en avance rapide, puisque les branches sont empilées), puis
  partir de `main` pour P1-03b.

## Environnement

- `.env` (schéma `public`) et `.env.test` (schéma `e2e`) pointent sur la base Neon dédiée
  `ep-lingering-base-…` (variables de test, la fuite n'est pas grave d'après l'utilisateur).
  `PUBLIC_SHOP_ENABLED=false` en dev, `true` en e2e.
- 49 migrations appliquées en dev, seed chargé. Comptes de démo : `admin@madeindiamonds.com` /
  `DemoPass!2026` (a maintenant une personne `@studio-admin`), et un compte de test
  `lea.<timestamp>@example.test` (`@lea-guitare`).
- Le `npm run dev` de l'utilisateur tourne sur le port 2000 (avec Prisma Studio et `stripe listen`).
  **Ne pas l'arrêter.** S'il répond 504 « Outdated Optimize Dep », lui demander de le relancer. Pour
  tester, lancer son propre serveur : `npx vite dev --port 2002 --strictPort`. Pour arrêter un
  processus, utiliser `pgrep -f "[v]ite dev --port 2002" | xargs -r kill` : un `pkill -f` sans
  crochets tue le shell de Claude lui-même (code 144).
- Pas de Docker dans WSL (intégration désactivée). La base est sur Neon.

## Pièges connus

- **Migrations** : `prisma migrate dev` propose de supprimer 3 index `transactions_*` et de recréer
  `blog_posts_published_createdAt_idx`. Retirer ces lignes à la main **avant** d'appliquer la
  migration (voir le commentaire en tête de `20261103163405_linkmusician_actor_person`).
  `prisma format` réaligne les lignes `id`/`email`/`username` de `User` : les remettre à l'identique.
- **Test `anonymizeUser.test.ts`** (boilerplate) : il simule Prisma. Toute nouvelle opération RGPD
  LinkMusician doit passer par `personAnonymizationOps`, déjà neutralisé dans ce test.
- **Formulaires** : un message de validation qui apparaît au blur décale les champs suivants. Dans
  les scripts de navigateur, faire `blur()` sur le champ avant de cliquer plus bas.
- **Boilerplate** (à signaler en amont, pas à corriger ici) : `ScrollTrigger.scrollerProxy is not a
function` à chaque chargement de page (GSAP, `SmoothScrollBar.svelte`, sans effet bloquant). Toute
  404 est journalisée comme `UnhandledError`. Le corps des pages n'est rendu que côté client
  (`{#if $isClient}`). `sitemap.config` pointe encore sur madeindiamonds.com.
- Les tests e2e ont été **mis de côté à la demande de l'utilisateur** : la suite complète n'a jamais
  été mesurée sur ce projet (P0-01 ⏸). Ne pas la lancer sans le lui proposer (elle est longue).

## Prochain lot : P1-03b — choix des métiers (« Qui es-tu ? »)

Voir la fiche dans `docs/plan/phase-1.md`. En résumé :

- Écran affiché après la vérification de l'email, ou après `/bienvenue`, tant que la personne n'a
  aucun `PersonTrack`. Un ou plusieurs métiers (enum `TrackKind` déjà en base : MUSICIAN, PRODUCER,
  SOUND_ENGINEER, MANAGER, BOOKER, PROMOTER, LABEL_PRO, PUBLISHER, MUSIC_COMMS), dont **un
  principal** (`isPrimary`, exactement un par personne).
- D15 : musicien complet, les autres affichés « bientôt » mais enregistrables (profil de base). On
  mesure ainsi la demande.
- Libellés inclusifs en français (producteur·rice, ingé son, organisateur·rice…), dans un
  référentiel pur et testé (par exemple `src/lib/actors/tracks.ts`), jamais écrits en dur dans les
  composants.
- Métiers modifiables ensuite dans les réglages, avec la garantie d'un métier principal unique.
- Où brancher la redirection : la garde `(app)/+layout.server.ts` (personne sans métier → écran de
  choix), plutôt que dans les pages d'authentification du boilerplate.
- Ensuite, proposer « créer ou rejoindre une structure » (bientôt, sauf groupe en phase 3).
- Critères de fin : au moins un métier pour toute personne qui a terminé l'écran, exactement un
  principal, export RGPD à jour (`exportPersonData` inclut déjà les métiers), `check`, `lint` et
  tests unitaires au vert, parcours vérifié dans le navigateur.

## Questions ouvertes à poser à l'utilisateur au bon moment

- Fusionner les branches de lot dans `main` maintenant ?
- D9 (nom définitif) et D4 (zone de lancement), nécessaires pour P0-05 (coquille, accueil).
- Relancer un jour la suite e2e complète (environ 30-40 min), et transformer le parcours
  d'inscription en spec e2e `e2e/linkmusician/inscription.spec.ts`.
- Remonter au boilerplate : l'interrupteur de boutique (générique), les index absents du schéma,
  l'erreur GSAP et le journal des 404.
```
