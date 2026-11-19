# Bilan des issues et des commits — 19 novembre 2026

> **Suite du même jour** : les tests différés ont depuis été exécutés sur le PC gamer. Voir la [recette et les corrections](recette-2026-11-19.md). Les réserves ci-dessous décrivent l’état constaté avant cette passe.

## Périmètre et chiffres vérifiés

**26 issues fermées sur 73 (35,6 %), 47 ouvertes**, hors pull requests.
Inventaire lu directement sur GitHub. Depuis le bilan du 17 novembre
(24 fermées sur 56), deux issues supplémentaires sont fermées (#83, #84)
et 17 tickets ont été ajoutés. La baisse du pourcentage reflète donc une
extension du périmètre ; elle ne mesure pas un recul du produit.

Les tickets regroupent des épopées, décisions et développements de tailles
différentes. Ce compteur ne mesure ni la charge restante ni la préparation
à la production.

Arbre de travail propre au début du bilan. HEAD local et `main` distant
vérifiés sur `4e7b9d55a1825339c196715939e3584226552b25`.
**Tous les commits cités sont publiés sur main.** L'historique contient
103 commits depuis `ad36147`, référence du précédent bilan, merge compris.
Publication du code ne vaut pas déploiement : aucun déploiement ni état
de base de production n'a été vérifié ici.

## Acquis des issues fermées

| Issues                                                         | Acquis                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #15–#25, #29                                                   | Référentiel métiers, inscription multirôle, formulaires et qualification des offres/besoins. Ces formulaires ne signifient pas que Label, Éditeur et Communication sont ouverts fonctionnellement.                                                                                  |
| #31–#34                                                        | Navigation multirôle, structures et permissions, widgets métier, invitations et délégations.                                                                                                                                                                                        |
| #51–#54                                                        | Enregistrement autonome, crédits multirôles, progression déclarée et parcours E2E associé.                                                                                                                                                                                          |
| #55–#58                                                        | Audit des capacités, ordre des verrous, protection contre révocation concurrente et proposition unique par conversation/jour.                                                                                                                                                       |
| [#84](https://github.com/Pierre-FABIEN/linkmusician/issues/84) | Audit structurel documentaire livré (`9eac062`) : cartographie, huit scénarios et quatorze écarts. Revue statique, sans exécution de tests dans cet audit.                                                                                                                          |
| [#83](https://github.com/Pierre-FABIEN/linkmusician/issues/83) | Architecture D72 révision 2 acceptée : projet facultatif distinct du groupe et des réalisations, droits explicites, partage sans transfert. Révision `2c32be3`, acceptation notamment `4bec313` et `5001738`. La clôture porte sur la décision, pas sur toutes ses implémentations. |

## Avancées confirmées dans les issues encore ouvertes

« Livré » ci-dessous décrit le code et la documentation ; les vérifications
antérieures sont déclarées par les sessions de développement et n'ont pas
été réexécutées pour ce bilan.

| Issue / lots                                                                 | Commits principaux                                    | Réalisé et limite                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#26](https://github.com/Pierre-FABIEN/linkmusician/issues/26), ONB-12c      | `f237dd8`, `71a71be`, `0476188`                       | Formation/répertoire du groupe, fiches historiques sous les blocs D61, disponibilités et invitation à compléter. Les trois sous-lots c1–c3 sont dans l'historique ; vérifier les critères résiduels avant clôture.                                                                         |
| [#27](https://github.com/Pierre-FABIEN/linkmusician/issues/27), ONB-13       | `676cf00`                                             | Annonces qualifiées, conditions revérifiées sous verrou. Le corps du ticket présente encore la qualification comme travail restant ; rapprochement critères/tests nécessaire.                                                                                                              |
| [#37](https://github.com/Pierre-FABIEN/linkmusician/issues/37), DASH-07      | `ad36147`, `11cda49`                                  | Droit explicite de candidater pour autrui puis candidature déléguée au nom de l'artiste. Le deuxième sous-lot est désormais publié, contrairement à la limite du bilan du 17.                                                                                                              |
| [#28](https://github.com/Pierre-FABIEN/linkmusician/issues/28), ONB-14       | `5bc401a`                                             | Recette transverse d'inscription ajoutée. La matrice complète et les critères résiduels restent à vérifier pour fermer.                                                                                                                                                                    |
| [#50](https://github.com/Pierre-FABIEN/linkmusician/issues/50), DASH-20a–c   | `73f02cb`, `c2ecb10`, `86ca852`                       | Recettes confidentialité, manager/booker, révocation groupe/lieu, ingénieur du son et confirmations simultanées. Pas une validation de toute la recette de lancement.                                                                                                                      |
| [#72](https://github.com/Pierre-FABIEN/linkmusician/issues/72), N1–N4        | `a2bbc3e`, `be34fce`, `e7d384b`, `27f7bf5`            | Réalisations unifiées, carte à six branches indépendantes, moteur de prochaines actions, « Plus tard » / « Pas pour moi ». Avancement complet du projet, studio solo et antériorité restent à terminer selon les lots N5–N7.                                                               |
| [#71](https://github.com/Pierre-FABIEN/linkmusician/issues/71), U0/U1        | `2f63fbc`, `43b1b59`, `11a9ff8`                       | Accueil Collab en quatre pivots, travail prioritaire, « Mes contributions ».                                                                                                                                                                                                               |
| #71, P2/P3/U2                                                                | `4474ddb`, `06a4772`, `3f87687`, `4647b57`, `c58b966` | Modèle Project, services et droits, fiche, « Mes projets », classement « Hors projet », accueil centré sur le projet. Des écarts UX restent documentés.                                                                                                                                    |
| #71 / [#36](https://github.com/Pierre-FABIEN/linkmusician/issues/36), P4a/U3 | `1fc98a3`, `e568a95`, `6653e69`, `988c9bd`            | Invitations, participations, coordination consentie/révocable, équipe, invitations groupées, « À traiter », transformation d'un groupe de contacts en projet. Aucune permission implicite sur les morceaux.                                                                                |
| #71/#36, U3b                                                                 | `6f940e9`, `cbd7a21`, `b89e6a2`, `38ff3e6`            | Besoins du projet, proposition/validation, recherche, annonce liée conditionnelle, RGPD et tests rédigés. **Tests non exécutés**, performance 0/5/20 besoins non mesurée. L'annonce liée pour un projet de groupe reste un arbitrage Q100.                                                 |
| #36, P1/P1b                                                                  | `a2ed036`, `6a08471`, `6926699`                       | Libération des étapes à perte de gestion, historique préservé. D75 acceptée pour le concert déclaré par un simple membre ; P1b est une décision et une revue du comportement existant.                                                                                                     |
| #36, P1c                                                                     | `cb8ec9d`                                             | Tests du concert déclaré par simple membre et scénarios D75 **écrits, non exécutés**.                                                                                                                                                                                                      |
| #36/#72, P8/U6a                                                              | `6027d05`, `8759727`, `30b0ab1`                       | Interprète personne ou groupe sur un concert, étapes personnelles de scène, interface « Qui a joué », carte et aide adaptées. **Tests non exécutés** ; plateaux et candidature solo restent à faire.                                                                                       |
| #36/#72, P1d                                                                 | `c616beb`, `43a0844`, `3e1f74c`                       | D79 acceptée : seuls les concerts reconnus comptent dans l'antériorité et la tournée. Correctif publié, **tests non exécutés**.                                                                                                                                                            |
| [#85](https://github.com/Pierre-FABIEN/linkmusician/issues/85)               | `6d7e88b`                                             | Filtrage serveur des propositions d'accompagnement bloquées dans les deux sens, tests intégration/E2E ajoutés. Le confirmé reste visible pour permettre d'y mettre fin, sans message privé ; comportement explicitement documenté sous Q75. Vérifier les preuves de recette avant clôture. |

Le journal #35 dispose déjà de DASH-05a–m. Les actes des projets/équipes/besoins
s'ajoutent à ce socle ; le ticket reste une vérification des nouvelles
transitions, de la confidentialité et du RGPD, pas un journal à reconstruire.

## Ce qui reste substantiellement à réaliser

- **Collab** : suggestions d'intervenants U3c, partage des morceaux d'autrui
  P5/U4, tâches et livrables P13/U5, autres extensions de D72. La conservation
  minimale des crédits P6 attend l'avis RGPD ; ne pas l'annoncer livrée.
- **Scène solo** : P8b et U6b, formats de plateaux et candidature en son nom.
  D78 reste proposée. Le concert solo livré ne couvre pas ce parcours complet.
- **Progression** : compléter N5–N7, dont le Studio personnel ; les apports
  du projet et de la scène couvrent une partie des intentions, pas tous les lots.
- **G1, #61–#66, #70, #74–#76** : ergonomie Rencontre/Jam et clarification
  des entrées. Les avancées de Collab ne démontrent pas leur achèvement.
- **G2, #39–#45** : prestations/devis, distinction œuvres/enregistrements,
  finalisation des espaces métier ; socles existants à conserver.
- **G3, #77/#38/#46** : agenda culturel généraliste et programmation.
- **G4, #78–#81** : imports sourcés, revendication étendue, administration
  et synchronisation des agendas partenaires. Ne pas confondre avec les
  lieux et mécanismes de revendication déjà présents.
- **G5, #28/#50/#82** : recette complète, sécurité, pilote Toulouse et go/no-go.
- **G6, #59/#47–#49** : concepts Jam optionnels et métiers différés.
- **#86/#88/#89** : spectateur, vision économique mondiale et assistant
  conversationnel global sont des évolutions/cadrages ; aucun des commits
  examinés ne démontre leur livraison. L'assistant d'inscription existant
  ne vaut pas livraison de #89.
- **#87** : décision V1 acceptée, liens audio externes ; reste à contrôler
  ses critères sur les parcours. Ce ticket n'autorise aucune suppression
  des fonctionnalités ou médias existants.

## Décalages du suivi à corriger

1. #85 reste ouverte avec un constat décrit comme actuel, alors que
   `6d7e88b` corrige la lecture concernée. Ajouter le résultat et la preuve
   des tests ; conserver explicitement l'exception des accompagnements confirmés.
2. #72 décrit encore N3 et N4 comme non livrés dans son compte rendu N2.
   Les commits et la documentation métier les présentent comme livrés.
   Ajouter aussi P8/U6a avec leur réserve de tests.
3. #36 présente P1c comme à écrire et les commits U3b comme non publiés.
   P1c est écrit, reste à exécuter ; U3b et P1d sont publiés au HEAD vérifié.
4. #26/#27/#37 restent formulées largement en « travail restant » malgré
   les commits ONB-12c, ONB-13 et DASH-07. Refaire les cases critère par critère.
5. Le backlog du 18/11 dit encore D72 non implémentée et P4/U3 restants.
   Le socle P2 puis P4a/U3 sont désormais présents. Le résumé du plan conserve
   volontairement un compteur daté du 17/11 : utiliser le présent instantané
   pour les chiffres actuels.
6. #83/#84 contiennent, sous leur résultat de clôture, d'anciennes sections
   « à faire » ou « non validé ». Ce sont des strates historiques, pas le
   statut courant de ces décisions.

## Validation et prochaine action

**Priorité : exécuter la passe de tests différés U3b-b/U3b-c, P8, U6a,
P1c et P1d avant de les déclarer terminés.** Le
[prompt de reprise](prompt-reprise.md) détaille les suites, migrations et
mesures attendues. Les changements de l'outillage E2E (parts isolées,
reprise, PostgreSQL local, attente des animations pour axe) facilitent la
recette mais n'en constituent pas une preuve de réussite.

Les rapports antérieurs consignent notamment deux échecs de verrou `55P03`
préexistants ; le compte rendu N2 consigne aussi deux timeouts de la suite
globale, avec les tests concernés réussis en relance isolée. Aucune nouvelle
exécution ici ne permet d'annoncer la suite globale verte.

Méthode de ce bilan : inventaire GitHub complet hors PR, lecture des corps
d'issues, historique et fichiers modifiés, inspection ciblée des services,
tests présents et documentations métier, contrôle de publication par
`git ls-remote`. **Aucun test, migration, seed, modification d'issue GitHub,
commit, push ni déploiement exécuté pour ce bilan.** Seul ce rapport est ajouté.
