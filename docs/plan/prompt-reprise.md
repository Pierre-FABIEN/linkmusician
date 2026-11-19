# Prompt de reprise — après U3b-b (tests à exécuter, puis U3b-c)

```markdown
Reprends LinkMusician dans le dossier de travail courant.

**Étape 0 — Exécuter les tests de U3b-b**, écrits le 19/11/2026 sur le
portable mais jamais lancés. Avant tout nouveau code :

1. git status, git log -10 et git ls-remote origin refs/heads/main. Commits
   locaux du 19/11/2026 : `6926699` (P1b), `78db51d` (U3b-a), `1b99704`
   (D76 acceptée), `6f940e9` (métier et fiche), `cbd7a21` (tests), puis la
   doc U3b-b. Note ce que l'utilisateur a publié depuis ; préserve tout.
2. La migration `20261119132238_project_needs` est appliquée en dev et e2e ;
   vérifie avec `npm run db:status` (et le schéma e2e) avant les tests.
   Production : non appliquée.
3. Lance, sans `npm run check` en parallèle (mémoire WSL) :
   - `npm run test:unit -- --run src/lib/projects/needs.test.ts`
   - `PROGRESSION_INTEGRATION=1 npm run test:unit -- --run src/lib/server/projects/needs.integration.test.ts`
   - non-régression : `participants.integration`, `service.integration`,
     `overview.integration`, et les E2E `projets`, `projets-equipe`,
     `projets-equipe-u3` (voir e2e/README.md).
     `locking.integration` : 2 échecs `55P03` préexistants, à ne pas confondre.
4. Corrige ce qui échoue **dans le périmètre U3b-b** (code ou test), en
   commits « (U3b-b) ». Puis passe la fiche U3b-b de
   docs/plan/fin-du-projet.md et la ligne G0-03 du tableau §5 à « tests
   passés », avec les chiffres réels.

**Ensuite, une session = un lot : U3b-c — Besoins : écrans, « À traiter »,
annonce et recherche** (#71, #36). Lis CLAUDE.md, docs/plan/README.md §4,
les fiches U3b-b et U3b-c, la conception 22 (§6 propositions, §7.2
invitation, §7.3 annonce, §8 UX, §13 tests) et docs/projets/README.md
(section « Besoins »). D76 est **Acceptée** ; Q91 à Q99 au défaut (Q96 et
Q99 : pistes d'évolution, hors lot).

À faire :

- Bloc « Besoins » en Metro (§8.1) : feuille `MetroSheet` d'ajout et de
  **modification** (le service `updateNeed` existe), sous-écran au-delà de
  cinq besoins, états vides, 390 px, focus, `aria-live`.
- « À traiter » de la gestion : propositions en attente (section Projets,
  compteur `answers`, règle N3 `project.need` au rang 2, filtrable N4),
  lien vers `#besoins` de la fiche ; prochaine action de la fiche (§8.4).
- « Inviter pour ce besoin » : la feuille d'invitation de U3, rôle prérempli,
  rien de relié en base (Q98).
- « Préparer l'annonce » : `/annonces/nouvelle?…&besoin=<id>` ; dans
  `createOpportunity`, modification minimale marquée `LINKMUSICIAN:` :
  relire sous `project:` la gestion, l'état `OPEN`, que l'émetteur est le
  porteur (personne ou groupe), puis poser `opportunityId` et l'acte
  `NEED_LINKED`. Annonce impossible (porteur organisateur, studio, lieu ;
  métier booker, manager, organisateur) : phrase d'explication, pas de
  bouton. L'annonce ne nomme pas le projet (Q97).
- Mesure du coût de `projectView` avec 0, 5 et 20 besoins
  (`view.perf.integration.test.ts`).
- Aide (docs/aide), démo (`seed:demo` : un besoin ouvert, une proposition),
  E2E `projets-besoins.spec.ts` (S5 au clavier, S1 jusqu'à pourvu,
  participant·e simple, 390 px, axe).

Hors périmètre : P13 (tâches), #89 (assistant), U3c (intervenant proposé),
P1c, paiements.

Fin de lot : fiche U3b-c, tableau §5, docs/projets, conception 22, issues
#71 et #36 (commits locaux ou publiés), prompt de reprise. Commits en
français préfixés « (U3b-c) », sans push.

Restent ensuite : **P1c**, **T10** (`gdpr-data.spec.ts`), puis U6 + P8, P7,
U4 + P5 et U5 + P13. **P6** attend l'avis RGPD.
```
