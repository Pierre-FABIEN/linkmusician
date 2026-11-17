# 06 — Les métiers au-delà du musicien

État architectural vérifié au 15/11/2026 : [audit ARCH-MET-01](./17-audit-capacites-services.md).
Il distingue le code disponible des conceptions et bilans historiques ci-dessous ;
six métiers sont ouverts, trois restent « bientôt ». Ses extractions et tâches
proposées ne sont pas des fonctionnalités livrées.

Le musicien est le seul métier complet au lancement. Les huit autres sont
proposés dès l'inscription et enregistrés, mais affichés « bientôt »
(décision D15) : on mesure ainsi la demande réelle avant de les
construire. Ce document décrit, pour chacun, ce qu'il deviendra, et
comment ils se relaient autour d'un même morceau (§4).

Il s'appuie sur [01 §2](./01-analyse-produit.md#2-acteurs-et-besoins-réels)
(besoins et ordre d'arrivée), [02 §5](./02-progression.md#5-paliers-par-métier)
(paliers) et [05 §3](./05-mvp-roadmap.md#3-roadmap) (phases). Les éléments
**déjà décidés** dans ces documents sont repris tels quels ; les éléments
**proposés** ici sont marqués _(proposé)_ et restent à valider, idéalement
avec des personas de calibrage comme pour le musicien.

## 1. Principes communs

- **Une personne, plusieurs casquettes.** Un métier est une piste
  (`PersonTrack`) d'une même personne : on peut être guitariste et
  ingé son. Chaque piste a sa propre progression ; le niveau de compte
  est la somme.
- **Les professionnels consomment du signal.** Ils n'arrivent que quand
  la plateforme contient des trajectoires crédibles. On les fait entrer
  dans l'ordre où ils peuvent **produire de la preuve** pour les autres :
  le studio prouve l'enregistrement, l'organisateur le concert, le label
  la signature (01 §2).
- **Personne et organisation.** Le métier appartient à la personne ; la
  structure (studio, salle, label…) est une **organisation** distincte
  (`Organization`), qu'une ou plusieurs personnes administrent. Une
  organisation **vérifiée** (SIRET ou équivalent, contrôle manuel) peut
  passer des étapes au niveau `VERIFIED` (02 §4).
- **Paliers = conditions, jamais un seuil d'XP.** Les noms décrivent un
  parcours, jamais une compétence (02 §5).
- **Rien d'unilatéral ne rapporte** (02 §2.1) : publier une annonce,
  contacter, suivre ne valent rien. Ce qui rapporte, c'est une
  collaboration confirmée des deux côtés, ou une preuve apportée à
  d'autres.
- **Monétisation** : outillage et accès au signal, jamais de visibilité
  organique ni d'XP à acheter (01 §5).

### 1.1 Spécialités et intentions par métier (ONB-01, D56)

Pour chaque métier, une personne déclare trois listes **distinctes** de
codes stables, en sélection multiple :

- ses **spécialités** (ce qu'elle exerce : mixage, booking de tournée…) ;
- **Je propose** : les prestations qu'elle offre ;
- **Je recherche** : ce qu'elle cherche.

Les **compétences** restent les référentiels existants (instruments,
genres). Une spécialité n'impose jamais d'instrument. Chez les
musicien·nes, les spécialités instrument, voix et DJ sont **retirées**
(D58) : le référentiel des instruments les dit déjà. Restent les rôles
d'écriture (composition, paroles, arrangement), facultatifs.

Les **précisions** propres à un métier (langues chantées, jeu au clic,
plus tard DAW ou livrables) sont des codes rangés dans
`person_track_attributes`, une table commune à tous les métiers : seules
les réponses données sont stockées, une absence vaut « inconnu ».

Le référentiel vit dans `#lib/actors/specializations`. Une entrée est
identifiée par la paire `(métier, code)`. Un code n'est jamais supprimé ni
renommé : on le **retire**. La personne qui l'avait le garde, mais
personne ne peut plus l'ajouter. Le statut suit le métier : un métier
« bientôt » (D15) a des spécialités « bientôt ».

Les codes des profils existants sont repris à l'identique : ingé son
(`SoundSpecialty`), producteur·rice (`ProducerSpecialty`) et
organisateur·rice (`PromoterEventKind`). Ces colonnes restent la source de
la recherche jusqu'à ONB-04, 05 et 08. Les catalogues « Je propose » et
« Je recherche » sont remplis par les lots de chaque métier (ONB-03 à
ONB-11).

### 1.2 Fiche et gabarit de chaque métier (ONB-04 à 11, D59)

Un métier se décrit par des **données**, sans code d'écran à écrire :

- `TRACK_ROLES` (`src/lib/actors/roles.ts`) : adresse lisible, page de
  profil, écrans d'onboarding demandés ;
- ses spécialités (`src/lib/actors/specializations.ts`) ;
- son catalogue (`src/lib/actors/catalog/<métier>.ts`) : « Je propose »,
  « Je recherche » et ses **champs propres**. Un champ est un choix unique
  ou multiple parmi des codes ; il peut être requis et ne s'afficher que si
  une spécialité, une offre ou un besoin est coché (« si A&R : politique de
  démos », « si programmation : jauge »).

L'écran du métier (`/demarrer/metier/[slug]` à l'inscription,
`/profil/metier/[slug]` ensuite) se construit à partir de ces données ;
le serveur revérifie tout (`checkFields`). Les réponses vont dans
`person_track_attributes`. Un métier « bientôt » (D15) n'impose rien.

Ce que le gabarit ne fait pas, volontairement : pas de texte libre, pas
de fiche d'événement, de brief ou de date (ils appartiennent à l'annonce
ou au plateau), pas d'organisation revendiquée par saisie d'un nom (elle
se crée et se vérifie à part), aucune audience, aucun crédit, aucun droit
ni mandat déduits d'une déclaration.

### 1.3 Qualification pour la mise en relation (#29, ONB-12b, D61 à D64)

Chaque information demandée doit servir une mise en relation précise.
Trois objets, à ne pas mélanger :

- **profil métier** (la personne, par métier) : ce qu'elle sait faire, ce
  qu'elle propose, ce qu'elle cherche, où et comment elle travaille ;
- **projet ou structure** (`Organization` : groupe, studio, lieu,
  organisateur·rices, école) : membres et rôles, formation et répertoire
  du groupe (D64) ; un membre ne représente pas la structure, un
  accompagnement se confirme (`Representation`) ;
- **opportunité** (`Opportunity`) : un besoin daté, ses critères
  **bloquants** (métier, spécialité, rayon, formation, engagement,
  présence, rémunération : D63) ; genres et ambition restent des
  affinités.

Règles : une spécialité ne vaut pas une offre (D62) ; une information
absente est **inconnue**, jamais « non » ; l'XP n'entre dans aucun
critère ; les données communes (commune, rayon, genres) sont demandées
une fois.

**Visibilité (D61)** : par métier, trois blocs réglables (public, membres,
privé) ; défauts en Q64 et Q65.

| Bloc                      | Contenu                                       | Par défaut |
| ------------------------- | --------------------------------------------- | ---------- |
| Spécialités et intentions | spécialités, « Je propose », « Je recherche » | membres    |
| Précisions                | champs propres du catalogue                   | membres    |
| Conditions                | champs marqués `block: 'conditions'`          | privé      |

**Fiches historiques (ONB-12c2, Q70)** : les cartes « Ingé son »,
« Producteur·rice » et « Organisateur·rice » de `/@handle`, remplies sur
`/profil/son`, `/profil/production` et `/profil/organisateur`, suivent les
mêmes blocs, filtrés côté serveur (`#lib/actors/craftCardVisibility`) :
spécialités et types d'événements avec les intentions ; mobilité, matériel,
logiciels, styles et jauge avec les précisions ; tarifs avec les
conditions. Références, crédits confirmés, rang, plateaux ouverts et
organisations gérées restent publics. Les résultats de **Découvrir**
(membres) taisent les spécialités historiques d'un bloc d'intentions privé.
Chaque fiche historique rappelle qui voit quoi, avec un lien vers les
réglages du métier. Spécialité **postproduction** de l'ingé son (et l'offre
correspondante) : code du référentiel `person_track_specializations`, sans
code d'enum `SoundSpecialty` ni migration ; elle se coche sur la page du
métier.

