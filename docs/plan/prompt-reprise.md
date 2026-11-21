# Prompt de reprise — après Melokiva Diagram, première tranche (19 novembre 2026)

Session du 19/11 : **DIAGRAM-01, DIAGRAM-02 et DIAGRAM-03** (issue
[#90](https://github.com/Pierre-FABIEN/linkmusician/issues/90), décision
D80). Trois commits **locaux, non poussés** : `76cba90`, `894c910`,
`722674b` (plus le commit de documentation qui suit). Rien n'a été déployé.

- Inventaire : 312 processus ; 379 déclencheurs relus dans le code, 0 non
  inventorié, 87 hors périmètre justifié (boutique en veille D6,
  laboratoire, Diagram lui-même).
- 7 diagrammes `.drawio` du parcours de référence Groupe → Projet EP →
  Besoin → Recherche → Invitation → Participation ; 14 processus documentés.
- `/diagram` : garde serveur sur chaque lecture (ADMIN ou
  `DIAGRAM_READER_IDS`, 404 sinon), menu, recherche, visualiseur, contrôle.
- Vérifications : `npm run check` 0 erreur 0 avertissement ; lint 0 erreur
  sur les fichiers touchés ; 1 766 unitaires réussis (680 conditionnels
  ignorés) ; E2E `diagram.spec.ts` 3/3 sur PostgreSQL local. Aucun autre E2E
  rejoué, aucune passe Neon pour ce lot.

La recette du 19/11 (U3b-b, U3b-c, P8, U6a, P1c, P1d) reste valable :
[rapport](recette-2026-11-19.md).

```markdown
Reprends LinkMusician dans le dossier de travail courant. Lis CLAUDE.md,
git status, docs/diagram/README.md et docs/diagram/coverage.md.

1. Vérifie si `76cba90`, `894c910`, `722674b` et le commit de documentation
   DIAGRAM ont été poussés (`git ls-remote origin refs/heads/main`) ; ne
   pousse rien toi-même.
2. Pour un lot DIAGRAM : prochain lot recommandé DIAGRAM-04a (groupes :
   recrutement, demandes, rôles, transmission, départ, dissolution, états
   de `Membership`), puis l'ordre de docs/diagram/README.md §6. Partir de
   l'inventaire (processus « à construire »), lire les services réels,
   dessiner le .drawio non compressé, déclarer les étapes, puis
   `npm run diagram:sync` et `npm run test:unit -- --run src/lib/server/diagram`.
3. Toute action ajoutée ou modifiée dans le code met à jour
   src/lib/server/diagram/inventory/ (le test échoue sinon).
4. Hors DIAGRAM, contrôles déjà planifiés : T10 (gdpr-data.spec.ts), puis
   P7, U4/P5 et U5/P13 selon leurs fiches. Issues #71, #36 et #72 ouvertes.
5. Pas de production ni de push automatique. Avant une mise en production,
   garder une passe E2E sur Neon.
```

## Prochain chantier

**Clôture de Rencontre V1** ([rencontre-v1.md](rencontre-v1.md)). RV-01 est
livré. RV-02a ajoute le carnet volontaire (D82, #99 partielle) ; lire le
[bilan du sous-lot](rv-02a-carnet.md) pour les vérifications et les limites.
Prochaine tranche RV-02b : Découvrir tous les acteurs publics, puis
l'organisation des trois espaces. RV-03 et RV-04 restent à traiter.
Ne pas pousser automatiquement les commits locaux.

## Décisions et suites

- **D80** (Melokiva Diagram) acceptée par défaut, à confirmer ; **Q107 à
  Q109** au défaut (accès ADMIN + liste d'identifiants, 404, boutique hors
  inventaire).
- Pour ouvrir `/diagram` à un collaborateur sans droits d'administration :
  ajouter son identifiant de compte à `DIAGRAM_READER_IDS` (Vercel,
  variables serveur).
- **P8b** (plateaux par format) attend
  [D78](../decisions/D78-plateaux-par-format-revision-D64.md), toujours
  **Proposée** ; deux processus prévus de l'inventaire la citent.
- **U6b**, **N6**, **P6** : inchangés (voir le rapport de recette).
- Q101 à Q105 restent au défaut. `npm run seed:demo` n'a pas été rejoué
  (Diagram ne lit aucune donnée).
