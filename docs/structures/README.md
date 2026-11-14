# Structures partagées — DASH-02a

`/structure` affiche les participations actives, invitations et demandes du
compte connecté pour les cinq types en base : groupe, studio, lieu,
organisation d'organisateurs et école. `/structure/[id]` décrit uniquement
la participation de cette personne et ouvre les outils existants selon son
rôle ; aucun roster ni liste d'élèves n'est transmis par ces pages.

- `src/lib/structures/rules.ts` : types, libellés et capacités pures.
- `src/lib/server/organizations/access.ts` : type attendu, adhésion ACTIVE,
  structure non dissoute et acteur non supprimé, relus avec le client de
  transaction fourni. Aucun droit n'est tiré du métier ou de la session de
  navigation ; aucun cache de permissions.
- `structures.ts` : projection privée, sans mutation ni nouvel objet.
- Gardes existantes branchées : groupes, studios, co-gestion des organisations
  et lieux, écoles et accès aux équipes de co-gestion. Les restrictions par
  acte (responsable, âge, métier, quota, blocage, lieu revendiqué) restent
  obligatoires dans les services spécialisés.

Les invitations à un studio ou à une co-gestion sont relues après acquisition
du verrou : une révocation intervenue pendant l'attente empêche l'acceptation.
Aucune migration, nouvelle donnée personnelle ou nouvelle notification dans
ce lot ; export et anonymisation des adhésions existantes conservés.

Voir [l'audit, les tests et le découpage restant](../conception/12-structures-equipes.md).
DASH-02 est complété par les agences DASH-02b et les affectations consenties
DASH-04b, sans activation des métiers « bientôt ».

## Mandats individuels (DASH-04a)

Les accompagnements existants portent désormais une durée, un territoire et
une activité acceptés par l’artiste. Ils ne créent toujours aucune adhésion
au groupe. Voir [mandats individuels](../conception/13-mandats-individuels.md).
Les agences et équipes sont livrées dans [DASH-02b](../agences/README.md).
Les affectations consenties sont livrées dans [DASH-04b](../conception/15-affectations-delegations.md).

### Historique personnel des invitations (DASH-05b)

La fiche `/structure/[id]` affiche « Mon invitation » à partir de la seule
participation actuelle du compte connecté. Le nom de l’invitant conservé et
la date sont visibles, sans liste d’équipe. Une participation retirée ou une
structure dissoute reste inaccessible. Aucune acceptation ni aucun changement
de rôle n’est déduit des dates techniques ; une origine non conservée donne
un historique vide. Voir [journal d’activité](../conception/16-journal-activite.md).
