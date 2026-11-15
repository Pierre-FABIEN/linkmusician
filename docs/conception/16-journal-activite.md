# Journal d’activité — DASH-05 (#35)

## Audit du 14/11/2026 et découpage

Base : `5e7f982`, dépendances DASH-02 et DASH-04 récupérées depuis `origin/main`.
La mention « publication restante » dans #30/#35 est donc devenue obsolète.

| Source                     | Traces présentes                                                                         | Limite                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Representation`           | Proposition, confirmation et fin, auteurs des décisions                                  | Une proposition déclinée ou retirée est supprimée ; aucune décision à reconstruire ensuite.                         |
| `RepresentationDelegation` | Proposition et auteur, accord du collaborateur, approbation et auteur, clôture et auteur | `endedAt` ne distingue pas refus et retrait. La date d’expiration n’est pas un acte humain.                         |
| `Membership`               | Invitation et auteur, état de participation                                              | Les transitions ne forment pas un registre de tous les actes ; ne pas déduire l’auteur d’un retrait du rôle actuel. |
| Collaborations             | Acceptation et confirmation d’achèvement par participant                                 | Gardes propres aux participants et confidentialité du projet à conserver.                                           |
| Notifications              | `notify()` transactionnel, préférences, blocages, absence d’auto-notification            | Flux destiné au destinataire, purge après lecture ; ne peut pas servir de journal exhaustif.                        |
| Audit administrateur       | `AdminAuditLog`, écriture best-effort                                                    | Journal administratif séparé, sans garantie transactionnelle métier ni droit de lecture pour les membres.           |

**DASH-05a** livre la première lecture sur les affectations et le contrat
`ActivityEntry`, avec un composant accessible partagé. **DASH-05 reste partiel**.
La suite doit couvrir les invitations, mandats, validations et futures options
et propositions dans leurs services respectifs. Lorsqu’un acte n’est pas
conservé, sa journalisation transactionnelle et son effacement RGPD demandent
un lot distinct ; aucune reconstitution à partir des notifications.

## Historique privé des affectations (DASH-05a)

La fiche `/delegations/[id]` affiche une liste chronologique : proposition,
accord du collaborateur, accord pour l’artiste, clôture. Chaque entrée porte
un identifiant stable de fait, un libellé, le nom actuel de l’auteur réel et
l’horodatage conservé. Les dates sont affichées à l’heure de Paris avec un
élément HTML `time`. À date égale, l’ordre est stable mais ne certifie pas
l’ordre réel des deux accords. Aucun acte ni notification n’est créé à la lecture.

Le service construit l’historique **après** la garde de `delegationForMe` :
titulaire, collaborateur désigné ou gestion majeure actuelle de l’artiste.
L’administrateur de l’agence n’obtient aucun accès implicite. Une révocation
laisse les accords historiques consultables par les parties comme la fiche
existante ; elle ne redonne aucun accès aux conditions privées du mandat.
Un gestionnaire de groupe retiré perd l’accès par la même garde actuelle.

La projection n’inclut ni message, ni conditions, ni liste de membres, ni
identifiants personnels. Auteur supprimé ou référence effacée : « Compte
supprimé », sans attribution à l’artiste ou au titulaire par défaut. La clôture
reste « Affectation close » ; aucun refus ni motif n’est inventé.

Pas de nouvelle donnée personnelle stockée, pas de migration ni de copie du
journal. Export et anonymisation des affectations déjà livrés dans DASH-04b
restent la source des faits ; la projection reflète leur effacement.

## Validation

- Tests purs : dates, ordre des accords, faits absents, auteurs effacés.
- Intégration : cycle réel, auteurs, contrôle du payload, tiers et gestionnaire
  d’agence exclus, suppression d’auteur et nombre de notifications inchangé.
- E2E existant `delegations.spec.ts` enrichi : historique avant et après les
  deux accords, clôture, dates HTML ; contrôle axe et 390 px conservé.

## Mandats et invitations conservés (DASH-05b)

Depuis `/accompagnement`, « Historique des accompagnements » ouvre un menu
privé des 100 propositions et mandats conservés les plus récents. Chaque lien
ouvre `/accompagnement/[id]/historique` : proposition par le titulaire,
confirmation par la personne qui a réellement répondu pour l’artiste et fin
par son auteur réel. Les mandats terminés restent accessibles aux parties.
Le journal ne transporte aucun message, condition, territoire ou identifiant
de compte ; il ne permet aucune mutation.

Le lecteur serveur `representation/history.ts` vérifie la majorité et l’acteur
vivant du lecteur, puis son identité de titulaire, d’artiste individuel ou de
gestion actuelle d’un groupe vivant. Le rôle de gestion doit être ACTIVE,
OWNER ou ADMIN. Un simple membre, un gestionnaire d’agence ou un collaborateur
délégué n’a aucun accès supplémentaire au mandat par ce journal. La révocation
est relue à chaque GET, même si la personne a confirmé le mandat autrefois.
Les groupes dissous et les parties supprimées ne sont pas listés. Le profil
masqué d’un groupe ne retire pas aux parties leurs propres traces privées.
Les blocages ne suppriment pas ces faits historiques des parties et n’ouvrent
aucune possibilité de contact ou de mutation depuis le journal.

Sur `/structure/[id]`, « Mon invitation » montre uniquement l’invitation de
la participation courante du lecteur, avec son auteur et sa date. La sélection
de la liste des structures ne reçoit aucun auteur supplémentaire. La même
garde de participation existante exclut les tiers et les participations
retirées, ainsi que les structures supprimées ou dissoutes. Aucune liste de
collègues ou d’élèves n’est ajoutée. Les six types de structure, dont l’agence,
passent par cette projection commune.

Une référence d’invitant effacée ne permet plus de distinguer invitation,
demande ou fondation : aucune invitation n’est alors inventée. Une référence
conservée vers un auteur supprimé affiche « Compte supprimé ». `startedAt`
et `updatedAt` ne prouvent pas l’identité de la personne ayant accepté ou
validé : aucune acceptation, départ ou modification de rôle n’en est déduite.

Pas de migration ni de nouvelle copie de données personnelles : export et
anonymisation des mandats, auteurs et participations restent ceux des sources
existantes. À l’issue de DASH-05b, les propositions refusées ou retirées étaient encore
supprimées ; DASH-05c ci-dessous les conserve désormais. La conservation
transactionnelle des autres transitions reste à livrer,
avec les validations de collaboration et les futures options/propositions.
DASH-05 n’est donc pas clos après ce lot.

## Propositions déclinées ou retirées (DASH-05c)

À la livraison initiale du 14/11/2026, `origin/main` était à `ac4d736` :
DASH-05a et DASH-05b étaient déjà publiés. À la reprise du même jour,
`git ls-remote origin refs/heads/main` renvoie
`8827f11b40b7ed631a91af7486b42c2817fef99f` : DASH-05c est également publié.
Aucun push effectué pendant cette reprise.

### Audit et conservation minimale

`answerRepresentation(..., false)` supprimait la proposition après vérification
de la majorité et de la gestion actuelle de l’artiste ; `endRepresentation`
supprimait une proposition uniquement pour son titulaire. Ces deux chemins
prenaient déjà, dans la transaction, les verrous de l’artiste (`band:`) et de
la paire (`rep:`). L’état était relu après attente ; le refus relisait aussi les
droits. Une proposition expirée ou bloquée peut toujours être déclinée ou retirée,
sans pouvoir être confirmée. Aucun droit par métier, agence ou ancienne gestion
n’est ajouté. Le retrait d’un mandat confirmé garde son comportement `ENDED`.

La même ligne `Representation` est conservée : `DECLINED` pour le refus,
`WITHDRAWN` pour le retrait ; `endedById` désigne la personne qui a effectivement
agi et `endedAt` la date passée à l’action. `agentId`, `artistId`, `kind` et
`createdAt` conservent le contexte et la proposition initiale. Aucun motif n’est
collecté. Message, dates de périmètre, départements et activités sont effacés dans
le même UPDATE. Aucun deuxième registre ni copie de nom n’est créé.

L’action et sa trace forment une seule écriture dans la transaction existante.
Les appels répétés ou concurrents sur une proposition close échouent avec 404 :
ils ne créent aucune entrée et n’écrasent ni l’auteur ni la date du premier acte.
Le verrou commun arbitre refus et retrait concurrents. Une nouvelle proposition
est une nouvelle ligne ; les états clos ne consomment aucun quota, n’apparaissent
plus dans les listes d’action et ne donnent aucun droit, rang ou point.
Le compteur des objectifs métier les exclut également, pour préserver le
comportement antérieur où ces propositions étaient supprimées. Ce contrôle
a été ajouté lors de la reprise, avec vérification avant/après pour les deux
décisions.

### Lecture privée et RGPD

Les lecteurs de DASH-05b restent inchangés : titulaire, artiste individuel majeur
ou gestion majeure ACTIVE OWNER/ADMIN actuelle du groupe vivant. Une personne
ayant refusé pour un groupe perd l’accès lorsqu’elle quitte sa gestion. Agence,
simple membre et collaborateur délégué n’acquièrent aucun accès. Les libellés du
journal distinguent « Proposition déclinée », « Proposition retirée » et
« Accompagnement terminé ». La lecture n’émet aucun acte ni notification.

L’export personnel inclut le statut, la date et le nom actuel non supprimé de
l’auteur de décision. Il couvre aussi les refus effectués pour un groupe par le
compte exporté, même après son départ de la gestion, avec le rôle « auteur de
décision » et le contexte artiste. Cette restitution de son propre acte n’accorde
aucun accès au journal ou à un mandat. Les termes d’une proposition close ont
déjà été effacés. L’anonymisation existante efface `endedById` pour tout auteur,
y compris lorsqu’il n’est ni artiste ni titulaire ; le statut et la date restent.
Un auteur effacé s’affiche « Compte supprimé ». Les parties supprimées restent
exclues des lectures selon les règles précédentes.

### Migration et limites

Migration `20261114180757_representation_proposal_decisions` : deux valeurs
d’enum ajoutées, aucune modification d’index ni reprise de données. Générée par
`db:nouvelle-migration`, nettoyée et relue, puis appliquée via `db:deploy` et
`db:deploy:e2e`. Client Prisma régénéré. PostgreSQL ne permet pas de retirer une
valeur d’enum directement : pas de migration descendante destructive qui perdrait
les décisions. Un retour applicatif doit conserver la compatibilité de lecture
avec ces états ; une restauration complète relève d’une sauvegarde cohérente.

Aucune proposition anciennement supprimée n’est reconstruite, notamment depuis
les notifications. Les fixtures de démo sont des décisions fictives explicites,
réservées aux comptes de démonstration ; elles ne convertissent aucun fait réel.
Participations, validations de collaboration et futures options restent à livrer.
DASH-05 et l’épopée #30 restent ouverts.

## Co-gestion des lieux et organisations (DASH-05d)

### Audit et découpage

Les participations utilisent plusieurs services distincts :

| Circuit                                             | Écritures et garanties actuelles                                                                                                                                                                                                                      | Suite                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `organizations/comanagement.ts` — PROMOTER et VENUE | Invitation conservée avec invitant ; acceptation/refus, annulation, départ/retrait et succession sous verrou `org:` dans une transaction. Les états et dates ne conservaient pas les auteurs de décision ; `DECLINED` confondait refus et annulation. | DASH-05d, présent lot                                                                     |
| `studios/service.ts`                                | Copie historique de la co-gestion, avec ses propres mutations.                                                                                                                                                                                        | DASH-05e, ci-dessous                                                                      |
| `agencies/service.ts`                               | Invitations, départs/retraits, succession et fermeture sous verrou d’agence.                                                                                                                                                                          | Lot suivant                                                                               |
| `bands/service.ts`                                  | Demandes, invitations, acceptations/validations, retraits, changements de rôle, transmission et dissolution.                                                                                                                                          | Lot suivant                                                                               |
| `schools/service.ts`                                | Adhésion par lien, remplacement d’une participation et départ.                                                                                                                                                                                        | Lot suivant                                                                               |
| `actors/person.ts`                                  | Anonymisation, départs et successions techniques, sans auteur humain à inventer.                                                                                                                                                                      | Effacement des nouvelles références couvert ; aucun acte humain créé lors de l’effacement |

Le lot reste borné au premier circuit. Il n’annonce pas la couverture des autres
structures ni celle des validations de collaboration ou futures options.

### Conservation transactionnelle

`MembershipDecision` conserve la participation, le type explicite d’acte, la
personne qui agit et l’horodatage. Le contexte est celui de la participation et de
son organisation ; aucun nom, titre libre, message ou motif n’est recopié.
`ACCEPTED`, `DECLINED`, `WITHDRAWN`, `LEFT`, `REMOVED` et
`RESPONSIBILITY_RECEIVED` distinguent acceptation, refus personnel, annulation
par la gestion, départ, retrait par la gestion et responsabilité reçue.
L’invitation reste lue dans `Membership` : aucun second événement d’invitation.

Les traces sont créées dans les mêmes transactions que les changements d’état
et de rôle, après relecture sous verrou `org:`. La mutation et sa trace utilisent
le même instant. Une succession enregistre la responsabilité reçue sur la période
du successeur avec l’auteur réel du départ, dans la même transaction que le
départ. Elle n’est pas attribuée au successeur par défaut. Le refus par le chemin
« partir » d’une invitation est identifié comme personnel ; l’annulation par un
gestionnaire est explicitement différente, même si le statut source reste
`DECLINED` pour compatibilité avec les listes existantes.

Les appels répétés ou concurrents relisent la période et échouent sans ajouter
ni écraser de trace une fois l’acte effectué. L’unicité participation/type fournit
une deuxième protection : les six transitions de ce circuit se produisent au
plus une fois par période. Une nouvelle invitation crée une nouvelle période.
Cette contrainte ne doit pas être réutilisée telle quelle pour un futur circuit
où un même changement de rôle pourrait être répété sur une période.

La garde du retrait relit désormais également le type exact et la structure
vivante sur la cible, y compris pour un départ personnel. Aucun droit fondé sur
le métier, une agence ou une ancienne fonction n’est introduit. Les autres gardes,
quotas et notifications existants restent ceux du service ; aucune notification
ni progression supplémentaire n’est émise pour le journal.

### Lecture personnelle et effacement

`/structure/[id]` conserve ses gardes de participation courante et montre les
actes réellement présents sous « Ma participation ». Un départ retire toujours
l’accès à cette fiche et aux outils. `/structure/historique`, ouvert depuis
« Mes structures », restitue uniquement les 100 périodes personnelles les plus
récemment mises à jour des lieux et organisations vivants (PROMOTER/VENUE),
y compris après refus ou départ. Ce lecteur exige l’identité exacte du
participant et son acteur vivant, sans accès aux périodes des collègues, même
pour la gestion actuelle, une agence ou un ancien responsable. Il ne renvoie
aucun outil, permission, liste d’équipe ni identifiant de compte. La structure
masquée n’empêche pas la consultation de ses propres traces privées ; une
structure dissoute ou supprimée en est exclue. Le lecteur n’ajoute aucun acte.

Les actes sont projetés dans `ActivityEntry` ; à date égale, l’identifiant
stabilise l’ordre sans prétendre prouver la séquence réelle. Les références
d’auteurs effacées affichent « Compte supprimé ». Une date de début, de fin,
un état ou un rôle sans acte conservé ne crée aucune entrée. Aucune reprise
historique depuis les notifications ni les anciens états n’est effectuée.

L’export personnel inclut les actes concernant sa propre participation et ceux
dont le compte est auteur pour une autre personne, avec organisation, acte,
date et auteur actuel non supprimé. Il ne révèle pas l’identité du participant
tiers dans ce dernier cas et ne donne aucun accès à son journal. L’anonymisation
efface `authorId` partout, y compris pour autrui. Les périodes suivent leur
traitement RGPD existant ; une suppression physique de participation efface ses
actes en cascade, une suppression physique d’auteur met sa référence à null.
Ni l’anonymisation ni une succession technique RGPD n’inventent un acte humain.

### Migration et validation

Migration additive `20261114184911_membership_comanagement_decisions` générée
par `db:nouvelle-migration`, nettoyée et relue, appliquée par `db:deploy` puis
`db:deploy:e2e` ; client régénéré. Elle crée uniquement l’enum, la table, deux
index et ses clés étrangères ; les index SQL préexistants sont préservés.
Aucune donnée antérieure n’est convertie. Un retour avant toute écriture peut
supprimer la table `membership_decisions` puis le type `MembershipDecisionKind`
dans le schéma concerné. Après écriture, ce retour perdrait les décisions : il
nécessite une sauvegarde cohérente et un traitement explicite des données, donc
aucun retour destructif automatique n’est fourni ni exécuté.

Tests purs de projection et tests d’intégration réels : les deux types, refus
et annulation distingués, appels répétés et concurrents, départ/retrait,
succession, rollback, tiers et mauvaise structure exclus, export et
anonymisation. Le parcours E2E des structures est étendu à l’acceptation puis au
départ réel et à sa lecture personnelle après perte d’accès (clavier, axe et
390 px). La démo comporte des périodes fictives explicitement créées, à
identifiants stables ; aucune ancienne participation réelle n’est convertie.

## Co-gestion des studios (DASH-05e)

Audit du service `studios/service.ts` : les invitations conservent déjà leur
auteur ; acceptation/refus, annulation, départ/retrait et succession sont
transactionnels sous verrou `studio:`. Le quota reste de trois studios gérés et
cinq invitations en attente. Les métiers du son conditionnent l’invitation ;
l’historique ne donne aucun droit fondé sur le métier.

Ces mutations écrivent maintenant les six types de `MembershipDecision` de
DASH-05d, avec la personne qui agit et le même instant que le changement d’état.
Le refus personnel (`DECLINED`) est distinct d’une annulation par la gestion
(`WITHDRAWN`), même lorsque le statut de participation reste `DECLINED`. Le
chemin de départ d’une invitation distingue lui aussi ces deux actes. La
responsabilité reçue par le successeur est attribuée à l’auteur réel du départ,
sans fabriquer une acceptation du successeur. Tout est enregistré dans la même
transaction, y compris les deux actes d’un départ avec succession. Relecture de
l’état sous verrou et unicité période/type empêchent les doublons et écrasements
lors d’appels répétés ou concurrents. Une nouvelle invitation reste une nouvelle
période ; les traces antérieures ne sont pas modifiées.

Le retrait vérifie maintenant aussi le type STUDIO exact et la structure vivante
sur la cible, y compris lorsqu’on part soi-même. Les droits de gestion, quotas,
notifications et le verrou propre au studio sont conservés. Ni notification,
progression, rang ni événement de collaboration n’est ajouté par le journal.

`/structure/historique` inclut les studios vivants selon la même garde
strictement personnelle que les lieux/organisations : ses propres périodes,
même closes, sans outil ni accès aux collègues. La fiche courante conserve sa
garde et perd son accès après départ. Une agence, un métier ou une ancienne
fonction ne donne aucun accès aux périodes d’autrui. Une structure masquée ne
retire pas la lecture personnelle ; une structure supprimée ou dissoute est
exclue. Le lien de retour utilise maintenant l’identifiant de route typé
`/(app)/structure`, correction d’un défaut relevé au contrôle de types.

Aucun nouveau champ ni migration : export personnel, export des actes pour
autrui et anonymisation de `authorId` livrés dans DASH-05d couvrent aussi les
studios. Les suppressions physiques suivent les mêmes cascades et mises à null.
Aucun message, motif, titre privé ou nom recopié. Aucune reconstruction depuis
les anciens états, dates ou notifications ; les invitations connues gardent leur
source et aucune ancienne acceptation n’est déduite d’un rôle actuel.

Les tests d’intégration communs appellent les vrais services des trois types.
Chaque scénario a ses propres comptes, pour qu’un test d’anonymisation ne
modifie pas l’auteur attendu dans le suivant. Ils couvrent concurrence,
nouvelle invitation, droits, succession, rollback et export/anonymisation. Le
parcours E2E studio vérifie invitation acceptée, départ avec transmission,
perte d’accès et deux historiques personnels distincts, avec dates HTML,
auteurs réels, clavier, axe et 390 px. Les périodes fictives de démo sont créées
explicitement, par upserts, sans convertir les participations existantes.
Les agences, groupes, écoles, validations de collaboration et futures options
restent dans les lots suivants ; DASH-05 et #30 restent ouverts.

## Participations des agences (DASH-05f)

`agencies/service.ts` écrit les six types de décision existants dans la même
transaction sous verrou `org:` que la mutation. Acceptation et refus portent
l’identité de la personne invitée ; annulation et retrait portent celle de la
gestion ; départ et responsabilité reçue portent celle de la personne qui part.
La même date sert à l’état et aux actes, y compris lors d’une transmission.
La relecture après verrou et l’unicité période/type empêchent le rejeu ou
l’écrasement d’un acte. Une nouvelle invitation ouvre une nouvelle période.

La fermeture est un autre chemin de mutation : les périodes actives sont
retirées et les invitations annulées avec l’auteur réel de la fermeture et
l’instant de dissolution. Les périodes déjà closes restent intactes. Tout
échec d’écriture annule ensemble dissolution, états et traces. Aucune
transition technique RGPD n’est transformée en acte humain. Les permissions,
majorité, métiers requis, quotas et notifications restent ceux du service.

Le lecteur personnel commun inclut AGENCY : uniquement ses propres périodes,
sans outils ni liste d’équipe, même après départ ou refus. Les collaborateurs
sont couverts comme les gestionnaires. Les gardes de la fiche et des outils
restent inchangées ; un métier ou une ancienne gestion ne donne aucun droit.
Les agences dissoutes ou supprimées sont exclues, y compris de ce lecteur ;
l’export RGPD garde les actes personnels et les actes pour autrui avec leur
contexte d’agence. L’anonymisation des auteurs et les cascades existantes
s’appliquent sans nouveau champ ni migration. Aucun ancien acte n’est déduit
d’un état, d’une date ou d’une notification.

Démo : trois périodes fictives dédiées, quatre actes datés et attribués,
réservés aux comptes de démonstration. Groupes, écoles, validations de
collaboration et futures options restent à livrer ; DASH-05/#35 et #30
restent ouverts.

## Entrées et sorties des groupes (DASH-05g)

Le circuit `bands/service.ts` conserve les nouvelles acceptations/refus
personnels d’invitations, annulations par la gestion, demandes (`JOIN_REQUESTED`),
réponses par leur gestionnaire réel (`REQUEST_ACCEPTED`, `REQUEST_DECLINED`),
retraits personnels de demande (`REQUEST_WITHDRAWN`), départs et retraits.
La dissolution après départ du seul responsable annule les invitations et
clôt les demandes (`REQUEST_CLOSED`) avec cet auteur et cette date. Aucun
refus de la personne invitée ou de la demandeuse n’en est déduit.

L’entrée par recrutement (`RECRUITMENT_ACCEPTED`) porte le gestionnaire réel
qui accepte la candidature, jamais le candidat par défaut. Elle utilise la
période existante si une demande ou invitation attendait ; sinon elle en crée
une nouvelle. L’origine d’invitation connue reste visible, mais aucun accord
d’invitation ni acceptation de demande n’est inventé lors du recrutement.
Le titre libre, la candidature et le message ne sont pas copiés dans la trace.

Tous ces actes partagent la transaction sous verrou `band:` avec la mutation,
la formation, la progression et les notifications existantes. L’échec d’une
trace annule la transaction. Relecture de l’état et unicité période/type
empêchent doublons et écrasements en cas de rejeu/concurrence. Les demandes
et invitations suivantes sont de nouvelles périodes. Le retrait d’une demande
relit aussi le groupe vivant, y compris pour son auteur. Les droits métier,
quotas, protections des mineur·es et règles de progression restent ceux du
service ; le journal ne produit aucun effet supplémentaire.

Le lecteur commun inclut BAND : uniquement les propres périodes et actes
conservés, après refus ou départ, sans outil ni accès aux traces de collègues.
Un groupe masqué n’empêche pas la lecture personnelle ; un groupe supprimé
ou dissous est exclu. Aucun historique n’est ajouté à la page publique du
groupe ni aux listes d’équipe. Export des actes personnels et pour autrui,
anonymisation de leurs auteurs et cascades existants réutilisés. La succession
technique RGPD n’invente aucun acte humain. Aucun ancien état, rôle, date ou
notification n’est converti en nouvelle trace.

Migration `20261114195003_membership_band_admissions` : six valeurs d’enum
ajoutées, aucune table, aucun index supprimé ou recréé, aucune reprise de
données. Générée avec `db:nouvelle-migration`, nettoyée, relue puis appliquée
avec `db:deploy` et `db:deploy:e2e` ; client régénéré. Les valeurs d’enum ne
peuvent pas être retirées directement : pas de retour destructif automatique.
Un retour applicatif doit garder la compatibilité de lecture ; une restauration
complète relève d’une sauvegarde cohérente.

Découpage : les rôles et transmissions peuvent se répéter pendant une même
période. La contrainte actuelle participation/type leur est inadaptée ; ils
restent dans un lot distinct et ne sont pas annoncés livrés ici. Les écoles,
validations de collaboration et futures options restent également à suivre.
DASH-05/#35 et #30 restent ouverts.

## Rôles et transmissions des groupes (DASH-05h)

Audit de `setRole` et `transferOwnership` : les deux mutations relisaient déjà
la période active et la responsabilité après verrou `band:`, sans conserver
les actes. Elles écrivent maintenant dans la même transaction métier :
`BAND_ADMIN_GRANTED` (MEMBER → ADMIN), `BAND_MEMBER_SET` (ADMIN → MEMBER),
`BAND_OWNERSHIP_GIVEN` (OWNER → ADMIN du cédant) et
`BAND_OWNERSHIP_RECEIVED` (MEMBER/ADMIN → OWNER du destinataire).
Les deux actes d’une transmission portent le même auteur réel (le cédant)
et la même date. Le destinataire n’est pas déclaré auteur d’un consentement.
Aucun titre, message, motif ni identité de collègue recopié dans les actes.

Ces quatre types sont répétables, y compris à date égale, sur une même période.
L’index unique partiel `membership_decisions_once_key` maintient l’unicité
participation/type des douze types déjà livrés, dont `RESPONSIBILITY_RECEIVED`
pour les successions des autres circuits. Un index participation/date sert
la lecture. Tout futur type doit choisir explicitement son régime d’unicité ;
les nouveaux types ne sont pas automatiquement ajoutés au prédicat SQL.
Le nettoyeur de migrations protège cet index partiel contre les suppressions
proposées par Prisma ; cette protection est testée.

Un appel `setRole` identique réussit sans modifier la participation ni ajouter
une trace, après les mêmes contrôles de droits. Des appels identiques concurrents
produisent un seul changement réel. Des appels opposés sont sérialisés : chaque
transition effective est conservée, un appel devenu identique ne produit rien.
Une transmission rejouée par l’ancien responsable est refusée (403) ; deux
transmissions concurrentes par le même cédant n’en réalisent qu’une. Un retour
explicite par le nouveau responsable permet une nouvelle transmission réelle.
Ces intentions n’ont pas de clé d’idempotence permanente : après un aller-retour,
la même intention autorisée est un nouvel acte. Un échec de trace annule les
changements de rôle et les deux côtés de la transmission.

Les gardes OWNER, cible active, groupe BAND vivant sont conservées. Un rôle
OWNER forcé dans `setRole` est aussi rejeté à l’exécution. Progression et
notifications ne reçoivent aucun effet supplémentaire. Le lecteur commun reste
strictement personnel, y compris après départ ; ni la gestion ni les outils
ni la page publique ne reçoivent les actes des collègues. Dates égales : ordre
stable par identifiant, sans affirmer l’ordre réel des transactions.

Export et anonymisation communs couvrent les quatre types : actes de sa propre
participation et actes pour autrui, sans identité du participant tiers ; auteurs
effacés partout. La succession technique RGPD reste sans acte humain.
Aucune reprise d’ancien événement depuis rôles, états, dates ou notifications.
Les fixtures fictives dédiées de démo illustrent deux transmissions aller-retour
et trois changements de rôle, avec identifiants stables, sans convertir les
participations existantes.

Migrations `20261114200647_membership_band_roles` et
`20261114200800_membership_decisions_once`, appliquées en développement et sur
`e2e`, client régénéré. La première ajoute les quatre valeurs, remplace l’ancien
index par l’index de lecture ; le nettoyage avait retiré la création de l’index
partiel, rétablie immédiatement par la seconde migration avant les tests ou
écritures métier. Déployer les deux migrations avant de remettre les mutations
en service. Aucune reprise de données, aucune autre suppression d’index.
Un retour applicatif doit savoir lire les nouveaux types ; restaurer l’ancien
index unique échouerait après répétitions et supprimer les nouveaux actes ferait
perdre l’historique. Pas de retour destructif automatique : sauvegarde cohérente
et traitement explicite requis pour une restauration complète.

Écoles, validations de collaboration et futures options restent hors de ce lot.
DASH-05/#35 et #30 restent ouverts.

## Participations aux écoles (DASH-05i)

L’acceptation d’un lien d’école conserve `ACCEPTED`, attribué à l’élève qui
le suit, à l’instant de son entrée. « Invitation acceptée » désigne ici le
lien collectif : aucune invitation nominative ni attribution à la personne
qui a créé ou transmis le lien n’est inventée. Aucun jeton, hachage, message
ou nom de camarade n’est recopié. La création et la révocation des liens
restent des outils de gestion, hors du journal personnel des élèves.

L’entrée relit le lien et l’école vivante après le verrou transactionnel
`org:` ; création/révocation du lien utilisent aussi ce verrou et relisent les
droits de gestion. Une entrée rejouée pendant la participation active reste
sans effet, sans usage ni acte supplémentaire, comme auparavant. Une période
en attente est activée sans suppression de ses éventuelles traces. Après un
départ ou retrait, suivre à nouveau un lien valable crée une nouvelle période.

`leaveOrRemoveStudent` prend désormais le même verrou dans une transaction,
puis relit la période active, le type SCHOOL, l’école vivante et les droits.
Le départ conserve `LEFT` avec l’élève comme auteur ; le retrait `REMOVED`
avec la personne qui gère comme auteur. Date de fin et acte partagent le même
instant. Rejeux et clôtures concurrentes ne peuvent écraser le premier acte.
Le responsable ne peut toujours pas partir ; aucune co-gestion n’est créée.
Toute erreur d’écriture annule mutation, usage du lien et trace concernés.

Le lecteur commun `/structure/historique`, accessible aussi depuis `/ecoles`,
inclut les écoles vivantes : seules les périodes personnelles, même closes,
sans outils, liens d’invitation ni liste d’élèves. La gestion ne reçoit aucun
accès aux journaux des élèves. Une école masquée reste consultable par ses
anciens élèves ; une école supprimée/dissoute ou un lecteur supprimé est exclu.
Les protections des mineur·es et la visibilité des ateliers restent inchangées.

Les trois types réutilisent l’unicité par période/type déjà garantie par
`membership_decisions_once_key`. Aucune migration ni reconstruction d’anciens
actes depuis états, dates ou notifications. Export des actes personnels et pour
autrui, anonymisation des auteurs et cascades communs réutilisés. Une succession
ou dissolution technique RGPD ne crée aucun acte humain. Les deux périodes
fictives de démo, à identifiants stables, montrent un départ et un retrait.
Validations de collaboration et futures options restent à livrer ; DASH-05,
#35 et #30 restent ouverts.

## Validations de collaboration (DASH-05j)

### Audit et périmètre

Audit du 15/11/2026 de `collaborations/service.ts`, `collaborations/endorse.ts`,
`works/service.ts` et des vérifications dérivées de `milestones/service.ts` :

- `CollaborationParticipant.acceptedAt` et `confirmedCompletionAt` conservent
  déjà les actes de la personne identifiée par `actorId`. Aucun mandataire,
  groupe, studio ou gestionnaire ne répond à sa place dans ce circuit.
- Proposer vaut accord ; si la date est passée, proposer ou accepter vaut
  aussi confirmation d’achèvement. Les deux dates identiques sont donc deux
  faits conservés issus d’une même intention, pas deux clics prétendus.
- `COMPLETED`, `completedAt`, l’avancement du morceau, les crédits automatiques,
  les preuves d’étapes et les événements de progression sont des résultats du
  calcul serveur. Ils ne constituent pas un autre consentement humain.
- Refus et annulation ne conservaient que `CANCELLED`, sans auteur ni date de
  décision. Leur conservation demande un autre lot (**DASH-05k**), sans reprise
  des anciens états ni des notifications.
- Les appréciations et leurs reprises suivent un service distinct ; une
  appréciation redonnée réactive la même ligne, sans conserver chaque date de
  redon. Leur éventuel journal répétable reste à cadrer séparément. Les crédits
  manuels des morceaux ont aussi leur propre circuit et leurs propres gardes.
  Les futures options/propositions restent dans leur propre lot ultérieur.

### Conservation et atomicité

Aucune nouvelle table, migration, reprise ni copie de trace : le journal projette
les deux dates sources réellement conservées. Les mutations d’acceptation et de
confirmation prennent un verrou transactionnel `collaboration:`, relisent les
participants et l’état, puis écrivent les dates et règlent la collaboration dans
la même transaction (progression, crédits et étapes compris). Une erreur annule
le tout. Une réponse ou confirmation répétée est refusée sans écraser la date ;
les confirmations distinctes concurrentes aboutissent à un seul achèvement.
Refus et annulation prennent le même verrou afin de ne pas écraser un achèvement
concurrent. Cela ne leur invente aucune trace. La création et ses accords
implicites sont également atomiques avec la notification déjà existante.
Les gardes de blocage restent appliquées aux réponses/confirmations ; annuler
reste possible après blocage. L’acteur qui agit doit être vivant.

### Lecture privée, RGPD et démo

Dans une conversation, le volet clavier « Journal des validations de
collaboration » montre les 100 collaborations les plus récentes par date de
rencontre, y compris annulées, et leurs validations en ordre chronologique.
Une collaboration sans dates sources affiche l’absence d’activité, même si son
état est terminé. Aucune proposition, annulation ou décision ancienne n’est
reconstruite. Dates HTML à l’heure de Paris, auteurs actuels, ordre stable à
égalité de date sans prétendre certifier la séquence réelle.

Le lecteur serveur filtre chaque collaboration sur la participation exacte du
lecteur vivant ; la route conserve également la garde de conversation existante.
Un titre de collaboration n’est renvoyé qu’à ses participants. Ni identifiant de
compte/acteur, ni message, titre ou identifiant de morceau, studio, liste d’équipe,
condition de mandat ou preuve privée n’est ajouté par ce lecteur. Gérer le
morceau, le groupe, le studio, une agence ou disposer d’un mandat n’ouvre pas ce
journal. Un blocage ne supprime pas les validations historiques des parties et
ne donne aucun nouvel outil. Les identifiants d’entrée utilisent l’identifiant
collaboration et un ordinal de participant trié, sans exposer son identifiant
personnel ; ils restent stables tant que les participants sources sont conservés.

L’export personnel des collaborations inclut désormais les validations avec acte,
auteur et date. L’anonymisation existante conserve l’acteur vidé et ses dates :
la projection et l’export affichent « Compte supprimé », y compris chez l’autre
participant. Une suppression physique suit les cascades existantes ; aucune
succession RGPD ne crée un consentement. Aucun stockage personnel supplémentaire.

La démo réutilise les dates explicites des collaborations fictives déjà créées
par `seed-scenarios.ts` : Clara/Inès (quatre validations) et Lucas/Kevin (deux
validations, réponse attendue). Aucun ancien état réel n’est converti et aucun
nouveau scénario de seed n’est nécessaire pour cette projection.

## Refus et annulations de collaboration (DASH-05k)

### Audit et modèle retenu

L’audit de `collaborations/service.ts` distingue deux intentions :
`respondToCollaboration(..., false)` refuse une proposition encore sans réponse
pour ce participant ; `cancelCollaboration` annule explicitement une collaboration
proposée ou acceptée. Chaque participant vivant peut annuler ; le proposant ne
peut pas refuser sa propre proposition déjà acceptée implicitement. Les deux
chemins gardaient la collaboration avec le seul statut `CANCELLED`, sans acte
attribuable. Aucun chemin utilisateur ne supprime la collaboration.

Deux dates facultatives sont ajoutées à `CollaborationParticipant` : `declinedAt`
pour le refus, `cancelledAt` pour l’annulation explicite. `actorId` est l’auteur
réel de chacun de ces actes : personne ne répond par mandat, métier ou gestion
pour autrui dans ce circuit. Aucune identité ni texte libre n’est copié. Une seule
clôture étant possible par collaboration, un registre répétable supplémentaire
n’est pas nécessaire. L’état opérationnel reste `CANCELLED` dans les deux cas.
Les anciennes lignes gardent ces deux dates à null : aucune reconstruction depuis
`CANCELLED`, `updatedAt`, notifications ou événements de progression.

Les suppressions ont été relues avant ce choix : l’anonymisation RGPD garde
l’acteur vidé et les participations ; supprimer son morceau met `workId` à null.
Une suppression physique de collaboration cascade ses participations et dates ;
celle du proposant cascade la collaboration, celle d’un autre acteur cascade sa
participation. Ces politiques existantes ne sont pas transformées en nouveaux
actes humains et aucune copie orpheline de décision n’est créée.

### Atomicité et accès

Les deux nouvelles dates sont écrites dans la transaction de la mutation, après
le verrou `collaboration:` et la relecture des participants et de l’état. Toute
erreur de trace ou de changement d’état annule l’ensemble. Les réponses et
confirmations finales utilisent le même verrou : une clôture gagnante empêche
une réponse ultérieure, une collaboration achevée ne peut plus être annulée.
Deux refus ou annulations concurrents n’en gardent qu’un, sans réécriture de
l’auteur ou de sa date. Accepter une proposition future puis l’annuler conserve
les deux actes réels si ces deux mutations ont réussi dans cet ordre.

Les gardes existantes restent appliquées : acteur vivant, participation exacte,
blocage interdisant les réponses et confirmations ; annulation encore possible
après blocage. Aucun accès par la propriété du morceau, le studio, le groupe,
l’agence ou un mandat. Ni notification ni effet de progression supplémentaire.

Le volet privé « Journal des validations de collaboration » inclut maintenant
« Proposition de collaboration refusée » et « Collaboration annulée », avec
l’auteur actuel et la date source. La limite des 100 collaborations, les dates
HTML à Paris, l’ordre stable et le contrat sans identifiant personnel ni contenu
privé du projet sont conservés. Les validations antérieures restent visibles.
L’export personnel inclut les nouveaux actes dans `collaborations[].validations` ;
l’anonymisation existante les affiche comme « Compte supprimé » chez l’autre
participant, sans attribuer son acte au lecteur.

Migration additive `20261115151623_collaboration_refus_annulations`, générée par
`db:nouvelle-migration`, nettoyée et relue : seulement deux colonnes nullable,
aucune reprise ni suppression/recréation d’index. Appliquée par `db:deploy` et
`db:deploy:e2e`, client régénéré. Retour applicatif compatible possible en gardant
les colonnes ; les supprimer perdrait les nouveaux actes. Aucun retour destructif
automatique n’est fourni.

La démo ajoute par upsert deux collaborations fictives à identifiants stables,
Clara/Inès : refus d’Inès et annulation de Clara. Une base déjà semée reçoit aussi
ces seules nouvelles situations, sans convertir ses collaborations antérieures.
Les appréciations répétables, crédits manuels et futures options/propositions
restent dans leurs propres lots. DASH-05 et les issues #35/#30 restent ouverts.

## Actes d’appréciation de collaboration (DASH-05l)

Audit du 15/11/2026 : `endorseCollaborator` ouvre l’attribution aux seuls
participants d’une collaboration COMPLETED, TL1, hors blocage et sans
auto-appréciation. La cible doit être vivante ; l’instrument doit être actif
et déclaré par cette personne. Une appréciation active ne se modifie pas :
l’appel est refusé, même avec une autre qualité. Après reprise, la même ligne
`CollabEndorsement` est réactivée et peut porter une autre qualité/instrument.
`createdAt` date sa création initiale, pas chaque attribution ; `revokedAt`
et le contenu courant ne sont pas un historique. Notifications, `updatedAt`
et événements moteur ne deviennent jamais des actes du journal.

### Modèle et unicité

`CollaborationAppreciationAct` conserve seulement GIVEN (« Appréciation de
collaboration attribuée »), REVOKED (« Appréciation de collaboration reprise »),
l’auteur réel, la collaboration et la date fournie à la mutation. Aucun nom,
qualité, instrument, destinataire, texte ou contenu privé du morceau recopié.
Dans ce circuit personnel à deux participants, le libellé ne prétend pas
identifier un destinataire ni certifier le contenu d’une ancienne appréciation.
Le registre est indépendant de la ligne réactivable ; chaque acte a son propre
identifiant, sans unicité auteur/type ni date. Plusieurs cycles à date égale
restent possibles. L’unicité d’une transition effective est assurée par la
relecture de l’état courant sous le verrou transactionnel `collaboration:`.

Attribution et reprise prennent ce verrou avant toute lecture métier et le
gardent jusqu’au commit, comme réponses, confirmations et annulations. Les
appels identiques concurrents donnent un succès et un refus, sans écrasement.
Les appels opposés sont sérialisés : une reprise qui arrive avant toute
attribution échoue ; celle qui la suit conserve un second acte. Après un
aller-retour, la même intention est un nouvel acte autorisé, sans clé
permanente d’idempotence. Les participants et l’auteur vivant sont relus ;
la reprise reste personnelle et possible après blocage, sans TL1 ni nouvelle
condition d’achèvement. L’attribution garde ses conditions d’ouverture.

Audit des autres verrous : le moteur prend ensuite ses verrous d’acteurs
triés, comme le règlement de collaboration ; aucun chemin de ce circuit ne
prend ces verrous avant `collaboration:`. Les autres services d’appréciation
(jams/annonces) ne modifient pas `CollabEndorsement`. Blocage/déblocage ne
partagent pas ce verrou : la garde lit le blocage présent au contrôle dans
la transaction, sans nouvelle promesse de sérialisation de ces réglages.
Aucun verrou global ni modification de ces services n’est ajouté.

L’écriture d’acte a lieu dans la transaction métier après les effets existants.
Son échec annule appréciation, événement, gains/reprises et notification. Le
journal n’appelle ni moteur ni notification. L’attribution garde son unique
`endorsement.received`, notification existante et rendements par paire ; la
reprise garde `revokeEndorsementEvent`, transactions négatives et
`endorsement.revoked` si un événement source existe. Réputation et paliers
restent calculés depuis les sources métier, jamais depuis ce registre.
Une ancienne ligne sans événement source peut être reprise : seul ce nouvel
acte est journalisé, sans fabriquer son attribution ni des points à reprendre.

### Lecture, effacement et déploiement

La projection privée existante inclut ces seuls nouveaux actes : participation
exacte du lecteur vivant, garde de conversation, limite de 100 collaborations,
aucun accès par mandat ou gestion de projet. Le blocage n’efface pas l’histoire.
L’ordre à date égale utilise l’identifiant sans prétendre certifier l’ordre réel.
Les validations anciennes fiables restent projetées depuis leurs dates sources ;
aucun ancien acte d’appréciation n’est repris. Le volet ne révèle pas de détail
supplémentaire du projet ni de l’appréciation.

L’export `collaborations[].validations` couvre le registre. L’anonymisation garde
l’acteur vidé : ses actes deviennent « Compte supprimé », également chez l’autre
participant. La suppression RGPD des appréciations reçues garde son comportement
métier ; elle ne cascade pas les actes donnés par autrui, qui sont indépendants.
Supprimer un morceau ne touche pas ce registre. Une suppression physique de
collaboration cascade ses actes ; celle de l’auteur cascade ses actes, celle du
proposant cascade la collaboration et tout son registre. La suppression physique
d’un autre participant suit les cascades existantes sans créer d’acte. Aucune
succession technique ou suppression RGPD n’est une reprise humaine.

Migration additive `20261115152721_collaboration_appreciation_acts`, générée avec
`db:nouvelle-migration`, nettoyée et relue : enum, table, deux index et deux clés
étrangères seulement ; aucune reprise ni suppression d’index. Appliquée par
`db:deploy` et `db:deploy:e2e`, client régénéré. Un retour applicatif peut garder
la table ; la supprimer perdrait les nouveaux actes. Aucun retour destructif
automatique ; restauration complète depuis sauvegarde cohérente si nécessaire.

Démo dédiée et idempotente Clara/Inès : deux attributions et deux reprises
fictives explicites, sans conversion d’anciennes données ni effet de progression.
Crédits manuels et futures options/propositions restent dans leurs propres lots.
DASH-05 et #35/#30 restent ouverts.

## Actes humains des crédits de morceaux (DASH-05m)

Audit du 15/11/2026 depuis `works/service.ts`, ses routes `/morceaux`,
`/morceaux/nouveau`, `/morceaux/[id]`, `collaborations/service.ts`, le moteur,
les lecteurs publics, les documents de démarches et `actors/person.ts`.

| Circuit disponible                           | Mutation et effets préexistants                                                                                                    | Acte nouveau                                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Création personnelle ou pour un groupe géré  | Crédit confirmé du créateur, rôles saisis ; aucune notification ni progression à la création                                       | `CREATOR_CREDITED`, auteur = personne qui crée, consentement implicite à son propre crédit |
| Gestion attribuant à autrui                  | Nouvelle ligne en attente, rôles libres pourvus ou créés, notification `WORK_CREDIT`                                               | `ASSIGNED`, auteur = gestion réelle ; aucun consentement du destinataire                   |
| Gestion s'attribuant un crédit absent        | Nouvelle ligne confirmée et effets `afterConfirm` existants                                                                        | `SELF_ASSIGNED`, auteur = personne créditée ; un seul acte avec consentement               |
| Confirmation personnelle                     | Transition de `confirmedAt` nul, corroboration/part de composition ou succès du son selon les rôles                                | `CONFIRMED`, auteur = personne créditée                                                    |
| « Ce n'est pas moi »                         | Crédit en attente supprimé, FK des rôles à null : à pourvoir                                                                       | `DECLINED`, auteur = personne créditée                                                     |
| Retrait personnel confirmé                   | Rôles supprimés puis crédit supprimé, aucune reprise de points                                                                     | `LEFT`, auteur = personne créditée                                                         |
| Retrait par la gestion                       | Seulement une ligne en attente, rôles remis à pourvoir                                                                             | `WITHDRAWN`, auteur = gestion réelle                                                       |
| Crédit automatique de collaboration terminée | Nouveau crédit confirmé, ou ajout d'un rôle sur crédit existant ; une attente existante reste en attente ; succès du son existants | Aucun acte manuel, aucune nouvelle confirmation personnelle                                |

L'auto-attribution nécessite déjà le droit de gestion. Une attribution à une
personne déjà créditée est refusée : ce chemin n'édite ni ses rôles ni son
consentement. Aucun écran ne permet de modifier individuellement les rôles
attribués ; ils disparaissent avec le retrait confirmé. Les seuls ajouts de
rôles sur une ligne existante viennent des collaborations automatiques. Les
rôles libres ont leurs propres ajouts/retraits, hors journal des crédits.
Le porteur individuel ne peut quitter son crédit : il supprime son morceau.
Un créateur pour un groupe peut quitter son crédit sans quitter le groupe.

### Conservation et unicité

`WorkCreditAct` conserve seulement morceau, identifiant opaque de période
(`WorkContributor.id` sans FK), personne concernée, auteur nullable, type et
instant. Aucun titre, rôle, instrument, message, identité recopiée ou référence
de collaboration. Le registre survit à la suppression du crédit et de ses
rôles. Une nouvelle attribution crée une autre période ; `(periodId, kind)`
interdit deux actes du même type dans une période. Les gardes métier refusent
les rejeux sans transition : aucun upsert ni écrasement d'acte. Les types de
création/auto-attribution comprennent le consentement sans fabriquer un second
clic de confirmation. Un ancien crédit ou un crédit automatique peut faire
l'objet d'une nouvelle confirmation effective s'il attend encore, ou d'un
retrait : seul cet acte nouveau est conservé.

Aucune migration de données ni reconstruction depuis `confirmedAt` (origine
multiple), `createdAt` du crédit, `updatedAt`, notifications ou événements moteur.
Le titre et les dates de création/composition du morceau restent des faits
métier ; ils ne deviennent pas des actes manuels de crédit. Le récapitulatif
de campagne existant continue de lire ces faits, séparément.

L'écriture du registre est dans la transaction de la mutation et après ses
effets existants : son échec annule crédit, rôles, preuve, événements, XP,
succès et notification. Le registre ne déclenche aucun de ces effets. Les
plafonds de personnes, rôles et attentes, droits de gestion, visibilité des
profils, blocage et `canInviteMinor` gardent leurs règles. Leurs contrôles
antérieurs hors transaction ne deviennent pas des promesses de sérialisation
des changements de profil ou de blocage.

### Verrous et courses

Les mutations manuelles de crédits, la composition, la suppression et les
crédits automatiques prennent le même verrou transactionnel `work:`. La
création du morceau crée une identité neuve, invisible avant commit : aucun
verrou supplémentaire. Le retrait d'un rôle libre garde son circuit existant
(suppression conditionnelle) ; aucune ligne de crédit n'y est modifiée.

L'audit a trouvé une inversion existante : une collaboration finalisée prenait
les verrous de progression par acteur, puis modifiait le morceau et prenait
`work:`, tandis qu'une confirmation manuelle prenait `work:` puis les acteurs.
`load` de collaboration prend désormais `collaboration:` puis `work:` **avant
toute écriture de participant/collaboration**, donc avant tout verrou d'acteur,
et relit la collaboration après l'attente. La suppression du morceau peut avoir
mis `workId` à null ; la collaboration peut alors finir sans crédit automatique.
Cela évite aussi de garder une ligne de collaboration verrouillée en attendant
le morceau que sa suppression doit détacher (`ON DELETE SET NULL`). Deux
collaborations sur le même morceau se sérialisent avant le moteur ; confirmations,
attributions et retraits manuels prennent place avant ou après le crédit
automatique sans fabriquer d'acte. Une attribution manuelle arrivant après un
crédit automatique déjà créé est refusée, comme pour tout crédit existant.

Les acteurs sont verrouillés dans l'ordre trié par `processEvent`. Les chemins
de concert gardent `band:` avant leurs effets de progression ; composition et
étapes gardent leurs appels existants à `syncComposition`/`lockBand`. Le lot ne
réorganise pas globalement les séquences de progression entre événements,
ni les dissolutions, opérations RGPD ou FK physiques. Refus/annulations et
appréciations de collaboration gardent leur verrou `collaboration:` ; aucun
chemin de crédit manuel ne demande ce verrou. Une erreur SQL de concurrence
annule toute la transaction, sans trace humaine technique.

### Lecture, RGPD et cascades

`/morceaux` expose un volet privé des **100 derniers actes** dont la personne
connectée vivante est la destinataire ou l'auteur. La lecture s'appuie seulement
sur l'identité serveur. On n'expose que libellé, auteur affiché et date, sans
identifiant de morceau/période, titre, lien, rôles, destinataire tiers ou équipe.
Un auteur de gestion voit ses propres attributions/retraits pour autrui, pas
les confirmations ou refus de ses collaborateurs. Propriété, gestion, mandat,
appartenance au groupe, consultation publique du morceau et connexion seule
ne donnent aucun droit au journal d'autrui. Les droits restent identiques
après perte de gestion, refus, retrait, blocage ou masquage. Cette trace
personnelle n'ouvre aucune lecture du morceau privé et n'identifie pas le tiers
crédité par la gestion. Le nom de l'auteur historique reste lisible par la
personne concernée sans lien vers son profil ; auteur effacé : « Compte supprimé ».
L'ordre à date égale utilise l'identifiant, sans certifier un ordre réel.

L'export `morceaux.actes_de_credits` est complet, sans limite de 100, et porte
les mêmes actes autorisés, leur type, instant, auteur affiché, identifiant
opaque de période et indication « concerne mon crédit ». Il ne recopie pas
l'identité de la personne créditée par la gestion ni les détails d'un morceau
perdu. Les crédits courants restent exportés séparément avec leurs faits métier.

L'anonymisation oublie `authorId` sur tous les actes donnés, y compris pour
autrui ; elle conserve le sujet sous son acteur vidé, sans nouveau retrait
humain. Les crédits en attente supprimés ne cascadent pas le registre. Les
crédits confirmés des morceaux d'autrui restent « Compte supprimé », comme
avant. La suppression des morceaux portés supprime leurs actes. Physiquement :
FK morceau et sujet en cascade ; FK auteur à null ; aucune FK de période vers
le crédit. Supprimer un rôle ou crédit ne supprime donc aucun acte. Supprimer
le compte auteur garde les actes concernant autrui avec auteur effacé ;
supprimer le compte sujet les supprime. Une structure physiquement supprimée
cascade ses morceaux puis leurs actes. Une dissolution garde les morceaux et
les traces minimales, sans les rendre accessibles ; la succession technique
ne crée aucun acte. Aucune purge ou opération RGPD ne journalise un acte humain.

Migration additive `20261115154332_work_credit_acts`, produite par
`db:nouvelle-migration`, nettoyée et relue : un enum, une table, quatre index
et trois FK, aucune reprise historique ni suppression d'index. Appliquée par
`db:deploy` et `db:deploy:e2e`, client régénéré. Retour applicatif possible en
laissant la table ; la supprimer perdrait les actes nouveaux. Aucun retour
SQL destructif automatique ; restauration depuis sauvegarde cohérente au besoin.

Démo dédiée Clara/Inès : attribution, refus, nouvelle attribution, confirmation,
retrait, périodes distinctes et aucun crédit courant restant pour Inès. Actes
fictifs explicites et idempotents, sans conversion ni effets de progression.
Les options/propositions restent séparées. DASH-05 et #35/#30 restent ouverts.
