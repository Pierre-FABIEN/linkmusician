# Prompt de reprise — après U1 (P4a, participant·es d'un projet)

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot :
**P4a**, le métier de P4 (conception 19, « P4 — Participant·es et capacités
d'un projet », #71, #36) : inviter, accepter, refuser, quitter, retirer,
accorder ou retirer une capacité, sans écran au-delà d'une interface
minimale de validation (comme P2). Les écrans complets viendront avec U3.
Si le lot déborde, découpe-le (P4a1 pour les invitations et la participation,
P4a2 pour les capacités et la révocation) plutôt que de le prolonger.

Avant de coder :

1. Lis CLAUDE.md et docs/plan/README.md §4 (définition de terminé).
   Dans docs/conception/19-architecture-cible-collab.md : la fiche P4
   (§10), §6.2 (matrice des droits), §6.3 à §6.7 (révocation, départ,
   mineur·es, verrous), §9.1 (capacités : `COORDINATE` seule au MVP,
   consentement, révocation, non-élévation I11, tests exigés) et §9.3
   (ce que voit une personne invitée ou participante). Dans
   docs/conception/20-parcours-ux-collab.md : §14.1, la ligne U3.
   Lis aussi docs/projets/README.md (ce que P2 et P3 ont livré, « Limites
   de P2 et suites »), ainsi que Q76 et Q77 dans docs/plan/a-trancher.md.
2. Vérifie que les décisions citées ne sont plus « Proposée » : D72
   (acceptée, rév. 2), Q-G0-11, Q-G0-12 et Q-G0-15 (tranchées le
   18/11/2026), D37 et D46 (mineur·es), D66 (quotas). Crée une fiche P4a
   courte avant de coder, avec ce que tu livres et ce que tu laisses à U3.
3. git status, git log -5 et git ls-remote origin refs/heads/main. Le
   commit U1 (11a9ff8) était local le 19/11/2026 : note ce que
   l'utilisateur a publié depuis. Préserve les commits et changements des
   autres sessions.
4. Lis le code de P2 et P3 : src/lib/server/projects/ (access.ts,
   service.ts, view.ts, overview.ts, export.ts), src/lib/projects/rules.ts,
   la section `Project` de prisma/schema.prisma (`ProjectActKind`), et les
   tests d'intégration existants pour réutiliser leurs fabriques et leurs
   barrières.

À faire :

- **Données** : `ProjectParticipant` (personne, rôle libre en simple
  libellé, `capabilities` comme ensemble d'une enum fermée, statut
  invitation, active, refusée, partie ou retirée, dates, qui invite, et si
  la capacité a été reçue « comme membre » du groupe porteur). Actes
  `INVITED`, `JOINED`, `DECLINED`, `LEFT`, `REMOVED`,
  `CAPABILITY_GRANTED` et `CAPABILITY_REVOKED` ajoutés à `ProjectActKind`.
  Index partiel « une ligne ouverte par personne et par projet » en SQL
  brut : ajoute-le à la liste de scripts/migration-clean.mjs (et à son
  test) et à la liste des index protégés de CLAUDE.md. Migration
  additive : `npm run db:migrate -- --create-only --name
project_participants`, puis `npm run db:nettoyer-migration`, relire, et
  `npm run db:deploy` puis `db:deploy:e2e`.
- **Prédicat unique** `projectAccess(projet, personne)` → gestion,
  participation, capacités, relu sous le verrou `project:`. Les lectures
  (fiche, « Mes projets », `projectView`) l'utilisent : une personne
  participante lit la fiche et les résumés partagés, rien d'un élément non
  partagé, et a un 404 uniforme hors projet. La projection porte déjà un
  `role` pour s'y brancher.
- **Services** selon la matrice §6.2 : inviter (gestion, ou
  coordinateur·rice pour une participation simple), accepter ou refuser
  (la personne elle-même), quitter, retirer (gestion seule), accorder ou
  retirer `COORDINATE` (gestion seule ; l'ajout demande une nouvelle
  acceptation, pas le retrait). Pour une personne coordinatrice : modifier
  dates et description, ranger ses propres réalisations. Pas de besoins ni
  d'intervenants proposés dans P4a, sauf si le lot reste court ; sinon
  laisse-les à U3 et note-le dans la fiche.
- **Règles** : invitation d'une personne connue seulement (D37) ;
  mineur·e invité·e seulement à un projet d'un groupe dont elle ou il est
  membre, jamais `COORDINATE` (D46, Q-G0-12) ; blocages dans les deux
  sens ; quota d'invitations comme D66, avec un défaut consigné dans
  a-trancher s'il manque un chiffre. Un projet `DONE` ou `ABANDONED` gèle
  la participation. Une capacité reçue comme membre tombe au départ du
  groupe (acte automatique). Groupe porteur dissous : les personnes
  participantes lisent encore le projet, en lecture seule (Q77, §6.5).
- **Révocation (I12)** : le retrait d'une capacité ou d'une participation
  prend `project:` et sérialise avec les écritures qui s'appuient sur
  elle. L'ordre des verrous est `project-owner:` → `project:` → `work:` →
  `band:`/`org:`.
- **Notifications minimales** (§9.3) : l'invitation et la réponse.
  Avant d'accepter, la personne invitée voit le nom, le type, le porteur,
  qui l'invite et les capacités proposées, rien d'autre.
- **RGPD** : participations, capacités et actes dans l'export ;
  anonymisation « Compte supprimé » d'une personne participante ;
  participations effacées avec les projets d'une personne qui supprime son
  compte.
- **Tests** : intégration, avec POST forgés pour chaque action de §6.2 et
  chaque profil (gestion, coordinateur·rice, participant·e, `MEMBER` du
  groupe non participant, ancien·ne participant·e, tiers). Une personne
  coordinatrice qui tente d'accorder une capacité, de changer un partage,
  de renommer, de supprimer ou de ranger le morceau d'autrui est refusée.
  Barrières : retrait de capacité pendant une écriture, départ du groupe
  pendant une écriture. Mineur·e, blocage, projet clos, export et
  anonymisation. Coût de `projectView` remesuré avec des participant·es.
  E2E : invitation acceptée, fiche visible, morceau privé non visible,
  coordinateur·rice qui modifie les dates.
- **Acceptation** : aucun droit sur une réalisation ne découle de la
  participation ni d'une capacité au-delà du partage, et des tests le
  démontrent.

Repères :

- Le client n'envoie que des intentions : jamais de capacité qu'il
  s'attribuerait. Toute capacité est relue côté serveur sous verrou.
- Le serveur e2e est un `vite dev` : ne touche pas au code source, ne lance
  pas npm run check et ne régénère pas Prisma pendant un E2E ; vérifie les
  processus via ps (mémoire WSL limitée). Suite parallèle possible :
  `test:e2e:parallele`, base locale avec `E2E_DB=local`.
- SQL brut : nommer le schéma (`qualifiedTable`).
- `npm run lint` global échoue pour des raisons extérieures (`.shot-*.mjs`,
  `playwright-report/`) : passe ESLint et Prettier sur les fichiers du lot.
  Tableaux Markdown : garde la largeur des colonnes.
- Instabilités connues : M1, T1, T2 dans docs/plan/a-trancher.md. Relance
  seul un test qui échoue avant de conclure, et dis lequel.
- Une question qui bloque : consigne-la dans a-trancher avec un défaut, et
  avance.

Fin de lot : fiche P4a, docs/projets/README.md (section P4a, droits,
RGPD, limites), conception 19 (fiche P4 marquée livrée, avec ses écarts),
ligne G0-03 et tableau §5 de docs/plan/README.md, issues #71 et #36
(livré, partiel ou restant, commits locaux ou publiés), prompt de reprise
pour U3. Commits en français préfixés « (P4a) », sans push.

Restent ensuite : **U3** (écrans de l'équipe, « À traiter » étendu,
« Transformer en projet »), **P1** (E10 : libérer les `WorkStep` d'une
personne qui quitte ; court, indépendant), **T10** (`gdpr-data.spec.ts`),
puis U6 + P8, P7, U4 + P5 et U5 + P13. **P6** attend l'avis RGPD sur la
base légale.
```