**Matrice** (I : inscription, P : profil avancé, A : annonce ; R : requis,
C : conditionnel, F : facultatif ; « existe » : déjà dans le code).

| Métier                | Information                                               | Sert à                                    | Où  | Requis | Bloc             | Existe                       |
| --------------------- | --------------------------------------------------------- | ----------------------------------------- | --- | ------ | ---------------- | ---------------------------- |
| Tous                  | Commune, rayon                                            | distance (tranches)                       | I   | R      | public (tranche) | oui                          |
| Tous                  | Genres                                                    | affinité                                  | I   | R      | public           | oui (écran commun, Q56)      |
| Tous                  | Spécialités, « Je propose », « Je recherche »             | être trouvé·e pour une prestation (D62)   | I   | F      | intentions       | oui                          |
| Tous                  | Ouvert aux sollicitations                                 | ne pas solliciter qui ne veut pas         | P   | F      | membres          | ONB-12b                      |
| Tous                  | Références, portfolio (`CraftReference`, médias)          | confiance (déclaré)                       | P   | F      | public           | oui (son, production)        |
| Musicien·ne           | Instruments et niveau déclaré                             | critère bloquant d'une annonce            | I   | R      | public           | oui                          |
| Musicien·ne           | Expérience, engagement                                    | engagement compatible (scénario 1)        | I   | R      | intentions       | oui (D58)                    |
| Groupe                | Formation, répertoire                                     | duo, groupe de reprises (scénarios 3, 4)  | P   | F      | public           | oui (ONB-12c1, D64)          |
| Ingé son              | Où tu travailles ; `mobility`                             | à distance ou sur place (scénario 2)      | I   | R      | précisions       | oui (Q59 tranchée par D62)   |
| Ingé son              | Formats, livrables, consoles, jauge tenue                 | prestation adaptée au besoin              | I   | C      | précisions       | oui                          |
| Ingé son              | Révisions de mixage                                       | conditions de la prestation               | I   | C      | conditions       | oui                          |
| Producteur·rice       | Degré d'intervention, formats de beat                     | beat contre production complète           | I   | C      | précisions       | oui                          |
| Producteur·rice       | Ce que tu souhaites (beats)                               | conditions                                | I   | C      | conditions       | oui                          |
| Producteur·rice       | Tarifs indicatifs (`rate`)                                | conditions                                | P   | F      | conditions       | oui (ONB-12c2, Q70)          |
| Manager               | Statut, territoire, nouveaux projets, stade ciblé         | prospection d'artistes                    | I   | R ou C | précisions       | oui                          |
| Manager               | Capacité d'accompagnement                                 | conditions                                | I   | C      | conditions       | oui                          |
| Booker                | Structure, jauge, formations, types d'événements          | programmation contre booking (scénario 3) | I   | R ou C | précisions       | oui                          |
| Booker                | Ce que tu fournis (accueil)                               | conditions                                | I   | C      | conditions       | oui                          |
| Organisateur·rice     | Situation, formats de jam, jauge, régie                   | distinguer personne, lieu et événement    | I   | R ou C | précisions       | oui                          |
| Organisateur·rice     | Rémunération envisagée                                    | conditions habituelles                    | I   | C      | conditions       | oui                          |
| Annonce               | Métier, spécialité, instrument, rayon                     | critères bloquants                        | A   | R ou F | annonce          | oui                          |
| Annonce               | Rémunération, fourchette, formation, engagement, présence | critères bloquants (scénarios 1 à 4)      | A   | F      | annonce          | oui (ONB-13b, D63)           |
| Label, édition, comms | A&R, démos, soumissions, synchro, formats                 | scénarios 5, 6 (métiers fermés, Q62)      | I   | C      | précisions       | oui, non exigé (« bientôt ») |

