# Phases 4 à 6 — Les autres métiers et la carrière complète

> **Fiches rédigées le 05/11/2026**, à ajuster à chaque revue de phase
> (les barèmes surtout, calibrés par personas en début de phase).
> Conception : [06](../conception/06-metiers.md) (métiers, chaîne d'un
> morceau, lieux), [07](../conception/07-modes-de-jeu.md) (modes de jeu),
> [08](../conception/08-carrieres-par-role.md) (carrières par rôle).

**Ouvrir un métier** suit toujours la liste de 08 §16 : profil et
référentiel (module pur testé) · organisations et vérification ·
événements et règles d'XP dans `progression/core`, **calibrés par
personas** · rangs dans `core/tiers.ts` · quêtes et déblocages ·
place sur la carte commune (08 §2) · `available: true` dans
`src/lib/actors/tracks.ts` · export et anonymisation RGPD · e2e du
parcours du métier.

---

## Phase 4 — Studio, ingé son, producteur : actes III et IV

**But** : un morceau composé trouve un ingé son, s'enregistre, se
propose aux producteurs et se fait produire ; chacun gagne sur sa piste.

### P4-01 — Personas et barème des métiers du son

- **Tâches** : personas (ingé son studio, ingé son live, home studio,
  producteur·rice urbain·e, studio associatif) ; barème des sessions,
  mastering, sonorisation, production, crédits ; rangs de 02 §5 testés
  comme en P1-01 (`personas.test.ts`).
- **Fin** : temps simulé pour atteindre chaque rang jugé crédible ;
  barème consigné en 02 §2.2.

### P4-02 — Ingé son

- **Dépend de** : P4-01.
- **Tâches** : profil (spécialités studio, mixage, mastering, façade,
  retours ; matériel ; références créditées ; mobilité) ; règles d'XP et
  rangs ; quêtes (08 §5) ; ouverture du métier.
- **Fin** : e2e « un ingé son complète son profil et apparaît dans la
  recherche par métier ».

### P4-03 — Studio

- **Dépend de** : P4-02.
- **Tâches** : `Organization(STUDIO)` administrée par des personnes ;
  fiche (salles, matériel, tarifs, photos, créneaux) ; rangs Ouvert →
  Incontournable ; page publique.
- **Fin** : e2e « je crée la fiche de mon studio ».

### P4-04 — Producteur·rice

- **Dépend de** : P4-01.
- **Tâches** : profil (styles produits, logiciels, productions en
  écoute, tarifs indicatifs) ; règles d'XP, rangs, quêtes (08 §7) ;
  ouverture du métier.
- **Fin** : e2e « une productrice complète son profil ».

### P4-05 — Annonces par métier

- **Dépend de** : P2-02, P4-02.
- **Tâches** : annonce ciblée sur un métier et une spécialité (« cherche
  ingé son pour enregistrer 1 titre ») ; recherche par métier ; une
  annonce peut être liée à un morceau (P3-11).
- **Fin** : seuls les profils du métier visé voient l'annonce dans leurs
  suggestions ; e2e.

### P4-06 — Collaborations liées au morceau

- **Dépend de** : P3-11, P2-06.
- **Tâches** : `Collaboration.workId` ; types `RECORDING`, mixage,
  mastering, `PRODUCTION`, `SESSION_WORK` ; états du morceau
  (enregistré, mixé, produit) avancés par les collaborations terminées ;
  XP de chacun **sur la piste du métier exercé**.
- **Fin** : une session confirmée fait passer le morceau « enregistré »
  et crédite la piste ingé son de Sam et la piste musicien de Léa
  (intégration, e2e).

### P4-07 — Crédits

- **Dépend de** : P4-06.
- **Tâches** : crédit confirmé des deux côtés (contributeur du morceau
  et personne créditée) ; affichage sur le morceau, le profil et la
  carte de réputation ; remplacement progressif de `MediaCredit`.
- **Fin** : un crédit non confirmé n'apparaît nulle part (test).

### P4-08 — Vitrine des propositions

- **Dépend de** : P4-07.
- **Décisions** : vitrine gratuite pour les producteurs, ou incluse dans
  l'offre pro (P5-09).
