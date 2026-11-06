# Groupes et adhésions (P3-01)

Un groupe est une **organisation** (`Organization`, `kind = BAND`) adossée
à un `Actor` de type `ORGANIZATION` : il a un `@handle` (partagé avec les
personnes), un nom, et sa propre piste d'XP (`BAND`). On en garde
l'historique comme un club : qui y a joué, et quand.

- **Modèle** : `Organization` (`formedAt`, `dissolvedAt`) et `Membership`
  (une ligne par période, invitation ou demande ; rôle OWNER, ADMIN ou
  MEMBER ; `title` libre, « basse, chœurs » ; `startedAt`, `endedAt`).
  Statuts : `INVITED`, `REQUESTED`, `ACTIVE` (ouverts), `LEFT`, `REMOVED`,
  `DECLINED` (clos). Un retour crée une nouvelle ligne. Au plus une ligne
  ouverte par personne et par groupe : index partiel `memberships_open_key`
  (SQL brut, protégé par `scripts/migration-clean.mjs`).
- **Règles pures** : `src/lib/bands/rules.ts` (formulaires, droits, départ,
  successeur, périodes), testées en tables.
- **Service** : `src/lib/server/bands/service.ts`, seul point d'écriture,
  sous verrou par groupe (`pg_advisory_xact_lock`).
- **Droits** : OWNER et ADMIN (« co-gestion ») invitent, acceptent les
  demandes et retirent les membres ; seul l'OWNER (« responsable ») change
  les rôles et transmet le groupe. Un groupe a **toujours un OWNER** :
  l'OWNER transmet avant de partir ; seul·e, son départ dissout le groupe
  (l'historique reste).
- **Progression (D37)** : créer un groupe ne rapporte rien. À la 2ᵉ
  adhésion active, le groupe est **formé** : `membership.accepted` pour
  chaque membre actif (fondateur compris, 200 XP) et étape `FORMATION`
  vérifiée (100 XP pour le groupe, 25 pour chaque membre présent). Chaque
  adhésion suivante émet `membership.accepted` (200, puis 100, 50 et 0 pour
  les retours dans le même groupe). Un départ ne reprend rien.
- **Mineur·es (D5, D37)** : un·e mineur·e ne reçoit d'invitation que d'une
  personne qu'il ou elle connaît (conversation acceptée des deux côtés, ou
  jouée ensemble) ; le refus ne dit pas pourquoi. Il ou elle peut demander
  à rejoindre un groupe.
- **Blocage (P2-05)** : pas d'invitation entre personnes bloquées ; une
  demande est refusée si une personne qui gère le groupe est bloquée ; la
  page du groupe n'est pas montrée si sa gestion a bloqué le lecteur.
- **Notifications** : `BAND_INVITE` (invitation reçue), `BAND_REQUEST`
  (demande reçue, pour la gestion), `BAND_JOINED` (nouveau membre, pour la
  gestion), avec leurs préférences dans `/reglages` et le digest.
- **Pages** : `/groupes` (mes groupes, invitations reçues, demandes
  envoyées), `/groupes/nouveau`, `/groupes/[handle]` (membres actuels et
  passés, invitations et demandes pour la gestion, « Demander à
  rejoindre », « Quitter le groupe »). Rattachées à l'onglet « Mon
  parcours » (mode carrière). La page publique `/@handle` du groupe arrive
  avec P3-02 (ci-dessous).
- **Page publique (P3-02)** : `/@handle` du groupe (`src/lib/server/bands/public.ts`,
  `BandProfile.svelte`), même visibilité qu'un profil (`publicActorWhere`,
  blocage dans les deux sens avec la gestion). Effectif actuel et passé
  avec rôle, « ce que j'y fais » et période ; présentation, genres, ville,
  liens d'écoute ; « Demander à rejoindre » pour un membre connecté ;
  signalement. Indexée et dans le sitemap une fois formée, tant qu'elle
  n'est pas dissoute ; données structurées `MusicGroup` (fondation,
  ville, membres adultes et visibles en `OrganizationRole`).
- **Membres sur la page publique (D38)** : compte supprimé « Compte
  supprimé » ; profil masqué ou suspendu « Un·e musicien·ne », sans lien ;
  mineur·e nommé·e seulement pour un membre connecté (`publicMember`),
  jamais dans les données structurées. Aucune donnée interne (identifiant,
  date de naissance, XP, confiance) dans la réponse (test d'intégration).
- **Fiche du groupe** : `/groupes/[handle]/modifier`, pour la gestion :
  nom, présentation (600 caractères, texte brut), genres (5 au plus),
  ville (centre de commune seulement), liens YouTube, SoundCloud ou
  Bandcamp. Quota et validation des liens suivent la confiance de la
  personne qui publie (le groupe reste au palier 0) ; un lien de groupe
  n'est jamais une « démo » qui rapporte de l'XP (les étapes, P3-04, s'en
  chargent). L'envoi de fichiers au nom du groupe viendra si le besoin
  se montre.
- **Profil d'une personne** : carte « Groupes » (groupes actuels, avec ce
  qu'elle y fait et depuis quand).
- **Recrutement (P3-03)** : annonce « cherche un membre » émise par le
  groupe ; accepter une candidature fait entrer la personne dans le groupe
  (`joinFromRecruitment`). Voir [annonces](../annonces/README.md#recrutement-dun-groupe-p3-03).
- **Genres** : facultatifs pour un groupe (une personne en déclare au
  moins un) ; enregistrés par `updateBandProfile`, sans toucher aux
  influences.
- **Limites** : 10 groupes actifs par personne, 20 invitations en attente
  par groupe.
- **RGPD** : adhésions dans l'export (`groupes`). À l'anonymisation, les
  adhésions en cours se closent (la personne reste dans l'historique,
  « Compte supprimé »), invitations et demandes sont supprimées, « invité
  par » est oublié ; un groupe dont elle était responsable passe à la
  co-gestion la plus ancienne, sinon au membre le plus ancien, sinon il est
  dissous.
- **Tests** : `src/lib/bands/rules.test.ts` ; intégration
  `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/bands`
  (historique après départs et retours, formation, OWNER, mineur·e,
  anonymisation ; page publique : effectif, mineure, données internes,
  sitemap, fiche) ; e2e `e2e/linkmusician/groupes.spec.ts` (création,
  invitation, départ, fiche, page publique vue par un visiteur).
