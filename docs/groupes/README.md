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

## Actes personnels d’entrée et de sortie (DASH-05g)

Les invitations acceptées/refusées et annulées, demandes envoyées, acceptées,
déclinées, retirées par leur auteur ou closes par dissolution, entrées par
recrutement, départs et retraits ont désormais une trace `MembershipDecision`
avec auteur réel et date, dans la même transaction sous verrou `band:`.
Le lecteur **Mes structures › Historique de mes participations** inclut les
propres périodes des groupes vivants, après départ ou refus, sans outil ni
lecture des collègues. La fiche de participation courante perd toujours son
accès après départ ; aucun journal personnel n’est ajouté à la page publique.
Un groupe masqué n’interdit pas la lecture de ses propres actes privés ; les
groupes supprimés ou dissous sont exclus du lecteur. L’export RGPD conserve
leurs actes, y compris ceux de dissolution et les décisions pour autrui.

Une demande et sa réponse ont des auteurs distincts ; l’acceptation d’un
recrutement est attribuée au gestionnaire qui l’a décidé, sans fabriquer un
accord d’invitation du candidat. Une invitation/demande déjà ouverte est
conservée lors de l’entrée par recrutement. La dissolution par le départ du
seul responsable conserve son départ, les annulations d’invitations et les
clôtures de demandes avec son identité, sans inventer un refus personnel.
Un retrait de demande exige désormais aussi un groupe vivant.

Les appels répétés/concurrents relisent l’état et ne doublonnent ni n’écrasent
les actes. Une nouvelle invitation ou demande crée une nouvelle période.
Les effets de progression, formation, notifications, quotas et règles pour
les mineur·es gardent leur fonctionnement ; la lecture n’émet aucun effet.
Aucun titre libre, message ou motif recopié, aucun ancien acte reconstruit.
L’anonymisation efface les auteurs selon le registre commun sans créer de
trace humaine de ses successions techniques.

Migration additive `20261114195003_membership_band_admissions` : six valeurs
d’enum, sans nouvelle table ni modification d’index ; anciennes données
conservées. PostgreSQL ne retire pas directement les valeurs d’enum : le
retour applicatif doit rester compatible avec les nouveaux actes, toute
restauration complète exige une sauvegarde cohérente.

Les changements de rôle et transmissions répétables des groupes restent dans
le lot suivant : la contrainte actuelle participation/type n’est pas adaptée
à leur répétition sur une même période. DASH-05 reste ouvert. Intégrations
`bands/history.integration.test.ts`, services de groupe et recrutement ;
E2E `groupes.spec.ts` enrichi, `recrutement.spec.ts` et `structures.spec.ts`.

## Rôles et transmissions personnels (DASH-05h)

`setRole` conserve chaque passage MEMBER → ADMIN et ADMIN → MEMBER. Un rôle
identique est sans effet ; les droits sont vérifiés même dans ce cas.
`transferOwnership` conserve deux actes personnels datés du même instant et
attribués au cédant : responsabilité transmise (il devient ADMIN), responsabilité
reçue (la cible devient OWNER). Les allers-retours et nouvelles transmissions
sur les mêmes périodes restent tous conservés. Rejouer une transmission avec
l’ancien responsable est refusé ; le verrou `band:` arbitre les appels concurrents.
Toute erreur de trace annule les rôles et les deux actes de la transmission.

Les quatre nouveaux types `BAND_*` sont répétables ; un index SQL unique partiel
maintient la protection des douze types précédents. Les deux migrations du lot
sont à déployer ensemble avant de reprendre les écritures ; détails et limites
de retour dans [la conception](../conception/16-journal-activite.md).
Lecteur strictement personnel et export/anonymisation communs réutilisés.
Aucun journal de collègues ni nouvel accès aux outils, aucune notification ou
progression ajoutée, aucune succession technique RGPD présentée comme un acte
humain. Aucun événement ancien reconstruit. Démo dédiée « Démo — Rôles du groupe ».
Écoles, validations et options restent à suivre ; DASH-05 reste ouvert.

## Gestion des morceaux et révocation (ARCH-MET-02b)

Les mutations Work du groupe prennent leur verrou `work:` puis la même clé
`band:` que les changements d’adhésion/rôle, avant de relire la gestion.
Une révocation validée pendant l’attente interdit leur écriture ; une mutation
déjà autorisée sous ces verrous peut terminer avant la révocation.
`managedBands` partage le prédicat OWNER/ADMIN actifs d’un BAND vivant avec
la gestion Work. Un membre ou un mandat ne reçoit aucun droit de gestion
par ce mécanisme. Les règles d’équipe et de visibilité restent distinctes.

## Formation et répertoire (ONB-12c1, D64)

- **Ce que c'est** : la fiche de mise en relation du groupe, table
  `band_profiles` (une ligne par groupe, `formation` : `SOLO`, `DUO`, `TRIO`,
  `BAND` ; `repertoire` : `COVERS`, `ORIGINALS`, `BOTH`). Un duo ou un groupe
  de reprises est une organisation, jamais une personne : rien sur le profil
  d'un·e musicien·ne seul·e.
- **Écriture** : la gestion (OWNER, ADMIN) dans « Modifier la fiche du
  groupe », par `updateBandProfile`, sous le verrou du groupe et la même
  relecture de gestion que le reste de la fiche. Codes relus par Zod
  (`bandLineupSchema`) ; vide = non précisé. Un appel sans ces champs ne les
  efface pas.
- **Lecture** : publique sur `/@handle` (« Sur scène », « Déclaré par le
  groupe »), comme la fiche ; résumé sur `/groupes/[handle]`. Un écart avec
  l'effectif actif est signalé à la gestion, jamais corrigé
  (`formationHint`) : des membres peuvent ne pas monter sur scène.
- **Rapprochement** (préparé pour ONB-13b) : `formationMatch` et
  `repertoireMatch` (`src/lib/bands/lineup.ts`) renvoient `yes`, `no` ou
  `unknown` ; une valeur absente n'exclut jamais, « les deux » répond aux
  deux recherches. Aucune XP, aucun tri.
- **RGPD** : données de l'organisation, comme sa présentation : pas d'auteur
  conservé, hors export personnel, supprimées en cascade avec le groupe.
- **Tests** : `lineup.test.ts`, `public.integration.test.ts` (refus d'un
  membre, non précisé, conservation, une seule ligne), E2E `groupes.spec.ts`
  (clavier, 390 px, axe, POST forgés hors gestion et code inconnu).
