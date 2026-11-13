# Structures et équipes — DASH-02 (#32)

## Audit et découpage (12/11/2026)

Base propre : `ccbf90b` (DASH-03). Issues #30, #32, #34 et #35 lues avec
leurs commentaires actuels (aucun). Les dépendances GitHub sont circulaires :
DASH-02 dépend de DASH-04, qui dépend de DASH-02. Le socle existant permet de
livrer **DASH-02a** avant d'étendre les représentations.

| Existant        | Données et garde                                                            | Limites à préserver                                                                                                                          |
| --------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Groupes         | `Organization.BAND`, `Membership`, `bands/service.requireManager`           | Membre actif distinct de la gestion ; rôle et transmission réservés au responsable ; invitations aux mineur·es selon connaissance préalable. |
| Studios         | `Organization.STUDIO`, `studios/service.requireManager`                     | Création et invitation selon les métiers du son ; majorité non inventée ; publication distincte de l'accès à la gestion.                     |
| Organisateurs   | `Organization.PROMOTER`, `organizations/comanagement.requireOrgManager`     | Création/invitation par organisateur adulte ; seul le responsable retire une personne active.                                                |
| Lieux           | `Organization.VENUE`, revendication approuvée, `venues/profile` et `claims` | Le droit sur une organisation ne crée pas une revendication de lieu ; retrait du lieu et publication restent spécifiques.                    |
| Écoles          | `Organization.SCHOOL`, `schools/service.managedSchool`                      | Un élève MEMBER n'est jamais gestionnaire ; liste des élèves et liens d'invitation réservés à la gestion.                                    |
| Représentations | `Representation` confirmée, P5-07                                           | Accompagner un artiste ne donne pas d'adhésion administrative à son groupe.                                                                  |

Les cinq types sont déjà en base. Les gardes sont en partie copiées ; la
co-gestion des lieux et organisateurs partage déjà son service. `/structure`
est encore un ancien écran d'orientation qui annonce des lieux « plus tard ».

## DASH-02a — socle des structures existantes

- Réutiliser `Organization` et `Membership`, sans migration ni nouvelle donnée
  personnelle. Ne créer aucun deuxième objet pour une structure existante.
- Une matrice pure décrit les capacités de gestion pour les cinq types.
  Seules les adhésions ACTIVE avec rôle OWNER ou ADMIN donnent accès à la
  gestion ; une invitation, une demande, un départ ou retrait n'en donne pas.
  Les capacités spécialisées ne s'appliquent qu'au type correspondant.
- Un lecteur serveur commun vérifie le type attendu, l'adhésion actuelle,
  l'absence de dissolution et de suppression de l'acteur. Il utilise le client
  de la transaction de l'appelant et ne conserve aucun cache de permissions.
- Brancher les gardes d'écriture existantes sur cette lecture commune. Les
  règles supplémentaires (responsable pour certains actes, métier pour créer
  ou inviter, quotas, blocages, âge, revendication du lieu) restent appliquées
  dans les services de domaine. La capacité générale de gestion ne remplace
  jamais ces règles par action ou par personne visée.
- `/structure` devient le menu privé **Mes structures** : participations
  actives, invitations et demandes de ce compte uniquement. Chaque entrée
  ouvre un écran de participation dédié avec son type, son état, son rôle et
  les liens réellement utilisables vers les outils existants. Aucun effectif,
  nom de collègue ou liste d'élèves n'est exposé par ce nouvel écran.
- Un métier actif, principal, un rôle technique de compte, une représentation
  ou un rang ne constitue jamais une adhésion de gestion. La navigation garde
  la structure et ses filtres lors d'une bascule de contexte.

## Suite du découpage

**DASH-02 reste partiel** après DASH-02a. L'extension typée aux agences et
collaborateurs, les délégations et mandats détaillés, leur durée, territoire et
activité, ainsi que la traçabilité commune se poursuivent avec DASH-04 puis
DASH-02b/DASH-05. Aucune agence ni délégation nouvelle n'est ouverte dans ce
socle. Les métiers label, édition et communication restent « bientôt ».

La durée, le territoire et les activités des accompagnements individuels sont
désormais traités dans [DASH-04a](./13-mandats-individuels.md). Les agences,
collaborateurs et sous-délégations restent dans DASH-04b/DASH-02b.

## Vérifications du socle livré

- Règle pure : cinq types, responsables/co-gestion actifs, tous les états sans
  droit, membre et élève sans gestion, capacités spécialisées du bon type.
- Intégration : quatre tests dans `organizations/access.integration.test.ts`.
  Type exact, droits actuels, absence de cache après retrait, autre compte,
  dissolution et suppression, lecture privée sans roster, invitation révoquée.
  Une transaction tient le verrou pendant qu'une acceptation attend ; la
  révocation est validée avant libération, puis l'acceptation doit être refusée.
- Non-régressions Prisma : 40 tests existants des groupes, studios, écoles,
  organisations d'organisateurs, revendications et fiches de lieux, exécutés
  sans parallélisme entre fichiers sur le schéma e2e.
- `structures.spec.ts` : les cinq types sur données réelles, état vide,
  invitation acceptée, membre et élève sans gestion, élève mineur sans liste
  de camarades, créations selon l'âge, accès révoqué en POST et en GET,
  structure étrangère ou dissoute en 404, contexte avec filtres conservés,
  clavier, axe et absence de débordement à 390 px.
- `ecole.spec.ts`, `navigation-metiers.spec.ts`, `actions-metiers.spec.ts` et
  les deux parcours `aide.spec.ts` réussis. Le support d'autocomplétion des
  communes cible son `listbox`, sans confusion avec le sélecteur de métier.
- Suite complète : 1 326 tests unitaires réussis, 251 tests conditionnels non
  exécutés. Contrôle des types sans erreur ni avertissement. Formatage et
  ESLint hors scripts locaux préexistants conformes (réserves dans le plan).

Les lieux masqués restent gérables par leurs responsables : la visibilité du
profil public ne supprime pas une adhésion privée. Les nouvelles pages ne
montrent que les participations de la personne connectée, jamais une équipe
trouvée par un identifiant libre. Les contraintes de blocage, d'âge, de métier
et de visibilité des parcours spécialisés restent dans leurs services ; les
nouvelles pages ne proposent aucune mutation qui pourrait les contourner.