La **complétude** d'un métier (`#lib/actors/completeness`, sur
`/profil/metier/[slug]` et « Ma pratique ») liste ce qui manque pour être
exploitable, avec le bénéfice de chaque ajout ; les champs facultatifs
sont proposés « pour aller plus loin », sans pénalité ni pourcentage.

## 2. En attendant leur phase (D15)

Tant que son métier n'est pas ouvert, la personne a un **profil de base**,
le même pour tous les métiers : présentation, ville, statut pro déclaré
(D17), « ce que je recherche », liens, matériel (D18). Son métier
s'affiche avec la mention « bientôt ».

_(proposé)_ Pour mesurer la demande :

- compter les personnes par métier, principal ou secondaire (indicateur
  D13) ;
- proposer « Prévenez-moi à l'ouverture » sur l'écran des métiers ;
- ouvrir un métier plus tôt que prévu si sa demande le justifie
  (décision à prendre au cas par cas).

## 3. Fiches par métier

Chaque fiche suit le même plan : besoin, profil, organisation liée,
preuves apportées aux autres, progression, fonctionnalités, garde-fous.

### 3.1 Producteur·rice — `PRODUCER` · phase 4

- **Besoin immédiat** : trouver des artistes pour son portfolio.
- **Apporte** : production, arrangement, beats.
- **Profil spécifique** _(proposé)_ : styles produits (référentiel des
  genres), logiciels et matériel (liste libre), productions en écoute
  (médias, avec crédits), tarifs indicatifs ou « sur devis »,
  disponibilité.
- **Organisation liée** : `STUDIO` (facultative : un home studio n'est
  pas une organisation).
- **Preuves apportées aux autres** : une collaboration de production
  confirmée **vérifie** l'étape « Premier enregistrement » d'un groupe
  quand le studio ou le producteur est sur la plateforme (02 §2.2).
- **Paliers** (02 §5) : Home studio (≥1 production en écoute) →
  Premiers projets (≥1 collaboration de production confirmée) →
  Portfolio (≥5 projets, ≥3 artistes distincts) → Producteur établi
  (≥15 projets, ≥1 sortie vérifiée créditée) → Référence (≥5 sorties
  vérifiées créditées, ≥10 artistes distincts).
- **Sources d'XP** _(proposé)_ : collaboration de production confirmée
  (mêmes multiplicateurs que les collaborations musicien), crédit sur une
  sortie vérifiée, endossement d'un artiste.
- **Fonctionnalités** : collaborations de production, crédits sur les
  médias, recherche d'artistes par genre et zone.
- **Garde-fous** : un crédit n'est accepté que confirmé par l'artiste ;
  rendements décroissants par artiste (02 §6).

### 3.2 Ingé son — `SOUND_ENGINEER` · phase 4

- **Besoin immédiat** : remplir son agenda (studio ou live).
- **Apporte** : enregistrement, mixage, mastering, sonorisation.
- **Profil spécifique** _(proposé)_ : spécialités (studio, mixage,
  mastering, live/façade, retours), matériel, références (médias
  crédités), mobilité (rayon, D18).
- **Organisation liée** : `STUDIO`, ou aucune (indépendant).
- **Preuves apportées aux autres** : comme le producteur pour
  l'enregistrement ; en live, sa confirmation peut **corroborer** un
  concert (tiers hors groupe, 02 §4) _(proposé)_.
- **Paliers** : mêmes paliers que le producteur (02 §5 les regroupe :
  « Producteur / ingé son »).
- **Sources d'XP** _(proposé)_ : session d'enregistrement ou de mixage
  confirmée, date de sonorisation confirmée par le groupe.
