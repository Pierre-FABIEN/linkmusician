# Mode jam

Module LinkMusician (lots P2-12 et P2-13, décisions D21, D26 et D5).
Jouer pour le plaisir et rencontrer, sans projet ni engagement.

## Écrans

- **`/jouer`** : première page après la connexion et l'onboarding, le
  « menu du jeu » : Mode carrière (tableau de bord) ou Mode jam, chaque
  carte disant comment on y avance. Le dernier choix est retenu
  (`Person.preferredMode`, « Reprendre »). La première fois, une
  **présentation en 3 étapes** (`/jouer/carriere`, `/jouer/jam`).
- **Navigation (D48)** : raccourcis Découvrir, Messages et Notifications
  dans l'en-tête ; Profil dans le menu du compte. La pastille du mode
  bascule directement entre Jam et Carrière.
- **« Ta prochaine étape »** (`src/lib/jam/guide.ts`) : ville → se mettre
  dispo (ou repérer une jam, pour les mineur·es) → écrire à quelqu'un →
  confirmer la jam (points) → passer en mode carrière.
- **`/jam`** : page-menu (D50) : « Ta prochaine étape », puis, mise en
  avant, Apprécier les musicos croisés (`/jam/apprecier` : jam en cours et
  jams des 7 derniers jours, autres présent·es et appréciations laissées,
  `crossedJams`, `crossedStatus`, badge « Jam en cours » ou « N à
  apprécier », chaque jam menant à « Qui était là ? »), Les musicos
  dispo autour de moi (`/jam/dispos` : « Je suis dispo » et les dispos),
  Jams à venir (`/jam/agenda` : calendrier mensuel et lieux), Mes jams
  (`/jam/mes-jams` : invitations du lead, dernières jams), Lancer une jam
  (organisateurs seulement, D51), Mon carnet et mon réseau.
- **Organisateurs (D51)** : `Person.organizesJams`, case « Je suis prêt·e
  à organiser des jams » de `/profil`, offerte aux adultes seulement
  (`#lib/jam/organizer`). Seul·es ces profils lancent une jam
  (`createJam` refuse sinon, `/jams/nouvelle` renvoie vers
  `/profil?organiser=1#organiser`) ; « Lancer une jam », « Publier une jam
  ici » et « Rejouer ensemble » ne s'affichent qu'à eux. Les autres
  s'écrivent par la messagerie et peuvent déclarer une collaboration. Ces
  profils seront proposés aux structures (phase 5). Migration : les
  personnes qui avaient déjà publié une jam ont été cochées. RGPD : export
  `pret_a_organiser_des_jams`, remis à faux à l'anonymisation.

## « Je suis dispo » (P2-13)

- Une disponibilité par personne : **ce soir**, **demain** ou **ce
  week-end**, calculée à l'heure de Paris (heure d'été comprise), avec une
  note facultative (140 caractères, texte brut). Elle **s'éteint seule** à
  la fin du créneau ; la tâche quotidienne (`/api/jobs/opportunities`)
  efface les échues.
- **Dispos autour de toi** : dans ton rayon de déplacement (25 km par
  défaut), les plus tôt dispos d'abord ; commune et tranche de distance,
  instrument, note, et « Lui proposer de jouer » (messagerie).
- 5 activations d'affilée, puis une toutes les ~5 h.
- **Jamais** un profil masqué, suspendu, ou séparé de moi par un blocage.

## Sécurité (D5, D26)

- Une jam a lieu dans un **lieu public ou professionnel** (bar,
  café-concert, salle, scène ouverte, MJC, local de répétition, studio),
  **jamais chez un particulier**.
- **Mineur·es** : leur disponibilité n'est montrée à personne, donc le
  bouton ne leur est pas proposé ; ils rejoignent les jams ouvertes qui
  finissent avant 22 h ; la prise de contact suit la messagerie
  restreinte (D5).

## RGPD

La disponibilité figure dans l'export et est effacée à l'anonymisation.

## Code et tests

- Créneaux, note : `src/lib/jam/availability.ts` (pur, testé).
- Service : `src/lib/server/jam/availability.ts`.
- Modes : `src/lib/linkmusician/modes.ts`.
- E2E : `e2e/linkmusician/modes.spec.ts`, `e2e/linkmusician/dispo.spec.ts`.

## Annuaire des lieux (P2-14a)

- **Pourquoi** : la plupart des jams sont tenues par un hôte, souvent un
  bar ou une MJC (D27). Une jam se tient toujours dans un lieu de
  l'annuaire, jamais chez un particulier (D26).
