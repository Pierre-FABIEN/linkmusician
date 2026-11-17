# Morceaux (P3-11, P4-07)

Le **morceau minimal** (D35, D40) : une idée qu'on note à plusieurs, qu'on
crédite, puis qu'on déclare composée avec une maquette. C'est le premier
maillon de la chaîne d'un morceau (conception 06 §4) : enregistrement,
production et sortie viendront en phase 4.

- **Modèle** :
  - `Work` : titre, `state` (`IDEA`, `COMPOSED`), `proof` (`DECLARED`, `CORROBORATED`, renseignée au passage à « composé »), porteur `ownerId` (un `Actor`, personne ou groupe), `createdById`, maquette `demoMediaId` (un `Media` du porteur), `demoFromWork`, `composedAt` ;
  - `WorkGenre` : 3 genres au plus ;
  - `WorkContributor` : une personne créditée, `invitedById`, `confirmedAt` ;
  - `WorkRole` : `INSTRUMENT` (du référentiel), `COMPOSITION`, `LYRICS` ou `ARRANGEMENT` ; rôles du son (P4-07) `RECORDING`, `MIXING`, `MASTERING`, `PRODUCTION`. Un rôle sans `contributorId` est **à pourvoir**.
- **Règles pures** : `src/lib/works/rules.ts` (formulaires, rôles, preuve,
  ce que déclenche une confirmation, lien « Recruter »), testées en tables.
- **Service** : `src/lib/server/works/service.ts`, seul point d'écriture,
  sous verrou par morceau (`pg_advisory_xact_lock`).
