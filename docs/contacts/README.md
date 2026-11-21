# Contacts (P3-16b)

Le **carnet de contacts** (D45, D46, [D82](../decisions/D82-carnet-volontaire.md)) : on va à une jam sans connaître
personne, on en repart avec des contacts qu'on recontacte par l'app, sans
échanger son numéro.

- **Qui est un contact** : un acteur enregistré volontairement dans son
  carnet (`SavedContact`) : personne ou structure, sans prérequis, sans
  notification ni réciprocité. Une conversation n'y ajoute personne.
  Un profil masqué, suspendu, supprimé ou séparé par un blocage n'est jamais
  affiché (`publicActorWhere`), mais l'entrée reste supprimable.
- **Ajouter / retirer** : depuis `/@handle` (actions `saveContact` et
  `unsaveContact`) ; « Garder le contact » après une jam enregistre dans le
  même carnet. Retirer n'affecte pas les conversations. La migration
  `20261121141822_carnet_volontaire` reprend les anciens `MusicalTie` et les
  membres des groupes de contacts, sans suppression et sans doublon.
- **Aucun droit** : enregistrer ne contourne ni la demande de premier message,
  ni les refus, blocages, quotas, règles des mineur·es ou partage des jams.
  Une invitation en discussion et une présentation exigent aussi une
  conversation acceptée des deux côtés.
- **Page** : `/messages/contacts`, onglet de Messages (`MessagesTabs`,
  Conversations | Contacts) ; la barre de navigation ne change pas.
  - pour chaque contact : instrument, ce qui est établi (`howWeMet` : mêmes jams déclarées dont la présence est visible, collaborations confirmées), projets en commun (groupes actifs, morceaux crédités des deux côtés), groupes de contacts, **Écrire** (la conversation existante, sinon un premier message) ;
  - « Retirer de mon carnet » pour les gens du carnet ;
  - carnet vide : invitation à découvrir des profils.
- **Groupes de contacts** (`ContactGroup`, `ContactGroupMember`) : privés,
  20 par personne, 30 personnes par groupe, nom de 2 à 40 caractères ; ne
  contiennent que des personnes du carnet (vérifié à l'ajout). Créer, renommer,
  supprimer, ajouter, retirer. Ils ouvrent une discussion de groupe
  (P3-16c, ci-dessous).
- **Mis en avant** : « Garder le contact » sur « Qui était là ? » annonce
  « … rejoint tes contacts : tu le ou la retrouves dans Messages, onglet
  Contacts » ; le carnet de jams parle de « Mes contacts de jam » et mène
  à tous ses contacts ; aide `mode-jam` et `rencontrer`.
- **Règles pures** : `src/lib/contacts/rules.ts` (nom, `howWeMet`, ordre
  du carnet : rencontre commune la plus récente, puis nom), testées.
- **Service** : `src/lib/server/contacts/service.ts` (`myContacts`,
  `isContact`, `isReachableContact`, groupes) ; écriture du carnet dans
  `src/lib/server/network/service.ts` (`saveContact`, `removeContact`).
- **RGPD** : l'export liste le carnet (`carnet_de_contacts`), ses groupes et leurs membres ; à
  l'anonymisation, les entrées du carnet sont supprimées dans les deux sens ; ses groupes sont supprimés et la personne retirée des
  groupes des autres.
- **Tests** : `src/lib/contacts/rules.test.ts` ; intégration
  `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/contacts` ;
  intégration `src/lib/server/network/carnet.integration.test.ts` ;
  e2e `e2e/linkmusician/contacts.spec.ts` et `carnet.spec.ts`.

## Discussions de groupe (P3-16c, D46)

- **Ouverture** : « Ouvrir une discussion » sous un groupe de contacts
  (`openFromContactGroup`) ; titre = nom du groupe ; l'auteur y entre,
  chaque personne du groupe qui peut l'être est **invitée** (notification
  `GROUP_DISCUSSION_INVITE`). Les autres sont écartées sans bruit.
- **Invitation** : tant qu'elle n'a pas rejoint, la personne ne voit que le
  titre, l'auteur et qui est déjà là, jamais les messages ; **Rejoindre** ou
  **Non merci** (sans prévenir). « Non merci » et « Quitter » sont
  définitifs pour cette discussion : pas de réinvitation (le consentement
  prime). Seul l'**auteur** invite, et seulement les personnes de son carnet avec une conversation acceptée
  (`isReachableContact`, D82).
- **Mineur·es** : ni invité·es, ni autorisé·es à ouvrir une discussion au
  lancement (D46, `isIndexable`) ; la raison n'est jamais dite (même message
  que pour un blocage).
- **Blocage** : pas d'invitation entre l'auteur et une personne séparée par
  un blocage ; pas de « Rejoindre » si un blocage existe avec une personne
  déjà présente. Un blocage posé **après** coup ne ferme pas la discussion :
  on la quitte (limite connue, à revoir après le pilote).
- **Limites** : 30 personnes par discussion (invitées et présentes), 20
  discussions ouvertes par personne ; messages en texte brut, mêmes règles
  que la messagerie (`checkMessage`).
- **Messages** : section « Invitations à une discussion » puis
  « Discussions de groupe » dans `/messages` ; page
  `/messages/groupes/[id]` ; polling léger toutes les 15 s
  (`/api/discussions/[id]/nouveaux`, D8). La pastille de Messages compte les
  non-lus des discussions et les invitations en attente (`unreadTotal`).
- **Modèle** : `GroupDiscussion`, `GroupDiscussionMember` (`INVITED`,
  `ACTIVE`, `DECLINED`, `LEFT`), `GroupDiscussionMessage` ; tables à part de
  `Conversation` (une paire, `pairKey`).
- **RGPD** : export des discussions (statut, dates) et des messages
  envoyés ; à l'anonymisation, les invitations sont supprimées, la personne
  sort des discussions (`LEFT`) et le texte de ses messages devient
  « Message supprimé ».
- **Code et tests** : règles pures `src/lib/discussions/rules.ts` (testées) ;
  service `src/lib/server/discussions/service.ts` ; intégration
  `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/discussions` ;
  e2e `e2e/linkmusician/discussions.spec.ts`.
