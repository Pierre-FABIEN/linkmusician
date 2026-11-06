# Morceaux (P3-11)

Le **morceau minimal** (D35, D40) : une idée qu'on note à plusieurs, qu'on
crédite, puis qu'on déclare composée avec une maquette. C'est le premier
maillon de la chaîne d'un morceau (conception 06 §4) : enregistrement,
production et sortie viendront en phase 4.

- **Modèle** :
  - `Work` : titre, `state` (`IDEA`, `COMPOSED`), `proof` (`DECLARED`, `CORROBORATED`, renseignée au passage à « composé »), porteur `ownerId` (un `Actor`, personne ou groupe), `createdById`, maquette `demoMediaId` (un `Media` du porteur), `demoFromWork`, `composedAt` ;
  - `WorkGenre` : 3 genres au plus ;
  - `WorkContributor` : une personne créditée, `invitedById`, `confirmedAt` ;
  - `WorkRole` : `INSTRUMENT` (du référentiel), `COMPOSITION`, `LYRICS` ou `ARRANGEMENT`. Un rôle sans `contributorId` est **à pourvoir**.
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
  groupe, sinon `SESSION_WORK`).
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
  - intégration `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/works` ;
  - e2e `e2e/linkmusician/morceaux.spec.ts`.

Reportés à la phase 4 : `Collaboration.workId`, états « enregistré » à
« sorti », crédits d'enregistrement et de production, propositions
(`WorkPitch`).