- **Données** : `Venue` (nom, clé de doublon `nameKey`, type, commune et
  son centre aligné sur la grille, jamais d'adresse). `claimedByActorId`
  sert à la revendication par le lieu (P5-03).
- **Règles** : `#lib/venues/rules` (types, nettoyage du nom, clé de
  doublon sans accents ni article) ; service `#server/venues/service`
  (ajout limité à 5 par jour, recherche, lieux dans un rayon de 50 km).
- **Écrans** : `/lieux`, `/lieux/nouveau`, `/lieux/[id]` (signalement),
  section « Lieux de jam » sur `/jam`, étape « Trouve un lieu pour
  jouer » du guide.
- **RGPD** : les lieux ajoutés figurent dans l'export (`lieux_ajoutes`) ;
  à l'anonymisation, ils restent (lieux publics) liés à l'acteur
  anonymisé.
- **Points** : ajouter un lieu ne rapporte rien. Une jam n'est plus une
  collaboration : seules les appréciations après la jam rapporteront
  (P2-15).

## Revendication d'un lieu, niveau 1 (P5-03a, D31)

- **Pourquoi** : ajouter un lieu reste ouvert à tous ; **revendiquer** sa
  fiche (devenir le lieu sur LinkMusician) exige une preuve de gestion.
- **Parcours** : sur `/lieux/[id]` (lieu confirmé, pas encore géré),
  « C'est mon lieu » donne un code `LM-XXXXXXXX` (8 caractères sans
  ambiguïté, le même tant que la demande est ouverte). La personne le
  publie dans la bio du compte Instagram ou Facebook officiel, ou sur une
  page du site, puis colle le lien : la demande passe en file de
  `/moderation` (« Lieux à revendiquer »). La modération ouvre le lien,
  vérifie le code et que la page est bien celle du lieu, puis approuve ou
  refuse avec un motif.
- **Approbation** : l'organisation `VENUE` naît (nom du lieu, handle
  libre), gérée par la personne (OWNER) ; `Venue.claimedByActorId` pointe
  sur **l'organisation**, pas sur la personne ; la fiche affiche « Géré par
  le lieu ». Les autres demandes ouvertes sur ce lieu sont refusées. Le
  matériel sur place passe à la gestion du lieu. Un lieu n'a pas de page
  `/@handle` : elle redirige vers sa fiche (Q19).
- **Règles** : majeur·es seulement (D5, Q27) ; trois revendications par
  30 jours, trois lieux gérés au plus ; l'organisation naît à
  l'approbation (Q28). `#lib/venues/claim` (pur), service
  `#server/venues/claims`, modèle `VenueClaim`.
- **Niveau 2** « Gérant vérifié » (dirigeants de l'API Recherche
  d'entreprises, ProConnect) : reporté après le lancement (Q20).
- **RGPD** : revendications dans l'export (`revendications_de_lieux`) ; à
  l'anonymisation, le demandeur et le lien de preuve sont effacés.
- **Points** : aucun. Le lieu gagne un rang (`venueTier`, P5-03b).
- **Décision notifiée** (P5-03b, Q29) : approbation ou refus envoient une
  notification `VENUE_CLAIM` vers la fiche du lieu.

## Fiche du lieu (P5-03b)

- **Modèle** : `VenueProfile` sur l'organisation `VENUE` (jauge, scène et
  son, conditions `VenueCondition` : cachet, chapeau, défraiement ; jours ;
  accueil des mineur·es `VenueAgeRule` ; publication). Genres :
  `actor_genres` de l'organisation ; matériel : `Venue.backline`.
  - Règles pures : `src/lib/venues/profile.ts` (formulaire,
    `publicationGaps`, `venueQuests`, `VENUE_LEARNING`).
  - Service : `src/lib/server/venues/profile.ts`, seul point d'écriture.
