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
| `studios/service.ts`                                | Copie historique de la co-gestion, avec ses propres mutations.                                                                                                                                                                                        | Lot suivant                                                                               |
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