- **Fonctionnalités** : collaborations d'enregistrement, réservation via
  le studio (phase 4-5).
- **Garde-fous** : comme le producteur.

### 3.3 Studio — organisation `STUDIO` · phase 4

Ce n'est pas un métier mais une structure, administrée par des
producteurs ou ingés son.

- **Besoin immédiat** : remplir ses créneaux.
- **Fiche** : matériel, salles, tarifs, créneaux, photos.
- **Preuves** : une réservation honorée **vérifie** l'étape « Première
  répétition » d'un groupe ; un enregistrement confirmé vérifie
  « Premier enregistrement » (02 §2.2).
- **Paliers** (02 §5) : Ouvert → Actif (≥5 sessions confirmées) →
  Reconnu (≥20 sessions, ≥10 clients distincts) → Incontournable (≥5
  sorties vérifiées enregistrées sur place).
- **Monétisation** : fiche étendue, agenda et réservation avec commission
  (Stripe Connect, phases 4-5).

### 3.4 Manager — `MANAGER` · phase 5

- **Besoin immédiat** : repérer des projets qui avancent.
- **Apporte** : accompagnement, structuration, réseau.
- **Profil spécifique** (P5-07) : artistes accompagnés (liens vers
  leurs profils, **seulement ceux qui ont confirmé**), genres (5), zone (sa
  ville), ce qu'il cherche (une phrase). Un seul profil pour les métiers de
  manager et de booker.
- **Organisation liée** : `MANAGEMENT` (agence), facultative.
- **Preuves apportées aux autres** : peu de preuves directes ; il
  consomme surtout le signal (paliers et vitesse de progression des
  groupes).
- **Paliers** (02 §5) : Premier artiste → Développeur (≥1 artiste ayant
  franchi 2 paliers sous son accompagnement) → Agence.
- **Sources d'XP** (P5-07) : relation d'accompagnement confirmée par
  l'artiste ; palier franchi par un artiste accompagné (part faible,
  comme les 25 % des membres de groupe, reportée : Q21).
- **Fonctionnalités** : flux « projets qui montent », recherche avancée
  et alertes (abonnement Scout, phases 5-6).
- **Garde-fous** : l'accompagnement doit être confirmé par l'artiste ;
  aucune XP pour un simple suivi de profil.

### 3.5 Booker / programmateur·rice — `BOOKER` · phase 5

- **Besoin immédiat** : trouver des dates pour ses artistes, ou des
  artistes pour ses dates.
- **Apporte** : des dates.
- **Profil spécifique** (P5-07) : celui du manager (genres, zone, ce
  qu'il cherche, artistes qui ont confirmé). Salles ou festivals
  programmés : par les organisations (P5-05b) ; jauges et période de
  programmation : _(proposé)_, plus tard.
- **Organisation liée** : `PROMOTER` (salle, festival) ou `MANAGEMENT`.
- **Preuves apportées aux autres** : un concert confirmé par la salle
  vérifiée **vérifie** l'étape « Premier concert » (02 §2.2).
- **Paliers** : ceux du manager / booker (02 §5).
- **Sources d'XP** (P5-07) : date bookée et jouée, confirmée des deux
  côtés (« Booké par » sur le concert, parmi les bookers confirmés du
  groupe) ; tournée bookée (≥3 dates dans 3 communes en 30 jours).
- **Fonctionnalités** : annonces « plateau » et appels à projets avec
  conditions d'éligibilité (palier, genre, zone) ; abonnement Scout.
- **Garde-fous** : un concert ne rapporte qu'une fois qu'il a eu lieu et
  qu'il est confirmé par les deux parties.

### 3.6 Organisateur·rice — `PROMOTER` · phase 5

- **Besoin immédiat** : programmer des groupes fiables.
- **Apporte** : des dates, donc des preuves de live.
- **Profil spécifique** (P5-05a) : ce que la personne organise
  (concerts, soirées, festival, tournées, scènes ouvertes), genres
  programmés, jauge habituelle, événements passés en lien ; la zone est sa
  commune.
- **Organisation liée** : `PROMOTER` (association, salle, collectif).
- **Preuves apportées aux autres** : en organisation vérifiée, il fait
  passer les concerts au niveau `VERIFIED` (étapes 6 et 7).
- **Paliers** (02 §5) : Premier événement → Programmateur régulier (≥5
  événements) → Scène locale (≥20 événements, ≥30 groupes distincts) →
  Festival (événement de ≥10 groupes vérifié).
- **Sources d'XP** _(proposé)_ : événement tenu et confirmé par au moins
  un groupe programmé ; groupe programmé pour la première fois.
- **Fonctionnalités** : annonces « plateau » (P5-05a : une date dans un
  lieu validé, conditions de rang de groupe, de genre et de zone ;
  candidature au nom d'un groupe ; section payante pour les pros plus
  tard, 01 §5), vérification des concerts (P5-06).
- **Garde-fous** : un événement fictif ne rapporte rien sans confirmation
  des groupes ; contestation possible (02 §4).

### 3.7 Professionnel·le de label — `LABEL_PRO` · phase 6

- **Besoin immédiat** : repérer des artistes avec une traction prouvée.
- **Apporte** : signatures, sorties.
- **Cible réaliste** : labels indépendants, pas les majors (01 §4).
- **Profil spécifique** _(proposé)_ : label (organisation), rôle (A&R,
  production, distribution, promotion), genres, catalogue.
- **Organisation liée** : `LABEL`, vérifiée.
- **Preuves apportées aux autres** : seul un label vérifié peut valider
  l'étape « Signature » ; les sorties sont identifiées par UPC ou ISRC
  (02 §2.2).
- **Paliers** (02 §5) : Première sortie → Catalogue (≥5 sorties) →
  Développeur d'artistes (≥3 artistes ayant franchi un palier après
  signature).
