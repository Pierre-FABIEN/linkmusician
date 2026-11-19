# Prompt de reprise — après P1b (U3b, besoins et intervenants proposés)

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot :
**U3b — Besoins et intervenants proposés dans les projets** (#71, conception
20 §8.2 ; reliquat de U3). **Ce lot commence par la conception métier** :
aucune migration ni implémentation avant qu'elle soit écrite et que ses
questions aient un défaut consigné. Si la conception déborde la session,
découpe : **U3b-a** (conception, documentaire) puis **U3b-b** (modèle,
services, écrans).

Avant d'écrire :

1. Lis CLAUDE.md, docs/plan/README.md §4, la fiche « U3 » de
   docs/plan/fin-du-projet.md (son « Laissé ») et, dans
   docs/conception/20-parcours-ux-collab.md : §8.1 (matrice : « Proposer un
   besoin », « Publier l'annonce au nom du porteur »), §8.2 (« Ajouter un
   besoin »), §8.4 (écarts de U3), P4 et P12 (§2), §6.3 (« À traiter »).
   Dans docs/conception/19-architecture-cible-collab.md : §9.1 (capacités
   `PROPOSE` et `APPROVE`, Q-G0-15), §5.3 (cardinalités), fiche P4. Dans
   docs/projets/README.md : modèle P2/P4a (`Project`, `ProjectItem`,
   `ProjectParticipant`, actes, `projectAccess`).
2. git status, git log -8 et git ls-remote origin refs/heads/main. Le
   commit P1b (doc, « (P1b) ») était local le 19/11/2026 ; P1 et U3 étaient
   publiés (`bbec47c`). Note ce que l'utilisateur a publié depuis. Préserve
   les commits des autres sessions.
3. Relis le code des annonces (`Opportunity`, `/annonces/nouvelle`) et de
   `/decouvrir` : un besoin s'y appuie, il ne les redouble pas.

Conception à écrire (nouvelle section de la conception 20, ou fiche dédiée
liée depuis §8.2), en confrontant chaque point au code réel :

- **L'objet « besoin »** rattaché à un projet : métier recherché, phrase,
  commune du porteur (jamais de localisation précise), lien éventuel vers
  une annonce publiée ; ce qu'il n'est pas (ni annonce, ni invitation, ni
  participation, ni droit).
- **Statuts et cycle de vie** : proposé, ouvert, publié en annonce, pourvu,
  abandonné ; ce que devient un besoin quand le projet est clos, laissé de
  côté, supprimé, ou que son porteur (groupe) est dissous ; actes en ajout
  seul, comme `ProjectAct`.
- **Droits de proposition et de validation** : la gestion ajoute et publie ;
  la coordination ajoute ou propose ; qui accepte, refuse, retire ; aucune
  capacité nouvelle implicite (I2, I11) ; relecture sous verrou `project:`
  (I12) et ordre des verrous.
- **« Proposer à la gestion »** : la proposition, sa place dans « À
  traiter » (rang, compteur, N3), sa réponse, son expiration ; notification
  ou non (comme Q80).
- **Besoin, invitation, participant·e** : un besoin pourvu ne fait entrer
  personne dans l'équipe sans invitation consentie (D37, personne connue) ;
  « Trouver un pro » mène à `/decouvrir` prérempli, sans envoi automatique
  (P12) ; l'XP n'entre jamais dans le tri.
- **Rôles de coordination** : ce que la coordination voit et fait sur un
  besoin, ce qu'elle perd à la révocation (propositions en attente).
- **Confidentialité et consentement** : qui voit un besoin (équipe, public
  via l'annonce seulement) ; mineur·es (Q-G0-12) ; blocages ; RGPD (export,
  anonymisation de l'auteur·rice d'une proposition).
- **Quotas anti-abus** (besoins ouverts par projet, propositions), comme
  Q76 et Q79.
- **Compatibilité Melokiva Assistant (#89)** : l'assistant devra pouvoir
  préparer un brouillon de besoin et le soumettre au même service, avec
  confirmation humaine. Prévoir des intentions serveur explicites et un
  état « brouillon » si utile ; **ne développe pas l'assistant**.

Puis, seulement après la conception : migration additive (relire la
migration, index partiels protégés, `db:nettoyer-migration`), services,
écrans Metro, aide, démo, tests (unitaires des règles, intégration des
droits et des courses à barrières, E2E au clavier, 390 px, axe).

Repères :

- P1c (test d'intégration du concert déclaré par un simple `MEMBER`, D75)
  reste à faire ; lot court, indépendant.
- Production : migrations P1 (`20261119120151_work_step_auto_released`,
  `20261119120152_work_step_release_stale`) appliquées en dev et e2e
  seulement. `npm run seed:demo` non rejoué depuis P1.
- `locking.integration.test.ts` : 2 échecs `55P03` préexistants.
- Une question qui bloque : consigne-la dans a-trancher avec un défaut, et
  avance. Q88 à Q90 (P1b) sont au défaut.

Fin de lot : fiche, tableau §5, issues #71 (et #36 si les besoins y
touchent), prompt de reprise. Commits en français préfixés « (U3b) », sans
push.

Restent ensuite : **P1c**, **T10** (`gdpr-data.spec.ts`), puis U6 + P8, P7,
U4 + P5 et U5 + P13. **P6** attend l'avis RGPD sur la base légale.
```
