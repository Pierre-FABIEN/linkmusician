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

## À venir

- **P5-05b** : organisation `PROMOTER` (association, collectif, festival)
  gérée à plusieurs comme un studio, vérifiable (SIRET, P5-02), qui publie
  des plateaux en son nom ; nécessaire à P5-06 pour vérifier les concerts.
- **P5-06** : concerts vérifiés, émission de `gig.held`.
- Festivals : leurs jams « off » se publient comme des jams (P2-14b) ;
  stages et masterclasses : avec les écoles (P5-11).
