# Conception — LinkMusician (RPG de l'industrie musicale)

Dossier de conception produit et d'architecture, rédigé **avant tout
développement**. Il répond à la « première mission » du brief fondateur :
dix livrables, plus une revue critique du concept.

| #   | Livrable                                                            | Document                                                                          |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | Analyse fonctionnelle + incohérences et risques                     | [01-analyse-produit.md](./01-analyse-produit.md)                                  |
| 2   | Modèle économique                                                   | [01-analyse-produit.md §5](./01-analyse-produit.md#5-modèle-économique)           |
| 3   | Architecture fonctionnelle                                          | [03-architecture.md §1](./03-architecture.md#1-architecture-fonctionnelle)        |
| 4   | Architecture technique (sur le boilerplate)                         | [03-architecture.md §2](./03-architecture.md#2-architecture-technique)            |
| 5   | Modèle de données relationnel                                       | [04-modele-donnees.md](./04-modele-donnees.md)                                    |
| 6   | Système XP et de progression                                        | [02-progression.md](./02-progression.md)                                          |
| 7   | Niveaux par catégorie d'acteur                                      | [02-progression.md §5](./02-progression.md#5-paliers-par-métier)                  |
| 8   | Parcours utilisateur (onboarding)                                   | [05-mvp-roadmap.md §1](./05-mvp-roadmap.md#1-onboarding)                          |
| 9   | Stratégie MVP                                                       | [05-mvp-roadmap.md §2](./05-mvp-roadmap.md#2-stratégie-mvp)                       |
| 10  | Roadmap par phases (décisions, dépendances, critères, tests)        | [05-mvp-roadmap.md §3](./05-mvp-roadmap.md#3-roadmap)                             |
| 11  | Métiers au-delà du musicien (fiches par métier)                     | [06-metiers.md](./06-metiers.md)                                                  |
| 12  | La chaîne d'un morceau entre les métiers                            | [06-metiers.md §4](./06-metiers.md#4-la-chaîne-dun-morceau--du-jam-au-producteur) |
| 13  | Les modes de jeu : carrière (actes, épreuves) et jam (match rapide) | [07-modes-de-jeu.md](./07-modes-de-jeu.md)                                        |

## Les six positions structurantes

Je retiens ou corrige six points du brief. Le reste du dossier en découle.

1. **Quatre systèmes distincts au lieu d'un seul score.** L'**XP**
   (progression, motivation), les **compétences** (déclarées, montrées en
   démo et confirmées par des pairs), la **réputation** (ce que les autres
   confirment de vous) et la **confiance** (un indicateur interne
   anti-abus qui fixe les quotas). Le brief en prévoyait trois. Il en
   manque un, la confiance : sans elle, l'XP finit par servir de droit
   d'accès et devient l'objet même du farming.
2. **La progression ne bloque jamais l'usage de base.** Créer un groupe,
   contacter quelqu'un ou publier une démo, tout cela marche dès le
   premier jour. Un vrai groupe qui s'inscrit doit pouvoir créer sa page
   immédiatement. Si l'on bloque, on perd l'acquisition. La progression
   débloque de la **reconnaissance** et des **quotas**, pas des fonctions
   vitales.
3. **Une action unilatérale ne rapporte pas d'XP.** Contacter quelqu'un,
   liker ou suivre un profil ne rapporte rien. L'XP vient des issues
   **confirmées par une autre partie** : collaboration terminée et
   confirmée des deux côtés, concert confirmé par l'organisateur, membre
   accepté dans un groupe.
4. **La valeur dépend de la preuve.** Une même étape rapporte plus selon
   qu'elle est _déclarée_, _corroborée_ (par un pair indépendant) ou
   _vérifiée_ (par une source externe ou une organisation). C'est la
   réponse réaliste au « vérifiable autant que possible ».
5. **On lance avec deux types d'acteurs, pas sept.** Le MVP se limite
   aux musiciens et aux groupes, dans une zone géographique. Les
   producteurs et studios viennent ensuite, puis les organisateurs, puis
   les labels. Une plateforme de mise en relation locale vide ne sert à
   rien.
6. **Pas de classement au lancement.** Un classement par XP récompense
   ceux qui accumulent les points, pas les bons musiciens, et met en
   concurrence des gens qu'on veut voir collaborer. On le reconsidère en
   phase 6, opt-in, sous forme de défis collectifs.

## Décisions ouvertes

Les décisions à trancher (visibilité de la progression, zone de
lancement, âge minimum, ORM, temps réel…) sont suivies dans le
[registre des décisions](../decisions/README.md). Le reste de ce dossier
suppose les recommandations par défaut.

## Glossaire

| Terme                     | Définition                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Acteur**                | Toute entité qui a un profil : une _personne_ ou une _organisation_. Supertype technique `Actor`                               |
| **Organisation**          | Groupe, studio, label, organisateur, management, éditeur. On y appartient par _adhésion_                                       |
| **Piste (de métier)**     | Une casquette d'une personne : musicien, producteur, manager… Chaque piste a sa progression                                    |
| **XP / niveau de compte** | Points de progression et niveau global, cosmétiques et motivants. Ils ne donnent aucun droit                                   |
| **Palier**                | Étape nommée d'une piste (« Collaborateur », « Musicien de scène »), définie par des **conditions**, pas seulement par de l'XP |
| **Étape**                 | Réalisation datée d'un groupe ou d'un acteur (premier concert…), avec un statut de preuve                                      |
| **Statut de preuve**      | `DECLARED` → `CORROBORATED` (tiers indépendant) → `VERIFIED` (organisation vérifiée ou API)                                    |
| **Attestation**           | Confirmation d'une étape par un tiers                                                                                          |
| **Endossement**           | Recommandation ciblée (compétence ou qualité) donnée par un collaborateur confirmé                                             |
| **Réputation**            | Carte des signaux confirmés par d'autres. Jamais affichée sous forme de nombre                                                 |
| **Confiance (TL0-3)**     | Palier interne anti-abus qui fixe les quotas et les droits (corroborer, endosser)                                              |
| **Annonce / opportunité** | Besoin publié par un acteur (« cherche batteur »). C'est une _quête émise_                                                     |
| **Quête système**         | Prochain objectif suggéré par la plateforme (« ajoute ta première démo »)                                                      |
| **Collaboration**         | Travail commun avec un cycle de vie, terminé quand **toutes** les parties l'ont confirmé                                       |
| **Registre XP**           | Table `XpTransaction`, en ajout seul, source de vérité de toute la progression                                                 |

## Et ensuite ?

L'ordre de réalisation, les fiches de lots et l'état d'avancement sont
dans le [plan d'exécution](../plan/README.md).
