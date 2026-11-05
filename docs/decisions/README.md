# Registre des décisions

Chaque décision structurante est consignée ici **avant** d'être
implémentée. Cela évite de rediscuter un sujet déjà tranché, et permet
de retrouver pourquoi on a fait un choix.

- Statuts : **Proposée** (recommandation en attente de validation) ·
  **Acceptée** · **Rejetée** (avec l'alternative retenue) · **Remplacée
  par Dxx**.
- Une décision simple reste une ligne du tableau. Une décision qui
  mérite une argumentation a son fichier `Dxx-titre.md` (modèle §2),
  référencé dans la colonne « Détail ».
- Une décision acceptée ne se modifie pas : on en écrit une nouvelle qui
  la remplace.

## 1. Registre

| ID  | Sujet                             | Recommandation                                                                                                                                                                                                                                                                                                                                                                       | Statut                    | Lot    | Détail                                                                                                             |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| D1  | Visibilité de la progression      | Étapes, succès et réputation publics. XP et niveau discrets. Registre privé                                                                                                                                                                                                                                                                                                          | Proposée                  | P0-02  | [conception/02 §1](../conception/02-progression.md#1-quatre-systèmes-indépendants)                                 |
| D2  | Niveau universel ou par métier    | Un niveau de compte (cosmétique) et des paliers par piste de métier                                                                                                                                                                                                                                                                                                                  | Proposée                  | P0-02  | [conception/02 §3-5](../conception/02-progression.md#3-niveau-de-compte)                                           |
| D3  | Compétition                       | Aucune au MVP. Défis collectifs opt-in en phase 6                                                                                                                                                                                                                                                                                                                                    | Proposée                  | P0-02  | [conception/01 §4.3](../conception/01-analyse-produit.md#43-fonctionnalités-à-ne-pas-construire-ou-pas-maintenant) |
| D4  | Zone de lancement                 | Une métropole ou une région, à nommer                                                                                                                                                                                                                                                                                                                                                | **À choisir**             | P0-02  | [plan §7](../plan/README.md#7-piste-parallèle-non-technique--amorcer-la-communauté)                                |
| D5  | Âge minimum                       | 16 ans. Pour les 16-17 ans : messagerie restreinte, localisation limitée à la ville                                                                                                                                                                                                                                                                                                  | **Acceptée** (03/11/2026) | P0-02  | [conception/03 §2.5](../conception/03-architecture.md#25-sécurité-et-conformité)                                   |
| D6  | Modules du boilerplate            | **On garde tout** : boutique mise en veille par l'interrupteur `SHOP_ENABLED`, code, tests et migrations conservés (« ils seront peut-être utiles ensuite »). Modifications du boilerplate minimales et marquées `LINKMUSICIAN:` pour rester synchronisable                                                                                                                          | **Acceptée** (03/11/2026) | P0-03  | [plan/phase-0](../plan/phase-0.md)                                                                                 |
| D7  | ORM                               | On garde Prisma. PostGIS via `Unsupported` et `$queryRaw` isolés                                                                                                                                                                                                                                                                                                                     | Proposée                  | P0-02  | [conception/03 §2.2](../conception/03-architecture.md#22-décisions-techniques-et-compromis)                        |
| D8  | Temps réel                        | Polling au MVP. Ably ou Pusher en phase 4                                                                                                                                                                                                                                                                                                                                            | Proposée                  | P0-02  | idem                                                                                                               |
| D9  | Nom de produit et domaine         | « LinkMusician » provisoire, à confirmer avant P0-05                                                                                                                                                                                                                                                                                                                                 | **À choisir**             | P0-02  | —                                                                                                                  |
| D10 | Historique de migrations          | On garde les 48 migrations du boilerplate (pas de base de production, mais c'est la condition pour pouvoir fusionner l'amont). Nos migrations s'ajoutent à la suite                                                                                                                                                                                                                  | **Acceptée** (03/11/2026) | P0-04  | [plan/phase-0 P0-04](../plan/phase-0.md#p0-04--base-dédiée-postgis-rôle-moderator)                                 |
| D11 | Échelle de niveau d'instrument    | 5 niveaux à descripteurs observables (voir proposition ci-dessous)                                                                                                                                                                                                                                                                                                                   | **Acceptée** (04/11/2026) | P1-02  | ci-dessous                                                                                                         |
| D12 | Source du référentiel des genres  | Liste maison sur 2 niveaux, inspirée de MusicBrainz, en français                                                                                                                                                                                                                                                                                                                     | **Acceptée** (04/11/2026) | P1-04  | —                                                                                                                  |
| D13 | Mesure des indicateurs            | Événements maison (table existante `DomainEvent` et vues admin). Pas d'outil tiers au MVP                                                                                                                                                                                                                                                                                            | Proposée                  | P1-13  | —                                                                                                                  |
| D14 | Modèle des comptes                | Un compte = une **personne** (`Actor` + `Person`). Elle a un ou plusieurs **métiers** (`PersonTrack`). Groupes, studios, labels et organisateurs sont des **structures** (`Organization`) qu'une personne crée ou rejoint. Le rôle technique (`ADMIN`, `MODERATOR`, membre) reste distinct                                                                                           | **Acceptée** (03/11/2026) | P1-03  | [conception/04 §1](../conception/04-modele-donnees.md#1-choix-structurant--lactor-comme-supertype)                 |
| D15 | Métiers ouverts au lancement      | Tous les métiers sont proposés à l'inscription. Musicien est complet, les autres ont un profil de base marqué « bientôt » (on mesure la demande réelle)                                                                                                                                                                                                                              | **Acceptée** (03/11/2026) | P1-03b | —                                                                                                                  |
| D16 | Données demandées à l'inscription | Minimal : email, mot de passe, pseudo, date de naissance (16 ans minimum), acceptation des CGU. Métiers, instruments et ville viennent juste après la vérification de l'email. Google : écran de complétion (date de naissance)                                                                                                                                                      | **Acceptée** (03/11/2026) | P1-03a | —                                                                                                                  |
| D17 | Statut professionnel              | Trois statuts déclarés, un par personne : amateur·rice, semi-pro (rémunéré·e de temps en temps), professionnel·le (vit de la musique, intermittent·e…). Affiché sur le profil, toujours « déclaré ». Distinct du niveau d'instrument (D11) : il décrit la situation, pas la maîtrise                                                                                                 | **Acceptée** (04/11/2026) | P1-06b | —                                                                                                                  |
| D18 | Contenu d'un profil complet       | En plus de la conception (photo, bio, instruments et niveau, genres, influences, ville, disponibilités, médias) : statut pro (D17), liens externes (Spotify, YouTube, Bandcamp, SoundCloud, Instagram, site), « ce que je recherche », matériel et années de pratique, rayon de déplacement par tranches. Le seuil « profil complété » (XP) reste ≥1 instrument, ≥1 genre, zone, bio | **Acceptée** (04/11/2026) | P1-06b | —                                                                                                                  |
| D20 | Le morceau, fil conducteur entre les métiers | Les métiers se relaient autour d'un même morceau : les musicien·nes le créent (jam, groupe), l'ingé son l'enregistre, les producteurs le découvrent dans la vitrine des propositions, puis scène, sortie, label. Chaque maillon est une collaboration confirmée de tous les côtés et rapporte des points à chacun, sur la piste du métier exercé. Principe acquis ; modèle (`Work`, crédits, propositions) et barème à valider avant la phase 3                                                                                                           | **Acceptée** sur le principe (05/11/2026) | P3, P4  | [conception/06 §4](../conception/06-metiers.md#4-la-chaîne-dun-morceau--du-jam-au-producteur)                      |
| D21 | Les modes de jeu                             | L'app se vit comme un jeu, avec deux modes au choix comme dans un jeu de foot. **Carrière** : 8 actes calqués sur l'industrie, ambition choisie, classes (métiers) et cartes qui se croisent, campagnes (morceaux), groupe comme un club, épreuves vérifiées par un tiers qui débloquent de vraies possibilités, crédits, fiche de carrière, coups de pouce, parrainage. **Jam** (match rapide) : jouer et rencontrer, sans projet ; les rencontres alimentent le réseau musical. Ton : encouragement, jamais de pression ; seules les actions réelles rapportent | **Acceptée** sur le principe (05/11/2026) | P2 à P6 | [conception/07](../conception/07-modes-de-jeu.md)                                                                  |

### Proposition pour D11 : échelle de niveau d'instrument

| Niveau | Libellé       | Descripteur (« je peux… »)                                              |
| ------ | ------------- | ----------------------------------------------------------------------- |
| 1      | Découverte    | …jouer quelques morceaux ou accords seul, je débute                     |
| 2      | Amateur       | …jouer des morceaux complets, j'ai déjà joué avec d'autres              |
| 3      | Confirmé      | …tenir un set de 45 min en groupe, suivre une grille, improviser un peu |
| 4      | Avancé        | …jouer régulièrement sur scène, enregistrer en studio sans difficulté   |
| 5      | Professionnel | …vivre en partie de mon instrument (sessions, scène, enseignement)      |

Affichage public : « Confirmé (déclaré) ». Le mot _déclaré_ reste
toujours visible.

## 2. Modèle de fiche détaillée

```markdown
# Dxx — Titre

- Statut : Proposée | Acceptée (AAAA-MM-JJ) | Rejetée | Remplacée par Dyy
- Lot concerné : Px-yy

## Contexte

Quel problème, quelles contraintes.

## Options envisagées

1. … (avantages / inconvénients)
2. …

## Décision

Ce qui est retenu, en une phrase.

## Conséquences

Ce que ça implique, ce que ça interdit, ce qu'il faudra surveiller.
```