- **Droits** :
  - un morceau porté par une personne se gère par elle ;
  - un morceau porté par un groupe se gère par sa gestion (OWNER ou ADMIN actifs) ;
  - l'**équipe** (porteur, membres actifs du groupe, personnes créditées, même en attente) voit les idées ;
  - la gestion crédite, ouvre ou retire des rôles à pourvoir, joint la maquette, déclare le morceau composé, le renomme ou le supprime ;
  - elle retire un crédit **non confirmé** seulement. Une personne qui a confirmé retire elle-même son crédit, et ses rôles disparaissent ;
  - un crédit refusé (« Ce n'est pas moi ») rend ses rôles à pourvoir.
- **Crédits** : créditer une personne la prévient (`WORK_CREDIT`). Son nom
  n'apparaît publiquement qu'une fois qu'elle a confirmé : confirmer vaut
  consentement. Un rôle à pourvoir identique est pourvu, pas dupliqué. Se
  créditer soi-même vaut confirmation.
- **Composé (D35, D40)** : le bouton « C'est composé » exige une maquette
  (non refusée par la modération).
  - Avec moins de 2 crédits confirmés : _déclaré_, sans XP. Le morceau devient _corroboré_ à la 2ᵉ confirmation.
  - Avec 2 crédits confirmés ou plus : _corroboré_, et `work.composed` est émis.
  - Une confirmation sur un morceau déjà corroboré émet `work.credit_confirmed`.
- **Progression** : chaque contributeur confirmé reçoit 150 XP, une fois par
  morceau. On multiplie par la moyenne, sur les autres contributeurs, du
  rendement décroissant par paire (1 ; 0,5 ; 0,25 puis 0 sur 12 mois) et du
  poids de confiance de l'autre (`core/rules/workComposed.ts`).
  - « Une fois par morceau » tient même si la personne est retirée puis recréditée (`creditedOnWork`).
  - Retirer son crédit ou supprimer le morceau ne reprend rien.
  - Les co-crédits entrent dans la détection des cercles fermés (`jobs/collusion.ts`).
  - Les morceaux n'entrent pas (encore) dans la réputation ni dans les paliers.
- **Mineur·es (D5, D37)** : on ne crédite un·e mineur·e que si on le ou la
  connaît (conversation acceptée ou jouée ensemble, `canInviteMinor`) ; le
  refus ne dit pas pourquoi. Sur un morceau public, un·e mineur·e n'est
  nommé·e que pour un membre connecté (`publicMember`, D38).
- **Maquette** : un lien YouTube, SoundCloud ou Bandcamp, ou un média déjà
  publié du porteur. Jamais une « démo » qui rapporte de l'XP.
  - Un lien ajouté depuis le morceau suit la visibilité du morceau (`demoFromWork`) : tant que c'est une idée, il n'apparaît ni sur le profil, ni sur la page du groupe, ni à `/medias/[id]` (`notIdeaDemo`, `src/lib/server/works/visibility.ts`).
  - Un lien en attente de validation compte comme joint et s'affiche une fois validé.
- **Pages** :
  - `/morceaux` : crédits à confirmer, puis mes morceaux ;
  - `/morceaux/nouveau` : à moi ou au nom d'un groupe que je gère, `?groupe=` présélectionne ;
  - `/morceaux/[id]` : la fiche. 404 pour une idée hors de l'équipe ;
  - section « Morceaux » de la fiche du groupe (membres actifs) ;
  - carte « Morceaux » de `/@handle`, pour une personne (portés ou crédités) comme pour un groupe ;
  - entrée « Mes morceaux » dans Mon parcours.
- **Recruter** : un rôle à pourvoir ouvre `/annonces/nouvelle` prérempli
  (titre « Batterie pour « … » », instrument, `RECRUIT_MEMBER` au nom du
  groupe, sinon `SESSION_WORK`). Un rôle du son ouvre une annonce ciblée sur
  le métier, reliée au morceau (P4-05) : ingé son et sa spécialité, ou
  producteur·rice pour la production (`openRoleHref`).
- **Crédits du son (P4-07, conception 06 §4.4)** :
  - une collaboration liée au morceau (prise de son, mixage, mastering,
    production) crédite, une fois **terminée**, la personne qui a assuré la
    prestation : crédit **confirmé** d'office, puisque chacun·e a confirmé la
    collaboration (`creditFromCollaboration`, dans la transaction de la
    collaboration). Un rôle à pourvoir du même type est pourvu. Une personne
    déjà créditée reçoit le rôle en plus ; si son crédit attend encore sa
    réponse, il reste en attente. Au-delà des plafonds, rien n'est ajouté ;
  - l'équipe peut aussi créditer un rôle du son (groupe « Son » du
    sélecteur) : la personne confirme, comme pour tout crédit ;
  - un rôle du son crédite un **travail, pas une part d'auteur·rice** : une
    personne qui n'a que des rôles du son n'entre ni dans la corroboration
    du morceau composé, ni dans le partage de l'XP de composition
    (`confirmedAuthors`, `hasCreativeRole`), ni dans le bulletin de partage ;
    confirmer un tel crédit ne rapporte rien (la collaboration rapporte déjà) ;
  - affichage : sur le morceau, dans la carte « Morceaux » du profil, dans la
    carte « Ingé son » ou « Producteur·rice » (« Crédits confirmés »,
    `CraftCredits`) et dans « Crédits confirmés » de la fiche de carrière,
    où un rôle du son compte dès sa confirmation ;
  - **succès sans XP (P4-07b, D54)** : un crédit du son confirmé émet
    `work.sound_credited`, qui débloque _Première prise de son_, _Premier
    mixage_, _Premier mastering_ ou _Première production_ (jamais en se
    créditant soi-même sur son propre morceau) ; un morceau composé seul·e
    émet `work.composed_solo` : _Fait maison_, et _Orchestre à soi seul·e_
    si la personne y tient aussi un rôle du son ;
  - un crédit **non confirmé n'apparaît nulle part** hors de l'équipe du
    morceau (test d'intégration) ;
  - `MediaCredit`, cité par la conception, n'a jamais été créé : il n'y a
    rien à remplacer.
- **Étape « Première composition » (P3-04)** : `firstComposedWork(bandId)`
  donne le premier morceau composé du groupe et sa preuve.
- **RGPD** :
  - l'export liste les morceaux portés et les crédits ;
  - à l'anonymisation, les morceaux portés par la personne sont supprimés, ses crédits en attente aussi ;
  - ses crédits confirmés sur les morceaux des autres restent, affichés « Compte supprimé » ;
  - `invitedById` et `createdById` sont oubliés.
- **Tests** :
  - `src/lib/works/rules.test.ts` ;
  - règle et persona « deux ami·es qui enchaînent les morceaux » (`core/core.test.ts`, `core/personas.test.ts`) ;
  - intégration `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/works` (crédit du son en attente puis confirmé) et `src/lib/server/collaborations` (crédit d'une collaboration terminée) ;
  - e2e `e2e/linkmusician/morceaux.spec.ts` ; `collaborations-morceau.spec.ts` (étape 4, crédits confirmés de Sam).

Livrés en phase 4 : `Collaboration.workId` et états « enregistré » à
« produit » (P4-06), crédits du son (P4-07). Restent : « sorti » (phase 5),
propositions (`WorkPitch`, P4-08).

## Historique personnel des crédits (DASH-05m)

Les nouveaux actes de création avec crédit personnel, attribution de gestion,
auto-attribution, confirmation, refus, retrait personnel et retrait de gestion
sont conservés dans `WorkCreditAct`, indépendamment du crédit supprimable.
Une attribution de gestion attend le consentement ; un crédit automatique
n'invente aucun acte manuel. Aucun acte ancien n'est reconstitué.

Dans `/morceaux`, **Historique personnel des crédits** montre les 100 derniers
actes concernant son crédit ou réalisés par soi, sans titre, lien, rôles ni
identité du destinataire tiers. Cela reste personnel après retrait ou perte
de gestion et n'ouvre aucun accès aux morceaux privés ni aux actes des autres.
La suppression du morceau supprime ses actes ; celle du crédit les conserve.
L'export RGPD inclut tous les actes autorisés, et l'anonymisation oublie leurs
auteurs. Le journal n'ajoute ni notification, ni progression, ni réputation.
Audit complet, verrous et cascades : [conception du journal](../conception/16-journal-activite.md#actes-humains-des-crédits-de-morceaux-dash-05m).

### Concurrence de progression (ARCH-MET-02a)

La composition et les confirmations conservent le verrou du morceau, prennent
celui du groupe avant le moteur, puis préverrouillent ensemble les acteurs des
émissions successives (auteurs et membres historiques potentiellement concernés
par une étape). Les adhésions préparent aussi leur union d'acteurs sous le verrou
du groupe. Une collaboration conserve l'ordre collaboration → morceau avant ses
écritures, puis groupe → acteurs pour l'enregistrement et le concert.
Les règles de crédit, preuve et XP sont inchangées ; l'ensemble des effets reste
dans la transaction métier. Pas de migration ni de changement de parcours ; aide
et démo existantes restent applicables. Voir [le suivi de recette](../plan/README.md#arch-met-02a--ordre-des-verrous-56-15112026).

### Gestion et révocation concurrente (ARCH-MET-02b, #57)

Créer pour un groupe, modifier/supprimer, créditer/retirer un crédit en attente,
ouvrir/retirer un rôle libre, joindre une maquette et déclarer composé prennent
`work:` puis `band:` pour un groupe. L’existence du morceau et du porteur ainsi
que la gestion sont relues après attente : une révocation déjà validée interdit
la mutation. Une mutation déjà autorisée sous ces verrous peut terminer avant
la révocation. La création préalloue un identifiant privé et suit le même ordre.
Le retrait d’un rôle conserve son DELETE conditionnel : un rôle crédité ou
rattaché à un autre morceau ne peut pas être supprimé par cette commande.

La liste des morceaux gérables et les groupes proposés à la création partagent
le même prédicat que la décision : personne porteuse vivante ou OWNER/ADMIN
actifs d’un groupe vivant. L’équipe et le public gardent leurs lectures propres ;
MEMBER, crédit, métier et mandat ne donnent aucun outil de gestion.

Pour un nouveau lien de maquette, préparation réseau sans verrou SQL, puis
création, publication et association dans une seule transaction. Révocation,
suppression ou échec : aucun effet média persistant ; la compensation est le
rollback SQL. Aucun DELETE de compensation sur un média existant ou partagé.
Un média existant est relu et verrouillé avant association. Les tests à barrières
sont dans `works/access.integration.test.ts` ; le parcours morceaux vérifie aussi
les POST forgés de tiers, crédité et MEMBER. Aucune migration ni modification de
parcours : aide, seed, export et anonymisation existants restent applicables.
Retour par revert applicatif conservant les données, avec réintroduction de R2.

## Étapes prises en charge (DASH-06a, D68)

- **Quoi** : « Qui prend en charge ? » (`/morceaux/[id]/etapes`, résumé sur
  la fiche du morceau). Pour l'enregistrement, quatre réponses : moi-même
  (seule enregistrée), une personne de l'équipe (renvoie aux crédits), un·e
  professionnel·le (annonce ingé son existante), plus tard (rien n'est
  enregistré). Mixage, mastering et production : plus tard.
- **Modèle** : `WorkStep` (unique par morceau et étape ; mode `SELF`,
  responsable, lieu `HOME`, statut, `startedAt`, `doneAt`) et `WorkStepAct`
  (ajout seul : `CLAIMED`, `STARTED`, `FINISHED`, `RESET`, `REOPENED`,
  `RELEASED`, avec auteur, responsable concerné, statuts de départ et
  d'arrivée). Contrainte SQL `work_steps_status_dates_check` : dates
  cohérentes avec le statut. Le responsable d'un acte est une colonne sans
  clé étrangère (deux `SET NULL` vers `actors` sur une même ligne, plus la
  cascade de l'étape, faisaient échouer la suppression d'un compte).
- **Transitions** (`#lib/works/steps`, `planWorkStep`) : prendre → À faire ;
  commencer → En cours (date de début) ; terminer, avec confirmation → Terminé
  (date de fin), aussi depuis À faire ; remettre à faire efface le début ;
  rouvrir un Terminé → En cours. Rejouer une action ne crée aucun acte.
- **Droits** : prendre l'étape exige de gérer le morceau (porteur, ou
  OWNER/ADMIN actif d'un groupe vivant). Seule la personne responsable fait
  avancer le statut, tant qu'elle gère encore le morceau ; les autres
  gestionnaires peuvent libérer une étape non terminée. Ni métier d'ingé son,
  ni crédit, ni simple adhésion ne donnent ces droits.
- **Concurrence** : chaque mutation passe par `loadManagedWork` (verrou
  `work:` puis `band:`, gestion relue) et relit l'étape sous ce verrou. Le
  formulaire renvoie la **révision** vue (`WorkStep.revision`, +1 à chaque
  transition) : un changement calculé sur une révision dépassée est refusé
  sans acte (deux onglets) ; un rejeu sans effet reste sans effet. L'étape et
  son acte s'écrivent dans la même transaction (échec de l'acte = rien).
- **Lecture** : l'équipe du morceau voit l'étape ; l'historique est réservé à
  la gestion et à la personne responsable. Rien de public.
- **Sans effet** : ni `recordedAt`, ni parcours de campagne, ni crédit de
  prise de son, ni coup de pouce, ni XP ; « déclaré par », jamais vérifié
  (cohérence avec les faits indépendants : DASH-06c, #53).
- **RGPD** : export (`morceaux.etapes_prises_en_charge`,
  `morceaux.actes_d_etapes`) ; l'anonymisation oublie responsable et auteurs ;
  les étapes partent avec les morceaux portés.
- **Tests** : `steps.test.ts` (20), `steps.integration.test.ts` (parcours,
  course, groupe et révocation, RGPD, suppression d'un compte, révision
  périmée, rollback), E2E `etapes-autonomes.spec.ts` (Thomas, clavier,
  390 px, axe, rechargement, POST forgés et périmés).
- **Migrations** : `20261117031648_work_steps`,
  `20261117033626_work_step_acts_responsable_sans_fk`,
  `20261117040040_work_steps_revision` (ajouts seuls).
- **Pas encore** (#51 à #54) : modes membre et externe, notes et livrables,
  journal commun, effets sur le parcours et suggestions (#53), recette
  complète du parcours de Thomas (#54). Crédit de prise de son : DASH-06b
  ci-dessous.

## Rôles du son ajoutés à son crédit (DASH-06b, D69)

- **Quoi** : sur la fiche du morceau, « Tu assures aussi le son ? » ajoute
  prise de son, mixage, mastering ou production à **son propre** crédit
  (`addOwnSoundRole`, action `?/addSoundRole`). Visible seulement pour la
  gestion déjà créditée et confirmée, et seulement les rôles pas encore
  tenus.
- **Règles** : un seul `WorkContributor` ; un rôle à pourvoir du même type
  est pourvu, sinon une ligne est créée (plafond `MAX_ROLES`). Rejouer ne
  change rien. Pas de crédit pour autrui (accord explicite : lot distinct).
- **Droits** : gestion relue sous verrou (`loadManagedWork`). Un tiers, un
  membre non gestionnaire ou un crédit en attente sont refusés.
- **Acte** : `WorkRoleAct` (`ADDED`, rôle, instant), en ajout seul et
  répétable, distinct de `WorkCreditAct` (l'attribution initiale n'est pas
  rejouée). Visible dans l'historique privé des crédits (`/morceaux`).
- **Effets** : aucune part ni XP de composition, aucune preuve. Sur son
  propre morceau, `work.sound_credited` (sans XP) peut débloquer « Orchestre
  à soi seul·e » ; les succès d'un crédit du son reçu (« Première prise de
  son »…) ne se débloquent pas par un auto-crédit.
- **Concurrence** : verrou `work:` partagé avec `creditFromCollaboration` ;
  une course auto-crédit / crédit de collaboration laisse un seul rôle.
- **RGPD** : export `morceaux.roles_ajoutes` ; les actes suivent le crédit
  (conservé en « Compte supprimé ») et partent avec les morceaux portés.
- **Tests** : `rules.test.ts`, `own-roles.integration.test.ts` (6 :
  Thomas, rejeu, rôle à pourvoir, tiers/attente, groupe, course, RGPD).
- **Migration** : `20261117130312_work_role_acts` (ajout seul).

## Réalisation déclarée (DASH-06c, D70)

- **Une seule règle** : `productionStages` (`#lib/works/production`) dit,
  pour chaque étape du son, si elle est franchie par un **fait de
  collaboration** (date `Work.recordedAt`…) ou par une **réalisation
  déclarée** (étape prise soi-même et terminée). Le fait de collaboration
  prime toujours. Lecture serveur : `stepFactsOf` (`server/works/production.ts`).
- **Rien n'est écrit** : `recordedAt` reste la date de la première
  collaboration terminée. La date déclarée est lue sur l'étape ; rouvrir ou
  libérer l'étape la retire, sans toucher au fait de collaboration.
- **Affichage** (équipe seulement, D68) : pastille « Enregistré le … ·
  déclaré par Thomas » sur la fiche, et étape « Fait soi-même · déclaré par »
  dans le chemin du morceau (`workJourney`, jamais « vérifié »).
- **Besoin réel** (`nextProductionNeed`) : enregistrement s'il n'est ni fait
  ni pris en charge ; une fois enregistré (même déclaré), mixage s'il n'est
  ni fait ni pris en charge. Il règle « La suite du morceau » et les coups de
  pouce (`TO_RECORD`, nouveau `TO_MIX`). Chercher un·e pro reste possible.
- **Sans effet** : aucun événement, aucune XP, aucun succès, aucun
  `collaboration.completed`, aucun crédit automatique. La carte de carrière
  (acte IV) exige toujours une étape de groupe corroborée ou vérifiée.
- **Tests** : `production.test.ts` (6), `production.integration.test.ts`
  (Thomas, collaboration prioritaire et réouverture, lecteur hors équipe),
  coups de pouce (`nudges.test.ts`, `nudges.integration.test.ts`).
- **Migration** : aucune.
