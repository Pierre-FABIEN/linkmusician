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

## Carte de carrière (P3-13, D53 ; carte parallèle N2, D73 Q-NL-1)

- `/espace/carte`, entrée « Ma carte de carrière » en tête du menu : la
  première épreuve **à portée** et sa raison, sinon une phrase neutre ;
  pastille « n à portée » ou « n épreuves franchies ».
- **N2 (18/11/2026) : plus d'« acte en cours » ni de numéro romain à
  l'écran.** Huit épreuves rangées en six **branches** indépendantes
  (Équipe : La rencontre ; Création : La création ; Production : Le
  studio, La production ; Scène : La scène ; Diffusion : La sortie ;
  Accompagnement : Le développement, La carrière). Le numéro 1 à 8 reste
  un identifiant interne (`actsCelebrated`, `act-n`, carte souvenir).
- Règle pure `src/lib/career/map.ts` (`careerMap(facts, ambition,
reachFacts)`) : état d'épreuve `passed` (Franchie), `within_reach` (À
  portée), `open` (Ouverte), `soon` (Bientôt), distinct du niveau de
  preuve des faits ; `withinReach` (au plus trois) ; `branches` (tuiles :
  faits comptés, épreuves et états, nombre de franchies). Les **conditions
  de franchissement sont inchangées**.
- **À portée** = un fait déclencheur réel et un geste possible
  (`ReachFacts`, lus côté serveur seulement pour les épreuves non
  franchies) :
  - La rencontre : une collaboration passée qui n'attend que ma
    confirmation → `/espace/a-confirmer` ;
  - La création : un morceau composé déclaré où je suis confirmé·e et où un
    autre rôle attend sa confirmation → la fiche du morceau ;
  - Le studio : « Premier enregistrement » déclaré, non gelé, d'un de mes
    groupes → parcours du groupe (« Demander une confirmation » pour la
    gestion, « Voir le parcours du groupe » sinon) ;
  - La production : une production (avec morceau) à confirmer côté
    artiste ;
  - La scène : un concert à confirmer côté groupe chez un hôte **vérifié**,
    ou un « Premier concert » corroboré mais pas vérifié → les plateaux.
    Tri : ambition, puis branche, puis numéro interne. Jamais l'XP.
- Page d'une branche `/espace/carte/[branche]` (`#lib/career/branch`,
  `careerBranchFor`) : Possible maintenant (au plus deux gestes), En cours
  (confirmations attendues, contestations), Réalisé (avec sa preuve :
  « Simple déclaration », « Confirmé par d'autres », « Vérifié » ; retiré
  barré), Premières fois et épreuves, Pas possible pour l'instant
  (« Bientôt sur Melokiva », version solo de Studio et Scène prévue). Les
  sections vides sont omises.
- Q-NL-3 : la porte de « La rencontre » mène à **Rencontre** (`/jam`) ;
  les appréciations de jam restent des faits admissibles, inchangés.
