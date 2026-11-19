# Prompt de reprise — passe de tests U3b-b, U3b-c, P8 et U6a

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot :
**valider U3b-b, U3b-c, P8 et U6a**, livrés le 19/11/2026 sans qu'**aucun
test** n'ait été exécuté (consigne de l'utilisateur). Aucun nouveau code hors
corrections. Machine conseillée : le PC de recette (mémoire WSL : jamais
`npm run check` pendant les E2E).

0. git status, git log -15 et git ls-remote origin refs/heads/main. Commits
   locaux du 19/11/2026 : U3b (`1b99704`, `6f940e9`, `cbd7a21`, `268f680`,
   `b89e6a2`, `38ff3e6`, doc `243d0d9`, publiés à `243d0d9`), puis P8
   (`6027d05` métier et migration, `8759727` tests), U6a (`30b0ab1`) et la doc
   P8 (non publiés au départ). Note ce que l'utilisateur a publié ; préserve
   tout.

1. Migrations (jamais `npx prisma migrate`, jamais en production) :
   `npm run db:status` (dev) et l'équivalent e2e. Doivent être appliquées :
   `20261119132238_project_needs` (U3b) et
   `20261119180000_collaboration_performer` (P8, **écrite à la main** : relis
   le SQL — colonne `performerId`, recopie depuis `bandId`, index, clé
   étrangère — et compare avec `npm run db:migrate -- --create-only --name
verif` : aucune différence attendue ; supprime ce brouillon). Puis
   `npm run db:deploy`, `npm run db:deploy:e2e`, `npx prisma generate`.

2. **Tests différés de U3b** (un à la fois) :
   - `npm run test:unit -- --run src/lib/projects/needs.test.ts src/lib/projects/overview.test.ts src/lib/career/next/next.test.ts`
   - `PROGRESSION_INTEGRATION=1 npm run test:unit -- --run src/lib/server/projects/needs.integration.test.ts`
   - `PROGRESSION_INTEGRATION=1 PROJECT_PERF=1 npm run test:unit -- --run src/lib/server/projects/view.perf.integration.test.ts`
     (relève les requêtes et médianes 0, 5, 20 besoins)
   - non-régression : `participants.integration`, `service.integration`,
     `overview.integration`, `opportunities/targeted.integration`.
   - E2E : `projets-besoins`, puis `projets`, `projets-equipe`,
     `projets-equipe-u3`, `mes-projets`.
   - À regarder de près : tri N3 (`next.test.ts`, deux projets) ;
     `createOpportunity` avec `needId` ; course de quota
     (`project-need-author:`) ; E2E étapes 8 et 9.

3. **Tests différés de P8 et U6a** :
   - `npm run test:unit -- --run src/lib/collaborations/solo.test.ts src/lib/milestones/personal.test.ts src/lib/career/solo.test.ts src/lib/career/branch.test.ts src/lib/collaborations/rules.test.ts src/lib/career/map.test.ts`
   - `PROGRESSION_INTEGRATION=1 npm run test:unit -- --run src/lib/server/collaborations/solo-gigs.integration.test.ts`
   - non-régression : `gigs.integration`, `career/realisations.integration`
     (budget de requêtes : une requête de plus seulement sans groupe
     crédité), `career/map.integration`, `representation.integration`,
     `milestones/service.integration` (export RGPD).
   - E2E : `solo-scene` (scénario B), puis `concerts`, `booker`, `carriere`
     (libellé « Qui a joué », avertissement de groupe retiré pour la scène).
   - À regarder de près : `solo-gigs` dépend de l'ordre de ses cas (le groupe
     naît au 7ᵉ) ; la confirmation concurrente ; l'anonymisation de la
     mineure ; le texte « en ton nom ou avec ton groupe » affiché dans la
     branche Scène (E2E étape 1).

4. Puis `npm run test:unit -- --run` en entier si la machine le permet.
   `locking.integration` : 2 échecs `55P03` préexistants, à ne pas confondre.
   Pour chaque échec : cause, lien avec le lot, correction du code ou du
   test selon la conception 22 et D76 (U3b), D77 et la conception 19 §9.4
   (P8) — jamais un test assoupli pour couvrir un défaut. Commits
   « (U3b-b) », « (U3b-c) », « (P8) » ou « (U6) ».

5. Fin : fiches U3b-b, U3b-c, P8 et U6a de docs/plan/fin-du-projet.md, lignes
   G0-03, P8 et U6a du tableau §5, docs/projets/README.md et
   docs/scene/README.md à « tests passés » avec les chiffres réels ; issues
   #71, #36 et #72 (ne ferme ni #36 ni #72 : P13, P1c, P8b, N6 y restent) ;
   prompt de reprise. Commits en français, sans push.

Hors périmètre : U3c, P13, P1c, P7, #89, paiements.
```

## Ce qui reste à développer après la passe de tests

- **P8b** (plateaux par format) : attend la validation de
  [D78](../decisions/D78-plateaux-par-format-revision-D64.md) (**Proposée**,
  révision partielle de D64) ; découpage P8b-1 à P8b-5 dans D78 §3.
- **U6b** : formats sur le formulaire de plateau, déclaration solo,
  « Candidater en mon nom », recherche solo, E2E jusqu'à la date obtenue
  depuis un plateau (après P8b).
- **N6** : « Le studio » franchissable par une personne (la scène l'est
  depuis P8).
- Q101 à Q105 (P8) au défaut, à faire valider.

## Autres lots planifiés

**P1c** (test du concert d'un simple membre), **T10**
(`gdpr-data.spec.ts`), puis P7, U4 + P5, U5 + P13. **P6** attend l'avis
RGPD. Production : migrations P1, U3b et P8 non appliquées ;
`npm run seed:demo` à rejouer pour voir les besoins de la démo.
