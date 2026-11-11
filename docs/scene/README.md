# Métiers de la scène (phase 5)

L'organisateur·rice (P5-05), puis le booker et le manager (P5-07).
Conception : [06 §3.6](../conception/06-metiers.md#36-organisateurrice--promoter--phase-5)
et [08 §8](../conception/08-carrieres-par-role.md#8-organisateurrice--promoter--phase-5) ;
barème en [02 §2.2](../conception/02-progression.md#22-barème-première-version-à-calibrer).
Le lieu a sa propre doc ([docs/jam](../jam/README.md#revendication-dun-lieu-niveau-1-p5-03a-d31)).

## Barème et rangs (P5-01)

- **Noyau pur** : événement `gig.held` (`core/events.ts`), règle
  `core/rules/gigHeld.ts` (événement tenu 200, artiste à sa toute première
  date 100, date bookée 150), rangs `PROMOTER_TIERS` et `AGENT_TIERS`
  (`core/tiers.ts`). Personas : `core/personas-scene.test.ts`.
- Aucun code n'émet encore `gig.held` : il viendra avec les concerts
  vérifiés (P5-06).

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

## À venir

- **P5-06** : concerts vérifiés, émission de `gig.held`.
- Festivals : leurs jams « off » se publient comme des jams (P2-14b) ;
  stages et masterclasses : avec les écoles (P5-11).
