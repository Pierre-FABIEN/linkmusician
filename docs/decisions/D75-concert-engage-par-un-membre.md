# D75 — Concert déclaré par un simple membre (Q-G0-7, E11)

- **Statut : Acceptée** (19/11/2026), **dans le périmètre validé par
  [D72](./D72-architecture-projets-collab.md)** le 18/11/2026 (arbitrage
  Q-G0-7, [conception 19 §9](../conception/19-architecture-cible-collab.md)).
  Cette fiche consigne la règle et le comportement observé. Les points que
  D72 ne tranche pas sont des **questions ouvertes** (§8), pas des
  décisions.
- Lot concerné : **P1b** ([#36](https://github.com/Pierre-FABIEN/linkmusician/issues/36)).
- **Portée : documentaire.** Aucun code, aucune migration, aucun barème
  ne change.

## 1. Contexte : l'écart E11

L'audit structurel ([E11](../conception/audit-structurel-collab.md)) a
relevé une asymétrie. Un membre `MEMBER` d'un groupe peut faire valoir le
concert de ce groupe par une collaboration `GIG`, qui corrobore ou vérifie
l'étape « Premier concert ». Déclarer cette même étape à la main exige en
revanche la gestion du groupe (`OWNER` ou `ADMIN`). Ce comportement est
défendable, puisqu'un tiers confirme le fait, mais aucune décision ne
l'écrivait.

La question posée (Q-G0-7) : **un simple membre peut-il déclarer un
concert joué par son groupe sans en avoir la gestion ?** D72 répond :
**oui, quand le fait est confirmé par un tiers habilité, l'organisateur ou
le lieu.**

## 2. Comportement observé dans le code (19/11/2026)

Lu dans `src/lib/server/collaborations/service.ts`
(`gigPartiesOfPair`, `proposeCollaboration`, `settle`),
`src/lib/collaborations/rules.ts` (`checkGigParties`, `collabFormSchema`),
`src/lib/server/milestones/service.ts` (`verifyGigFromCollaboration`,
`declareMilestone`, `managedBand`, `attest`), `milestones/disputes.ts` et
`progression/core/rules/gigHeld.ts`.

**Proposer un concert.** Une collaboration `GIG` se propose dans une
conversation acceptée entre deux personnes. Le serveur relit :

- le **groupe** : un `BAND` non dissous dont l'une des deux personnes est
  membre **actif, quel que soit son rôle** (aucun filtre `role` dans
  `gigPartiesOfPair`) ;
- l'**hôte** : une organisation `PROMOTER`, ou un lieu `VENUE` revendiqué
  (`venueClaims` `APPROVED`), **géré** (`OWNER` ou `ADMIN`) par l'une des
  deux personnes ;
- la **séparation** : l'une joue, l'autre gère l'hôte, et ce ne sont pas
  les mêmes personnes. Un concert entre deux membres, ou joué et accueilli
  par la même personne, est refusé ;
- la date : 60 jours en arrière au plus, 90 jours à l'avance ; une
  collaboration par conversation et par jour (`requireAvailableDay`) ;
- un « booké par » facultatif, seulement si l'accompagnement est confirmé
  et couvre la date et le territoire (`confirmedBookerOf`).

L'une ou l'autre personne peut proposer : le membre du groupe, ou la
gestion de l'hôte.

**Confirmer.** La collaboration n'est terminée que lorsque les deux
personnes ont accepté puis confirmé, la date passée. Chacune peut refuser
ou annuler tant qu'elle n'est pas terminée.

**Effets à la fin** (`settle`) :

1. `collaboration.completed` : la collaboration de musicien·ne (barème,
   rendement décroissant par contrepartie, confiance de la contrepartie)
   pour la personne qui joue ; la gestion de l'hôte n'y gagne rien
   (`hostIds`).
2. `verifyGigFromCollaboration` **relit les adhésions actives au moment de
   la confirmation**. S'il n'y a plus de membre actif parmi les
   participant·es, ou plus de gestion distincte de l'hôte, rien ne se
   passe de plus. Sinon :
   - `gig.held` crédite la gestion de l'hôte (« Événement tenu ») et le
     booker confirmé, jamais les musicien·nes ; une date confirmée
     seulement par qui l'organise ne rapporte rien ;
   - « Premier concert » passe `CORROBORATED` (hôte non vérifié) ou
     `VERIFIED` (organisation vérifiée), et « Première tournée » peut être
     vérifiée ;
   - l'étape (`milestone.attested`) crédite **les membres présents à la
     date du concert**, y compris celles et ceux qui n'y ont pas pris part.

**Déclarer à la main.** `declareMilestone` exige la gestion
(`managedBand`) et donne une preuve `DECLARED`, sans tiers.

**Contester, retirer.** Une étape se conteste par une personne extérieure
au groupe (un membre passe par la gestion) ; si la contestation est
retenue, les gains de l'étape sont repris par transactions négatives
liées. La gestion peut retirer l'étape elle-même. Une collaboration
terminée, elle, ne se signale pas : `ReportTarget` n'a pas de valeur
`COLLABORATION`.

**Tests.** `gigs.integration.test.ts` couvre la séparation des rôles,
l'hôte non vérifié, l'organisation vérifiée et la tournée, mais toujours
avec une personne `OWNER` du groupe. **Le chemin d'un `MEMBER` n'est pas
testé** (voir §8, P1c). _Mise à jour du 19/11/2026 : les tests P1c sont
écrits (même fichier, `describe` « P1c », scénarios A à D), non exécutés ;
ils ont relevé Q106, tranchée par [D79](./D79-concert-reconnu-seul-compte.md)
et corrigée en P1d : une collaboration terminée sans `gig.held` ne compte
plus comme date antérieure ni dans la tournée._

## 3. Règle retenue (D72, Q-G0-7)

> Un membre actif d'un groupe, quel que soit son rôle, peut faire
> reconnaître un concert joué par ce groupe, **à condition que la gestion
> du lieu ou de l'organisation qui l'a accueilli le confirme**. Seule
> cette confirmation par un tiers donne une preuve (`CORROBORATED` ou
> `VERIFIED`). Sans tiers, l'étape reste une déclaration, réservée à la
> gestion du groupe.

Le code applique déjà cette règle : **aucune correction n'est
nécessaire**. E11 est un écart d'écriture, pas de comportement.

## 4. Déclarer, confirmer, administrer, engager

Le mot « engager » du titre de Q-G0-7 ne doit pas être lu au sens
juridique. Quatre gestes sont distincts :

| Geste                                     | Qui                                                                   | Ce que le geste produit                                       |
| ----------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Déclarer** un concert joué              | Un membre actif du groupe (tout rôle), ou la gestion de l'hôte        | Une collaboration `GIG` proposée, rien d'autre                |
| **Confirmer** qu'il a eu lieu             | La gestion de l'hôte (tiers), avec le membre, une fois la date passée | Le fait reconnu : XP, étape corroborée ou vérifiée            |
| **Administrer** le groupe ou un événement | La gestion du groupe ; la gestion du lieu ou de l'organisation        | Étape déclarée, retrait, candidature à un plateau, annonces   |
| **Engager** le groupe auprès d'un tiers   | Personne sur la plateforme                                            | Aucun objet : ni contrat, ni cachet, ni mandat n'en découlent |

**Reconnaître un fait passé ne donne aucun pouvoir de représentation.**
Les droits d'agir au nom du groupe restent ceux qui existent déjà :
candidater à un plateau exige la gestion (`applyAsBand`) ou un droit
délégué (D71, [conception 18](../conception/18-candidature-deleguee.md)) ;
un mandat de
manager ou de booker se confirme entre le groupe et la personne. La
plateforme ne porte aucun contrat. Cette précision décrit le périmètre
existant, elle n'ajoute pas de règle.

## 5. Droits et responsabilités

- **Membre (tout rôle)** : peut proposer un concert de son groupe à la
  gestion d'un hôte ; reste responsable de l'exactitude de ce qu'il
  propose. Ne peut ni déclarer l'étape seul, ni la retirer, ni candidater
  au nom du groupe.
- **Gestion de l'hôte** : c'est elle qui atteste. Elle peut refuser ou
  annuler avant la fin ; sa confiance pondère les gains (`trustWeight`).
- **Gestion du groupe** : n'est pas partie à la collaboration. Elle voit
  l'étape sur la page du groupe et peut la retirer (`retractMilestone`) ;
  elle n'est pas prévenue (Q88).
- **Modération** : tranche les contestations d'étape ; reprend les gains
  de l'étape par transactions négatives liées, jamais par `UPDATE`.

## 6. Garanties contre les déclarations abusives

Les mêmes que pour la gestion du groupe ; le chemin du simple membre n'en
retire aucune :

- un tiers distinct gère l'hôte ; un lieu doit être revendiqué ; seule une
  organisation vérifiée donne `VERIFIED` ;
- adhésions relues à la proposition, puis **à la confirmation** ;
- conversation acceptée préalable, une collaboration par conversation et
  par jour, fenêtre de 60 jours en arrière ;
- rendement décroissant par contrepartie et par artiste, pondération par la
  confiance de qui confirme ; une date confirmée seulement par l'hôte ne
  rapporte rien à l'hôte ;
- détection des cercles fermés (`collusion.ts`), piste pour la modération ;
- contestation et retrait de l'étape, avec avertissement de confiance pour
  qui l'a déclarée ou confirmée.

**Limite connue** : une collusion entre un membre et une organisation
`PROMOTER` non vérifiée, créée pour l'occasion, donne une étape
`CORROBORATED` et l'XP de collaboration. C'est vrai aussi pour la gestion
du groupe : ce n'est pas propre à E11. Les gains de la collaboration
elle-même ne sont pas repris par une contestation d'étape (Q90).

## 7. Progression et réputation

- Aucun barème ne change. La personne qui joue gagne la collaboration ; la
  gestion de l'hôte gagne l'événement tenu ; l'étape crédite les membres
  présents à la date.
- L'XP n'entre dans aucun calcul de confiance, de réputation ou de tri :
  le rang d'un lieu ou d'un organisateur se lit dans ses dates confirmées
  (`venueSummary`, `promoterSummary`), pas dans l'XP.
- Le client n'envoie que l'intention (groupe, hôte, date, titre) ; le
  serveur relit tout et calcule.

## 8. Limites, cas particuliers, questions ouvertes

| Scénario                                                       | Ce que fait le système                                                                                                      |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Un membre déclare un concert réellement joué                   | Proposé à la gestion de l'hôte ; terminé après confirmation des deux                                                        |
| L'hôte confirme                                                | Collaboration terminée, `gig.held`, étape corroborée ou vérifiée                                                            |
| Une personne propose pour un groupe dont elle n'est pas membre | Refusé (« L'un de vous deux doit jouer dans ce groupe », 403), sauf si c'est la gestion de l'hôte et que l'autre est membre |
| Un ancien membre déclare un concert d'avant son départ         | Refusé : l'adhésion doit être active à la proposition. Un membre actif ou la gestion peuvent le faire (Q89)                 |
| Le membre quitte le groupe avant la confirmation               | La collaboration se termine, mais sans `gig.held` ni étape (adhésion relue)                                                 |
| Le concert est refusé ou contesté                              | Refus ou annulation avant la fin : rien. Après : contestation ou retrait de l'étape ; la collaboration terminée reste (Q90) |
| Concerts fictifs pour l'XP                                     | Garanties du §6 ; limite connue pour un hôte non vérifié complice                                                           |
| Déclaration lue comme un droit de contracter                   | Aucun objet contractuel ; candidature et mandat ont leurs propres droits (§4)                                               |

**Questions ouvertes**, hors D72, consignées avec un défaut dans
[a-trancher](../plan/a-trancher.md) :

- **Q88** : prévenir la gestion du groupe qu'un membre a fait reconnaître
  un concert ? Défaut : non au lancement.
- **Q89** : un ancien membre peut-il déclarer un concert d'avant son
  départ ? Défaut : non.
- **Q90** : signaler une collaboration terminée, et reprendre ses gains ?
  Défaut : non au lancement ; les garanties du §6 suffisent jusqu'à un abus
  constaté.

**Écart à traiter dans un lot distinct** : **P1c**, un test d'intégration
du chemin `MEMBER` (proposition, confirmation par l'hôte, étape
corroborée, refus de la déclaration à la main). Aucun changement de
comportement attendu.

**Évolutions futures** : le modèle d'événement (P11, G3) reliera plateau
accepté et concert confirmé (E13) ; il ne changera pas qui peut déclarer.
Un mandat limité à un projet (Q-G0-8, P12) restera distinct de ce droit.

## 9. Références

- [D72 — Architecture Collab](./D72-architecture-projets-collab.md),
  arbitrage du 18/11/2026 ; [conception 19](../conception/19-architecture-cible-collab.md),
  E11 (§6) et Q-G0-7 (§9) ;
  [audit structurel](../conception/audit-structurel-collab.md), E11.
- [Registre](./README.md) : D71 (candidature déléguée), D49 (contestation
  des étapes), D54 (XP d'activité).
- Code : `src/lib/server/collaborations/service.ts`,
  `src/lib/collaborations/rules.ts`,
  `src/lib/server/milestones/service.ts`,
  `src/lib/server/milestones/disputes.ts`,
  `src/lib/server/progression/core/rules/gigHeld.ts`.
