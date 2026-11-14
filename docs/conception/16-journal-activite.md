# Journal d’activité — DASH-05 (#35)

## Audit du 14/11/2026 et découpage

Base : `5e7f982`, dépendances DASH-02 et DASH-04 récupérées depuis `origin/main`.
La mention « publication restante » dans #30/#35 est donc devenue obsolète.

| Source                     | Traces présentes                                                                         | Limite                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Representation`           | Proposition, confirmation et fin, auteurs des décisions                                  | Une proposition déclinée ou retirée est supprimée ; aucune décision à reconstruire ensuite.                         |
| `RepresentationDelegation` | Proposition et auteur, accord du collaborateur, approbation et auteur, clôture et auteur | `endedAt` ne distingue pas refus et retrait. La date d’expiration n’est pas un acte humain.                         |
| `Membership`               | Invitation et auteur, état de participation                                              | Les transitions ne forment pas un registre de tous les actes ; ne pas déduire l’auteur d’un retrait du rôle actuel. |
| Collaborations             | Acceptation et confirmation d’achèvement par participant                                 | Gardes propres aux participants et confidentialité du projet à conserver.                                           |
| Notifications              | `notify()` transactionnel, préférences, blocages, absence d’auto-notification            | Flux destiné au destinataire, purge après lecture ; ne peut pas servir de journal exhaustif.                        |
| Audit administrateur       | `AdminAuditLog`, écriture best-effort                                                    | Journal administratif séparé, sans garantie transactionnelle métier ni droit de lecture pour les membres.           |

**DASH-05a** livre la première lecture sur les affectations et le contrat
`ActivityEntry`, avec un composant accessible partagé. **DASH-05 reste partiel**.
La suite doit couvrir les invitations, mandats, validations et futures options
et propositions dans leurs services respectifs. Lorsqu’un acte n’est pas
conservé, sa journalisation transactionnelle et son effacement RGPD demandent
un lot distinct ; aucune reconstitution à partir des notifications.

## Historique privé des affectations (DASH-05a)

La fiche `/delegations/[id]` affiche une liste chronologique : proposition,
accord du collaborateur, accord pour l’artiste, clôture. Chaque entrée porte
un identifiant stable de fait, un libellé, le nom actuel de l’auteur réel et
l’horodatage conservé. Les dates sont affichées à l’heure de Paris avec un
élément HTML `time`. À date égale, l’ordre est stable mais ne certifie pas
l’ordre réel des deux accords. Aucun acte ni notification n’est créé à la lecture.

Le service construit l’historique **après** la garde de `delegationForMe` :
titulaire, collaborateur désigné ou gestion majeure actuelle de l’artiste.
L’administrateur de l’agence n’obtient aucun accès implicite. Une révocation
laisse les accords historiques consultables par les parties comme la fiche
existante ; elle ne redonne aucun accès aux conditions privées du mandat.
Un gestionnaire de groupe retiré perd l’accès par la même garde actuelle.

La projection n’inclut ni message, ni conditions, ni liste de membres, ni
identifiants personnels. Auteur supprimé ou référence effacée : « Compte
supprimé », sans attribution à l’artiste ou au titulaire par défaut. La clôture
reste « Affectation close » ; aucun refus ni motif n’est inventé.

Pas de nouvelle donnée personnelle stockée, pas de migration ni de copie du
journal. Export et anonymisation des affectations déjà livrés dans DASH-04b
restent la source des faits ; la projection reflète leur effacement.

## Validation

- Tests purs : dates, ordre des accords, faits absents, auteurs effacés.
- Intégration : cycle réel, auteurs, contrôle du payload, tiers et gestionnaire
  d’agence exclus, suppression d’auteur et nombre de notifications inchangé.
- E2E existant `delegations.spec.ts` enrichi : historique avant et après les
  deux accords, clôture, dates HTML ; contrôle axe et 390 px conservé.
