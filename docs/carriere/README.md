# Mode carrière : écran de carrière et ambition (P3-12)

Conception : [07 §4.1 et §4.2](../conception/07-modes-de-jeu.md#41-choisir-son-ambition).

## Écran de carrière

- **`/espace`**, accueil Collab en quatre pivots (U0, D74 ; détail :
  [conception 20 §6.4](../conception/20-parcours-ux-collab.md#64-ce-que-u0-a-livré-et-les-écarts-livré-le-18112026)) :
  identité, niveau, XP et palier en en-tête ; pivot `avancer` ouvert par le
  **héros** (première prochaine action N3, sinon le projet principal (U2),
  sinon « Commence ici » pour un compte neuf, sinon « Ta prochaine étape »),
  « À faire maintenant », les tuiles « À traiter », candidatures, contacts
  et agenda, puis « Mes projets » (trois projets au plus, « Créer un
  projet », « Hors projet » ; [docs/projets](../projets/README.md)) ;
  `ma musique` ; `réseau` ; `repères` (dont « Ta prochaine étape » quand
  elle n'est pas le héros). Seulement des compteurs.
- Écrans (`/espace/…`, fil d'Ariane D52) :
  - `ambition` : choix parmi cinq, « Je ne sais pas encore » pour retirer ;
  - `objectifs` : les trois prochains (`nextObjectives`) et l'avancement ;
  - `campagnes`, titré « Hors projet » (U2, adresse conservée) : les
    morceaux de l'équipe (`campaigns`, `myWorks`), classés pour moi :
    rangés dans aucun de mes projets (que je gère), déjà rangés, gérés par
    d'autres ; places libres et crédits à confirmer comme avant
    (`outsideProjects`, `src/lib/server/projects/overview.ts`) ;
  - `equipe` : groupes actifs avec leur rang (P3-08), partenaires réguliers
    (collaborations confirmées, les plus nombreuses d'abord) ;
  - `agenda` : collaborations acceptées à date future, sans personne
    bloquée ; les jams sont dans Rencontre (`/jam/agenda`, U0, #76) ;
  - `journal` : historique des gains (privé, D1) ;
  - `progression` : confiance et ce qu'il manque, succès ;
  - `a-confirmer`, titré « À traiter » (U0) : collaborations, crédits,
    invitations de groupe, accompagnement, candidatures et demandes de
    contact, droits et blocages appliqués (`src/lib/server/space/inbox.ts`).

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
- « Pas pour moi » par branche : depuis « Ce que Melokiva me propose »
  (N4), pas depuis la carte, qui ne masque rien.
- Différé : avancement d'un
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

## Mes contributions (U1, #71)

- Écran `/espace/contributions` : ce que la personne a réalisé et qui le
  confirme (conception 20 §10.2 bis). Lecture personnelle, jamais pour un
  autre lecteur ; la fiche publique garde ses comptes (P3-14).
- Règle pure `src/lib/career/contributions.ts` : `contributionLines`
  (réalisations N1 → une ligne par réalisation, meilleure preuve, rôles et
  familles), `partyName` (« Compte supprimé », personne bloquée non
  nommée), `filterContributions`, `presentCategories`, `byYear`.
- Projection serveur `src/lib/server/career/contributions.ts` :
  `contributionsOf(actorId)` = `readRealisations` + morceaux crédités et
  collaborations terminées (blocages dans les deux sens lus dans la même
  requête) + conversations où la personne figure. Nombre fixe de
  requêtes (5 à 19 ; 18 pour 140 lignes).
- Aucun point, aucune règle de confiance, aucune migration.
- Tests : `src/lib/career/contributions.test.ts`, intégration
  `contributions.integration.test.ts` (isolation, blocages, retrait,
  groupe dissous, compte supprimé, mesures), e2e `contributions.spec.ts`.

## Prochaines actions (N3, #72)

- **Moteur en deux couches** (conception 21 §8–§9, D73 NL4–NL5).
  Règle pure `src/lib/career/next/` : `candidatesFrom(faits)` produit les
  candidates, `rankSuggestions` les filtre (titre, raison, geste et
  destination interne obligatoires), les dédoublonne (une par clé
  `règle:type:objet`, puis une par objet, puis une par règle aux rangs 3 à
  5), les trie (rang, échéance réelle, attente la plus longue, clé) et
  tronque (3 sur l'accueil, 5 dans une vue détaillée, une seule de rang
  5). Aucun champ d'XP, rien d'aléatoire.
- Projection serveur `src/lib/server/career/next.ts` : `nextFactsFor`
  lit les faits du lecteur lui-même avec les prédicats existants, puis
  `nextActionsFor` appelle la règle pure. `suggestionView` ne passe au
  navigateur que la clé, le rang, la branche, la phrase et le geste.
- **Règles livrées** :

  | Rang | Règle                                      | Source réutilisée                                                                  |
  | ---- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
  | 1    | `collab.confirm` (l'autre a déjà confirmé) | `pendingForMe` filtré par `spacePriorityFacts` (conversation acceptée, ni blocage) |
  | 2    | `collab.confirm`, `collab.respond`         | idem ; échéance : le jour de la session à venir                                    |
  | 2    | `credit.confirm`                           | `teamWhere`, porteur ni bloqué ni bloquant                                         |
  | 2    | `band.invitation`                          | invitations de groupe vivant (comme `bandCounts`), sans blocage                    |
  | 2    | `representation.respond`                   | `representationsForMe` (réservé aux majeur·es pour les propositions)               |
  | 2    | `applications.review`, `contact.respond`   | compteurs des priorités ; contact : adultes seulement                              |
  | 3    | `work.step`                                | étape ouverte prise en charge, morceau que je gère (`manageableOwnerWhere`)        |
  | 3    | `crea.demo`, `crea.compose`                | idée que je gère, modifiée depuis moins de 30 jours                                |
  | 4    | `prod.mix`                                 | `nextProductionNeed` ; pros du réseau réel (`MusicalTie`), adultes, hors équipe    |
  | 4/5  | `prod.record`                              | idem ; rang 4 si l'ambition est « Enregistrer » ou « Devenir pro », sinon rang 5   |
  | 4    | `team.fill_role`                           | places libres ; réseau proche, sinon rien si une annonce ouverte recrute déjà      |
  | 5    | `trial.within_reach`                       | épreuves à portée de la carte N2                                                   |
  | 5    | `objective`                                | `craftQuests` sur l'espace d'un métier (le héros musicien montre déjà le sien)     |

- **Prudence** : sans pro du réseau, une recherche filtrée
  (`/decouvrir?metier=inge-son&specialite=…`) ; jamais pour un·e
  mineur·e, qui garde la prise en charge de l'enregistrement sur la fiche
  du morceau. Rien n'est envoyé : chaque suggestion ouvre un écran. Aucune
  jam (`JAMS_SOON` reste aux coups de pouce).
- **Dédoublonnage** : une épreuve à portée qui vise une collaboration n'est
  pas répétée à côté de sa demande, et n'est gardée que si la collaboration
  a passé le filtre de visibilité. Sur la page de branche (N2), une
  collaboration proposée dans « Possible maintenant » n'est plus répétée
  dans « En cours ».
- **Affichage** : pivot « priorités » de `/espace` (musicien·ne et
  espaces métier), bloc « À faire maintenant » au-dessus des aperçus,
  trois tuiles au plus, rien quand il n'y a rien. Le héros `NextStep`
  reste inchangé tant qu'UX-1 n'est pas tranché.
- **Lectures** : `requestMemo(event.locals, clé)` mémorise, le temps
  d'une requête HTTP et pour l'identité de la clé, la lecture des
  réalisations, la carte, les priorités et l'accompagnement (layout et
  page de `/espace`). Lectures à plat : les détails (titres, noms, rôles,
  profils du réseau) ne partent que s'il y a des lignes.
- Requêtes SQL ajoutées à l'accueil (scénario `next.integration.test.ts`) :
  **5** pour un compte neuf, **17** pour un compte actif ; budget du test :
  6 et 20.
- Tests : `src/lib/career/next/next.test.ts`, `branch.test.ts`,
  intégration `PROGRESSION_INTEGRATION=1 npx vitest --run
src/lib/server/career/next`, e2e `prochaines-actions.spec.ts`.

## Plus tard et Pas pour moi (N4, #72)

- **Gestes** (D73 Q-NL-4, conception 21 §8.6) : sur une tuile « À faire
  maintenant », « Plus tard » (rangs 3 à 5) et « Pas pour moi » (rangs 4 et 5) ; jamais sur une demande des rangs 1 et 2. Un message confirme le
  geste, la tuile suivante prend la place.
- **Plus tard** : 30 jours à l'heure du serveur, ou moins si le fait
  déclencheur change : chaque règle donne un fait stable (`Candidate.fact`),
  dont seule l'empreinte FNV-1a (`version`) est enregistrée. Un report en
  cours sur le même fait n'est ni prolongé ni recréé.
- **Pas pour moi** : la règle de la tuile, ou une branche depuis la page
  des choix, jusqu'à réactivation.
- **Page** `/espace/propositions`, « Ce que Melokiva me propose » : ce qui
  est écarté (Réactiver), ce qui est reporté, avec sa date (Revoir
  maintenant), et « Pas pour moi » par branche. Seulement le libellé de la
  règle, jamais le titre d'un objet. Lien sous le bloc, et état « Tu as
  choisi ce que Melokiva te propose » quand tout est écarté.
- **Code** : règle pure `src/lib/career/next/choices.ts` (cibles
  acceptées, empreinte, `hiddenBy`), appliquée par `rankSuggestions` avant
  le dédoublonnage ; service `src/lib/server/career/choices.ts`
  (`postpone`, `declineSuggestion`, `declineTarget`, `reactivate`,
  `choicesPage`) ; lecture groupée `readChoices` dans
  `src/lib/server/career/next.ts`, mémorisée par requête.
- **Sécurité** : le propriétaire vient de la session (`chooserOf` : compte,
  e-mail vérifié, personne, suspension, car les actions de formulaire ne
  passent pas par la garde du layout) ; un report ou un « Pas pour moi »
  depuis une tuile n'est accepté que pour une clé que le serveur **propose
  en ce moment** au lecteur, au bon rang ; toute autre clé reçoit la même
  réponse (« Cette suggestion n'est plus proposée. »), sans rien dire de
  l'objet. Une cible de branche ou de règle est lue dans une liste fermée.
  Réactiver supprime seulement un choix du lecteur. Unicité (propriétaire,
  choix, cible) ; deux envois simultanés donnent une ligne.
- **Données personnelles** (table `suggestion_choices`) :
  - finalité : n'afficher que les suggestions que la personne veut voir ;
  - contenu : propriétaire, type de choix, cible (règle, branche, ou clé
    `règle:TYPE:objet` d'un objet de la personne), empreinte, échéance,
    dates ; aucun texte, aucun nom ;
  - durée : un report vit 30 jours et se purge à la prochaine écriture ou
    visite de la page des choix (pas de tâche planifiée) ; un « Pas pour
    moi » vit jusqu'à sa réactivation ou la suppression du compte ;
  - export : `prochaines_actions_choix` dans l'export du compte ;
    anonymisation : supprimés (`personAnonymizationOps`), et en cascade si
    l'acteur est supprimé.
- **Coût** : une requête de plus par chargement de l'accueil, la même avec
  0 ou 40 choix (`choices.integration.test.ts`).
- **Différé** : « Pas pour nous » sur un projet, avec le socle projet
  (P2/P3) et ses capacités (P4).
- Tests : `src/lib/career/next/choices.test.ts`, intégration
  `PROGRESSION_INTEGRATION=1 npx vitest --run
src/lib/server/career/choices`, e2e `propositions.spec.ts`.

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
