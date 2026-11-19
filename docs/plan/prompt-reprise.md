# Prompt de reprise — après la recette du 19 novembre 2026

La passe différée U3b-b, U3b-c, P8, U6a, P1c et P1d est **validée** sur le
PC gamer : [rapport et corrections](recette-2026-11-19.md).

- 1 682 unitaires réussis, 680 tests conditionnels ignorés.
- 125 intégrations distinctes et 2 tests de performance réussis sur Neon e2e.
- 13 scénarios E2E réussis sur PostgreSQL local, en deux passes (10 puis
  3 corrigés), sans reprise automatique.
- TypeScript/Svelte : 0 erreur, 0 avertissement ; lint des corrections conforme.
- Migration P8 appliquée en dev et e2e. Aucune opération de production.
- Le lint global conserve des écarts antérieurs détaillés dans le rapport.

```markdown
Reprends LinkMusician dans le dossier de travail courant. Lis CLAUDE.md,
git status et le rapport docs/plan/recette-2026-11-19.md.

1. Préserve le bilan des issues, le rapport de recette et les quatre fichiers
   de tests corrigés : ils peuvent encore être locaux. Le code initial a été
   vérifié publié sur main à 4e7b9d5 ; ne pas confondre avec la publication
   des corrections de recette. Aucun push n'a été fait par cette recette.
2. Ne relance pas toute la passe différée sans changement ou nouvelle raison.
   La suite E2E complète et les intégrations hors périmètre restent distinctes.
3. Prochain contrôle déjà planifié : T10 (gdpr-data.spec.ts), puis P7,
   U4/P5 et U5/P13 selon leurs fiches et dépendances. Aucun de ces lots
   n'est livré par la recette du 19/11.
4. Les issues #71, #36 et #72 restent ouvertes : U3c, partage des morceaux
   d'autrui, tâches/livrables, plateaux solo et studio personnel restent.
5. Pas de production ni de push automatique. Avant une mise en production,
   garder une passe E2E sur Neon (pooler et latence non vus par les E2E locaux).
```

## Décisions et suites

- **P8b** (plateaux par format) attend la validation de
  [D78](../decisions/D78-plateaux-par-format-revision-D64.md), toujours
  **Proposée** ; découpage P8b-1 à P8b-5 dans D78 §3.
- **U6b** : formats sur le formulaire de plateau, déclaration solo,
  candidature et recherche solo, après P8b.
- **N6** : Studio franchissable par une personne ; la scène l'est depuis P8.
- Q101 à Q105 restent au défaut. D79/Q106 est acceptée et son correctif testé.
- **P6** attend l'avis RGPD. Les migrations en production restent à vérifier
  avant déploiement ; aucune n'a été appliquée en production ici.
- `npm run seed:demo` n'a pas été rejoué pendant la recette.
