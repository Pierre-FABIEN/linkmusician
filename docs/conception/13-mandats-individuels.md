# Mandats individuels — DASH-04a (#34)

## Audit et découpage (13/11/2026)

L’issue #34 et ses commentaires ont été lus (aucun commentaire). Le service
P5-07 gère déjà plusieurs managers et bookers par artiste, la proposition,
l’acceptation et la fin. Il ne portait ni durée, ni territoire, ni activités.
La confirmation vérifiait la gestion avant la transaction ; la fin écrivait
sans verrou. Les concerts ne contrôlaient que le statut confirmé du booker.

DASH-04a étend ce modèle. DASH-04 reste partiel : agences, collaborateurs et
sous-délégations seront traités avec DASH-04b/DASH-02b, après ce socle.
Le journal d’activité commun reste DASH-05. Aucun métier « bientôt » n’est ouvert.

## Périmètre consenti

Chaque proposition désigne un artiste (personne majeure ou groupe), un agent
majeur et son métier. Elle porte des dates UTC facultatives (début inclus,
fin exclue), une liste de départements français (vide : tous territoires) et
une activité explicitement affichée avant confirmation :

- manager : `CAREER_SUPPORT`, accompagnement de carrière ;
- booker : `BOOKING_CREDIT`, attribution des concerts bookés.

Ces activités ne donnent ni gestion du groupe, ni lecture des conversations,
ni signature ou engagement contractuel. Le périmètre est immuable : le modifier
exige de terminer puis de soumettre une nouvelle proposition à l’artiste.
Les propositions expirées ne peuvent plus être confirmées. Un mandat confirmé
futur ou expiré ne donne aucun droit actif. Il reste visible dans l’espace
privé avec ses conditions et peut être terminé par l’une des parties.

Les anciennes lignes reçoivent l’activité de leur métier, sans limite de date
ni de territoire : leurs droits existants sont conservés. La migration est
additive et porte deux contraintes SQL (ordre des dates et activités du métier).

## Contrôles et traces

Proposition, confirmation et fin prennent le verrou du groupe, puis celui de
la paire agent/artiste. Les droits sont relus après attente : gestion actuelle,
majorité, métier de l’agent, blocages, absence de suppression et de dissolution.
Les propositions prennent aussi un verrou par agent pour leur quota commun.
Le groupe ne peut pas se confirmer un accompagnement entre ses membres.

L’attribution d’un concert vérifie le mandat à la date de l’action et à la date
du concert, ainsi que le département de la commune de l’hôte. Une commune
inconnue ne satisfait jamais un territoire limité. La vérification est rejouée
sous le verrou du groupe au moment du crédit : une révocation empêche les
nouveaux gains sans retirer les faits déjà validés. Les deux parties habituelles
jouent et accueillent toujours le concert ; un booker ne les remplace pas.

La ligne conserve les termes, la date et l’auteur de la confirmation puis de
la fin. Les propositions déclinées ou retirées restent supprimées comme en
P5-07 ; leur journal historique et les sous-délégations ne sont pas livrés.
L’export RGPD inclut les dates, territoires et activités. L’anonymisation
existante termine les mandats, efface le mot et oublie les auteurs de décision.
Les périmètres n’ajoutent aucune localisation personnelle précise.

## Vérifications

- règles pures : dates réelles, début/fin, territoire absent ou différent,
  activité interdite, codes Corse et outre-mer ;
- intégration : limites actives, révocation, expiration avant acceptation,
  perte du métier et perte de la gestion pendant l’attente d’un verrou ;
- E2E booker : conditions visibles avant confirmation, concert dans le
  territoire, révocation, mobile 390 px et accessibilité ;
- non-régressions P5-07 : gains, tournée, rang et export/anonymisation.

Les résultats réellement exécutés sont consignés dans `docs/plan/README.md`.
