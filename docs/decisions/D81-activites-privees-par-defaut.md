# D81 — Activités privées par défaut, présence personnelle (Q111)

- **Statut : Acceptée** (20/11/2026), demandée par le fondateur. Il a
  d'abord tranché Q111 (liste réservée aux participant·es, sans mineur·es),
  puis demandé de protéger contre le pistage par conception (mission
  « confidentialité des activités »).
- Lots : **RV-01** ([#92](https://github.com/Pierre-FABIEN/linkmusician/issues/92),
  [#100](https://github.com/Pierre-FABIEN/linkmusician/issues/100)) ; suites
  dans [#99](https://github.com/Pierre-FABIEN/linkmusician/issues/99),
  [#101](https://github.com/Pierre-FABIEN/linkmusician/issues/101) et
  [#103](https://github.com/Pierre-FABIEN/linkmusician/issues/103).
- Conception : [23 — Confidentialité des activités](../conception/23-confidentialite-activites.md).
- **Portée** : deux migrations (suppression de `JamAttendance.removedAt` ;
  `confidentialite_activites`), une règle pure et une politique serveur
  unique (`src/lib/privacy/activities.ts`, `src/lib/server/privacy/activities.ts`).

## 1. Problème

Une personne qui s'inscrit partout et dit « J'y étais » à toutes les jams
pouvait savoir où se trouve quelqu'un, et quand. Elle le pouvait par la liste
« Qui était là ? », par le carnet (« Croisé·es à… »), par la formation
affichée avant la jam, par les compteurs exacts, par les communes du profil
public, ou en testant une présence (réponses de l'appréciation, de « Garder
le contact », d'une invitation dans un groupe). Le danger est réel quand les
personnes ne se connaissent pas.

## 2. Décision

1. **La présence est une déclaration personnelle** : seule la personne pose,
   corrige ou retire son « J'y étais ». Personne d'autre, hôte compris, ne la
   valide ni ne la retire (`removeFromJam` et `removedAt` supprimés).
   « Je ne viens plus » n'efface jamais un « J'y étais » déclaré.
2. **Les activités sont privées par défaut** : « Je viens », formation,
   « J'y étais » et historique ne sont montrés à personne d'autre que la
   personne. Ni le carnet, ni une conversation acceptée, ni un rôle
   d'administration n'y donnent accès.
3. **Une seule politique décide** (`canViewActivity`, `othersAttendanceVisibleTo`).
   Le partage volontaire, les exclusions et la découverte sur place s'y
   ajouteront, sans contournement par une autre route.
4. **La gestion d'une jam garde ses seuls besoins opérationnels** : l'hôte
   et le lead voient la formation nommée, les invitations et le nombre exact
   d'inscrit·es. Ils ne voient pas qui était là.
5. **Pas de compteur exact** pour les autres : une tranche (« Quelques
   musicien·nes viennent », « Plus de 5 », « Plus de 10 »).
6. **Aucune déduction automatique** « a joué avec » à partir des présences :
   `playedTogether` ne compte que les collaborations confirmées.
7. Les **organisateurs restent publics** en cette qualité (hôte, lead).

## 3. Conséquences

- « Qui était là ? », le carnet et la formation ne montrent que ce que chacun·e
  a choisi de partager (phase 4) ou la découverte réciproque sur place
  (phase 5). On se retrouve aussi par Découvrir.
- L'appréciation après une jam n'est possible qu'entre personnes qui se
  voient : plus rare qu'avant, à suivre dans #93.
- « Garder le contact » depuis une jam exige une présence visible, ou une
  collaboration confirmée.
- Le profil public ne liste plus les communes des jams appréciées.

## 3 bis. Partage volontaire et découverte (validés le 20/11/2026)

- Deux réglages distincts : jams **passées**, jams **à venir**. Partager le
  passé ne partage jamais l'avenir.
- « Tous les membres » exige un consentement explicite, et n'est jamais
  appliqué à un·e mineur·e. Une autorisation individuelle ne vaut que si le
  mode « Les personnes que j'autorise » est choisi.
- « Masquer mes jams à cette personne » l'emporte sur tout, y compris sur
  place ; il ne coupe pas les conversations et n'est pas notifié.
- Découverte sur place **sans QR code** : volontaire, réciproque, expirante
  à la fin de la jam, effacée ensuite, trois activations par 12 h, interdite
  aux mineur·es, sans XP.

## 4. Risques résiduels

- **Places par instrument** : « 1 place ouverte » devient « complet » quand
  quelqu'un prend la place avec un instrument. Une personne qui sait que sa
  cible joue de la batterie peut le remarquer. La capacité est un besoin
  opérationnel ; le risque est accepté et documenté (conception 23 §5).
- **Passage d'une tranche à l'autre** : l'arrivée d'une personne peut faire
  passer de « Personne » à « Quelques ». Cela ne désigne personne.
- **L'hôte et le lead** voient les inscrit·es de leur jam. Un faux
  organisateur pourrait s'en servir : le signalement et la restriction
  ciblée de #91 y répondent.
