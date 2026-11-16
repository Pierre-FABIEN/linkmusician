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
