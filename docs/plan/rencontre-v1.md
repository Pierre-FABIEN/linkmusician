# Chantier Rencontre V1 — plan de clôture

> Consigné le 20/11/2026 d'après le bilan de conception « Melokiva Rencontre
> V1 ». **Chantier en cours** depuis le 20/11/2026 (RV-01). Les états des issues ci-dessous ont été
> relus sur GitHub le 20/11/2026 (toutes ouvertes, sauf #31 à #34 fermées).
>
> Ce plan **regroupe** les tickets du [backlog G0–G6](./backlog-ordonne-2026-11-18.md)
> qui concernent Rencontre et fixe leur ordre de livraison. Il ne remplace pas
> le backlog : les numéros d'issue et les préfixes `Gx-yy` restent valables.

## Principes

- **Le périmètre de Rencontre V1 est figé.** On n'ajoute rien, sauf pour
  corriger un défaut bloquant découvert pendant le développement ou les tests.
- **On ne repart pas de zéro.** L'inscription, la messagerie, la recherche de
  musiciens, le carnet et les objets de jam existent déjà dans le code, de même
  que les acquis des tickets #31 à #34 (navigation multirôle, structures et
  permissions, widgets, invitations et délégations). Chaque ticket **commence
  par un audit ciblé** : on note ce qui est acquis et ce qui manque, puis on ne
  développe que les manques.
- **Deux jalons distincts** :
  - **V1 fonctionnelle** : les parcours sont développés, sécurisés, testés et
    utilisables ;
  - **V1 validée pour le lancement** : ils ont en plus été éprouvés avec des
    utilisateurs réels et des professionnels partenaires à Toulouse.
- **L'ordre n'impose pas une cascade.** Une fois les contrats de données et
  d'autorisation stabilisés (lot RV-01), les lots RV-02 (#99), RV-03 (#103) et
  RV-04 (#102) peuvent avancer en parallèle.
- Méthode habituelle : une session = un lot (découpé `RV-03a`, `RV-03b`… s'il
  déborde), commits sur `main` préfixés par l'ID, définition de terminé
  ([README §4](./README.md)).

## Architecture fonctionnelle retenue

Rencontre sert à découvrir, participer, rencontrer et garder le contact :

| Domaine                     | Rôle                                                    | Issue de référence |
| --------------------------- | ------------------------------------------------------- | ------------------ |
| **Jams**                    | Jouer et rencontrer des musiciens                       | #103               |
| **Événements**              | Concerts, festivals, agenda culturel                    | #77                |
| **Découvrir**               | Tous les acteurs publics du réseau                      | #99                |
| **Contacts et discussions** | Carnet privé et messagerie indépendante                 | #99                |
| _Lieux et structures_       | Socle transversal : jams, agenda et Collab s'en servent | #102               |

Collab (projets, groupes, prestations, progression professionnelle) reste un
domaine à part. Les domaines sont distincts, mais les identités, les
permissions et les relations sont partagées.

## Les sept lots

| Lot   | Objet                              | Priorité | Issues                      | Dépend de                       |
| ----- | ---------------------------------- | -------- | --------------------------- | ------------------------------- |
| RV-01 | Sécuriser les fondations Jam       | P0       | #100, #91, #92, #93         | —                               |
| RV-02 | Découvrir, Contacts et Discussions | P0/P1    | #99, #26, #27               | RV-01 (contrats d'autorisation) |
| RV-03 | Achever le moteur Jam              | P1       | #94, #95, #96, #97, #103    | RV-01                           |
| RV-04 | Intégrer les établissements        | P1       | #102, #79, #80              | RV-01                           |
| RV-05 | Construire l'agenda culturel       | P1       | #77, #38, #46, #78          | RV-04 (#79 et #80 réutilisés)   |
| RV-06 | Assembler l'expérience Rencontre   | P1       | #74, #75, #70, #76, #61–#65 | RV-02 à RV-05                   |
| RV-07 | Valider et clôturer la V1          | G5       | #66, #98, #50, #82          | RV-06                           |

### RV-01 — Sécurité et cohérence Jam

| Issue | Travail attendu                                                                                          |
| ----- | -------------------------------------------------------------------------------------------------------- |
| #100  | Auditer toutes les permissions et transitions multirôles                                                 |
| #91   | Annulations, signalements, modération des jams fictives                                                  |
| #92   | Présence autodéclarée, sans validation ni retrait par autrui                                             |
| #93   | XP après l'événement, compensation des gains invalidés (transactions négatives liées, jamais d'`UPDATE`) |

**Critère de sortie :** impossible d'usurper les droits d'un organisateur, de
retirer la présence d'autrui ou de gagner indûment des récompenses à partir
d'une jam fictive.

**Avancement (20/11/2026) :** audit #100 livré, avec sa matrice, la machine
d'états et les notifications attendues : [rv-01-audit-jam.md](./rv-01-audit-jam.md).
Deux failles hors #91–#97 y sont corrigées. Prochaine étape : #92 (contrat de
présence), dont dépendent #93 et la fin de #100.

