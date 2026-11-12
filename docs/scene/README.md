# Métiers de la scène (phase 5)

L'organisateur·rice (P5-05), le booker et le manager (P5-07).
Conception : [06 §3.6](../conception/06-metiers.md#36-organisateurrice--promoter--phase-5)
et [08 §8](../conception/08-carrieres-par-role.md#8-organisateurrice--promoter--phase-5) ;
barème en [02 §2.2](../conception/02-progression.md#22-barème-première-version-à-calibrer).
Le lieu a sa propre doc ([docs/jam](../jam/README.md#revendication-dun-lieu-niveau-1-p5-03a-d31)).

## Barème et rangs (P5-01)

- **Noyau pur** : événement `gig.held` (`core/events.ts`), règle
  `core/rules/gigHeld.ts` (événement tenu 200, artiste à sa toute première
  date 100, date bookée 150), rangs `PROMOTER_TIERS` et `AGENT_TIERS`
  (`core/tiers.ts`). Personas : `core/personas-scene.test.ts`.
- `gig.held` est émis à la fin d'un concert confirmé (P5-06,
  `verifyGigFromCollaboration`) : organisateurs = personnes qui gèrent
  l'hôte, confirmateurs = personnes qui jouent, lieu = l'hôte s'il est un
  lieu, vérifié = hôte vérifié.

## Organisateur·rice (P5-05a)

- **Métier ouvert** : `PROMOTER`, `available: true` (`src/lib/actors/tracks.ts`).
- **Profil** : `PromoterProfile` (ce que la personne organise,
  `PromoterEventKind` : concerts, soirées, festival, tournées, scènes
  ouvertes ; jauge habituelle facultative) et `PromoterGenre` (genres
  programmés, 5 au plus). Événements passés en lien : `CraftReference`
  sur la piste `PROMOTER`, 6 au plus, « non vérifiés ».
  - Règles pures : `src/lib/crafts/promoter.ts` ; schéma
    `src/lib/schema/crafts/promoterProfileSchema.ts`.
  - Données : `src/lib/prisma/crafts/promoterProfile.ts`, seul point
    d'écriture (hors anonymisation).
  - Écran : `/profil/organisateur`, réservé à qui a le métier ; liens
    depuis « Mon profil ».
- **Recherche** : `/decouvrir?metier=organisateur&specialite=scenes-ouvertes`
  (slugs : `concerts`, `soirees`, `festival`, `tournees`,
  `scenes-ouvertes`). Trouvable dès qu'un type d'événement est coché ; les
  genres programmés comptent dans le filtre Genre.
- **Profil public** : carte « Organisateur·rice » (`PromoterCard`) : rang,
  ce qu'elle ou il organise, genres, jauge, plateaux ouverts, événements
  passés.
- **Plateaux** : annonces `GIG_SLOT`, candidature au nom d'un groupe ;
  voir [docs/annonces](../annonces/README.md#plateaux-p5-05a).
- **Rang** (`getPromoterTier`) : lu dans les `gig.held` où la personne
  organise, confirmés par au moins une personne hors organisation et
  booking (`core/promoterSummary.ts`). **Jamais l'XP.** Vide jusqu'à
  P5-06.
- **Objectifs** (`/espace/objectifs`, `nextPromoterObjectives`) : remplir
  sa fiche, indiquer sa ville, publier un premier plateau, programmer un
  premier groupe (candidature acceptée), tenir un premier événement
  (P5-06), programmer 3 groupes pour leur toute première date, organiser
  une jam publique.
- **Mineur·es (D5)** : le métier s'affiche, mais publier un plateau et
  candidater au nom d'un groupe demandent d'être majeur·e.
- **RGPD** : profil d'organisateur·rice et candidatures envoyées pour un
  groupe dans l'export ; à l'anonymisation, le profil et les événements
  passés sont supprimés, `sentById` est oublié.
- **Tests** : `src/lib/opportunities/gigSlot.test.ts` (éligibilité),
  `core/promoterSummary.test.ts`, `core/craftQuests.test.ts`,
  `src/lib/crafts/promoter.test.ts` ; intégration
  `opportunities/gigSlots.integration.test.ts`,
  `crafts/promoterProfile.integration.test.ts`, recherche ; e2e
  `e2e/linkmusician/organisateur.spec.ts`.

## Organisations d'organisateur·rices (P5-05b)

- **Modèle** : `Organization` de type `PROMOTER` (association, collectif,
  festival) et sa fiche `PromoterOrgProfile` (ce qu'elle organise, jauge
  habituelle). Nom, présentation, genres (`actor_genres`) et ville
  (`actor_locations`) sont ceux de l'acteur, comme pour un groupe.
  - Règles pures : `src/lib/organizations/promoter.ts` (fiche,
    `gigSlotGaps`).
  - Service : `src/lib/server/organizations/promoters.ts`, seul point
    d'écriture (verrou par organisation, comme le studio).
- **Créer** : `/organisations` (lien « Mes organisations » depuis « Mon
  profil »), réservé aux organisateur·rices majeur·es (`isPromoter`, D5) ;
  trois organisations gérées au plus. La personne en est responsable
  (OWNER).
- **Fiche** : `/organisations/[handle]` : nom, présentation, ville,
  ce qu'elle organise, genres programmés (5), jauge ; ses plateaux et les
  candidatures à trancher ; la vérification ; la co-gestion.
- **Co-gestion** : inviter (ADMIN) une personne qui a le métier et est
  majeure (Q33), notification `ORG_INVITE` ; accepter ou décliner sur
  `/organisations` ; la ou le responsable retire, qui part transmet
  (`successorOf`), on ne part pas seul·e.
- **Plateaux en son nom** : « Publier au nom de » sur `/plateaux/nouveau`
  (ou « Publier un plateau » depuis la fiche). Il faut une ville et au
  moins un type d'événement (`gigSlotGaps`). L'organisation est l'émettrice
  (`issuerActorId`), la personne est notée (`postedById`) ; la zone est la
  ville de l'organisation. Toute la gestion reçoit les candidatures et les
  tranche (`managesIssuer`) ; accepter ouvre la conversation entre la
  personne qui tranche et celle qui a candidaté.
- **Vérification** : la carte commune (`OrgVerificationCard`, P5-02) ;
  `isVerifiedOrg` servira à P5-06.
- **Page publique** `/@handle` (`PromoterOrgPublic`) dès la création, comme
  un groupe : ville, ce qu'elle organise, genres, jauge, plateaux ouverts,
  contacts (la gestion visible), mention « vérifiée ». Ni adresse, ni
  SIRET. La carte « Organisateur·rice » d'une personne liste ses
  organisations.
- **RGPD** : les adhésions à la gestion figurent dans l'export
  (`organisations`) ; à l'anonymisation, elles se closent et la
  responsabilité passe à la personne suivante, ou l'organisation est
  dissoute (`bandAnonymizationOps`, commun à toutes les organisations).
- **Tests** : `src/lib/organizations/promoter.test.ts` ; intégration
  `organizations/promoters.integration.test.ts` ; e2e
  `e2e/linkmusician/organisation-organisateurs.spec.ts`.

## Booker et manager (P5-07)

- **Métiers ouverts** : `MANAGER` et `BOOKER`, `available: true`.
- **Accompagnement** : `Representation` (`agentId`, `artistId` : personne
  ou groupe, `kind` `MANAGER` ou `BOOKER`, `status` `PROPOSED`,
  `CONFIRMED`, `ENDED`). Service : `src/lib/server/representation/service.ts`,
  seul point d'écriture ; règles pures : `src/lib/representation/rules.ts`.
  - **Proposer** : une personne majeure qui a le métier propose
    d'accompagner une personne majeure ou un groupe dont elle ne fait pas
    partie (Q48, Q49) ; 10 propositions en attente au plus. Notification
    `REPRESENTATION_REQUEST` à l'artiste, ou à la gestion du groupe.
  - **Confirmer** : l'artiste, ou une personne majeure de la gestion du
    groupe (OWNER, ADMIN). Émet `management.confirmed` : 200 au manager
    (rendement par artiste, confiance de qui confirme), rien au booker.
  - **Un accompagnement non confirmé ne rapporte rien** : ni XP, ni rang,
    ni mention publique, ni « Booké par » (test d'intégration
    `representation.integration.test.ts`).
  - **Décliner** ou **retirer** supprime la proposition ; **mettre fin**
    (l'une ou l'autre partie) passe à `ENDED` : l'accompagnement compte
    toujours pour le rang, mais ne permet plus de booker.
  - Écran : `/accompagnement` (propositions à trancher, qui m'accompagne,
    proposer, mes artistes) ; lien « Proposer d'accompagner » sur la page
    d'un groupe ou d'un·e musicien·ne, pour qui a l'un des métiers ;
    entrée dans `/espace` et dans « À confirmer ».
- **Dates bookées** : `Collaboration.bookedById`. Dans le formulaire de
  concert (`/messages/[id]`), « Booké par » ne propose que les bookers
  confirmé·es du groupe choisi (`confirmedBookersOf`), revérifié côté
  serveur. À la fin du concert, `verifyGigFromCollaboration` met le booker
  dans `gig.held.bookerIds` s'il l'est encore : 150 × rendement par
  artiste **et par lieu** × confiance (règle `gigHeld`).
- **Tournée bookée** : `creditBookedTour` relit les `gig.held` où le
  booker a été crédité pour ce groupe, après sa dernière tournée bookée ;
  s'ils font une tournée (`firstTour` : ≥3 dates dans ≥3 communes en 30
  jours), il émet `tour.booked` : 400 × meilleure confiance des personnes
  qui ont confirmé (règle `tourBooked`, Q51).
- **Rang** (`getAgentTier`, `core/agentSummary.ts`, `AGENT_TIERS`) :
  artistes distincts dont l'accompagnement a été confirmé ; « développé » :
  un **groupe** qui a passé au moins deux rangs (`bandTier`, lu dans ses
  étapes prouvées et datées) entre la confirmation et la fin. **Jamais
  l'XP.** La part de 10 % sur un rang franchi reste reportée (Q21).
- **Profil** : `AgentProfile` (« ce que je cherche », 280 caractères) et
  `AgentGenre` (5 au plus), un seul pour les deux métiers ; écran
  `/profil/accompagnement` ; données `src/lib/prisma/crafts/agentProfile.ts`.
  Zone : la ville de l'acteur.
- **Recherche** : `/decouvrir?metier=manager` ou `?metier=booker`, dès qu'un
  genre est choisi ; les genres suivis comptent dans le filtre Genre.
- **Profil public** : carte « Manager / Booker » (`AgentCard`) : rang, ce
  qu'elle ou il cherche, genres, **artistes qui ont confirmé** (pas les
  propositions, ni un artiste masqué, dissous ou bloqué).
- **Objectifs** (`nextAgentObjectives`) : fiche, ville, première
  proposition, premier accompagnement confirmé ; booker : date bookée,
  tournée bookée ; manager : un groupe qui passe deux rangs.
- **RGPD** : fiche et accompagnements (comme agent ou artiste) dans
  l'export ; à l'anonymisation, la fiche est supprimée, les propositions
  aussi, un accompagnement en cours se termine, sans mot ni personne qui a
  confirmé ou terminé.
- **Tests** : `core/agentSummary.test.ts`, `core/personas-scene.test.ts`
  (`tour.booked`), `core/craftQuests.test.ts`, `representation/rules.test.ts` ;
  intégration `server/representation/representation.integration.test.ts`,
  recherche ; e2e `e2e/linkmusician/booker.spec.ts`.

## À venir

- Festivals : leurs jams « off » se publient comme des jams (P2-14b) ;
  stages et masterclasses : avec les écoles (P5-11).
