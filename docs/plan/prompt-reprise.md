# Prompt de reprise — passe de tests U3b-b et U3b-c

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot :
**valider U3b-b et U3b-c**, livrés le 19/11/2026 sans qu'**aucun test** n'ait
été exécuté (à la demande de l'utilisateur). Aucun nouveau code hors
corrections.

1. git status, git log -12 et git ls-remote origin refs/heads/main. Commits
   locaux du 19/11/2026 (non publiés au départ) : `1b99704` (D76 acceptée),
   `6f940e9` (métier et fiche), `cbd7a21` (tests), `268f680` (doc),
   `b89e6a2` (mesure de coût), `38ff3e6` (écrans, « À traiter », annonce),
   puis la doc U3b-c. Note ce que l'utilisateur a publié ; préserve tout.
2. Migration `20261119132238_project_needs` : `npm run db:status` (dev) et
   l'équivalent e2e. Si elle manque (autre poste), `npm run db:deploy` puis
   `npm run db:deploy:e2e` ; jamais en production, jamais `npx prisma migrate`.
   Puis `npx prisma generate`.
3. Lance, **un à la fois** (mémoire WSL : pas de `npm run check` pendant
   les E2E) :
   - `npm run test:unit -- --run src/lib/projects/needs.test.ts src/lib/projects/overview.test.ts src/lib/career/next/next.test.ts`
   - `PROGRESSION_INTEGRATION=1 npm run test:unit -- --run src/lib/server/projects/needs.integration.test.ts`
   - `PROGRESSION_INTEGRATION=1 PROJECT_PERF=1 npm run test:unit -- --run src/lib/server/projects/view.perf.integration.test.ts`
     (relève les requêtes et médianes 0, 5, 20 besoins)
   - non-régression : `participants.integration`, `service.integration`,
     `overview.integration`, `opportunities/targeted.integration`, puis
     `npm run test:unit -- --run` en entier si la machine le permet.
   - E2E (voir e2e/README.md) : `projets-besoins`, puis `projets`,
     `projets-equipe`, `projets-equipe-u3`, `mes-projets`.
     `locking.integration` : 2 échecs `55P03` préexistants, à ne pas confondre.
4. Pour chaque échec : cause, lien avec U3b, correction du code ou du test
   selon le comportement de la conception 22 et de D76 (jamais un test
   assoupli pour couvrir un défaut). Commits « (U3b-b) » pour le socle,
   « (U3b-c) » pour les écrans.
5. Points à regarder de près : ordre de tri des suggestions N3
   (`next.test.ts`, deux projets) ; `createOpportunity` avec `needId` (refus
   qui annulent la création) ; la course de quota (`project-need-author:`) ;
   l'E2E étape 8 (préparer l'annonce, puis projet de groupe refusé) et
   étape 9 (« Retirer la coordination »).
6. Fin : passe les fiches U3b-b et U3b-c de docs/plan/fin-du-projet.md, la
   ligne G0-03 du tableau §5 et docs/projets/README.md à « tests passés »
   avec les chiffres réels (dont les mesures de coût) ; issues #71 et #36
   (lots livrés ; ne ferme pas #36 : P13 et P1c y restent) ; prompt de
   reprise. Commits en français, sans push.

Hors périmètre : U3c (intervenant proposé), P13, P1c, #89, paiements.

Restent ensuite : **P1c**, **T10** (`gdpr-data.spec.ts`), puis U6 + P8, P7,
U4 + P5 et U5 + P13. **P6** attend l'avis RGPD. Production : migrations P1
et U3b non appliquées ; `npm run seed:demo` à rejouer pour voir les besoins
de la démo.
```
