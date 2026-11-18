# D72 — Synthèse pour la décision du fondateur

> Statut de D72 : **Proposée** (révision 2, 18/11/2026). Rien n'est
> décidé ni implémenté. Ce document se lit seul ; le détail est dans
> [D72](./D72-architecture-projets-collab.md) et la
> [conception 19, §9](../conception/19-architecture-cible-collab.md#9-questions-à-trancher-par-le-fondateur).
> Issue : [#83](https://github.com/Pierre-FABIEN/linkmusician/issues/83).

## Le but

Permettre aux musicien·nes et aux professionnel·les de **créer,
organiser, faire avancer et valoriser leurs projets ensemble** (un EP, une
tournée, un festival), sans casser ce qui marche : groupes, morceaux,
crédits consentis, preuves confirmées à deux, progression.

## 1. Principes déjà consensuels

La revue produit du 18/11 les a jugés favorablement. Ils restent à
approuver formellement.

1. Un **projet** est un objet à part, **facultatif**, porté par une seule
   personne ou structure. Un groupe peut en porter plusieurs à la fois.
   Un·e solo, un producteur ou un organisateur porte le sien sans groupe.
2. Le projet **regroupe sans posséder** : le supprimer ne supprime aucun
   morceau, aucun concert, aucun crédit.
3. Le projet **ne prouve rien** : aucune XP, aucune étape. La preuve reste
   la collaboration confirmée par les deux parties.
4. **Crédit ≠ gestion ≠ propriété intellectuelle.** Rien dans
   l'application ne cède des droits d'auteur.
5. Les corrections du modèle actuel sont nécessaires avec ou sans projet :
   solo sans groupe fictif, collaboration sur plusieurs morceaux le même
   jour, preuves d'autrui protégées contre la suppression.

## 2. Arbitrages structurants encore ouverts

| #   | Question                                                                | Recommandation                                                                                                                  |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Un collaborateur peut-il **agir** dans un projet sans gérer le groupe ? | **Oui** : deux rôles de projet au lancement, participant·e et coordinateur·rice                                                 |
| 2   | Comment un groupe travaille-t-il sur le morceau d'un·e membre ?         | Il est **partagé** dans le projet, sans changer de mains ; le transfert devient une exception                                   |
| 3   | Que voit un·e participant·e des morceaux du projet ?                    | **Rien sans partage explicite** de leur gestionnaire ; ce qui est déjà public est proposé en résumé                             |
| 4   | Un·e artiste solo peut-il ou elle jouer et candidater sans groupe ?     | **Oui**, en son nom, aux plateaux dont l'organisateur accepte le format solo                                                    |
| 5   | Que garde-t-on quand quelqu'un supprime un morceau crédité à d'autres ? | **Le minimum** qui donne sens à leur crédit, tant qu'il existe ; jamais les fichiers ni les données de la personne qui supprime |

## 3. Choix recommandés et conséquences

**1. Rôles de projet.** Le **coordinateur·rice** (un producteur, une
régie) modifie les dates, confie les tâches, invite et propose des
besoins. Il ou elle ne peut pas changer les droits des autres, toucher au
titre ou aux crédits d'un morceau, ni publier au nom du groupe. La
personne à qui une tâche est confiée la fait avancer et dépose ses
fichiers ; le gestionnaire du morceau les valide. Tout se retire à
l'instant.
_Conséquence_ : un petit système de droits nouveau, fermé et testé. Les
rôles plus fins (validation déléguée, tâches libres) viennent après le
pilote, sans refonte.

**2. Morceau d'un·e membre.** Léa partage son morceau dans l'EP du
groupe, et le groupe y travaille. Léa garde la main et ses crédits, et
peut retirer le partage. Si elle veut confier durablement le morceau au
groupe, elle demande un **transfert**, accepté des deux côtés. Aucun des
deux gestes ne cède de droits d'auteur ni ne rapporte d'XP.
_Conséquence_ : plus de doublon, et pas de perte de contrôle. Le
transfert sort du premier lot. Le « répertoire public partagé » d'un
groupe attend.

**3. Confidentialité.** Le gestionnaire choisit pour chaque élément :
« rien », « résumé » (titre ou titre de travail, avancement) ou
« travail » (ouvert à la coordination). Les compteurs, l'historique et
les notifications ne trahissent jamais un élément caché. Une invitation
ne montre que le nom du projet, son porteur et le rôle proposé.
_Conséquence_ : un réglage de plus au moment de ranger, et des tests
systématiques contre les accès détournés.

**4. Solo.** Un concert peut être joué par une personne, et ses étapes de
scène lui reviennent. Chaque plateau indique les formats acceptés (solo,
duo, trio, groupe). Les plateaux existants ne changent pas. Une personne
mineure ne candidate pas seule.
_Conséquence_ : fin des groupes « Solo » fictifs, et une révision
partielle de D64 (une personne peut se déclarer « je joue en solo »).

**5. Conservation.** On garde le crédit, le rôle, la date et le titre,
que la personne qui supprime peut masquer. On ne garde ni la maquette, ni
les fichiers, ni aucune donnée la concernant. Tout est purgé quand plus
aucun crédit d'une autre personne n'en dépend.
_Conséquence_ : un avis juridique (RGPD) est à obtenir avant ce lot, et
la politique de confidentialité doit être mise à jour.

## 4. Désaccords et compromis

- **Projet dès le lancement** : l'audit G0-01 proposait d'attendre.
  D72 propose de le faire maintenant, car le regroupement est une
  intention de l'utilisateur qu'aucun calcul ne retrouve.
- **Droits nouveaux** : la révision 1 n'en voulait aucun, mais un
  producteur devait alors devenir administrateur du groupe. Le compromis :
  deux rôles seulement, et une extension prévue sans refonte.
- **Transfert ou partage** : la révision 1 transférait le morceau pour y
  travailler. Le compromis : partager d'abord, transférer seulement si on
  le veut vraiment.
- **Visibilité** : la révision 1 montrait d'office titre et état. Le
  compromis : rien sans geste explicite, mais ce qui est déjà public est
  proposé en résumé, pour éviter un réglage inutile.
- **Plateaux solo** : la révision 1 refusait. Le compromis : l'organisateur
  choisit, plateau par plateau.
- **Tâches** : la révision 1 n'en voulait pas, alors que #36 les demande.
  Le compromis : réutiliser les étapes de production existantes, et
  attendre le pilote pour des tâches libres.

## 5. Ordre proposé des lots

1. Libérer les tâches d'un membre qui part (petite correction, sans
   décision).
2. Protéger les crédits d'autrui à la suppression (conservation minimale).
3. Le projet, et le partage des éléments.
4. « Mes projets », l'écran d'accueil des projets.
5. Les participant·es et le rôle de coordinateur·rice.
6. Le solo sur scène.
7. Une séance sur plusieurs morceaux le même jour.
8. Partager le morceau d'un·e membre dans le projet du groupe.
9. Les tâches confiées et les fichiers à valider.
10. La carte de carrière sans parcours imposé.
11. Les plateaux par format.
12. Plus tard, selon le pilote : œuvre / enregistrement / sortie,
    transfert de gestion, événements et festivals, mandat limité à un
    projet.

Aucun lot, hors le premier, ne démarre avant que D72 soit acceptée.
