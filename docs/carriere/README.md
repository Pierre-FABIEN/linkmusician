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
- La **carte de carrière** (actes I à III) arrive avec P3-13.

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
