# Prompt de reprise — après U3b-a (U3b-b, besoins : modèle et services)

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot :
**U3b-b — Besoins d'un projet : modèle, services et interface minimale**
(#71, #36). La conception est écrite : docs/conception/22-besoins-projet.md
(U3b-a, 19/11/2026). Décision **D76 Proposée** : vérifie d'abord dans
docs/decisions/README.md si l'utilisateur l'a validée ou amendée, et dans
docs/plan/a-trancher.md (section « besoins d'un projet ») si Q91 à Q99 ont
été tranchées ; sinon, applique les défauts et dis-le.

Avant d'écrire :

1. Lis CLAUDE.md, docs/plan/README.md §4, les fiches « U3b-a » et « U3b-b »
   de docs/plan/fin-du-projet.md, puis la conception 22 en entier (§3 modèle,
   §4 cycle de vie, §5 matrice et invariants N1–N6, §6 propositions et
   révocation, §9 RGPD et quotas, §10 architecture, §12 migration, §13 tests).
   Relis docs/projets/README.md (P2, P4a, U3) et le code :
   src/lib/server/projects/{access,service,participants,view,export}.ts,
   src/lib/projects/{rules,participants}.ts.
2. git status, git log -8 et git ls-remote origin refs/heads/main. Les
   commits P1b (`6926699`) et U3b-a (doc, « (U3b-a) ») étaient locaux le
   19/11/2026. Note ce que l'utilisateur a publié depuis. Préserve les
   commits des autres sessions.

À faire (U3b-b seulement) :

- Migration additive : `ProjectNeed`, `ProjectNeedStatus`, valeurs `NEED_*`
  de `ProjectActKind`, colonne `project_acts.needId` (sans clé étrangère).
  `npm run db:migrate -- --create-only --name project_needs`, puis
  `npm run db:nettoyer-migration`, relire (index partiels protégés), puis
  `db:deploy` et `db:deploy:e2e`. Jamais `npx prisma migrate`.
- Règles pures `src/lib/projects/needs.ts`, schémas
  `src/lib/schema/projects/need.ts` (`projectNeedDraftSchema`, réutilisable
  par #89, qui refuse tout état ou auteur venu du client).
- Services `src/lib/server/projects/needs.ts`, sous `lockProjectContext`,
  `projectAccess` relu ; `cancelPendingNeeds` appelé par retrait, départ et
  retrait de coordination ; lecture filtrée par rôle dans `projectView` ;
  export et anonymisation RGPD (§9.2).
- Interface minimale sur la fiche (liste, ajout, proposer, valider,
  refuser, pourvu) ; les écrans Metro complets, « À traiter », N3,
  l'annonce liée et l'E2E sont **U3b-c**.
- Tests : unitaires, intégration (matrice §5 par profil, courses à
  barrières, quotas, N4 : aucun `DomainEvent` ni `XpTransaction`, journal
  en ajout seul, RGPD, coût de `projectView` à 0, 5, 20 besoins).

Hors périmètre : P13 (tâches), #89 (assistant), U3c (intervenant proposé),
P1c, paiements.

Repères :

- P1c (test du concert déclaré par un simple `MEMBER`, D75) reste à faire.
- Production : migrations P1 non appliquées ; `npm run seed:demo` non
  rejoué depuis P1.
- `locking.integration.test.ts` : 2 échecs `55P03` préexistants.
- Mémoire WSL : ne lance pas `npm run check` pendant les E2E.
- Une question qui bloque : consigne-la dans a-trancher avec un défaut, et
  avance.

Fin de lot : fiche U3b-b, tableau §5, docs/projets, issues #71 et #36
(commits locaux ou publiés), prompt de reprise vers U3b-c. Commits en
français préfixés « (U3b-b) », sans push.

Restent ensuite : **U3b-c**, **P1c**, **T10** (`gdpr-data.spec.ts`), puis
U6 + P8, P7, U4 + P5 et U5 + P13. **P6** attend l'avis RGPD.
```