- **Gestion** : `/lieux/[id]/gerer` (lien « Gérer la fiche du lieu » sur
  `/lieux/[id]`, « Mes lieux » sur `/organisations`). Dans l'ordre :
  prochaines étapes, dates, fiche, publication, « Apprendre le métier »
  (licence, GUSO, SACEM : des liens, rien n'est géré), vérification SIRET
  (P5-02), co-gestion.
- **Publication** : jauge, scène et son, un genre, une condition
  (`publicationGaps`) ; publiée, la fiche donne le rang « Lieu ouvert ».
  Une fiche qui perd une condition repasse en brouillon.
- **Ville** : l'organisation prend la commune du lieu (`actor_locations`) à
  l'enregistrement : ses dates se diffusent autour de lui.
- **Dates** : « Publier une date » ouvre `/plateaux/nouveau` au nom du lieu,
  le lieu verrouillé. La gestion d'un lieu publie **sans le métier
  d'organisateur·rice** (Q34), majeure, fiche publiée, et seulement chez
  elle (`createGigSlot`).
- **Page publique** `/lieux/[id]` : « Jouer ici » (jauge, conditions,
  jours, public, genres, scène, contacts de la gestion) et « Dates à
  venir » (plateaux ouverts au lieu, d'auteurs visibles), avec le rang.
  Pas de `/@handle` (Q19).
- **Rang** (`venueSummary`) : publié, puis les dates `gig.held` tenues au
  lieu et confirmées hors organisation (P5-06) ; jamais l'XP (Q24).
- **Co-gestion** : commune aux organisations
  (`organizations/comanagement.ts`) ; une personne majeure, sans métier
  exigé (Q18). Invitation `ORG_INVITE`, réponse sur `/organisations`.
- **Mineur·es** : l'accueil déclaré par le lieu s'affiche ; son effet sur
  le mode jam vient avec les jams publiques des lieux (P5-04).
- **RGPD** : la gestion d'un lieu figure dans l'export (`organisations`) ;
  à l'anonymisation, elle se clôt (règle commune des organisations).
- **Tests** : `src/lib/venues/profile.test.ts`,
  `core/venueSummary.test.ts` ; intégration
  `venues/profile.integration.test.ts` ; e2e
  `e2e/linkmusician/lieu-fiche.spec.ts`.
- **Photos** (P5-03d) : des `Media` `IMAGE` portés par l'organisation du
  lieu, envoyés par sa gestion (`/api/media/sign` avec `forHandle` = le nom
  d'utilisateur de l'organisation, `venueForPhotoUpload`, essayé avant le
  studio). Validation et quota suivent la confiance de qui envoie
  (`uploadedById`, identifiant interne jamais affiché). 8 au plus
  (`MAX_VENUE_PHOTOS`), aucune XP. Gestion : état et retrait
  (`deleteVenuePhoto`) ; page du lieu : photos publiées, la première en
  grand (`publicVenueProfile`). Tests : intégration (Cloudinary simulé),
  e2e `lieu-photos.spec.ts` (photo déjà en ligne : pas de Cloudinary en
  e2e).
- **Plus tard** : gérant vérifié, niveau 2 (P5-03c, après le lancement).

## Jams publiques (P2-14b)

- **Données** : une jam est une `Opportunity` `JAM` avec `venueId`
  (obligatoire à la création), `startsAt`, `endsAt` (heure de Paris
  convertie en UTC) ; `JamSpot` (places souhaitées par instrument) ;
  `JamAttendance` (« Je viens », sans acceptation, retirable, sans XP).
- **Règles** : `#lib/jam/publicJam` (créneau, fin après minuit le
  lendemain, 8 h au plus, 60 jours à l'avance au plus, couvre-feu
  `endsBeforeCurfew` des mineur·es à 22 h) ; service
  `#server/jam/publicJams` (`createJam`, `upcomingJamsNear` dans les
  lieux à 50 km, `upcomingJamsAt`, `getJam`, `comeToJam`,
  `notComingToJam`).
- **Mineur·es (D5)** : ne voient, ne rejoignent et ne publient que des
  jams finies le jour même avant 22 h.
- **Écrans** : `/jams/nouvelle` (lieu de l'annuaire, jour, début, fin,
  style, places), `/jams/[id]` (« Je viens »), jams à venir sur `/jam` et
  sur la fiche du lieu (« Publier une jam ici »). Les annonces ne
  proposent plus le type Jam (`/annonces/nouvelle?type=JAM` redirige).
- **Calendrier** : le calendrier accessible sur `/jam` repère les jours
  contenant des jams dans le fuseau de Paris. Sélectionner une date affiche
  ses événements ; les jours marqués sont aussi annoncés par lecteur d'écran.
- **RGPD** : « Je viens » dans l'export (`jams_je_viens`), supprimés à
  l'anonymisation.

## Formation du lead et matériel sur place (P2-14c)

- **Lead** : `Opportunity.leadActorId`, désigné par l'hôte sur la fiche
  de la jam (vide : l'hôte est le lead, `leadOf`). L'hôte et le lead
  composent la formation et ajustent le matériel.
- **Places réservées** : `JamInvite` (une par jam et par personne,
  instrument parmi les places souhaitées, statut `INVITED`, `ACCEPTED`
  ou `DECLINED`). Une invitation **en attente ou acceptée tient la
  place** ; refusée ou retirée, elle la libère. L'invité·e la voit sur
  `/jam` (« On t’invite à jouer ») et répond sur la fiche. Acceptée,
  elle compte dans « viennent » et apparaît dans « La formation ». Un·e
  membre de la formation qui ne vient plus libère sa place.
- **« Je viens » avec un instrument** (`JamAttendance.instrumentId`,
  facultatif, l'instrument principal par défaut) : il ne prend qu'une
  place **ouverte**, jamais une place réservée. Un instrument complet
  n'empêche pas de venir (`spotBoard`, testé).
- **Invitations** : par identifiant, avec en suggestion le réseau du lead
  (conversations acceptées, partenaires de collaboration). Jamais un
  profil masqué, suspendu ou bloqué ; un·e mineur·e seulement à une jam
  finie avant 22 h.
- **Matériel** : enum `BacklineItem` (batterie, ampli basse, ampli
  guitare, clavier, sono et micros, câbles). `Venue.backline` est
  modifiable par le lieu qui a revendiqué sa fiche, sinon par son auteur
  ou un membre TL1. `Opportunity.backline` en est une copie à la
  création, ajustable par l'hôte ou le lead. La fiche dit à chacun·e
  quoi apporter selon son instrument (`whatToBring`, `packingSentence` :
  « Apporte ta basse et tes câbles. Sur place : l’ampli basse. »).
- **Validation des lieux (D26)** : un lieu ajouté par un compte TL0
  reste **en attente** (`Venue.validatedAt` nul) : absent de la
  recherche, des listes et des jams, visible de son seul auteur
  (« Tes lieux en attente ») et des membres TL1, qui peuvent le
  confirmer (`confirmedById`, liste « À confirmer près de toi »). Un
  modérateur peut aussi le valider (`/moderation`, « Lieux à valider »,
  journal d'audit). Un lieu ajouté par un membre TL1 est validé tout de
  suite. Les lieux antérieurs ont été validés par la migration.
- **Points** : rien de tout cela ne rapporte d'XP (D27).
- **RGPD** : invitations reçues (`jams_invitations`), jams dont on est
  lead (`jams_lead`), lieux confirmés (`lieux_confirmes`) et instrument
  de « Je viens » dans l'export. À l'anonymisation, les invitations
  sont supprimées et le lead retiré (l'hôte reprend la main) ; les
  lieux confirmés restent, liés à l'acteur anonymisé.
- **Code** : `#lib/jam/lineup` (pur, testé), `#server/jam/publicJams`
  (`inviteToJam`, `respondToJamInvite`, `cancelJamInvite`, `setJamLead`,
  `setJamBackline`, `myJamInvites`), `#server/venues/service`
  (`confirmVenue`, `setVenueBackline`, `myPendingVenues`),
  `validateVenue` (modération). E2E : `jams.spec.ts`, `lieux.spec.ts`.

## Lieux vérifiés par SIRET (P2-14d, D30)

- **Table de référence** `Establishment` : établissements de Toulouse
  Métropole importés de l'API publique Recherche d'entreprises
  (`npm run seed:etablissements`, relançable ; ≈ 1 400 au 05/11/2026) :
  débits de boissons (56.30Z), salles de spectacle (90.04Z), studios
  (59.20Z), enseignement culturel (85.52Z), MJC. **Jamais de nom de
  personne** (entreprise individuelle sans enseigne écartée) **ni
  d'adresse** : enseigne, activité, commune. Elle ne remplit pas
  l'annuaire : elle sert aux suggestions et à la vérification. À lancer
  aussi sur la base de production (P3-10).
- **Ajout d'un lieu** : pendant la saisie du nom, suggestions
  d'établissements (`/api/etablissements`, comptes connectés) ; en
  choisir un remplit le nom, le type, la commune et le SIRET. SIRET
  facultatif, contrôlé (clé de Luhn), puis cherché dans la table, sinon
  auprès de l'API en direct (5 s au plus, 20 vérifications par personne
  et par heure environ, jamais en e2e) : actif, en **Haute-Garonne**,
  même commune que le lieu. Vérifié, il **valide le lieu tout de suite**
  (`Venue.siret`, unique, `verifiedAt`, badge « Établissement vérifié »),
  même pour un compte TL0.
- **Lieu en attente** : son auteur (ou un membre TL1) peut le valider en
  ajoutant son SIRET sur la fiche.
- Un SIRET ne prouve pas qu'on travaille au lieu : la revendication de la
  fiche (P5-03) demandera une preuve en plus.
- **Code** : `#lib/venues/siret` (pur, testé), `#server/venues/establishments`
  (`lookupEstablishment`, `suggestEstablishments`), `verifyVenueSiret`
  dans `#server/venues/service`, script `prisma/seed-establishments.ts`.
  E2E : `lieux.spec.ts` (étape 4 bis).

## Après la jam (P2-15a, D27)

- **« J'y étais »** (`JamAttendance.attendedAt`) : du début de la jam à
  7 jours après sa fin (`isAfterJamOpen`), pour toute personne qui voit
  la jam (attendue, en formation, hôte ou non). **Aucune XP.** Les
  invité·es de la formation gardent leur instrument.
- **« Qui était là ? »** (`/jams/[id]/presents`, et `/jams/[id]` y
  redirige une fois la jam finie) : grille des présent·es (initiales et
  instrument tant qu'il n'y a pas de photo de profil) ; toucher une
  carte ouvre l'appréciation, « Garder le contact » (message) et, pour
  l'hôte, « Pas là : retirer ». « Rejouer ensemble » ouvre une nouvelle
  jam au même lieu. Sur `/jam`, « Tes dernières jams ».
- **Appréciation** (`JamEndorsement`) : une qualité (bon groove, à
  l'écoute, belle impro, fiable) ou l'instrument de la personne ; une par
  paire et par jam ; il faut avoir dit tous deux « J'y étais », être dans
  les 7 jours et au palier TL1 (`endorseRefusal`, testé). Elle émet
  `endorsement.received` : 40 XP, puis 20, 10 et 0 pour une même paire
  sur 12 mois (règle `endorsement.received`, conception 02 §2.2).
- **Faux présent** : l'hôte le retire (`removedAt`) ; ses appréciations
  données et reçues pour cette jam sont reprises (`revokedAt`, et
  transaction négative liée par `reverseGain`). Retirer soi-même son
  « J'y étais » a le même effet.
- **Profil public** : « Apprécié·e après des jams » (qualités et
  instruments, avec leur nombre).
- **RGPD** : « J'y étais » et retrait dans l'export (`jams_je_viens`),
  appréciations données et reçues. À l'anonymisation, les appréciations
  reçues sont supprimées ; celles données restent (réputation des
  autres), liées à l'acteur anonymisé ; l'XP reste au registre.
- **Code** : `#lib/jam/afterJam` (pur, testé), `#server/jam/afterJam`.
  E2E : `jams.spec.ts` (« deux présents, l'une apprécie l'autre »).

## Succès fun et « Rejouer ensemble » (P2-15b)

- **Succès sans XP** (D27, conception 02 §9) : « J'y étais » émet
  `jam.attended` (aucune règle d'XP ne l'écoute) avec les faits utiles,
  calculés par le service : jam finie après minuit, instruments
  différents joués en jam, lead d'une formation complète. _Noctambule_,
  _Touche-à-tout_, _Brise-glace_ (première appréciation laissée, sur
  `endorsement.received` avec `jamId`), _Chef d'orchestre_. Ils
  s'affichent dans la carte « Succès » du profil.
- **« Rejouer ensemble »** : `/jams/nouvelle?rejouer=<jam>` reprend le
  lieu, le titre, les horaires, le style, les places et la description
  d'une jam où l'on était (`replayDraft`) ; il ne reste qu'à choisir le
  jour, puis à inviter.
- E2E : `jams.spec.ts`, étape 5 du test « deux présents ».

## Carnet de jams et réseau musical (P2-16)

- **Carnet** (`/jam/carnet`, privé) : les jams où l'on était (« J'y
  étais », sans retrait), de la plus récente : date, lieu, commune,
  style, ce que l'on jouait, les personnes croisées et leurs instruments,
  les appréciations reçues. Résumé : jams, personnes rencontrées,
  instruments croisés, styles, communes (`logStats`, testé).
- **Réseau musical** (`MusicalTie`, privé, à sens unique) : « Garder le
  contact » sur « Qui était là ? » ajoute une personne, **seulement si
  l'on a vraiment joué ensemble** (présence commune à une jam, ou
  collaboration confirmée : `playedTogether`). On le voit et on le
  retire depuis le carnet.
- **Effets** : la recherche (`/decouvrir`) trie le réseau en premier,
  puis par distance, avec un badge « Dans ton réseau » (jamais l'XP) ;
  les suggestions d'invitation à une jam proposent le réseau d'abord
  (`inviteSuggestions`).
- **RGPD** : réseau dans l'export (`reseau_musical`), supprimé dans les
  deux sens à l'anonymisation.
- **Code** : `#lib/jam/log`, `#server/jam/log` (`jamLog`),
  `#server/network/service`. Tests : intégration de la recherche (le
  réseau en tête), e2e `jams.spec.ts` (étape 6).
