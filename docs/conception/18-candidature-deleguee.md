# Candidature déléguée — DASH-07 (#37, D71)

Suite des mandats individuels [DASH-04a](./13-mandats-individuels.md) et des
affectations [DASH-04b](./15-affectations-delegations.md). Dépend de
l’annonce qualifiée ONB-13b (#27, D63).

## Audit (17/11/2026)

- `applyTo` : seule la personne candidate pour elle-même. `applyAsBand` : la
  gestion majeure d’un groupe candidate à un plateau (`GIG_SLOT`), la personne
  qui envoie est notée `Application.sentById`. Les deux verrouillent l’annonce
  et revérifient statut, doublon et conditions dans la transaction (ONB-13b).
- Les mandats (`CAREER_SUPPORT`, `BOOKING_CREDIT`) et les affectations
  (`VIEW_MANDATE`, `END_MANDATE`) ne donnent **aucun** droit de candidater ;
  aucun métier, rôle d’agence ni rang non plus. Il faut un droit nouveau.
- `withdrawApplication` et `withdrawBandApplication` écrivent sans verrou ni
  auteur du retrait.
- `decideApplication` ouvre, pour un plateau, la conversation avec `sentById` ;
  la réciprocité y rapporte +30 XP aux deux. Appliqué à un agent, ce serait une
  XP gagnée par la candidature déléguée : interdit.
- Un mandat exige un agent majeur et un artiste majeur (personne) ou un groupe
  dont la gestion actuelle est majeure (`artistAnswerers`).

## Le droit de candidater (D71)

Objet distinct, `ApplicationGrant`, rattaché à un **mandat confirmé**
(`Representation`) d’un manager ou d’un booker. Le mandat est une condition
nécessaire, jamais suffisante.

- **Demande et accord** : l’agent titulaire demande ; l’artiste (personne
  majeure) ou la gestion majeure actuelle du groupe accorde ou refuse. Aucun
  droit avant l’accord. Pas de délégation en chaîne : un collaborateur
  d’agence (DASH-04b) n’en hérite pas et ne peut pas le demander.
- **Durée** : fin obligatoire, au plus 6 mois après l’accord et jamais au-delà
  de la fin du mandat. Le droit devient inactif dès que le mandat ne l’est plus
  (fin, expiration, perte du métier, blocage, perte de la gestion, suppression,
  dissolution).
- **Périmètre** : types d’annonces cochés par l’artiste, parmi ceux qui
  s’appliquent :
  - groupe : plateaux (`GIG_SLOT`) ;
  - personne : jam (`JAM`), session ou prestation (`SESSION_WORK`, qui couvre
    aussi les remplacements : il n'existe pas de type distinct) ;
  - booker : plateaux seulement ; manager : tous les types ci-dessus ;
  - **recrutement d’un groupe (`RECRUIT_MEMBER`) exclu** : l’accepter ferait
    adhérer la personne sans son consentement propre.
    Le territoire du mandat s’applique à l’annonce (département de la commune de
    l’émetteur ; commune inconnue hors d’un territoire limité). Aucun
    élargissement possible.
- **Immuable** : changer la durée ou le périmètre exige de révoquer puis de
  redemander.
- **Révocation** : l’artiste (ou sa gestion) et l’agent, à tout moment. Une
  révocation n’annule pas les candidatures déjà envoyées : l’artiste les retire
  une à une s’il le souhaite.

## Actes en ajout seul

`ApplicationGrantAct` conserve chaque fait, avec auteur réel et date : demandé,
accordé, refusé, retiré par l’agent, utilisé (lien vers la candidature),
révoqué. L’expiration se lit à la date, sans acte écrit par une tâche. Aucun
acte n’est modifié ni supprimé ; l’état du droit est une projection de ses
actes et de ses colonnes de décision.

## Candidature déléguée

- `applicantActorId` = l’artiste représenté (personne ou groupe),
  `sentById` = l’agent. Une candidature reste unique par annonce et par
  candidat : l’artiste et son agent ne peuvent pas postuler deux fois.
- **Envoi direct** : pas de validation préalable à chaque envoi. L’artiste
  (pour un groupe : sa gestion) est notifié·e à l’envoi, voit la candidature
  « envoyée en ton nom par … » et peut la retirer tant qu’elle n’est pas
  tranchée.
- **Mêmes règles que la candidature directe**, appréciées sur l’artiste, jamais
  sur l’agent : `eligibilityFor` (personne) ou `checkBand` (groupe), visibilité
  de l’émetteur et blocages (entre l’émetteur et l’artiste comme l’agent),
  « c’est ton annonce », membre du groupe émetteur.
- **Sous verrou** : verrou de l’artiste, puis de l’annonce (`FOR UPDATE`) ; le
  droit, le mandat, les conditions et le doublon sont relus après attente. Une
  révocation qui passe avant fait échouer l’envoi ; une révocation après laisse
  la candidature, retirable.
- **Acceptation** : la conversation s’ouvre avec l’**agent**, qui négocie. Elle
  est marquée déléguée et sa réciprocité ne rapporte d’XP à **personne**.
  L’artiste est notifié·e de l’acceptation. Aucune XP pour l’agent par la
  candidature ; les crédits de booking restent ceux de `BOOKING_CREDIT`.
- **Retrait** : sous verrou, auteur conservé (artiste, gestion du groupe ou
  agent).

## RGPD

Export : droits demandés, accordés ou reçus, leurs actes, et candidatures
envoyées pour autrui. Anonymisation : droits actifs révoqués, auteurs d’actes
et `sentById` oubliés ; un droit accordé par un groupe reste celui du groupe.

## Découpage

- **DASH-07a** : le droit, sa demande, son accord, sa révocation, ses actes,
  RGPD, pages (accompagnement de l’agent et de l’artiste), notifications.
- **DASH-07b** : candidature déléguée (envoi, notification, retrait par
  l’artiste, conversation sans XP), E2E 390 px, clavier, axe, POST forgé.

## Réalisation DASH-07a (17/11/2026)

- Règles pures : `src/lib/representation/applicationGrants.ts` (types par
  couple artiste/métier, durée, état lu à la date, actes).
- Service : `src/lib/server/representation/applicationGrants.ts` :
  `requestGrant`, `answerGrant`, `endGrant` (retrait d'une demande ou
  révocation), `grantsForRepresentation` (vue des deux parties) et, pour
  DASH-07b, `lockGrantPair` + `usableGrant` (droit et mandat relus sous les
  verrous `band:<artiste>` puis `rep:<agent>:<artiste>`, ceux des mandats).
- Page `/accompagnement/[id]/candidatures`, liée depuis chaque mandat
  confirmé de `/accompagnement` ; notification `APPLICATION_GRANT`.
- Migration additive `20261117150401_application_grants` : deux tables, une
  enum d'actes, une valeur de notification, contrainte
  `application_grants_kinds_check` (types non vides, recrutement exclu). Pas
  d'index partiel : l'unicité d'un droit ouvert par mandat est garantie sous
  verrou, une demande échue ne bloquant pas la suivante.
- Un droit accordé dont le mandat n'est plus actif reste affiché « sans
  effet » ; on peut toujours le révoquer, ou refuser une demande.
- RGPD : export `droits_de_candidater` (avec actes) ; anonymisation : droits
  ouverts terminés par un acte sans auteur, auteurs oubliés.
- Démo : Élise demande le droit pour la Fanfare Pirate ; la gestion du
  groupe le tranche.
- Tests : `applicationGrants.test.ts` (8), `applicationGrants.integration.test.ts`
  (6 : mandat seul insuffisant, périmètre et durée, gestion majeure du groupe,
  retrait/refus/révocation/échéance/fin du mandat, course révocation contre
  usage sous verrou, vue et RGPD), E2E `droit-de-candidater.spec.ts` (390 px,
  clavier, axe, POST forgé de l'agent et d'un tiers).
