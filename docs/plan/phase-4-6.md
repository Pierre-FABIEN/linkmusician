# Phases 4 à 6 — Les autres métiers et la carrière complète

> **Niveau intentions.** Chaque lot a un objectif et ses dépendances ;
> les fiches complètes sont rédigées à la revue de fin de la phase
> précédente ([README §6](./README.md#6-rituels)). Conception :
> [06](../conception/06-metiers.md) (métiers, chaîne d'un morceau),
> [07](../conception/07-modes-de-jeu.md) (modes de jeu),
> [08](../conception/08-carrieres-par-role.md) (carrières par rôle).

Chaque ouverture de métier suit la liste de 08 §16 : profil et
référentiel, organisations, événements et règles d'XP **calibrées par
personas**, rangs, quêtes et déblocages, place sur la carte commune,
retrait de « bientôt », RGPD.

## Phase 4 — Studio, ingé son, producteur : actes III et IV

**But** : un morceau composé trouve un ingé son, s'enregistre, se
propose aux producteurs et se fait produire ; chacun gagne sur sa piste.

| Lot                                   | Objectif                                                                                | Dépend de                        |
| ------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------- |
| P4-01 Personas et barème pros         | Personas ingé son, studio, producteur ; barème et rangs calibrés (comme P1-01)          | Revue de phase 3                 |
| P4-02 Ingé son                        | Profil (spécialités, matériel, références), règles d'XP, rangs, quêtes, ouverture       | P4-01                            |
| P4-03 Studio                          | Organisation `STUDIO` : fiche, salles, tarifs, créneaux ; rangs                         | P4-02                            |
| P4-04 Producteur·rice                 | Profil, règles d'XP, rangs, quêtes, ouverture                                           | P4-01                            |
| P4-05 Annonces par métier             | Annonce ciblée sur un métier (« cherche ingé son »), recherche par métier et spécialité | P2-02, P4-02                     |
| P4-06 Collaborations liées au morceau | `Collaboration.workId` (`RECORDING`, `PRODUCTION`…), états du morceau                   | P3-11, P2-06                     |
| P4-07 Crédits                         | Crédits confirmés des deux côtés, sur le morceau, le profil et la réputation            | P4-06                            |
| P4-08 Vitrine des propositions        | `WorkPitch` : proposer un morceau aux producteurs, filtres, retrait                     | P4-07 ; décision sur la gratuité |
| P4-09 Étapes vérifiées par les pros   | Enregistrement et répétition vérifiés par l'ingé son ou le studio (02 §2.2)             | P3-05, P4-06                     |
| P4-10 Carte : actes III et IV         | Actes jouables, épreuves, célébrations, récap de campagne                               | P3-13, P4-09                     |
| P4-11 Radar des pros                  | Flux « projets qui montent » (réputation, rangs, vitesse), alertes                      | P2-08                            |
| P4-12 Messagerie temps réel           | Ably ou Pusher à la place du polling (D8)                                               | P2-04                            |

## Phase 5 — Scène : lieux, organisateurs, bookers, managers (acte V)

**But** : les groupes trouvent des dates, les lieux des groupes ; les
concerts sont vérifiés ; les jams publiques des lieux nourrissent le
mode jam.

| Lot                            | Objectif                                                                        | Dépend de     |
| ------------------------------ | ------------------------------------------------------------------------------- | ------------- |
| P5-01 Personas et barème scène | Personas lieu, organisateur, booker, manager ; barème et rangs                  | Revue phase 4 |
| P5-02 Organisations vérifiées  | Vérification SIRET, contrôle manuel, droits associés                            | P3-09         |
| P5-03 Lieux                    | Organisation `VENUE` (D22) : fiche, jauge, matériel, conditions, agenda ; rangs | P5-01, P5-02  |
| P5-04 Jams publiques des lieux | Scènes ouvertes publiées par les lieux, visibles dans le mode jam               | P5-03, P2-14  |
| P5-05 Organisateur·rice        | Profil, événements, plateaux, appels à projets avec conditions d'éligibilité    | P5-02         |
| P5-06 Concerts vérifiés        | Concerts et tournées vérifiés par le lieu ou l'organisateur vérifié             | P5-03, P5-05  |
| P5-07 Booker et manager        | Profils, accompagnement confirmé par l'artiste, part sur les rangs des artistes | P5-01         |
| P5-08 Carte : acte V           | Acte jouable, épreuves « premier concert vérifié », « tournée »                 | P5-06         |
| P5-09 Offre pro (Scout)        | Abonnement : recherche avancée, alertes ; jamais de visibilité ni d'XP achetée  | P4-11         |
| P5-10 Réservation de studio    | Agenda et réservation avec Stripe Connect (commission)                          | P4-03         |

## Phase 6 — Sortie et développement : actes VI à VIII

**But** : sorties vérifiées, labels, éditeurs, communication ; défis
collectifs ; carrière complète.

| Lot                                | Objectif                                                                        | Dépend de     |
| ---------------------------------- | ------------------------------------------------------------------------------- | ------------- |
| P6-01 Personas et barème sortie    | Label, éditeur, communication musicale                                          | Revue phase 5 |
| P6-02 Label                        | Organisation `LABEL` vérifiée, signature (seul validateur), catalogue           | P6-01, P5-02  |
| P6-03 Éditeur·rice                 | Contrats d'édition, placements (preuves à définir)                              | P6-01         |
| P6-04 Communication musicale       | Campagnes, couvertures qui corroborent une sortie ou un concert                 | P6-01         |
| P6-05 Carte : actes VI à VIII      | Sortie, développement, carrière ; quêtes de méthode (préparer une sortie…)      | P3-07, P6-02  |
| P6-06 Défis collectifs par ville   | Défis coopératifs opt-in (D3), par exemple la fête de la musique                | P5-04         |
| P6-07 Autres rôles                 | Ouvertures selon la demande mesurée (06 §3.11) : clients privés, vidéastes, DJ… | Indicateurs   |
| P6-08 Coups de pouce et parrainage | Suggestions quand on n'avance plus, parrainage, succès _Passeur_                | P2-16, P3-12  |