- **Tâches** : `WorkPitch` (morceau, ce qui est cherché, public visé,
  expiration) ; proposer et retirer (opt-in de l'équipe) ; vitrine
  filtrée par genre, zone, besoin, triée par pertinence, **jamais par
  XP** ; prise de contact par la messagerie ; règles pour les mineur·es.
- **Fin** : un morceau retiré disparaît aussitôt ; la vitrine ne contient
  ni XP ni confiance (test du payload) ; e2e « Nora découvre le morceau
  et propose une production ».

### P4-09 — Étapes vérifiées par les pros

- **Dépend de** : P3-05, P4-06.
- **Tâches** : la collaboration d'enregistrement avec un ingé son ou un
  studio de la plateforme **vérifie** l'étape « Premier enregistrement »
  du groupe ; une réservation honorée vérifie « Première répétition ».
- **Fin** : intégration des deux vérifications.

### P4-10 — Carte : actes III et IV

- **Dépend de** : P3-13, P4-09.
- **Tâches** : actes studio et production jouables ; épreuves,
  déblocages (vitrine après l'enregistrement vérifié, appels à projets
  après la production) ; récap de campagne en fin de morceau.
- **Fin** : e2e de la campagne d'un morceau, de la composition à la
  production.

### P4-11 — Radar des pros

- **Dépend de** : P2-08.
- **Tâches** : flux « projets qui montent » (réputation, rangs, vitesse
  de franchissement) ; alertes par genre et zone ; jamais d'XP.
- **Fin** : un groupe qui franchit deux rangs en un mois remonte dans le
  flux (intégration).

### P4-12 — Messagerie temps réel

- **Dépend de** : P2-04 ; D8.
- **Tâches** : Ably ou Pusher à la place du polling ; présence ;
  repli sur le polling si le service tombe (`circuit-breaker.ts`).
- **Fin** : un message arrive en moins d'une seconde ; le repli marche.

### P4-13 — Coups de pouce et parrainage

- **Dépend de** : P2-16, P3-12.
- **Tâches** : suggestions quand on n'avance plus (jams proches, ingé
  son du réseau dispo, chanteuses du carnet) ; parrainage par les rangs
  Pilier local et plus ; succès _Passeur_.
- **Fin** : les suggestions s'appuient sur le réseau réel (intégration) ;
  aucune notification culpabilisante (relecture des textes).

---

## Phase 5 — La scène : lieux, organisateurs, bookers, managers (acte V)

**But** : les groupes trouvent des dates et les lieux des groupes ; les
concerts sont vérifiés ; les jams publiques des lieux nourrissent le
mode jam.

### P5-01 — Personas et barème de la scène

- **Tâches** : personas (bar à scène ouverte, café-concert, MJC,
  association organisatrice, booker indépendant, manager débutant) ;
  barème et rangs ; trancher `VENUE_HOST` (métier de la personne qui
  gère un lieu).
- **Fin** : barème consigné (02, 08).

### P5-02 — Organisations vérifiées

- **Dépend de** : P3-09.
- **Tâches** : vérification SIRET (API Sirene) puis contrôle manuel ;
  droits associés (vérifier des étapes) ; retrait de la vérification.
- **Fin** : seule une organisation vérifiée peut faire passer un concert
  `VERIFIED` (test).

### P5-03 — Lieux

- **Dépend de** : P5-01, P5-02.
- **Tâches** : `Organization(VENUE)` (D22) : type, jauge, scène,
  matériel, conditions (cachet, chapeau, défraiement), jours, photos ;
  agenda public ; rangs Lieu ouvert → Lieu culte ; quêtes
  d'apprentissage (licence de spectacles, GUSO, SACEM : liens et
  explications, rien de géré). **Revendication de la fiche (D31)**, à
  avancer avant le lancement : niveau 1 « Géré par le lieu » (code
  publié dans la bio Instagram ou Facebook officielle ou sur le site,
  contrôle par un modérateur) ; niveau 2 « Gérant vérifié » (identité
  comparée aux dirigeants de l'API Recherche d'entreprises, par
  ProConnect si possible, sinon documents en modération) ; le niveau 2
  est exigé pour les outils payants et pour contester une fiche.
  Préalable : demander à la DINUM si un service privé peut se raccorder
  à ProConnect.
- **Fin** : e2e « un bar crée sa fiche et publie une date » ; e2e « un
  bar revendique sa fiche avec le code publié sur son compte ».

### P5-04 — Jams publiques des lieux

