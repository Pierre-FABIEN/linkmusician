# Mode carrière : écran de carrière et ambition (P3-12)

Conception : [07 §4.1 et §4.2](../conception/07-modes-de-jeu.md#41-choisir-son-ambition).

## Écran de carrière

- **`/espace`**, page-menu (D50) : identité, niveau, XP et palier ; « Ta
  prochaine étape » (premier objectif) ; puis le menu (`MenuList`,
  « Mode carrière ») : À confirmer (s'il y a lieu, en évidence), Mon
  ambition, Mes objectifs, Campagnes en cours, Mon équipe, Agenda, Journal
  de bord, Points, succès et confiance. Seulement des compteurs.
- Écrans (`/espace/…`, fil d'Ariane D52) :
  - `ambition` : choix parmi cinq, « Je ne sais pas encore » pour retirer ;
  - `objectifs` : les trois prochains (`nextObjectives`) et l'avancement ;
  - `campagnes` : morceaux de l'équipe (`myWorks`), idées d'abord, places
    libres (rôles à pourvoir), crédits à confirmer ;
  - `equipe` : groupes actifs avec leur rang (P3-08), partenaires réguliers
    (collaborations confirmées, les plus nombreuses d'abord) ;
  - `agenda` : jams à venir (organisées, menées, « Je viens », invitation
    acceptée) et collaborations acceptées à date future ;
  - `journal` : historique des gains (privé, D1) ;
  - `progression` : confiance et ce qu'il manque, succès ;
  - `a-confirmer` : collaborations, crédits, invitations de groupe.

## Ambition

- `Person.ambition` (`CareerAmbition` : `PLAY_BAND`, `STAGE`, `RECORD`,
  `PRO`, `SUPPORT`), `null` tant qu'elle n'est pas choisie.
- Règle pure `src/lib/career/ambition.ts` : libellé, phrase, actes mis en
  avant, objectifs prioritaires. `nextObjectives(state, limit, priorities)`
  (`progression/core/quests.ts`) place les bases du profil d'abord, puis
  les objectifs de l'ambition, puis les autres dans l'ordre habituel :
  **aucun n'est retiré**, seul l'ordre change (test `ambition.test.ts`).
- Ne rapporte rien, n'entre dans aucun calcul (XP, confiance, recherche).
- Nouvel objectif système : « Compose un premier morceau » (`work.first`,
  morceau composé où l'on est crédité·e et confirmé·e).
- RGPD : export `ambition_de_carriere`, remise à `null` à l'anonymisation.

## Code et tests

- `src/lib/server/career/service.ts` (`setAmbition`, `campaigns`, `team`,
  `agenda`, `linkable`).
- Tests : `src/lib/career/ambition.test.ts`, quêtes
  `progression/core/core.test.ts` ; e2e `e2e/linkmusician/carriere.spec.ts`.

## Carte de carrière (P3-13, D53)

- `/espace/carte`, entrée « Ma carte de carrière » en tête du menu (acte en
  cours et son épreuve, nombre d'épreuves franchies).
- Règle pure `src/lib/career/map.ts` (`careerMap`) : huit actes, I à III
  jouables, la suite dans le brouillard (contenu visible) ; statut
  `passed`, `current` (premier jouable non franchi), `open`, `fog` ;
  l'ambition met des actes en avant sans changer leur état.
- Faits (`src/lib/server/career/map.ts`, `careerFacts`), jamais l'XP :
  appréciations de jam reçues et collaborations (résumé des événements),
  morceaux composés à plusieurs (`Work.proof = CORROBORATED`) ou seul·e
  (`DECLARED`, rappel « compose à plusieurs »), premier enregistrement de
  groupe corroboré dont on était membre à la date (étape toujours là, non
  gelée).
- Déblocages affichés avec leurs liens, sans verrou au MVP (D53).
- Célébration d'épreuve : `pendingActCelebrations`, appelée par le layout
  de l'espace quand il y a du neuf ; une fois par acte
  (`Person.actsCelebrated`), carte « Épreuve franchie » en tête.
- Tests : `src/lib/career/map.test.ts`, intégration
  `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/career`, e2e
  `carriere.spec.ts` (carte).
