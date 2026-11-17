# Bilan des issues et des commits — 17 novembre 2026

**24 issues fermées sur 56 (42,9 %), 32 ouvertes.** Les quatre tickets
#51–#54 ont été fermés depuis le bilan du 16 novembre. Onze tickets ont été
ajoutés au périmètre : #59–#66 et #70–#72. Le taux global baisse donc malgré
les livraisons. Sur les 45 tickets du bilan précédent : 24 fermés (53,3 %),
21 ouverts, contre 20 fermés et 25 ouverts précédemment.

Ces taux comptent des tickets de tailles différentes, avec recouvrement entre
épopées et sous-issues ; ils ne mesurent pas la proportion du produit terminée.

## État Git vérifié

- Arbre propre au démarrage.
- HEAD et `refs/heads/main` sur le distant :
  `ad36147c2a9b5104ff580af46fec4d043a663ad1`.
- Tous les commits cités ci-dessous appartiennent à l'historique de ce HEAD :
  ils sont publiés sur main, y compris DASH-07a. Les mentions « local » du
  plan et du prompt décrivent un état antérieur.
- Aucun déploiement applicatif de production vérifié.

## Livraisons récentes et correspondance avec les issues

| Issue / lot                                                              | Commit    | Résultat et limite                                                                                                                                                                               |
| ------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#26](https://github.com/Pierre-FABIEN/linkmusician/issues/26), ONB-12c1 | `f237dd8` | Formation et répertoire déclarés du groupe, modification par la gestion et exposition publique. Sous-lot livré ; #26 reste partielle.                                                            |
| [#51](https://github.com/Pierre-FABIEN/linkmusician/issues/51), DASH-06a | `c399f17` | Prendre soi-même l'enregistrement, HOME privé, statuts, révision et historique. Issue fermée.                                                                                                    |
| [#52](https://github.com/Pierre-FABIEN/linkmusician/issues/52), DASH-06b | `82ffc4a` | Ajouter un rôle du son à son propre crédit existant, sans doublon ni part ou XP de composition. Issue fermée ; ne pas en déduire une édition générale des rôles de tiers.                        |
| [#53](https://github.com/Pierre-FABIEN/linkmusician/issues/53), DASH-06c | `f9ced04` | Réalisation autonome affichée comme déclarée, parcours et suggestions cohérents, mixage proposé ensuite. Aucune collaboration ni récompense artificielle. Issue fermée.                          |
| [#54](https://github.com/Pierre-FABIEN/linkmusician/issues/54), DASH-06d | `214aeef` | Parcours Carrière → enregistrement autonome → crédit → suite vers le mixage ; démo et E2E. Issue fermée.                                                                                         |
| [#27](https://github.com/Pierre-FABIEN/linkmusician/issues/27), ONB-13b  | `676cf00` | Annonces qualifiées : rémunération, engagement, présence, formation, répertoire ; conditions revérifiées sous verrou à la candidature. Sous-lots 13a et 13b livrés, mais issue toujours ouverte. |
| [#37](https://github.com/Pierre-FABIEN/linkmusician/issues/37), DASH-07a | `ad36147` | Droit de candidater distinct du mandat, demandé, accordé, limité dans le temps et révocable ; actes, notification, RGPD. L'envoi d'une candidature déléguée reste à réaliser dans DASH-07b.      |
| Aide, sans rattachement explicite à une issue dans le message            | `4c773a0` | Recherche dans le texte intégral, filtres par thème, une réponse par section avec URL propre.                                                                                                    |

La décision D71 précède DASH-07a (`d2f15ca`). La publication de DASH-06b à d
est également consignée dans `5b91004`.

## Socle déjà livré

- Inscription : #15–#25 et audit de qualification #29 fermés. Référentiels,
  parcours adaptatif, formulaires métier et séparation offres/besoins sont
  livrés dans leur périmètre. Label, édition et communication restent « bientôt ».
- Espaces métier : #31–#34 fermés. Navigation multirôle, structures/agences,
  actions prioritaires, mandats et affectations consenties sont livrés.
- Journal : DASH-05a à m publiés (`7f45282` à `5c7f706`, avec les commits
  intermédiaires). Les historiques privés couvrent notamment mandats,
  participations, collaborations et crédits ; #35 reste ouverte.
- Architecture : #55–#58 fermés ; audit `b30edaa`, ordre des verrous
  `8cdf0b5`, gestion Work et maquettes atomiques `cba0234`, propositions
  concurrentes `9a73d45`. R4 et l'extraction facultative restent distincts.

## Ce qui reste ouvert

| Ensemble      | État réel / reste                                                                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #14, #26, #28 | Finir ONB-12c2 : portfolio, matériel, tarifs, visibilité et postproduction ; compléter la recette multirôle ONB-14.                                                                                   |
| #27           | Le corps présente encore ONB-13b comme à faire. Actualiser les preuves et vérifier les critères globaux avant une éventuelle clôture.                                                                 |
| #30, #35, #36 | Épopée, journal et projets partiels : SELF livré ; affectations à un membre avec accord, prestataires externes, autres étapes autonomes, versions, livrables et approbations restent dans leurs lots. |
| #37           | DASH-07a livré ; candidature déléguée, retrait, conversation et absence d'XP à terminer dans 07b, puis autres extensions du ticket.                                                                   |
| #38–#46       | Extensions calendriers, devis, portfolios et espaces métier. Des socles existent ; aucune livraison complète de ces tickets n'est établie par les commits récents.                                    |
| #47–#49       | Label, édition et communication : P2, ouverture produit distincte.                                                                                                                                    |
| #50           | Recette transverse toujours ouverte ; les recettes ciblées ne constituent pas une recette globale.                                                                                                    |
| #59           | Super Jam / Jam Battle : idéation, sans livraison établie dans ce bilan.                                                                                                                              |
| #60–#66       | Épopée et six lots UX Jam : accueil, découverte, fiche, après-jam, gestion et accessibilité. Ouverts ; à distinguer des fonctionnalités Jam déjà existantes.                                          |
| #70           | Catalogue de tuiles Metro adaptatives : ouvert ; les primitives existantes ne prouvent pas la livraison du nouveau périmètre.                                                                         |
| #71–#72       | Cadrage Carrière centrée projet et graphe de parcours non linéaires. Tickets de conception ; aucune refonte livrée déduite de leur création.                                                          |

## Écarts du suivi

- #14 et #27 présentent encore ONB-13b comme restant à faire.
- #26 ne distingue pas encore clairement ONB-12c1 livré et ONB-12c2 restant.
- #36 présente encore #51–#54 comme ouverts et non livrés.
- #52 est fermée mais son corps contient encore « entièrement à réaliser ».
- #37 ne détaille pas encore DASH-07a livré et DASH-07b restant.
- Le résumé du plan indique encore 20/45 ; certaines lignes et le prompt
  présentent ONB-12c1, ONB-13b ou DASH-07a comme locaux alors qu'ils sont publiés.

Ces écarts sont signalés ici. Aucun corps d'issue, état GitHub ou document
historique n'a été modifié par ce bilan.

## Vérifications et suite

Inventaire des issues obtenu avec le connecteur GitHub, puis recherches
séparées ouvertes/fermées (hors PR) : 32 + 24 = 56. Historique Git, messages et
fichiers modifiés relus ; publication contrôlée par `git ls-remote`.
Présence des services et tests SELF, des règles de qualification, des
revérifications transactionnelles et des droits de candidature inspectée.

Les résultats de tests restent des preuves antérieures, pas des exécutions de
ce bilan. Le commit DASH-07a consigne notamment 1 432 unitaires réussis,
8 tests unitaires et 6 intégrations du lot, ainsi qu'un E2E dédié. La recette
DASH-06a consigne deux échecs de timeout de verrou `55P03`, reproduits sur le
code d'origine ; ne pas présenter la suite d'intégration complète comme verte.
Les réserves antérieures du lint global restent consignées dans le bilan du 16.

Suite fonctionnelle préparée : DASH-07b, puis ONB-12c2 et recettes #28/#50.
Les cadrages #70–#72 constituent une autre piste à arbitrer avant refonte.
Pour le lancement, P0-01 (suite E2E globale), P3-10a (audit sécurité) et
P3-10 (ouverture publique) restent à satisfaire dans la route du projet.

Ce lot ajoute uniquement ce rapport ; aucun test produit, migration, seed,
push ou déploiement n'est exécuté.
