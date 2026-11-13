# Agences et équipes (DASH-02b)

`/agences` liste les participations privées du compte ; l’entrée est aussi
accessible depuis « Mes structures ». Manager ou booker majeur peut ouvrir
jusqu’à trois agences. Les agences sont des `Organization.AGENCY`, avec les
`Membership` communes, et restent privées : aucun profil public ni roster.

- **Responsable (OWNER)** : invite à la co-gestion ou comme collaborateur,
  retire une participation, ferme l’agence ; son départ transmet à la plus
  ancienne co-gestion active, jamais à un collaborateur.
- **Co-gestion (ADMIN)** : lit l’équipe, invite des collaborateurs, annule
  leurs invitations ; ne nomme pas de gestionnaire et ne retire pas une
  personne active.
- **Collaborateur (MEMBER)** : accepte ou décline son invitation, consulte
  sa seule participation et peut partir. Aucun accès à l’équipe ou à la gestion.

Toutes les personnes invitées sont majeures ; la co-gestion demande Manager
ou Booker au moment de l’invitation et de l’acceptation. L’invitation ne
constitue jamais un accès actif. Cinq invitations en attente au plus.

## Implémentation

- `src/lib/agencies/rules.ts` : validation et matrice des actions ;
- `src/lib/server/agencies/service.ts` : lectures et mutations sous verrou
  d’organisation, droits courants et blocages revérifiés ;
- `/agences/nouvelle`, `/agences/[id]` (menu), `/equipe`, `/participation` ;
- `structures/rules.ts` et `organizations/access.ts` : capacités communes ;
- migration `20261113160000_agencies` : valeur enum additive, sans copie de
  données. PostgreSQL ne sait pas retirer une valeur d’enum directement :
  le retour arrière exige archivage des agences et reconstruction du type.

L’export RGPD inclut rôle, état, auteur de l’invitation et dates de chaque
participation. L’anonymisation oublie l’auteur des invitations, termine ses
participations et transmet à la co-gestion ; sans co-gestion, elle ferme
l’agence et les participations restantes. L’historique reste conservé.

## Limites et suite

Aucune XP, aucun mandat artistique ni pouvoir de signature par appartenance.
Les accompagnements individuels restent indépendants. L’affectation d’un
artiste et les délégations par mandat restent **DASH-04b**, avant le journal
commun **DASH-05**. La lecture d’une équipe ne donne aucun droit sur les
conversations, les crédits ou les opportunités d’autrui. Label, édition et
communication ne sont pas ouverts par ce lot.

Tests : règles pures, intégration `PROGRESSION_INTEGRATION=1 npx vitest --run
src/lib/server/agencies --maxWorkers=1`, E2E `agences.spec.ts` et non-régression
`structures.spec.ts`. Les résultats exécutés sont dans `docs/plan/README.md`.
