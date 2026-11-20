# Couverture documentaire de Melokiva Diagram

> **Fichier généré** par `npm run diagram:sync`. Les chiffres viennent de
> l’inventaire réel ; ils mesurent la documentation, pas la qualité du code.

**Total** : 327 processus, 310 implémentés, 14 documentés par un diagramme, 14 aux références toutes vérifiées. **7 diagrammes**.

| Domaine                  | Inventoriés | Implémentés | Testés | Conçus ou prévus | Documentés | Références vérifiées | Diagrammes |
| ------------------------ | ----------: | ----------: | -----: | ---------------: | ---------: | -------------------: | ---------: |
| Identités et inscription |          30 |          27 |     27 |                3 |     0 / 27 |                0 / 0 |          0 |
| Rencontre                |          11 |          11 |     11 |                0 |     1 / 11 |                1 / 1 |          0 |
| Jams                     |          19 |          19 |     19 |                0 |     0 / 19 |                0 / 0 |          0 |
| Groupes                  |          21 |          21 |     20 |                0 |     3 / 21 |                3 / 3 |          0 |
| Projets                  |          20 |          18 |     18 |                2 |     5 / 18 |                5 / 5 |          3 |
| Besoins                  |           9 |           7 |      7 |                2 |      3 / 7 |                3 / 3 |          3 |
| Annonces                 |           4 |           4 |      4 |                0 |      0 / 4 |                0 / 0 |          0 |
| Candidatures             |           8 |           8 |      8 |                0 |      0 / 8 |                0 / 0 |          0 |
| Messagerie               |          12 |          11 |     11 |                1 |     2 / 11 |                2 / 2 |          0 |
| Collaborations           |           6 |           6 |      6 |                0 |      0 / 6 |                0 / 0 |          0 |
| Morceaux                 |          17 |          17 |     17 |                0 |     0 / 17 |                0 / 0 |          0 |
| Scène                    |          30 |          26 |     25 |                4 |     0 / 26 |                0 / 0 |          0 |
| Métiers pros             |          36 |          33 |     33 |                3 |     0 / 33 |                0 / 0 |          0 |
| Carrière et progression  |          25 |          24 |     24 |                1 |     0 / 24 |                0 / 0 |          0 |
| Sécurité et RGPD         |          63 |          62 |     59 |                1 |     0 / 62 |                0 / 0 |          0 |
| Processus transversaux   |          16 |          16 |     13 |                0 |     0 / 16 |                0 / 0 |          1 |

## Diagrammes

| Diagramme                                                                           | Type                       | Domaine     | Étapes | Statut                  |
| ----------------------------------------------------------------------------------- | -------------------------- | ----------- | -----: | ----------------------- |
| Vue globale de Melokiva (`global-carte`)                                            | Cartographie globale       | transversal |     14 | Implémenté, non vérifié |
| Un groupe prépare un EP et invite un ingé son (`parcours-groupe-ep`)                | Parcours utilisateur       | projets     |     17 | Implémenté et testé     |
| Qui fait quoi : besoin proposé par la coordination (`couloirs-besoin-coordination`) | Responsabilités (couloirs) | besoins     |     14 | Implémenté et testé     |
| Dataflow : ajouter un besoin (`dataflow-besoin-ajouter`)                            | Dataflow technique         | besoins     |     11 | Implémenté et testé     |
| Modèle de données : projets, équipe et besoins (`donnees-projets`)                  | Modèle de données          | projets     |     10 | Implémenté et testé     |
| Cycle de vie d’un besoin (`etats-besoin`)                                           | Machine à états            | besoins     |      6 | Implémenté et testé     |
| Cycle de vie d’une participation à un projet (`etats-participation`)                | Machine à états            | projets     |      6 | Implémenté et testé     |

## Contrôles

- **Processus implémentés sans diagramme détaillé** : 296
- **Diagrammes sans source .drawio lisible** : 0
- **Références inexistantes (fichier, service, entité, décision)** : 0
- **Acteurs sans parcours ni couloir** : 18
- **Relations entre diagrammes manquantes ou asymétriques** : 0
- **Processus implémentés sans cas d’erreur documenté** : 281
- **Transitions sans permission documentée** : 0
- **Déclarés testés sans référence de test** : 0
- **Liés à une décision encore proposée** : 2
  - `scene.plateaux-par-format` — Plateaux par format (P8b, révision de D64) — D78
  - `scene.parcours-solo-plateaux` — Parcours solo : formats du plateau, candidature et recherche solo (U6b) — D78
- **Fonctionnalités obsolètes encore présentées comme actives** : 0
- **Nœuds .drawio et étapes du catalogue désaccordés** : 0
