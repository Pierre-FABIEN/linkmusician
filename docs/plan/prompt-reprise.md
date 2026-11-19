# Prompt de reprise — après U3 (P1, libérer les étapes d'une personne qui part)

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot :
**P1**, corrections ciblées (conception 19 §10, « P1 » ; #36) : libérer les
étapes `WorkStep` d'une personne qui quitte un groupe ou en est retirée
(E10), avec un acte historisé ; consigner Q-G0-7 en décision (E11). Lot
court et indépendant. S'il déborde, découpe-le (P1a la libération, P1b la
décision) plutôt que de le prolonger.

Avant de coder :

1. Lis CLAUDE.md et docs/plan/README.md §4 (définition de terminé). Dans
   docs/conception/19-architecture-cible-collab.md : la fiche « P1 » (§10),
   E10 et E11 (tableau des écarts), §9.1 (ce que devient une tâche à la
   révocation) et la ligne `WorkStep` du tableau des entités.
2. Vérifie que Q-G0-7 est tranchée (D72) ; crée une fiche P1 courte dans
   docs/plan/fin-du-projet.md, avec ce que tu livres et ce que tu laisses
   (P13 : tâches confiées dans un projet).
3. git status, git log -8 et git ls-remote origin refs/heads/main. Les
   commits U3 (`6653e69`, `988c9bd`, `29cd85d` et la doc) étaient locaux le
   19/11/2026 : note ce que l'utilisateur a publié depuis. Préserve les
   commits et changements des autres sessions.
4. Lis `src/lib/server/bands/service.ts` (`leaveBand`, `removeMember`,
   `leaveOrRemoveManager`, anonymisation), le service des étapes
   (`WorkStep`, `WorkStepAct`, `applyWorkStep`) et la façon dont P4a appelle
   `dropMemberCapabilities` **après** la transaction de départ (ordre des
   verrous : `work:` avant `band:` ; ARCH-MET-02a).

À faire :

- Au départ ou au retrait d'un groupe, chaque étape non terminée au nom de
  la personne, sur un morceau du groupe, redevient libre, avec un acte de
  libération (valeur d'enum additive : relis la migration, scripts `db:*`).
- Suppression de compte : même effet (anonymisation RGPD).
- Tests : intégration (départ, retrait, suppression de compte, course
  départ ↔ prise en charge à barrières) ; E2E : l'étape apparaît libre pour
  la gestion du morceau.
- Démo et aide si l'écran change (« libérée au départ de … »).

Repères :

- Le serveur e2e est un `vite dev` : ne touche pas au code source, ne lance
  pas npm run check et ne régénère pas Prisma pendant un E2E (mémoire WSL).
- `npm run lint` global échoue pour des raisons extérieures : passe ESLint
  et Prettier sur les fichiers du lot. Tableaux Markdown : garde la largeur
  des colonnes. Jamais `prisma format` sur tout le schéma.
- Instabilités connues : M1, T1, T2 dans docs/plan/a-trancher.md. Relance
  seul un test qui échoue avant de conclure, et dis lequel.
- Une question qui bloque : consigne-la dans a-trancher avec un défaut, et
  avance.

Fin de lot : fiche P1, ligne du tableau §5 et issue #36 (livré, partiel ou
restant, commits locaux ou publiés), prompt de reprise. Commits en
français préfixés « (P1) », sans push.

Restent ensuite : **U3b** (besoins et intervenants proposés : objet
« besoin », « Proposer à la gestion », conception 20 §8.2 « Ajouter un
besoin » ; à concevoir d'abord), **T10** (`gdpr-data.spec.ts`), puis U6 + P8,
P7, U4 + P5 et U5 + P13. **P6** attend l'avis RGPD sur la base légale.
```
