# Prompt de reprise — après P4a (U3, écrans de l'équipe d'un projet)

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot :
**U3**, les écrans de l'équipe d'un projet (conception 20 §14.1, ligne U3 ;
#71, #36) : inviter, accepter, refuser, quitter, retirer ; coordination ;
« À traiter » étendu ; « Inviter les membres du groupe » (UX-8) ;
« Transformer un groupe de contacts en projet ». Le métier est livré par
P4a : U3 ne crée aucun droit nouveau. Si le lot déborde, découpe-le (U3a
pour l'équipe et « À traiter », U3b pour « Transformer en projet » et les
besoins proposés) plutôt que de le prolonger.

Avant de coder :

1. Lis CLAUDE.md et docs/plan/README.md §4 (définition de terminé). Dans
   docs/conception/20-parcours-ux-collab.md : §6.3 (« À traiter »), §7.3
   (prochaine action par rôle), §8 (participants, coordination, refus et
   révocation), §11 C (producteur invité), §12 (états vides, erreurs,
   mobile, accessibilité), §14.1 et UX-8 (§15). Dans
   docs/conception/19-architecture-cible-collab.md : §6.2, §9.1 et §9.3.
   Lis docs/projets/README.md (sections P2, P3 et **P4a**, et « Laissé à U3
   et après ») et Q79 à Q82 dans docs/plan/a-trancher.md.
2. Vérifie que les décisions citées ne sont plus « Proposée » (D72, D74,
   UX-8 au défaut). Crée une fiche U3 courte dans docs/plan/fin-du-projet.md
   (section « Collab — projets »), avec ce que tu livres et ce que tu
   laisses (P13 : tâches ; structure participante).
3. git status, git log -8 et git ls-remote origin refs/heads/main. Les
   commits P4a (`1fc98a3`, `e568a95`, `3dcaa26`, `6f584e5` et la doc)
   étaient locaux le 19/11/2026, comme U1 (`11a9ff8`) et le prompt
   `2ae81b6` : note ce que l'utilisateur a publié depuis. Préserve les
   commits et changements des autres sessions.
4. Lis le code de P4a : src/lib/projects/participants.ts (règles pures,
   préréglages, libellés), src/lib/server/projects/participants.ts
   (services, `myInvitations`), access.ts (`projectAccess`,
   `projectReaderWhere`, `readerAccess`), view.ts (`team`, `me`, `can`,
   journal des actes d'équipe), overview.ts (rôle réel), et les routes
   `/projets` et `/projets/[id]` (interface minimale : bloc « Équipe »,
   bloc « Invitations »). Tests : participants.integration.test.ts,
   e2e/linkmusician/projets-equipe.spec.ts.

À faire :

- **Équipe** sur la fiche, en Metro (D55, docs/design) : liste lisible,
  rôles libres, préréglages « participant·e » et « coordinateur·rice »
  expliqués en une phrase (`PRESETS`), invitation par recherche de
  personne connue plutôt qu'un @identifiant tapé (sans révéler qui refuse
  ni pourquoi), états de refus et de révocation de §8.3.
- **« À traiter »** (`/espace/a-confirmer`) : invitations de projet et
  coordination proposée, avec le même minimum que `/projets` (§9.3) ;
  pastille cohérente avec les notifications `PROJECT_INVITE`.
- **« Inviter les membres du groupe »** (UX-8) : une invitation par membre,
  chacune acceptée ; jamais d'adhésion d'office (I2). Respecte les quotas
  (Q79) et les mineur·es (Q81) : le service refuse déjà, l'écran le dit.
- **« Transformer un groupe de contacts en projet »** : crée le projet et
  propose une invitation à chaque contact ; rien sans acceptation.
- **Prochaine action par rôle** (§7.3) : coordination et participation ont
  chacune la leur ; « Inviter » peut devenir une prochaine action pour la
  gestion et la coordination. Mets à jour e2e/linkmusician/mes-projets.spec.ts
  si le texte change.
- **Besoins et intervenants proposés** (`PROPOSE`, inclus dans
  `COORDINATE`) : seulement si le lot reste court ; sinon note-le.
- **Aide** : la section « Tes projets, et les personnes qui y travaillent »
  (03-mode-carriere.md) existe ; complète-la.
- **Tests** : unitaires des règles d'écran nouvelles, E2E du scénario C
  (producteur invité) au clavier, 390 px et axe ; « À traiter » ;
  « Inviter les membres du groupe » avec un·e mineur·e et un quota.

Repères :

- Le client n'envoie que des intentions ; tout droit est relu sous
  `project:` par le service (aucune nouvelle écriture ne doit contourner
  `projectAccess`).
- Le serveur e2e est un `vite dev` : ne touche pas au code source, ne lance
  pas npm run check et ne régénère pas Prisma pendant un E2E ; vérifie les
  processus via ps (mémoire WSL limitée). Suite parallèle possible :
  `test:e2e:parallele`, base locale avec `E2E_DB=local`.
- `npm run lint` global échoue pour des raisons extérieures (`.shot-*.mjs`,
  `playwright-report/`) : passe ESLint et Prettier sur les fichiers du lot.
  Tableaux Markdown : garde la largeur des colonnes. Ne lance jamais
  `prisma format` sur tout le schéma : il réaligne le boilerplate.
- Instabilités connues : M1, T1, T2 dans docs/plan/a-trancher.md ;
  `organizations/access.integration.test.ts` a échoué une fois en parallèle
  des intégrations projets et passe seul (19/11/2026). Relance seul un
  test qui échoue avant de conclure, et dis lequel.
- Une question qui bloque : consigne-la dans a-trancher avec un défaut, et
  avance.

Fin de lot : fiche U3, docs/projets/README.md (section U3), conception 20
(§ « Ce que U3 a livré, et les écarts »), ligne G0-03 de docs/plan/README.md,
issues #71 et #36 (livré, partiel ou restant, commits locaux ou publiés),
prompt de reprise. Commits en français préfixés « (U3) », sans push.

Restent ensuite : **P1** (E10 : libérer les `WorkStep` d'une personne qui
quitte ; court, indépendant), **T10** (`gdpr-data.spec.ts`), puis U6 + P8,
P7, U4 + P5 et U5 + P13. **P6** attend l'avis RGPD sur la base légale.
```