- **Dépend de** : P5-03, P2-14b.
- **Tâches** : le lieu revendique sa fiche de l'annuaire (P2-14a) ;
  scène ouverte **récurrente** publiée par le lieu ; musicien·nes
  animateur·rices affilié·es au lieu ; les musicien·nes peuvent se dire
  **« prêt·e à animer une jam »** ; le lieu reçoit des **suggestions de
  leads** triées par réputation (appréciations reçues, jams animées ;
  **jamais l'XP**), propose l'animation, et le lead compose sa formation
  (P2-14c) ; les appréciations après la jam
  restent la seule source de points (D27) ; règles pour les mineur·es.
- **Fin** : e2e « je trouve la scène ouverte du jeudi dans le mode jam ».

### P5-05 — Organisateur·rice

- **Dépend de** : P5-02.
- **Tâches** : profil, événements, plateaux (`GIG_SLOT`), appels à
  projets avec conditions (rang, genre, zone ; jamais l'XP) ; rangs.
  **Festivals** : jams du festival (bœufs de fin de concert, scènes
  ouvertes « off ») publiées comme des jams (P2-14b) dans les lieux du
  festival ; **stages et masterclasses** reliés aux écoles (P5-11), qui
  comptent dans la quête « De l'atelier à la scène ».
- **Fin** : un groupe hors conditions ne peut pas candidater (test).

### P5-06 — Concerts vérifiés

- **Dépend de** : P5-03, P5-05.
- **Tâches** : collaboration `GIG` ; vérification par le lieu ou
  l'organisateur vérifié ; tournée (≥3 concerts dans ≥3 villes en 30
  jours) ; XP des deux côtés.
- **Fin** : intégration des étapes 6 et 7 au niveau `VERIFIED`.

### P5-07 — Booker et manager

- **Dépend de** : P5-01.
- **Tâches** : profils ; accompagnement confirmé par l'artiste ; part
  faible sur les rangs franchis par les artistes accompagnés ; dates
  bookées.
- **Fin** : un accompagnement non confirmé ne rapporte rien (test).

### P5-08 — Carte : acte V

- **Dépend de** : P5-06.
- **Tâches** : acte scène jouable ; épreuves « premier concert
  vérifié », « tournée » ; carte souvenir du concert.
- **Fin** : e2e de l'acte V.

### P5-00 — Validation juridique de la monétisation (D25)

- **Avant** P5-09 et P5-10 : faire valider par un juriste la commission
  sur prestations (présomption de salariat des artistes, GUSO, statut de
  la plateforme, CGV), et choisir le partenaire de portage éventuel pour
  les concerts. Conception 01 §5.4.

### P5-09 — Offre pro

- **Dépend de** : P4-11.
- **Tâches** : abonnements **lieux** (agenda, appels à groupes, jams
  publiques, aide licence et GUSO) et **pros** (Stripe, socle existant) : recherche avancée,
  alertes, flux étendu ; **jamais** de visibilité organique, de place
  dans le mode jam ni d'XP achetée.
- **Fin** : aucun produit payant n'écrit dans le registre XP (test).

### P5-10 — Réservation de studio

- **Dépend de** : P4-03.
- **Tâches** : agenda et réservation, paiement avec Stripe Connect
  (commission) ; réservation honorée = preuve (P4-09).
- **Fin** : e2e « je réserve et paie un créneau » (Stripe en mode test).

### P5-11 — Écoles, MJC, conservatoires (D29)

- **Dépend de** : P5-02, P2-14c.
- **Tâches** : organisation `SCHOOL` (école de musiques actuelles,
  académie, MJC, conservatoire) ; un·e prof ou responsable invite ses
  élèves (lien d'invitation) et publie des **ateliers jam** (jams du
  lieu, lead = le prof) ; quête **« De l'atelier à la scène »** (premier
  atelier, puis première jam publique) ; les confirmé·es qui animent
  ou parrainent des élèves gagnent en réputation (_Passeur_, 07 §4.8) ;
  aucune liste d'élèves publique ; règles des mineur·es (D5) inchangées.
- **Fin** : e2e « la prof invite un élève, il rejoint l'atelier puis
  une jam publique » ; un·e mineur·e ne voit que les ateliers finis avant
  22 h (test).

---

## Phase 6 — Sortie et développement : actes VI à VIII

**But** : sorties vérifiées et accompagnées, labels et éditeurs, défis
collectifs, carrière complète.

### P6-01 — Personas et barème de la sortie

- **Tâches** : personas (label indépendant, éditeur, attachée de presse,
  webzine local) ; barème ; preuves de placement de l'éditeur.
- **Fin** : barème consigné.

### P6-02 — Label

- **Dépend de** : P6-01, P5-02.
- **Tâches** : `Organization(LABEL)` vérifiée ; signature (seul
  validateur, confirmée par l'artiste) ; catalogue ; rangs.
- **Fin** : une signature non confirmée par les deux n'existe pas.

### P6-03 — Éditeur·rice

- **Dépend de** : P6-01.
- **Tâches** : contrats d'édition et placements confirmés ; preuves
  (ISWC, lien vers l'œuvre placée).
- **Fin** : intégration des preuves retenues.

### P6-04 — Communication musicale

- **Dépend de** : P6-01.
- **Tâches** : campagnes et couvertures confirmées par l'artiste ;
  corroboration d'une sortie ou d'un concert par un article lié.
- **Fin** : un simple partage ne rapporte rien (test).

### P6-05 — Carte : actes VI à VIII

- **Dépend de** : P3-07, P6-02.
- **Tâches** : actes sortie, développement, carrière jouables ; quêtes
  de méthode (préparer une sortie 4 semaines avant, dossier de presse,
  clip) ; épreuves « sortie vérifiée », « signature ».
- **Fin** : e2e de la carte complète sur un jeu de données.

### P6-06 — Défis collectifs par ville

- **Dépend de** : P5-04 ; D3.
- **Tâches** : défis coopératifs opt-in (« 50 morceaux enregistrés à
  Lyon ce mois-ci », la fête de la musique) ; jamais de classement entre
  personnes.
- **Fin** : un défi réussi crédite un succès collectif.

### P6-07 — Autres rôles

- **Dépend de** : indicateurs par métier (P1-13).
- **Tâches** : ouverture des rôles de 06 §3.11 selon la demande mesurée
  (clients d'événements privés, collectivités, vidéastes, graphistes,
  auteurs, DJ, techniciens, magasins de musique, loueurs, profs,
  tremplins, radios), un lot par rôle, découpé à la revue de phase.
- **Fin** : chaque rôle ouvert suit la liste d'ouverture ci-dessus.
