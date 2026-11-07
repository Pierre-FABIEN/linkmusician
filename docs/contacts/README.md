# Contacts (P3-16b)

Le **carnet de contacts** (D45, D46) : on va à une jam sans connaître
personne, on en repart avec des contacts qu'on recontacte par l'app, sans
échanger son numéro.

- **Qui est un contact** : les gens de son carnet (`MusicalTie`, « Garder
  le contact » après avoir vraiment joué ensemble, P2-16) et les personnes
  avec qui l'on a une conversation ouverte des deux côtés. Jamais une
  demande sans réponse, ni un profil masqué, suspendu ou séparé par un
  blocage (`publicActorWhere`).
- **Page** : `/messages/contacts`, onglet de Messages (`MessagesTabs`,
  Conversations | Contacts) ; la barre de navigation ne change pas.
  - pour chaque contact : instrument, comment on s'est rencontrés (`howWeMet` : jams ensemble, collaborations), projets en commun (groupes actifs, morceaux crédités des deux côtés), groupes de contacts, **Écrire** (la conversation existante, sinon un premier message) ;
  - « Retirer de mon carnet » pour les gens du carnet ;
  - carnet vide : invitation à aller à une jam.
- **Groupes de contacts** (`ContactGroup`, `ContactGroupMember`) : privés,
  20 par personne, 30 personnes par groupe, nom de 2 à 40 caractères ; ne
  contiennent que des contacts (vérifié à l'ajout). Créer, renommer,
  supprimer, ajouter, retirer. Ils ouvriront une discussion de groupe
  (P3-16c).
- **Mis en avant** : « Garder le contact » sur « Qui était là ? » annonce
  « … rejoint tes contacts : tu le ou la retrouves dans Messages, onglet
  Contacts » ; le carnet de jams parle de « Mes contacts de jam » et mène
  à tous ses contacts ; aide `mode-jam` et `rencontrer`.
- **Règles pures** : `src/lib/contacts/rules.ts` (nom, `howWeMet`, ordre
  du carnet : gardé·es d'abord, puis le plus récent ensemble), testées.
- **Service** : `src/lib/server/contacts/service.ts` (`myContacts`,
  `isContact`, groupes).
- **RGPD** : l'export liste ses groupes et leurs membres ; à
  l'anonymisation, ses groupes sont supprimés et la personne retirée des
  groupes des autres.
- **Tests** : `src/lib/contacts/rules.test.ts` ; intégration
  `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/contacts` ;
  e2e `e2e/linkmusician/contacts.spec.ts`.