- **Sources d'XP** _(proposé)_ : sortie vérifiée ; signature confirmée
  par l'artiste.
- **Fonctionnalités** : flux « projets qui montent », abonnement Scout,
  quêtes sponsorisées (phase 6, clairement marquées).

### 3.8 Éditeur·rice — `PUBLISHER` · phase 6

- **Besoin immédiat** : repérer des auteurs-compositeurs et placer des
  œuvres (synchronisation, interprètes).
- **Apporte** : gestion des droits, placements.
- **Profil spécifique** _(proposé)_ : catalogue (œuvres éditées),
  domaines (synchro, édition graphique), genres, sociétés de gestion
  partenaires.
- **Organisation liée** : `PUBLISHER`, vérifiée.
- **Preuves apportées aux autres** _(proposé)_ : un contrat d'édition
  confirmé par l'auteur ; un placement identifié (ISWC, ou lien vers
  l'œuvre placée).
- **Paliers** _(proposé, absents de 02 §5)_ : Premier contrat → Catalogue
  (≥10 œuvres éditées) → Placeur (≥3 placements vérifiés).
- **Sources d'XP** _(proposé)_ : contrat d'édition confirmé ; placement
  vérifié.
- **Questions ouvertes** : quelles preuves de placement accepter ; faut-il
  un référentiel des sociétés de gestion.

### 3.9 Communication musicale — `MUSIC_COMMS` · phase 6 _(proposé)_

Ajouté par D15 ; absent de la roadmap. Regroupe attaché·es de presse,
community managers et journalistes musicaux.

- **Besoin immédiat** : trouver des artistes à accompagner ou à couvrir.
- **Apporte** : visibilité, presse, contenus.
- **Profil spécifique** _(proposé)_ : spécialité (presse, réseaux,
  journalisme, radio, photo, vidéo, graphisme), médias ou clients, genres
  couverts, zone. Le graphisme (ONB-12a) demande ses supports (pochettes,
  affiches, identité, visuels pour les réseaux, merch).
- **Organisation liée** : `MEDIA` (webzine, radio, agence).
- **Preuves apportées aux autres** _(proposé)_ : un article ou une
  diffusion publiés, liés au profil de l'artiste et confirmés par lui,
  peuvent **corroborer** une sortie ou un concert.
- **Paliers** _(proposé)_ : Première campagne → Relais régulier (≥5
  artistes accompagnés ou couverts) → Média de référence (≥30 artistes,
  ≥3 sorties vérifiées couvertes).
- **Sources d'XP** _(proposé)_ : campagne ou publication confirmée par
  l'artiste.
- **Garde-fous** : pas d'XP pour un simple partage ou un relais de
  publication ; une couverture n'est pas une note.
- **Question ouverte** : phase d'arrivée (6 proposée, ou plus tôt si la
  demande mesurée le justifie).

### 3.10 Lieu — organisation `VENUE` · phase 5 _(proposé)_

Bars, cafés-concerts, restaurants, salles, MJC et centres culturels,
tiers-lieux, campings et hôtels en saison. Ce n'est pas un métier mais
une **structure**, administrée par la personne qui la gère ou la
programme.

- **Besoin immédiat** : faire vivre son lieu, attirer du monde, trouver
  des groupes fiables pour ses soirées.
- **Apporte** : des scènes, souvent les **toutes premières** d'un
  groupe ; des **jams publiques** (bœufs, scènes ouvertes).
- **Fiche** : type de lieu, jauge, scène et matériel disponibles
  (sono, backline), genres programmés, jours de programmation,
  conditions (cachet, chapeau, défraiement), photos.
- **Preuves apportées aux autres** : un concert confirmé par le lieu
  **corrobore** l'étape « Premier concert » ; **vérifiée** quand le lieu
  est une organisation vérifiée (SIRET).
- **Paliers** _(proposé)_ : Lieu ouvert (fiche complète) → Scène ouverte
  (≥3 jams ou concerts tenus) → Lieu de la scène locale (≥20 dates, ≥15
  groupes distincts) → Lieu culte (≥50 dates, ≥5 groupes passés ensuite
  au rang Tournée).
- **Sources d'XP** _(proposé)_ : date tenue, confirmée par le groupe ;
  jam publique tenue, confirmée par au moins 3 participants ; groupe
  programmé pour la première fois de sa vie.
- **Fonctionnalités** : publier une soirée ou une jam publique, qui
  apparaît dans le **mode jam** des musicien·nes de la zone ; appels à
  groupes pour ses dates ; agenda du lieu.
- **Apprendre le métier** (quêtes d'apprentissage, sans jamais le gérer
  à la place du lieu) : licence d'entrepreneur de spectacles au-delà de
  6 représentations par an, rémunération des artistes par le GUSO pour
  un organisateur occasionnel, déclaration à la SACEM.
