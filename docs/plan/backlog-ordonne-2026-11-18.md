# Backlog exécutable Melokiva — 18 novembre 2026

> **Référence de pilotage des issues GitHub ouvertes.** Le préfixe `Gx-yy` définit l'ordre métier recommandé dans une phase, **pas une dépendance absolue** : vérifier les prérequis et livrer un incrément testé. Le numéro GitHub #n reste stable. Conserver les closes comme historique et ne pas les rouvrir sans problème prouvé.

## Légende
- **G0** Décisions métier ; **G1** UX ; **G2** Collab et métiers ; **G3** Agenda culturel ; **G4** Structures/données ; **G5** Recette et lancement ; **G6** Exploration après validation.
- **Épopées** : [#73](https://github.com/Pierre-FABIEN/linkmusician/issues/73) = pilotage global ; [#30](https://github.com/Pierre-FABIEN/linkmusician/issues/30) = noyau Collab ; [#60](https://github.com/Pierre-FABIEN/linkmusician/issues/60) = Jam ; [#14](https://github.com/Pierre-FABIEN/linkmusician/issues/14) = inscription.
- **Légende d'état** : ouvert ≠ absent ; un ticket peut être partiellement réalisé. Contrôler le code et les tests en début de session.

## G0 — Décider le domaine avant de modeler les projets
| Ordre | Issue | Livrable | Prérequis |
|---|---|---|---|
| G0-01 | [#84](https://github.com/Pierre-FABIEN/linkmusician/issues/84) | Cartographie relationnelle code ↔ métier ↔ droits ↔ tests : **livrée** dans [audit-structurel-collab.md](../conception/audit-structurel-collab.md) (18/11/2026) | Aucun |
| G0-02 | [#83](https://github.com/Pierre-FABIEN/linkmusician/issues/83) | Décision d'architecture Projet/Groupe/Œuvre/Contribution : **acceptée** (18/11/2026) dans [D72](../decisions/D72-architecture-projets-collab.md) et [conception 19](../conception/19-architecture-cible-collab.md) (révision 2), non implémentée | G0-01 |
| G0-03 | [#71](https://github.com/Pierre-FABIEN/linkmusician/issues/71) | Parcours « Mes projets », créer projet/groupe séparés : **conception UX publiée** dans [conception 20](../conception/20-parcours-ux-collab.md) (18/11/2026), arbitrages UX-1 à UX-8 et code (lots U0 à U7) restants | G0-02 pour les choix structurels |
| G0-04 | [#72](https://github.com/Pierre-FABIEN/linkmusician/issues/72) | Graphe de progression non linéaire : **conception publiée** dans [conception 21](../conception/21-progression-non-lineaire.md) (18/11/2026), arbitrages Q-NL-1 à Q-NL-8 **validés dans [D73](../decisions/D73-progression-non-lineaire.md)** ; code (lots N1 à N7) restant | G0-02 |

**Critère de sortie** : ADR documentée, modèle conceptualisé et scénarios solo, groupe EP+tournée, prestataire externe, transfert et multi-métiers validés. Ne pas créer un modèle `Project` par réflexe.

## G1 — Faire comprendre le produit avant d'étendre le domaine
| Ordre | Issue | Livrable |
|---|---|---|
| G1-01 | [#74](https://github.com/Pierre-FABIEN/linkmusician/issues/74) | Rencontre / Collab à l'accueil |
| G1-02 | [#75](https://github.com/Pierre-FABIEN/linkmusician/issues/75) | Métiers clarifiés, textes adaptés |
| G1-03 | [#70](https://github.com/Pierre-FABIEN/linkmusician/issues/70) | Tuiles Metro adaptatives |
| G1-04 | [#76](https://github.com/Pierre-FABIEN/linkmusician/issues/76) | Rencontre = Jams / Agenda / Communauté |
| G1-05 | [#61](https://github.com/Pierre-FABIEN/linkmusician/issues/61) | Accueil Jam orienté action |
| G1-06 | [#62](https://github.com/Pierre-FABIEN/linkmusician/issues/62) | Découverte chronologique des jams |
| G1-07 | [#63](https://github.com/Pierre-FABIEN/linkmusician/issues/63) | Fiche Jam et CTA contextuel |
| G1-08 | [#64](https://github.com/Pierre-FABIEN/linkmusician/issues/64) | Après-jam et carnet |
| G1-09 | [#65](https://github.com/Pierre-FABIEN/linkmusician/issues/65) | Invitations / Mes jams / gestion séparées |
| G1-10 | [#66](https://github.com/Pierre-FABIEN/linkmusician/issues/66) | Recette Jam mobile et a11y |

**Critère de sortie** : amateur et professionnel comprennent la différence, sans perte des anciennes routes ni des mécanismes spécifiques Jam. Certaines tâches G1 peuvent avancer en parallèle de G0 lorsqu'elles ne changent que le wording.

## G2 — Noyau Collab et espaces métier
| Ordre | Issue | Livrable | Dépendances principales |
|---|---|---|---|
| G2-01 | [#26](https://github.com/Pierre-FABIEN/linkmusician/issues/26) | Profils & portfolios restants | Inscription déjà livrée |
| G2-02 | [#27](https://github.com/Pierre-FABIEN/linkmusician/issues/27) | Matching / annonces qualifiées | G2-01 lorsque nécessaire |
| G2-03 | [#37](https://github.com/Pierre-FABIEN/linkmusician/issues/37) | Opportunités, candidatures | G2-02 |
| G2-04 | [#40](https://github.com/Pierre-FABIEN/linkmusician/issues/40) | Œuvres, masters, crédits | G0-02 |
| G2-05 | [#36](https://github.com/Pierre-FABIEN/linkmusician/issues/36) | Tâches/collaborations externes, versions | G0-02 et G2-04 |
| G2-06 | [#39](https://github.com/Pierre-FABIEN/linkmusician/issues/39) | Devis & prestations | G2-05 |
| G2-07 | [#41](https://github.com/Pierre-FABIEN/linkmusician/issues/41) | Espace Musicien | G1 et noyau |
| G2-08 | [#42](https://github.com/Pierre-FABIEN/linkmusician/issues/42) | Espace Ingé son | G2-05/06 |
| G2-09 | [#43](https://github.com/Pierre-FABIEN/linkmusician/issues/43) | Espace Producteur | G2-05/06 |
| G2-10 | [#44](https://github.com/Pierre-FABIEN/linkmusician/issues/44) | Espace Manager | G2-03/05 |
| G2-11 | [#45](https://github.com/Pierre-FABIEN/linkmusician/issues/45) | Espace Booker | G2-03/06 et G3 |
| G2-12 | [#35](https://github.com/Pierre-FABIEN/linkmusician/issues/35) | Journal des nouvelles mutations | Se découpe au fil des précédentes |

**Point critique :** `Work` solo/groupe, `Membership`, `Representation`, `Collaboration`, `WorkStep` SELF sont déjà présents ; #51–#54 sont closes. **Étendre, ne pas réécrire.**

## G3 — Agenda culturel indépendant des jams
| Ordre | Issue | Livrable |
|---|---|---|
| G3-01 | [#77](https://github.com/Pierre-FABIEN/linkmusician/issues/77) | Modèle événement culturel généraliste |
| G3-02 | [#38](https://github.com/Pierre-FABIEN/linkmusician/issues/38) | Calendriers, lieux, occurrences et conflits |
| G3-03 | [#46](https://github.com/Pierre-FABIEN/linkmusician/issues/46) | Programmation côté organisateur |

**Critère de sortie :** pas de confusion entre inscription Jam, présence effective et découverte de concert ; droits d'organisateur explicites.

## G4 — Référentiel local et administration
| Ordre | Issue | Livrable |
|---|---|---|
| G4-01 | [#78](https://github.com/Pierre-FABIEN/linkmusician/issues/78) | Import légal, qualité, traçabilité et rapprochement |
| G4-02 | [#79](https://github.com/Pierre-FABIEN/linkmusician/issues/79) | Revendication antifraude (extension de `VenueClaim`) |
| G4-03 | [#80](https://github.com/Pierre-FABIEN/linkmusician/issues/80) | Fiches administrées, équipes et publication |
| G4-04 | [#81](https://github.com/Pierre-FABIEN/linkmusician/issues/81) | Synchronisation des événements partenaires |

**Critère de sortie :** source/licence connues, aucune prise de contrôle par simple import, déduplication, annulations et contestation testées. G4-01 peut commencer après stabilisation des identifiants de lieux, sans attendre l'intégralité de G2.

## G5 — Recette et lancement local
| Ordre | Issue | Livrable |
|---|---|---|
| G5-01 | [#28](https://github.com/Pierre-FABIEN/linkmusician/issues/28) | E2E multirôles complétés |
| G5-02 | [#50](https://github.com/Pierre-FABIEN/linkmusician/issues/50) | Recette transverse & audit sécurité P3-10a |
| G5-03 | [#82](https://github.com/Pierre-FABIEN/linkmusician/issues/82) | Pilote Toulouse, retours utilisateurs, go/no-go |

**Attention** : la date de lancement historique reste un *objectif*, pas une validation de mise en production. Revoir la portée du MVP selon les retours réels et les risques.

## G6 — Suites différées et non bloquantes
| Ordre | Issue | Livrable |
|---|---|---|
| G6-01 | [#59](https://github.com/Pierre-FABIEN/linkmusician/issues/59) | Validation Super Jam / Jam Battle |
| G6-02 | [#47](https://github.com/Pierre-FABIEN/linkmusician/issues/47) | Métier Label |
| G6-03 | [#48](https://github.com/Pierre-FABIEN/linkmusician/issues/48) | Métier Éditeur |
| G6-04 | [#49](https://github.com/Pierre-FABIEN/linkmusician/issues/49) | Métier Communication |

Ne pas ouvrir ces métiers sur la seule existence de leur formulaire d'inscription.

## Mode opératoire pour Codex / agent (une session = un lot)
1. Ouvrir [l'epic globale #73](https://github.com/Pierre-FABIEN/linkmusician/issues/73), choisir la **première issue non bloquée** (commencer par G0-01/#84).
2. Lire `CLAUDE.md`, la fiche issue, puis **seulement les fichiers/documentations concernés** ; comparer aux commits et à l'état réel de `main`.
3. Écrire un court état « acquis / manquants / décision attendue », puis coder **un incrément testable** si le ticket est prêt ; sinon publier une décision de conception vérifiable.
4. Exécuter `npm run check`, lint, tests unitaires/intégration et Playwright ciblés ; respecter RGPD, permissions serveur, accessibilité et règles de progression.
5. Publier sur `main` selon les règles du dépôt ; renseigner preuves et statut dans l'issue et `docs/plan/README.md`. Ne fermer que les critères effectivement remplis.
6. Lancer ensuite la prochaine issue dont les dépendances sont satisfaites. **Ne jamais confondre nombre d'issues ouvertes et charge restante.**

## Références
- [Audit du code et hypothèses](./audit-structurel-roadmap-2026-11-18.md).
- [Archives des descriptions précédentes](./archive-issues-avant-refonte-2026-11-18.md).
- [Plan historique et définition de terminé](./README.md).
- [Décisions encore à trancher](./a-trancher.md).

**État de cette opération** : 44 issues ouvertes ont été réécrites et renumérotées dans leurs titres ; 24 issues closes sont conservées ; aucun développement applicatif ni test n'a été exécuté dans cette opération de backlog.