### RV-02 — Découvrir, Contacts et Discussions

| Issue | Travail attendu                                               |
| ----- | ------------------------------------------------------------- |
| #99   | Refonte fonctionnelle des trois espaces                       |
| #26   | Profils et informations publiques nécessaires à la découverte |
| #27   | Matching métier, offres et besoins                            |

**Critère de sortie :** trouver un acteur public, l'enregistrer dans son carnet
sans lui écrire, puis lui envoyer séparément une demande de conversation, sans
relation préalable.

#26 et #27 sont transversales : leur clôture complète relève aussi du chantier
Profils/Collab. Rencontre valide au minimum les fonctions dont il dépend, sans
fermer ces tickets.

### RV-03 — Jam complète

| Issue | Travail attendu                                                                               |
| ----- | --------------------------------------------------------------------------------------------- |
| #94   | Consentement et éligibilité du lead                                                           |
| #95   | Scène ouverte et formation limitée                                                            |
| #96   | Réservations atomiques, sans surbooking                                                       |
| #97   | Provenance et disponibilité du matériel                                                       |
| #103  | Formulaire express, intentions de venue (jouer, écouter, décider sur place), parcours complet |

**Critère de sortie :** un organisateur publie une jam rapidement, les
participants comprennent les conditions, et les modifications importantes
(date, lieu, annulation) sont correctement traitées et notifiées.

### RV-04 — Lieux événementiels

| Issue | Travail attendu                                |
| ----- | ---------------------------------------------- |
| #102  | Parcours « Je représente un lieu »             |
| #79   | Vérification, contestations et révocations     |
| #80   | Administration des structures et programmation |

**Critère de sortie :** un gérant retrouve ou propose son établissement, demande
sa revendication, puis gère les fonctions autorisées après validation, sans
avoir à se déclarer booker ou organisateur.

### RV-05 — Événements culturels

| Issue | Travail attendu                                                   |
| ----- | ----------------------------------------------------------------- |
| #77   | Catalogue culturel, provenance, publication et reprise officielle |
| #38   | Calendriers, occurrences (événements multijours) et lieux         |
| #46   | Outils organisateurs, programmation et délégations                |
| #78   | Annuaire de départ et provenance des établissements               |

#79 et #80 servent aussi ce domaine mais **ne sont pas développées une deuxième
fois** : RV-05 réutilise ce que RV-04 a livré.

#81 (synchronisation automatique des agendas partenaires) est **différée après
le lancement** si l'alimentation manuelle et communautaire suffit pour le
pilote. C'est un arbitrage de périmètre : le ticket reste ouvert.

**Critère de sortie :** une contribution communautaire sourcée peut devenir une
publication officielle administrée par son organisateur, sans doublon ni perte
d'historique.

### RV-06 — Interface globale