- **Personne qui le gère** : piste `VENUE_HOST` (« lieu et
  programmation ») _(proposé)_, ou piste organisateur·rice.
- **Garde-fous** : une date ne rapporte qu'une fois tenue et confirmée
  par le groupe ; aucune visibilité achetée dans le mode jam.

### 3.11 Autres rôles à envisager _(proposé)_

Idées du même type : des acteurs qui font vivre la musique sans être
musicien·nes, et qui peuvent **apporter des preuves** ou **des
occasions** aux autres. À mesurer avant de construire (§2).

| Rôle                                                       | Ce qu'il apporte                                                       | Épreuve qu'il peut valider                                | Lien avec les modes de jeu                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| **Client d'événement privé** (particulier, entreprise)     | Des prestations payées : mariages, anniversaires, soirées d'entreprise | Prestation tenue (« Premier cachet »)                     | Quêtes émises « cherche un groupe pour un mariage » |
| **Collectivité, comité des fêtes**                         | Fête de la musique, fêtes de village, kiosques, festivals municipaux   | Concert corroboré, puis vérifié                           | Défis collectifs par ville (D3), le 21 juin         |
| **Vidéaste, photographe**                                  | Clips, live sessions, photos de presse                                 | Clip ou live session publié, crédité                      | Acte VI (la sortie)                                 |
| **Graphiste, illustrateur·rice**                           | Pochettes, affiches, identité visuelle                                 | Pochette créditée sur une sortie vérifiée                 | Acte VI                                             |
| **Auteur·rice, parolier·e, arrangeur·se**                  | Textes, arrangements                                                   | Rôle de composition confirmé sur un morceau               | Acte II (la création)                               |
| **DJ**                                                     | Soirées, remixes, premières parties                                    | Date tenue, remix crédité                                 | Mode jam (sessions DJ / live), acte V               |
| **Technicien·ne lumière, backliner, roadie, régisseur·se** | Le live qui fonctionne                                                 | Corrobore un concert (tiers hors groupe)                  | Acte V (la scène), tournée                          |
| **Magasin de musique, luthier·ère**                        | Jams en boutique, réparations, essais, petites annonces                | Accueil d'une jam publique                                | Lieu de jam du mode jam                             |
| **Loueur de matériel, local de répétition**                | Backline, sono, salles de répète à l'heure                             | Répétition honorée (comme le studio)                      | Acte II, mode jam (salle de jam)                    |
| **Prof de musique, école, conservatoire**                  | Cours, ateliers, jams d'élèves                                         | Atelier ou jam d'élèves tenue (jamais un niveau certifié) | Porte d'entrée des débutant·es, parrainage          |
| **Tremplin, concours**                                     | Sélections, prix, premières grandes scènes                             | Participation et résultat vérifiés par l'organisateur     | Épreuves spéciales, cartes souvenirs                |
| **Radio associative, webzine local**                       | Diffusion, interviews (voir communication musicale, §3.9)              | Diffusion corroborant une sortie                          | Acte VI                                             |

**Écoles (P5-11, D29)** : l'école, la MJC ou le conservatoire est une
organisation `SCHOOL` gérée par ses profs ; les élèves la rejoignent par
un lien d'invitation et ne sont listé·es nulle part en public. Ses
**ateliers jam** sont réservés à ses membres ; ils ne rapportent rien et
ne sont pas « tenus » (Q53).
La quête « De l'atelier à la scène » mène l'élève vers une jam publique.
Voir [docs/ecoles](../ecoles/README.md).

## 4. La chaîne d'un morceau : du jam au producteur

Les métiers ne sont pas des îlots. Ils se relaient autour d'un **même
morceau**, et chacun intervient à son tour : les musicien·nes le créent,
l'ingé son l'enregistre, le ou la producteur·rice le découvre et le
fait grandir, puis l'organisateur·rice le met sur scène et le label le
signe. Le **morceau** est le fil conducteur de la plateforme (D20) :
c'est lui qui rend visible la valeur que chaque métier apporte aux
autres, et c'est autour de lui que chacun gagne des points.

### 4.1 Le scénario

La version complète, jusqu'à la signature et la tournée, avec sa couche
de jeu, est dans [07 — Les modes de jeu](./07-modes-de-jeu.md).

1. **Se rencontrer** _(phase 2)_. Léa, bassiste, répond à l'annonce de
   jam de Malik, batteur. Ils échangent, jouent ensemble, et confirment
   tous les deux le jam : c'est une **collaboration** (`JAM`). Chacun
   gagne de l'XP sur sa piste musicien.
2. **Créer un morceau ou un groupe** _(phase 3)_. Le courant passe : ils
   composent un titre ensemble, ou montent un groupe. Le **morceau**
   existe sur la plateforme avec ses **contributeurs** (Léa : basse,
   composition ; Malik : batterie). Chaque contributeur confirme son
   rôle. Une maquette (média) s'y rattache. Si c'est un groupe, l'étape
   « Première composition » du groupe avance.
3. **Chercher un·e ingé son** _(phase 4)_. Pour enregistrer proprement,
   le groupe publie une annonce ciblée sur le métier ingé son (« cherche
   ingé son pour enregistrer 1 titre, Lyon, rock ») ou cherche
   directement par métier, spécialité et zone. Sam, ingé son, répond.
