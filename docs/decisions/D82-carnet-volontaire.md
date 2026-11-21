# D82 — Carnet de contacts volontaire, distinct des conversations (#99)

- **Statut : Acceptée** (21/11/2026). Elle applique la décision produit du
  20/11/2026 portée par [#99](https://github.com/Pierre-FABIEN/linkmusician/issues/99)
  (Découvrir, Contacts et Discussions, trois capacités autonomes).
- Lot : **RV-02a** ([plan Rencontre V1](../plan/rencontre-v1.md)).
- Liée à : [D81](./D81-activites-privees-par-defaut.md) (le carnet n'ouvre
  aucun accès aux activités), D45 et D46 (contacts, groupes, discussions).
- **Portée** : une migration additive (`saved_contacts`, reprise de
  l'existant), aucune suppression.

## 1. Constat

- Le « carnet » mêlait deux choses : `MusicalTie` (« Garder le contact »,
  réservé à qui l'on avait « vraiment joué ») et les conversations ouvertes.
  On ne pouvait pas enregistrer un ingénieur du son trouvé dans Découvrir
  sans avoir joué avec lui.
- Plusieurs écrans concluaient « vous avez joué ensemble » à partir de deux
  « J'y étais », qui sont de simples déclarations (#92).

## 2. Décision

1. **`SavedContact`** (`ownerId`, `contactId`, unique) : « j'ai enregistré
   cet acteur ». Unilatéral, privé, sans notification, sans réciprocité, sans
   prérequis (ni jam, ni collaboration, ni conversation). On l'ajoute et on
   le retire librement, depuis un profil, Découvrir ou une jam.
2. **Le carnet, c'est `SavedContact` seul.** Une conversation n'y ajoute
   personne ; Messages et Contacts sont deux entrées distinctes. On peut
   écrire sans enregistrer, et enregistrer sans écrire.
3. **Reprise de l'existant, sans perte** : chaque `MusicalTie` et chaque
   membre d'un groupe de contacts devient un `SavedContact` (idempotent).
   Les groupes de contacts restent intacts. `MusicalTie` n'est **plus écrit**
   mais n'est pas supprimé.
4. **Le carnet ne donne aucun droit** : il ne contourne ni la demande de
   premier message, ni le refus, ni le blocage, ni les règles des mineur·es,
   ni les quotas. **Inviter quelqu'un dans une discussion de groupe**, ou le
   **présenter** à un autre contact, exige désormais une **conversation
   acceptée** avec lui : sinon, enregistrer des inconnu·es puis les inviter
   en masse contournerait la demande de premier message.
5. **Libellés honnêtes** : « joué ensemble » seulement pour une collaboration
   confirmée ; une jam où les deux ont dit « J'y étais » se dit « même jam
   déclarée », et seulement si la présence de l'autre est visible (D81).
6. Le carnet sert encore à **classer** ses propres résultats (recherche,
   suggestions, invitations) : c'est privé et sans effet pour l'autre.

## 3. Conséquences

- « Garder le contact » ne refuse plus personne de visible.
- Un profil masqué, suspendu, bloqué ou supprimé disparaît du carnet affiché,
  sans rien révéler ; l'entrée reste supprimable.
- Notes privées sur un contact : reportées (pas en V1).

## Migration et retour arrière

La migration est additive : elle ne supprime ni les liens historiques ni les
membres des groupes. La reprise utilise `ON CONFLICT DO NOTHING` et peut être
rejouée. Un retour à l'ancien code reste possible tant que `saved_contacts`
est conservée ; ne pas supprimer cette table après utilisation, car les nouveaux
contacts n'existent pas dans `musical_ties`.