- Faits (`src/lib/server/career/map.ts`, `careerFacts`), jamais l'XP :
  appréciations de jam reçues et collaborations (résumé des événements),
  morceaux composés à plusieurs (`Work.proof = CORROBORATED`) ou seul·e
  (`DECLARED`, rappel sur la page Création), premier enregistrement de
  groupe corroboré dont on était membre à la date (étape toujours là, non
  gelée), morceau produit, « Premier concert » **vérifié** d'un groupe dont
  on était membre à la date (un concert seulement corroboré ne suffit pas,
  l'hôte ne franchit rien).
- Épreuve de plus (`Act.bonusTrial`), affichée, jamais bloquante : la
  « Première tournée » vérifiée pour « La scène ».
- Carte souvenir de « La scène » (`firstVerifiedGig`) : le groupe, l'hôte
  et le mois du premier concert vérifié, faits publics seulement ; titre
  « La scène » (plus « Acte V · »).
- Déblocages affichés avec leurs liens, sans verrou (D53) ; ceux qui ne
  sont pas livrés passent dans « Pas possible pour l'instant ».
- Célébration d'épreuve : `pendingActCelebrations`, appelée par le layout
  de l'espace quand il y a du neuf ; une fois par épreuve
  (`Person.actsCelebrated`, inchangé), titre « Épreuve franchie : La
  rencontre ».
- Requêtes (scénario `realisations.integration.test.ts`) : carte complète
  6 quand tout est franchi (comme les faits seuls), faits + 2 pour un
  compte neuf, page de branche faits + 2 au plus ; fiche et carte
  souvenir inchangées (14, 17, 10).
- Différé : prochaines actions globales (N3), « Plus tard » / « Pas pour
  moi » par branche (N4, aucun faux contrôle affiché), avancement d'un
  projet (N5), Studio et Scène pour une personne seule (N6, après P8),
  antériorité déclarée (N7).
- Tests : `src/lib/career/map.test.ts`, `src/lib/career/branch.test.ts`,
  intégration `PROGRESSION_INTEGRATION=1 npx vitest --run
src/lib/server/career`, e2e `carriere.spec.ts` (création, scène à
  portée puis franchie, mobile 390 px, clavier, Rencontre, axe) et
  `campagne.spec.ts`.

## Lecture unifiée des réalisations (N1, #72)

- La carte et la fiche ne comptent plus elles-mêmes : elles lisent les
  **réalisations** de la personne (conception 21 §6.3, D73 NL3), puis en
  déduisent leurs faits. Résultats identiques à avant N1.
- Règle pure `src/lib/career/realisations.ts` : type `Realisation` (clé du
  fait source, type, branche, porteur, objet, rôles, date, preuve, statut
  `ACTIVE` / `FROZEN` / `RETIRED`, visibilité), `dedupeRealisations` (une
  entrée par clé, rôles cumulés), `careerFactsOf`, `creditsOf`,
  `firstVerifiedGigOf`, `byBranch`. Aucun champ de points.
- Clés : `work:<id>:composed`, `work:<id>:produced`, `credit:<workRoleId>`,
  `collab:<collaborationId>`, `milestone:<bandId>:<definitionId>` (stable
  après un retrait puis une redéclaration).
- Projection serveur `src/lib/server/career/realisations.ts` :
  `readRealisations(actorId)` (vue complète, réservée aux services de
  carrière) et `realisationsOf(actorId, reader)`, qui ne rend à un autre
  lecteur que des faits actifs, au moins corroborés, sur des objets publics
  (ni idée, ni collaboration) d'acteurs qu'il peut voir (blocages compris).
- Les appréciations de jam et le nombre de collaborations restent lus dans
  le résumé musicien (`tierOf`), qui fait foi pour le palier.
- Requêtes SQL mesurées sur le même scénario : faits de la carte 8 → 6,
  fiche publique 17 → 14, fiche privée 20 → 17, carte souvenir 13 → 10.
- Tests : `src/lib/career/realisations.test.ts`,
  `src/lib/server/career/realisations.test.ts`, intégration
  `realisations.integration.test.ts` (non-régression sur les valeurs
  relevées avant N1, budget de requêtes, droits du lecteur, gel, retrait,
  révocation).

## Fiche de carrière et cartes souvenirs (P3-14)

- `/espace/fiche` : fiche privée avec les statistiques confirmées et les
  données privées (présences déclarées, morceaux solo, XP et niveau).
- Le profil `@handle` ne reçoit que des faits confirmés ; aucune XP ni
  confiance n'entre dans la fiche publique.
- Une carte PNG 1200 × 630 peut être téléchargée pour chaque épreuve
  effectivement franchie : `/api/carriere/souvenir/[handle]/[act].png`.
  L'image n'est rendue que pour un profil public et une épreuve encore
  franchie ; elle ne contient que le nom public, le nom de l'épreuve, sa condition et le
  mois de création de la carte. Le profil utilise la dernière carte comme
  image Open Graph.
- Rendu serveur par Satori et resvg, police Open Sans embarquée ; tests
  purs de séparation public/privé et de signature/dimensions PNG.

## Navigation par métier (DASH-01, #31)

Depuis le 12/11/2026, `/espace` sélectionne son menu d'après le contexte
métier de session, validé contre les métiers détenus. Musicien·ne conserve
le panorama historique ci-dessus. Les autres métiers utilisent `RoleSpace`
et les entrées existantes de `linkmusician/navigation.ts` ; leur rang est
lu par les services métier existants, jamais déduit de l'XP.

Voir [la conception et les limites](../conception/10-navigation-metiers.md).
Les objectifs placent le métier actif en premier ; cela ne change pas le
métier principal du profil. Les nouveaux outils des autres issues DASH
restent hors de ce lot.
