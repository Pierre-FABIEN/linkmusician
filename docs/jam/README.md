# Mode jam

Module LinkMusician (lots P2-12 et P2-13, décisions D21, D26 et D5).
Jouer pour le plaisir et rencontrer, sans projet ni engagement.

## Écrans

- **`/jouer`** : première page après la connexion et l'onboarding, le
  « menu du jeu » : Mode carrière (tableau de bord) ou Mode jam, chaque
  carte disant comment on y avance. Le dernier choix est retenu
  (`Person.preferredMode`, « Reprendre »). La première fois, une
  **présentation en 3 étapes** (`/jouer/carriere`, `/jouer/jam`).
- **Navigation par mode** : en jam, quatre onglets (Jam, Découvrir,
  Messages, Profil) ; pastille « changer de mode » en haut de l'écran.
- **« Ta prochaine étape »** (`src/lib/jam/guide.ts`) : ville → se mettre
  dispo (ou repérer une jam, pour les mineur·es) → écrire à quelqu'un →
  confirmer la jam (points) → passer en mode carrière.
- **`/jam`** : « Je suis dispo », les dispos autour de soi, les jams
  ouvertes (annonces de type jam), « Lancer une jam ».

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