4. **Enregistrer** _(phase 4)_. La session est une collaboration
   `RECORDING` **liée au morceau**. Quand toutes les parties la
   confirment terminée :
   - Léa et Malik gagnent de l'XP sur leur piste **musicien** ;
   - Sam gagne de l'XP sur sa piste **ingé son**, et un crédit
     confirmé sur le morceau (« enregistrement, mixage : Sam ») ;
   - le morceau passe à l'état « enregistré » et la nouvelle version
     audio s'y rattache ;
   - l'étape « Premier enregistrement » du groupe est **vérifiée**, car
     un professionnel présent sur la plateforme la confirme (02 §2.2).
5. **Proposer le morceau** _(phase 4)_. Le morceau enregistré, l'équipe
   peut le **proposer** : il entre dans la vitrine des propositions
   ouverte aux producteurs (« ce que nous cherchons : production,
   arrangement »). C'est un choix explicite de l'équipe, jamais
   automatique, et il se retire à tout moment.
6. **Être découvert par un·e producteur·rice** _(phase 4)_. Nora,
   productrice, parcourt les propositions filtrées par genre, zone et
   besoin. Elle écoute, contacte le groupe, propose une collaboration
   de production. Une fois confirmée par tous : XP sur sa piste
   **producteur**, crédit confirmé, XP pour les musiciens, morceau
   « produit ».
