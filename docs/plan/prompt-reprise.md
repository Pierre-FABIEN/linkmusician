# Prompt de reprise — après P1 (P1b, consigner Q-G0-7 en décision)

```markdown
Reprends LinkMusician dans le dossier de travail courant. Une session = un lot :
**P1b**, fin de la fiche « P1 » (conception 19 §10 ; #36) : consigner
Q-G0-7 (E11, concert engagé par un simple membre) en décision. Lot court,
documentaire ; aucun code attendu, sauf si la décision révèle un écart
avec le comportement actuel (dans ce cas, le consigner et l'ouvrir en lot).

Avant d'écrire :

1. Lis CLAUDE.md, docs/plan/README.md §4 et la fiche « P1 » de
   docs/plan/fin-du-projet.md (fin du fichier). Dans
   docs/conception/19-architecture-cible-collab.md : E11 (tableau des
   écarts), Q-G0-7 (§9) ; dans docs/decisions/D72-architecture-projets-collab.md,
   l'arbitrage du 18/11/2026.
2. git status, git log -8 et git ls-remote origin refs/heads/main. Les
   commits U3 (`6653e69`, `988c9bd`, `29cd85d`, `69138b9`) et P1
   (`a2ed036`, `6a08471` et la doc) étaient locaux le 19/11/2026 : note ce
   que l'utilisateur a publié depuis. Préserve les commits des autres
   sessions.
3. Vérifie dans le code ce que fait aujourd'hui un concert proposé par un
   simple membre (collaboration `GIG`, `server/collaborations/`) : la
   décision décrit le comportement réel, pas l'intention.

À faire :

- Une fiche `docs/decisions/D7x-concert-engage-par-un-membre.md` (numéro
  suivant), statut Acceptée, qui renvoie à D72 et Q-G0-7 ; ligne dans
  docs/decisions/README.md ; E11 marqué dans la conception 19.
- Fiche P1 et ligne P1 du tableau §5 passées à ✅ ; issue #36 : commentaire
  « P1b livré » (commits locaux ou publiés). Ne ferme pas #36 : P13 y reste.

Repères :

- Production : les migrations P1 `20261119120151_work_step_auto_released`
  et `20261119120152_work_step_release_stale` ne sont appliquées qu'en dev
  et e2e.
- Tests `locking.integration.test.ts` : 2 échecs `55P03` préexistants,
  identiques sans P1 (README §5).
- Une question qui bloque : consigne-la dans a-trancher avec un défaut, et
  avance. Q85 à Q87 (P1) sont au défaut.

Fin de lot : fiche, tableau §5, issue #36, prompt de reprise. Commits en
français préfixés « (P1b) », sans push.

Restent ensuite : **U3b** (besoins et intervenants proposés : objet
« besoin », « Proposer à la gestion », conception 20 §8.2 ; à concevoir
d'abord), **T10** (`gdpr-data.spec.ts`), puis U6 + P8, P7, U4 + P5 et
U5 + P13. **P6** attend l'avis RGPD sur la base légale.
```
