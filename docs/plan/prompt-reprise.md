# Prompt de reprise — après DASH-20c

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot :
T10 (docs/plan/a-trancher.md, « À vérifier hors code ») : `gdpr-data.spec.ts`
(boilerplate), les deux refus de suppression du compte attendent un JSON
`failure` en 200 et reçoivent 400.

Avant de coder :

1. Lis CLAUDE.md, docs/plan/README.md §4 (définition de terminé), la ligne
   T10 de docs/plan/a-trancher.md et la fiche DASH-20c dans
   docs/plan/fin-du-projet.md (« Reste »). Crée une fiche T10 courte avant
   de coder.
2. git status, git log -5 et git ls-remote origin refs/heads/main. Commits
   locaux attendus, sans push : « (DASH-20c) » (les commits ONB-14,
   DASH-20a et DASH-20b sont publiés : origin/main était à 18d2fe3 le
   17/11/2026). Note ce que l'utilisateur a publié depuis. Préserve les
   commits et changements des autres sessions.
3. Lis e2e/auth/gdpr-data.spec.ts, l’action
   `delete` de /auth/settings/donnees et la façon dont SvelteKit répond à
   un `fail(400)` pour une requête `x-sveltekit-action` (en-têtes de
   `sveltekitActionHeaders`, e2e/support/admin.ts).

À faire :

- Établir si l'écart vient du test (attente datée d'une version de
  SvelteKit) ou de la garde. Le compte doit rester intact dans les deux
  refus. Code du boilerplate : modification minimale, marquée
  `LINKMUSICIAN:`, ou proposée en amont si générique.
- Ne modifie le code que pour un défaut trouvé, avec un test qui le
  reproduit, et consigne-le dans la fiche.

Repères :

- Le serveur e2e est un `vite dev` : ne touche pas au code source, ne lance
  pas npm run check et ne régénère pas Prisma pendant un E2E ; vérifie les
  processus via ps.
- `npm run lint` global échoue pour des raisons extérieures (`.shot-*.mjs`,
  `playwright-report/`) : ESLint et Prettier sur les fichiers du lot.
  Tableaux Markdown : garder la largeur des colonnes (si la cellule modifiée
  était la plus large, la réécrire à la même largeur).
- Instabilités connues : M1, T1, T2 dans docs/plan/a-trancher.md. Relancer
  seul un test qui échoue avant de conclure, et dire lequel.
- Q70 à Q74 attendent l'utilisateur. Q73 (DASH-20c) : une collaboration sur
  le morceau d'un groupe n'avance que si l'un·e des participant·es le gère
  encore (`requireWorkStillManaged`).

Fin de lot : fiche T10, ligne T10 de a-trancher (corrigé ou expliqué),
tableau de docs/plan/README.md si un lot y figure, prompt de reprise.
Commit en français préfixé « (T10) », sans push.

Restent ensuite : la suite de #26 (invitation à compléter dans la
recherche, expériences), les extensions de #36 et #37, et #50 en recette
continue (extensions #51–#54 au fil des livraisons). #70–#72 cadrent l'UX
Metro/Carrière, sans refonte globale pendant un lot fonctionnel.
```