7. **Et ensuite** _(phases 5 et 6)_. Le morceau produit peut être joué
   sur scène (l'organisateur·rice **vérifie** le concert), sortir
   (sortie **vérifiée** par ISRC ou UPC), puis intéresser un label (la
   signature n'est validée que par le label vérifié). Chaque maillon
   suit la même règle : une collaboration confirmée de tous les côtés,
   des crédits confirmés, des points pour chacun.

### 4.2 Les états d'un morceau _(idée et composé tranchés par D35)_

| État            | Atteint quand                                                                        | Preuve                                                                   |
| --------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Idée            | Un contributeur crée le morceau ; visible de son équipe seulement                    | Déclarée                                                                 |
| Composé         | Une maquette est jointe ; à plusieurs, ≥2 contributeurs ont aussi confirmé leur rôle | Seul·e : déclarée, sans XP. À plusieurs : corroborée (les contributeurs) |
| Enregistré      | Une collaboration `RECORDING` liée est terminée                                      | Vérifiée si l'ingé son ou le studio est sur la plateforme                |
| Mixé, masterisé | Idem, collaboration de mixage ou de mastering                                        | Idem                                                                     |
| Produit         | Une collaboration `PRODUCTION` liée est terminée                                     | Vérifiée par le producteur                                               |
| Sorti           | La sortie est identifiée par ISRC ou UPC                                             | Vérifiée par API (Spotify, MusicBrainz)                                  |

Un morceau peut sauter des états (un titre enregistré en home studio
sans ingé son) : les états décrivent ce qui est **prouvé**, pas un
passage obligé.

### 4.3 Qui gagne quoi _(composition tranchée par D35, le reste à calibrer par personas)_

| Moment                            | Musicien·nes du morceau                               | Ingé son                      | Producteur·rice               |
| --------------------------------- | ----------------------------------------------------- | ----------------------------- | ----------------------------- |
| Jam ou collaboration confirmée    | XP collaboration (piste musicien)                     | —                             | —                             |
| Morceau composé (rôles confirmés) | 150 XP × multiplicateurs, à plusieurs seulement (D35) | —                             | —                             |
| Enregistrement confirmé           | XP enregistrement                                     | XP session + crédit           | —                             |
| Production confirmée              | XP production reçue                                   | —                             | XP production + crédit        |
| Sortie vérifiée                   | XP sortie                                             | XP crédit sur sortie vérifiée | XP crédit sur sortie vérifiée |

Chaque gain va **sur la piste du métier exercé** dans la collaboration :
une guitariste qui est aussi ingé son gagne sur sa piste ingé son quand
elle enregistre les autres. Le niveau de compte reste la somme.

### 4.4 Règles

- **Rien d'unilatéral** : créer un morceau, le proposer ou contacter
  quelqu'un ne rapporte rien. Seules les collaborations terminées et
  confirmées par **toutes** les parties, et les crédits confirmés par
  l'équipe du morceau, rapportent (§1).
- **Crédits** : un crédit (« enregistrement : Sam ») n'existe que
  confirmé par le morceau (un contributeur) **et** par la personne
  créditée. Il apparaît sur le morceau, sur le profil de chacun et dans
  la réputation. Une collaboration liée au morceau, terminée et confirmée
  par tous, vaut cette double confirmation : la personne qui a assuré la
  prestation est créditée d'office (P4-07). Un rôle du son (prise de son,
  mixage, mastering, production) crédite un **travail, pas une part
  d'auteur·rice** : il n'entre ni dans la corroboration du morceau composé,
  ni dans l'XP de composition, ni dans le bulletin de partage, et sa
  confirmation ne rapporte rien de plus que la collaboration.
- **Étape faite soi-même** (D68, DASH-06a) : la gestion d'un morceau peut
  prendre elle-même l'enregistrement, chez soi, sans studio ni adresse. Seule
  la personne responsable déclare l'avancement ; c'est une déclaration, pas
  une collaboration : elle ne crédite rien, ne prouve rien et ne rapporte
  rien tant que DASH-06c n'en a pas fixé les effets.
- **Rôle du son ajouté à son crédit** (D69, DASH-06b) : la gestion d'un
  morceau, déjà créditée et confirmée, peut ajouter à **son propre** crédit
  une prise de son, un mixage, un mastering ou une production. Aucun second
  crédit, aucun doublon ; un rôle à pourvoir identique est pourvu. C'est un
  travail, pas une part d'auteur·rice : ni corroboration, ni XP de
  composition. Les succès d'un crédit du son reçu d'autrui ne se débloquent
  pas ainsi. Ajouter un rôle à une autre personne exigera son accord (hors
  lot).
- **Réalisation déclarée** (D70, DASH-06c) : une étape terminée soi-même
  fait avancer le morceau, marquée « déclaré par », sans jamais valoir
  preuve : rien n'est écrit dans le morceau, aucun événement ni XP. Un fait
  issu d'une collaboration terminée prime et survit à une réouverture. Une
  étape prise en charge n'est plus un besoin de recrutement ; terminée,
  l'app propose le mixage.
- **Anti-collusion** : rendements décroissants par paire de personnes et
  par morceau (02 §6) ; un même morceau ne rapporte qu'une fois par
  type de collaboration et par personne.
- **Propositions aux producteurs** : opt-in de l'équipe, retirables,
  triées par pertinence (genre, zone, besoin), **jamais par XP** (02 §1).
  Un producteur ne voit ni l'XP ni la confiance des musiciens, seulement
  le morceau, ses crédits et la réputation publique.
- **Droits** : la plateforme ne gère ni les droits d'auteur ni la
  répartition des revenus. Les rôles de composition sont déclaratifs ;
  l'éditeur·rice (phase 6) ou la SACEM restent la référence.
- **Mineurs** : un morceau proposé par une équipe comptant un·e mineur·e
  n'est visible des producteurs que s'il est explicitement proposé, et
  la prise de contact passe par la messagerie restreinte (D5).

### 4.5 Ce que cela ajoute au modèle _(`Work` et `WorkContributor` tranchés par D35, le reste en phase 4)_

- `Work` (morceau) : titre, état, genres, acteur porteur (personne ou
  groupe), médias (versions successives).
- `WorkContributor` : acteur, rôle (instrument, composition, paroles,
  enregistrement, mixage, mastering, production), date de confirmation.
  (`MediaCredit`, envisagé plus tôt, n'a jamais été créé.) Livré en P3-11
  avec `WorkRole`, rôles du son en P4-07 : un rôle par ligne, rattaché à un
  contributeur ou **à pourvoir** (bouton « Recruter »). Composer, maquette
  et retrait d'un crédit : D40 et [docs/morceaux](../morceaux/README.md).
- `Collaboration.workId` : une collaboration peut être liée à un
  morceau (`RECORDING`, `PRODUCTION`, `SESSION_WORK`…).
- `WorkPitch` (proposition) : morceau, public visé (producteurs,
  puis labels en phase 6), ce qui est cherché, état, expiration.
- Événements de domaine : `work.composed`, `work.credit_confirmed`,
  `work.pitched`, et `collaboration.completed` porteur du `workId`.

### 4.6 Phases

- **Phase 2** : jams et collaborations entre musiciens (déjà prévus).
- **Phase 3** (D35) : le **morceau minimal** (`Work`,
  `WorkContributor`, maquette) avec les groupes, car les étapes
  « Première composition » et « Premier enregistrement » s'y appuient.
- **Phase 4** : ouverture des métiers **ingé son** et **producteur**,
  annonces ciblées par métier, collaborations liées au morceau, crédits,
  vitrine des **propositions**.
- **Phases 5 et 6** : concert vérifié par l'organisateur, sortie
  vérifiée, propositions ouvertes aux labels.

## 5. Ce que chaque ouverture demandera

Pour ouvrir un métier, il faudra au minimum :

1. ses champs de profil et leur référentiel (module pur testé, comme les
   métiers et le profil complet) ;
2. ses organisations et leur vérification (phase 5 pour les organisations
   vérifiées) ;
3. ses événements de domaine et ses règles d'XP dans
   `progression/core`, **calibrées par des personas** (02 §2.3) ;
4. ses paliers dans `progression/core/tiers.ts` ;
5. le retrait de la mention « bientôt » (`available: true` dans
   `src/lib/actors/tracks.ts`) ;
6. l'export et l'anonymisation RGPD de ses nouvelles données.

## 6. Décisions à prendre

| Sujet                                                   | Quand                                                    |
| ------------------------------------------------------- | -------------------------------------------------------- |
| Phase de la communication musicale                      | Revue de phase 3                                         |
| Paliers et preuves de l'éditeur·rice                    | Avant la phase 6                                         |
| Ouverture anticipée selon la demande                    | Revue de chaque phase, à partir des comptages par métier |
| Barème des métiers (personas dédiés)                    | Au début de leur phase                                   |
| Modèle du morceau et des propositions (D20, détails §4) | Avant la phase 3                                         |
