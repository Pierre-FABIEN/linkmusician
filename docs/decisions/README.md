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

| ID  | Sujet                            | Recommandation                                                                                     | Statut        | Lot   | Détail                                                                                                             |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------- | ------------- | ----- | ------------------------------------------------------------------------------------------------------------------ |
| D1  | Visibilité de la progression     | Étapes, succès et réputation publics. XP et niveau discrets. Registre privé                        | Proposée      | P0-02 | [conception/02 §1](../conception/02-progression.md#1-quatre-systèmes-indépendants)                                 |
| D2  | Niveau universel ou par métier   | Un niveau de compte (cosmétique) et des paliers par piste de métier                                | Proposée      | P0-02 | [conception/02 §3-5](../conception/02-progression.md#3-niveau-de-compte)                                           |
| D3  | Compétition                      | Aucune au MVP. Défis collectifs opt-in en phase 6                                                  | Proposée      | P0-02 | [conception/01 §4.3](../conception/01-analyse-produit.md#43-fonctionnalités-à-ne-pas-construire-ou-pas-maintenant) |
| D4  | Zone de lancement                | Une métropole ou une région, à nommer                                                              | **À choisir** | P0-02 | [plan §7](../plan/README.md#7-piste-parallèle-non-technique--amorcer-la-communauté)                                |
| D5  | Âge minimum                      | 16 ans. Pour les 16-17 ans : messagerie restreinte, localisation limitée à la ville                | Proposée      | P0-02 | [conception/03 §2.5](../conception/03-architecture.md#25-sécurité-et-conformité)                                   |
| D6  | Modules du boilerplate retirés   | Commerce, produits, promo et satellites retirés. On garde auth, admin, contact, blog               | Proposée      | P0-02 | [plan/phase-0](../plan/phase-0.md)                                                                                 |
| D7  | ORM                              | On garde Prisma. PostGIS via `Unsupported` et `$queryRaw` isolés                                   | Proposée      | P0-02 | [conception/03 §2.2](../conception/03-architecture.md#22-décisions-techniques-et-compromis)                        |
| D8  | Temps réel                       | Polling au MVP. Ably ou Pusher en phase 4                                                          | Proposée      | P0-02 | idem                                                                                                               |
| D9  | Nom de produit et domaine        | « LinkMusician » provisoire, à confirmer avant P0-08                                               | **À choisir** | P0-02 | —                                                                                                                  |
| D10 | Historique de migrations         | Si aucune base de production : nouvelle migration initiale unique. Sinon, migration de suppression | Proposée      | P0-07 | [plan/phase-0 P0-07](../plan/phase-0.md#p0-07--nouvelle-base-de-migrations-postgis-rôle-moderator)                 |
| D11 | Échelle de niveau d'instrument   | 5 niveaux à descripteurs observables (voir proposition ci-dessous)                                 | Proposée      | P1-02 | ci-dessous                                                                                                         |
| D12 | Source du référentiel des genres | Liste maison sur 2 niveaux, inspirée de MusicBrainz, en français                                   | Proposée      | P1-04 | —                                                                                                                  |
| D13 | Mesure des indicateurs           | Événements maison (table existante `DomainEvent` et vues admin). Pas d'outil tiers au MVP          | Proposée      | P1-13 | —                                                                                                                  |

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