Issues #74, #75, #70, #76 et #61 à #65, à traiter pour produire une expérience
homogène (style Metro, [docs/design](../design/README.md)). Point à vérifier en
priorité : la navigation distingue bien les trois univers de Rencontre — Jams,
Agenda et Communauté — tout en gardant un accès simple à Contacts et
Discussions.

**Critère de sortie :** un nouvel utilisateur comprend, sans explication
extérieure, où découvrir, participer, enregistrer un contact ou organiser un
événement.

### RV-07 — Validation et clôture

Issues #66 (mobile et clavier), #98 (recette métier Jam), #50 (recette
transverse et sécurité), #82 (pilote Toulouse, go/no-go). La recette repose sur
six scénarios réels, chacun couvert par des tests adaptés : Vitest,
intégration Prisma, Playwright, contrôles d'autorisation serveur, accessibilité
mobile et clavier, contrôle des données sensibles.

| Scénario                 | Parcours                                                                                   | Lots         |
| ------------------------ | ------------------------------------------------------------------------------------------ | ------------ |
| Thomas, musicien         | Découvre une jam, indique son intention de jouer, retrouve des profils, garde des contacts | RV-02, RV-03 |
| Sophie, gérante de salle | Revendique son établissement, complète sa fiche, gère les actions autorisées               | RV-04        |
| Marc, organisateur       | Publie une jam, désigne un lead consentant, modifie une date, prévient les inscrits        | RV-03        |
| Julie, contributrice     | Référence un concert public sourcé sans prétendre l'organiser                              | RV-05        |
| Association, festival    | Reprend sa fiche, associe plusieurs lieux, délègue des droits de programmation             | RV-04, RV-05 |
| Alex, professionnel      | Trouve un acteur, l'enregistre sans lui écrire, puis ouvre une conversation indépendante   | RV-02        |

Un scénario n'est coché que lorsqu'un test exécuté dans le dépôt le prouve.

## Hors périmètre de la V1

Laissés après le pilote, sans fermer les tickets :

- Super Jam et Jam Battle (#59) ;
- profil grand public et avis sur les événements (#86) ;
- billetterie interne et transactions événementielles ;
- recommandations relationnelles avancées et scores sociaux ;
- synchronisation massive des agendas partenaires (#81), si elle n'est pas
  indispensable pour amorcer le catalogue.

## Définition de « Rencontre terminé »

1. **Fonctionnel** : les quatre domaines et leurs parcours prioritaires
   fonctionnent de bout en bout.
2. **Cohérent** : entités et permissions partagées sans contradiction entre
   Jam, Agenda, Contacts et Collab.
3. **Sécurisé** : aucun acteur ne gère les ressources d'un autre sans
   habilitation ; mineurs et confidentialité protégés.
4. **Fiable** : pas de duplication accidentelle, de fausse confirmation
   d'événement, ni de présence transformée en preuve de prestation.
5. **Testé** : scénarios métier, cas adversariaux, tests techniques et
   accessibilité validés.
6. **Documenté** : `/aide`, `/diagram`, les décisions et les tickets décrivent
   ce qui est réellement livré.
7. **Éprouvé** : une première série d'essais auprès de musiciens,
   organisateurs et établissements toulousains permet de décider du lancement.

Les points 1 à 6 marquent la **V1 fonctionnelle**, le point 7 la **V1 validée**.

## Clôture des épopées

L'épopée Jam #60 et le pilotage transversal #101 ne se ferment qu'après
vérification de leurs tickets. #101 pilote aujourd'hui surtout la cohérence
Jam : au moment de la clôture, **étendre sa checklist** à l'Agenda, aux
Contacts et aux Lieux, ou prononcer la clôture de tout Rencontre dans l'épopée
globale #73.

## Première action quand le chantier démarre

Transformer ces sept lots en ordre d'exécution GitHub (dépendances,
parallélisation possible, critères de clôture reportés dans les issues et dans
#73), puis ouvrir RV-01 par l'audit de #100.
