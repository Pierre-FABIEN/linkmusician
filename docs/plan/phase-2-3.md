# Phases 2 et 3 — Fin du MVP

> **Fiches complètes, rédigées le 05/11/2026.** Chaque lot a son
> objectif, ses dépendances, les décisions à trancher, ses tâches et ses
> critères de fin. On les relit en début de session et on les ajuste si
> le code a révélé une surprise. Critères d'acceptation des phases :
> [conception/05 §3](../conception/05-mvp-roadmap.md#3-roadmap). Modes
> de jeu : [conception/07](../conception/07-modes-de-jeu.md). Pas de
> bêta : le MVP s'ouvre directement au public (D23, P3-10).

Rappels valables pour **chaque** lot : règles pures dans
`src/lib/<domaine>/` ou `progression/core/` et testées en tables ;
accès aux données dans `src/lib/prisma/<domaine>/` ; métier dans
`src/lib/server/<domaine>/` ; pages dans `src/routes/(app)/` ; le client
n'envoie que des **intentions** ; toute nouvelle donnée personnelle
entre dans l'export et l'anonymisation RGPD ; migrations relues et
nettoyées (`db:nouvelle-migration`) ; `docs/<domaine>/README.md` créé ou
mis à jour ; arrêter `npm run dev` avant les e2e.

---

## Phase 2 — Découverte, annonces, messagerie, collaborations, mode jam

**But** : on se trouve, on se parle, on joue ensemble, et cela se voit
dans la progression des deux côtés. Le jeu se sent : chaque gain se
fête, et le mode jam permet de jouer dès ce soir.

### P2-01 — Recherche géographique multicritère

> **Réalisé le 05/11/2026**, avec trois écarts : pagination par **numéro
> de page** et non par curseur (un curseur porterait la distance exacte) ;
> anti-aspiration par **connexion obligatoire et limite par personne**
> plutôt que par filtre de navigateur ; test k6 à **12 utilisateurs
> simultanés** (un par compte de démo, la limite étant par personne). La
> page est `/decouvrir` (entrée « Découvrir » de la navigation). Voir
> [docs/recherche](../recherche/README.md).

- **Dépend de** : P1-05, P1-06.
- **Décisions** : part de la réputation et de la proximité dans le tri
  (la réputation n'arrive qu'en P2-08 : tri par proximité seule en
  attendant) ; libellés des tranches de distance (`distanceBand`
  existe).
- **Tâches** :
  - règles pures des filtres (`src/lib/search/`) : instrument, niveau
    minimal, genre (parent inclut ses sous-genres), rayon, « ce que je
    recherche », statut pro ;
  - requête PostGIS (`ST_DWithin` sur `actor_locations`, schéma
    qualifié, `publicActorWhere`), **réciproque** en option (« je suis
    dans son rayon de déplacement ») ;
  - pagination par curseur (distance, id) ; jamais de distance exacte
    dans la réponse, seulement la tranche ;
  - page `/recherche` (filtres dans l'URL, cartes de résultat réutilisant
    les composants du profil public) ;
  - anti-scraping (`anti-scraping.ts`) et limite de débit ;
  - test k6 dans `k6/` (recherche à 50 utilisateurs simultanés).
- **Fin** : « guitariste à moins de 20 km » ne renvoie que des profils
  dont la zone floutée est dans le rayon (test d'intégration sur jeu de
  données connu) ; profils masqués, suspendus, anonymisés absents ;
  e2e recherche → profil public.

### P2-02 — Annonces (quêtes émises)

> **Réalisé le 05/11/2026**, avec des écarts : pas d'état brouillon
> (publication directe) ; la zone est la commune de l'auteur, lue à la
> volée (aucun point stocké en double) ; les annonces se consultent sur
> `/annonces`, pas dans les résultats de la recherche ; les conditions
> d'éligibilité sont affichées et seront vérifiées à la candidature
> (P2-03, `unmetConditions` déjà testé). Voir [docs/annonces](../annonces/README.md).

- **Dépend de** : P1-09.
- **Tâches** :
  - modèle `Opportunity` (04) : `JAM`, `RECRUIT_MEMBER`, `SESSION_WORK`
    au MVP ; états `DRAFT → OPEN → FILLED | CLOSED | EXPIRED` ;
  - règles pures : transitions, expiration, conditions d'éligibilité
    (rang, genre, zone ; **jamais l'XP**) ;
  - quota d'annonces actives selon la confiance (`checkStockQuota`,
    P1-09) ;
  - écrans : créer, publier, clôturer, liste « mes annonces », page
    publique d'une annonce, annonces proches dans la recherche ;
  - expiration automatique par cron QStash (`/api/jobs/opportunities`) ;
  - signalement d'une annonce (`ReportTarget.OPPORTUNITY`) ;
  - lien des objectifs « Bientôt » du tableau de bord vers `/annonces`.
- **Fin** : un TL0 ne peut avoir qu'une annonce active ; une annonce
  expirée disparaît de la recherche ; **aucune XP à la publication** ;
  e2e « je publie une annonce de jam ».

### P2-03 — Candidatures

> **Réalisé le 05/11/2026.** Écarts : pas de « message type » au refus
> (le candidat voit « Non retenue ») ; la proposition de collaboration
> après acceptation arrive avec P2-06.

- **Dépend de** : P2-02.
- **Tâches** : modèle `Application` (une par annonce et par personne) ;
  états `SENT → SEEN → SHORTLISTED → ACCEPTED | DECLINED | WITHDRAWN` ;
  écran « postuler avec un message » ; tableau de l'émetteur
  (présélection, acceptation, refus avec message type) ; l'acceptation
  **ouvre une conversation** (P2-04) et **propose une collaboration**
  (P2-06) ; une annonce passe à `FILLED` quand ses places sont prises.
- **Fin** : impossible de postuler deux fois ou à sa propre annonce ;
  e2e « je postule, l'émetteur accepte ».

### P2-04 — Messagerie

> **Réalisé le 05/11/2026.** Écarts : signalement de la **personne**
> depuis la conversation (pas encore d'un message isolé : il faudrait une
> cible `MESSAGE` dans la file de modération) ; le refus d'une demande ne
> pèse pas encore sur la confiance (avec P2-05). Voir
> [docs/messagerie](../messagerie/README.md).

- **Dépend de** : P1-09.
- **Décisions** : règles pour les 16-17 ans (D5) : messages reçus
  seulement de personnes déjà en contact ou via une annonce.
- **Tâches** : modèles `Conversation`, `ConversationParticipant`,
  `Message` (04) ; premier message à un inconnu = **demande** (quota TL
  journalier, limiteur Redis) ; acceptation ou refus de la demande ;
  texte brut, longueur maximale ; non-lus ; polling toutes les 15 s sur
  la conversation ouverte (D8) ; événement `conversation.reciprocated`
  quand l'autre répond (règle d'XP déjà écrite) ; signalement d'un
  message ; RGPD.
- **Fin** : un TL0 reçoit un 429 au 11ᵉ premier message du jour ; une
  conversation réciproque issue d'une annonce rapporte 30 XP aux deux
  (plafond 5 par jour) ; e2e « demande, acceptation, échange ».

### P2-05 — Blocage

> **Réalisé le 05/11/2026.** Règles de confiance ajoutées (conception 02
> §7) : 3 blocages reçus en 90 jours → palier 0 ; plus de la moitié des
> demandes refusées (plancher 10) → pas de palier 2. Candidatures : le
> filtre s'appliquera avec P2-03.

- **Dépend de** : P2-04.
- **Tâches** : modèle `Block` ; bloquer depuis le profil ou une
  conversation ; effets dans les deux sens : plus de profil (404), plus
  de message, plus de résultat de recherche, plus de candidature ; liste
  des personnes bloquées dans `/reglages` ; filtre partagé ajouté à
  `publicActorWhere` (variante par lecteur).
- **Fin** : un utilisateur bloqué ne peut ni écrire ni voir le profil
  (e2e) ; les refus et blocages reçus pèsent sur la confiance.

### P2-06 — Collaborations à double confirmation

> **Réalisé le 05/11/2026.** Cycle simplifié : `PROPOSED → ACCEPTED →
COMPLETED` (ou `CANCELLED`) ; pas d'état « en cours », et une
> collaboration déjà passée se confirme en un clic (proposer vaut
> confirmation pour soi). Contestation (`DISPUTED`) avec P3-06. Concerts
> et productions avec leurs preuves (phases 3 à 5). Indicateurs de
> conversation et de collaboration désormais mesurables (P1-13).

- **Dépend de** : P2-03, P1-07. **Lot central de la phase.**
- **Tâches** : modèles `Collaboration` et `CollaborationParticipant` ;
  cycle `PROPOSED → ACCEPTED → IN_PROGRESS → COMPLETED` (ou
  `CANCELLED`, `DISPUTED`) ; `COMPLETED` quand **chaque** participant a
  confirmé ; émission de `collaboration.completed` (règle d'XP et
  multiplicateurs déjà dans le noyau) ; écrans : proposer une
  collaboration à un contact, confirmer, historique sur le profil
  (« Ce que d'autres confirment » se remplit) ; objectif « Termine une
  première collaboration » actif ; RGPD (une collaboration survit à
  l'anonymisation d'un participant, affiché « Compte supprimé »).
- **Fin** : e2e « annonce → candidature → conversation → collaboration
  confirmée → XP créditée des deux côtés » ; 2ᵉ collaboration avec la
  même personne à 50 %, 4ᵉ à 0 (intégration).

### P2-07 — Endossements

> **Réalisé le 06/11/2026.** Écarts : une appréciation par paire et par
> collaboration, pas « une par compétence et par paire » (D32) ; on la
> laisse depuis la conversation, sous la collaboration confirmée.
> L'instrument proposé est l'un de ceux que la personne déclare ; le
> profil affiche « apprécié par N » (personnes distinctes, jams et
> collaborations). Une appréciation reprise émet `endorsement.revoked`,
> qui la retire du palier Référence (y compris pour les jams). Pas encore
> de reprise par l'auteur pour une appréciation de jam.

- **Dépend de** : P2-06, P2-15 (le modèle d'appréciation y naît pour
  les jams ; ce lot l'étend aux collaborations, D27).
- **Tâches** : modèle d'endossement (compétence ou qualité : « fiable »,
  « à l'heure », un instrument) ; impossible sans collaboration
  confirmée commune ; un par compétence et par paire ; révocable
  (transaction négative liée) ; confiance TL1 requise ; affichage
  « endossé par N » sur l'instrument (`InstrumentSkill` le prévoit) ;
  événement `endorsement.received` (règle existante).
- **Fin** : endossement impossible sans collaboration commune (e2e et
  intégration) ; révocation qui reprend l'XP.

### P2-08 — Réputation

- **Dépend de** : P2-06, P2-07.
- **Tâches** : `ReputationSnapshot` recalculé par job nocturne et à la
  demande ; carte publique de signaux (« 12 collaborations avec 7
  personnes · répond sous 48 h ») ; `internalScore` pour le tri de
  recherche, **jamais exposé** (test qui inspecte les réponses JSON) ;
  tri de P2-01 mis à jour.
- **Fin** : le score n'apparaît dans aucun payload ; la carte publique
  du profil se remplit ; l'XP n'entre pas dans le calcul (test).

### P2-09 — Notifications

- **Dépend de** : P2-04, P2-06.
- **Tâches** : modèle `Notification` ; badge in-app en polling ; emails
  regroupés (digest) via `smtp-mail.ts` ; préférences par type dans
  `/reglages` ; types : demande de contact, message, candidature,
  collaboration à confirmer, endossement, gain, succès ; ton
  d'encouragement, jamais culpabilisant (07 §7).
- **Fin** : jamais plus d'un email de digest par jour et par personne ;
  désinscription par type ; e2e « je reçois une demande, le badge
  s'allume ».
- **Découpé** (06/11/2026) :
  - **P2-09a — Dans l'app** : modèle `Notification` et préférences,
    émission aux six points (demande de contact, candidature reçue,
    candidature acceptée, collaboration à confirmer, appréciation,
    invitation de jam), cloche dans la coquille, `/notifications`,
    préférences par type dans `/reglages`, RGPD, e2e du badge. Les gains,
    niveaux et succès restent annoncés par les célébrations (P2-11) et les
    messages par leur pastille : pas de doublon sous la cloche.
  - **P2-09b — Digest email** (dépend de P2-09a) : job quotidien, au plus
    un email par jour et par personne, seulement s'il y a du neuf non lu
    (notifications, messages non lus, gains et succès de la veille) ;
    préférence « par email » par type dans `/reglages` et lien de
    désinscription par type dans l'email (jeton signé, sans connexion) ;
    purge des notifications lues de plus de 90 jours ; décider du Web Push
    (03 §mobile) ou le reporter.

### P2-10 — Confiance TL2 et détection de collusion

- **Dépend de** : P2-06.
- **Tâches** : condition TL2 complète (collaboration avec une
  contrepartie TL1+) ; job nocturne : composantes denses du graphe de
  collaborations sans lien extérieur → file de revue en modération ;
  empreinte d'appareil existante utilisée comme signal ; aucune
  sanction automatique.
- **Fin** : une clique de test apparaît dans la file de revue
  (intégration) ; TL2 atteint dans un scénario réaliste.

### P2-11 — Célébrations

> **Réalisé le 05/11/2026.** Écarts : les rangs (paliers) ne sont pas
> encore fêtés, faute d'événement de franchissement (le palier se calcule
> à la lecture) ; à ajouter avec P3-08 ou P3-13. Les messages des
> formulaires de l'espace ne répètent plus les gains (`progressMessage`
> supprimé).

- **Dépend de** : P1-11.
- **Tâches** : lecture des événements dérivés (`progress.level_reached`,
  `progress.achievement_unlocked`, `progress.trust_changed`) non encore
  vus ; marqueur « vu » par personne ; composants : annonce de gain
  (« +400 XP · Collaboration confirmée avec Malik »), animation de
  niveau, de rang, de succès ; respect de `prefers-reduced-motion` ;
  journal de bord (`/espace`) lisible comme un récit.
- **Fin** : après la publication d'une démo, la célébration s'affiche
  une fois et une seule (e2e) ; aucune valeur calculée côté client.

### P2-12 — Accueil à deux modes

> **Réalisé le 05/11/2026.** `/jouer` est l'accueil de l'espace (arrivée
> après connexion en mode LinkMusician, logo) ; `Person.preferredMode`
> retient le dernier choix. Le mode jam a déjà son hub `/jam` (jams ouvertes
> = annonces de type jam, « Lancer une jam ») ; « Je suis dispo » et les
> salons arrivent avec P2-13 à P2-16. L'onboarding et « Qui es-tu ? »
> mènent toujours au tableau de bord.

- **Dépend de** : P0-05.
- **Tâches** : écran d'accueil de l'espace avec deux grandes entrées,
  **Carrière** et **Jam**, comme le menu d'un jeu ; le dernier mode
  choisi est retenu (préférence) ; Carrière mène au tableau de bord
  (puis à l'écran de carrière en P3-12) ; Jam mène au mode jam
  (P2-13) ; accessibilité (axe).
- **Fin** : e2e « je choisis un mode, il est retenu à la visite
  suivante ».

### P2-12b — Menu du jeu et navigation par mode

> **Ajouté et réalisé le 05/11/2026** (demande : « une navigation simple et
> super intelligente, étape par étape »).

- `/jouer` est **la première page** après la connexion, la fin de
  l'onboarding et « Qui es-tu ? » : choix du mode, chaque carte dit comment
  on y avance.
- **Présentation en 3 étapes** la première fois qu'on choisit un mode
  (`/jouer/carriere`, `/jouer/jam`), « Passer » possible ; ensuite, accès
  direct (`Person.modeIntrosSeen`).
- **Coquille actuelle (D48)** : pas de barre d'onglets ; raccourcis
  Découvrir, Messages et Notifications à droite dans l'en-tête ; Profil
  dans le menu du compte. Le contrôle de mode bascule directement vers
  l'autre mode et enregistre la préférence.
- **« Ta prochaine étape »** : une seule action à la fois, « Étape X sur
  N » (carrière : objectifs du jeu ; jam : ville → dispo → écrire → jam
  confirmée → passer en carrière).
- La coquille et ses raccourcis restent sur le **profil public** et les
  **médias** quand on est connecté, sur mobile comme sur ordinateur.
- E2E `modes.spec.ts`.

### P2-13 — Mode jam : « Je suis dispo »

> **Réalisé le 05/11/2026.** Règles des mineur·es tranchées (D5, D26) :
> dispo jamais affichée (bouton non proposé), jams finissant avant 22 h.
> Le quota est une limite d'activations (5, puis une toutes les ~5 h).
> Voir [docs/jam](../jam/README.md).

- **Dépend de** : P2-01, P2-12.
- **Décisions** : règles pour les mineur·es (D5) : lieux publics et
  locaux de répète seulement, créneaux en journée ou début de soirée.
- **Tâches** : modèle de disponibilité (créneau, envie : instruments,
  styles ; expiration) ; interrupteur sur l'écran jam ; liste « dispos
  autour de toi » (réutilise la recherche, commune et tranche de
  distance) ; quota selon la confiance ; extinction automatique ;
  RGPD.
- **Fin** : une disponibilité expirée n'apparaît plus ; un mineur ne
  voit que ce que les règles autorisent (tests) ; e2e « je me mets
  dispo ce soir, quelqu'un du coin me voit ».

### P2-14a — Annuaire des lieux

- **Dépend de** : P2-13. Décisions D26, D27, D22.
- **Tâches** : modèle `Venue` (nom, type parmi bar, café-concert,
  salle, scène ouverte, MJC, local de répétition, studio, magasin de
  musique ; commune avec son centroïde, **jamais d'adresse précise**) ;
  créé par un membre (`createdById`), doublons évités (même nom
  normalisé dans la même commune) ; `claimedByActorId` prévu pour la
  revendication par le lieu en phase 5 (P5-03) ; recherche par nom et
  commune ; fiche publique `/lieux/[id]` ; signalement (`ReportTarget
VENUE`) ; quota de création (rate limit). Une jam n'est plus une
  collaboration (D27) : le type « Jam » disparaît des collaborations
  proposables (l'historique reste), textes du mode jam corrigés.
- **Fin** : doublon refusé (test) ; e2e « j'ajoute le Bar des Amis à
  Lyon, je le retrouve en cherchant ».

### P2-14b — Mode jam : jams publiques

- **Dépend de** : P2-02, P2-14a.
- **Tâches** : une jam est une annonce `JAM` enrichie : **lieu de
  l'annuaire obligatoire** (D26), début et fin, style, **places
  souhaitées par instrument** ; l'auteur est l'**hôte** ; « Je viens »
  sans acceptation (on peut venir seul), retirable ; « Trouve-moi une
  jam » (jams à venir et personnes dispos selon instrument et genres) ;
  mineur·es : jams finissant avant 22 h seulement (D5) ; fiche du lieu :
  ses jams à venir.
- **Fin** : un·e mineur·e ne voit aucune jam finissant après 22 h
  (test) ; e2e « je publie une jam au Bar des Amis, quelqu'un dit Je
  viens ».

### P2-14c — Formation du lead et matériel sur place

- **Dépend de** : P2-14b.
- **Tâches** : **lead** de la jam (l'hôte, ou un·e musicien·ne désigné·e
  par l'hôte) ; le lead **compose sa formation** : il invite des
  musicien·nes de son choix (affinités, réseau musical) sur des places
  réservées, acceptées par l'invité·e ; les autres places restent
  ouvertes à « Je viens ». **Matériel sur place** : batterie, ampli
  basse, ampli guitare, clavier, sono et micros, câbles ; par défaut
  celui de la fiche du lieu, modifiable pour une jam ; la fiche de la
  jam dit à chacun·e quoi apporter (« apporte ta guitare, l'ampli est
  là »). Aucune XP (D27). **Validation des lieux** (sécurité, D26) :
  un lieu ajouté par un compte récent (TL0) reste invisible et ne peut
  pas accueillir de jam tant qu'un second membre ne l'a pas confirmé ou
  qu'un modérateur ne l'a pas validé.
- **Fin** : une place réservée n'est pas prise par « Je viens » (test) ;
  e2e « le lead invite une batteuse, elle accepte ; la fiche dit
  d'apporter sa basse, l'ampli est fourni ».

### P2-14d — Lieux vérifiés par SIRET et établissements de Toulouse

> **Ajouté le 05/11/2026** (demande : « pour les organisateurs, un id
> d'entreprise à vérifier pour valider, du genre les bars » ; « on se
> concentre sur Toulouse pour les données »). Décision D30.

- **Dépend de** : P2-14c.
- **Tâches** : table de référence `Establishment` (SIRET, nom
  d'enseigne, code NAF, commune, actif) importée de l'API Recherche
  d'entreprises pour Toulouse Métropole (`npm run seed:etablissements`,
  relançable) : débits de boissons (56.30Z), salles de spectacle
  (90.04Z), studios (59.20Z), enseignement culturel (85.52Z), MJC ;
  entreprises individuelles sans enseigne écartées, aucune adresse.
  Ajout d'un lieu : suggestions d'établissements pendant la saisie du
  nom ; SIRET facultatif ; un SIRET vérifié (table, sinon API en direct,
  Haute-Garonne seulement, même commune, actif) **valide le lieu tout de
  suite** et affiche le badge « vérifié ». Un lieu en attente peut être
  validé en ajoutant son SIRET. Un SIRET n'est lié qu'à un lieu.
- **Fin** : SIRET invalide (clé de Luhn) refusé (test) ; un compte TL0
  ajoute un bar avec son SIRET, le lieu est validé et accueille une jam
  (e2e).

### P2-15 — Après la jam : « J'y étais » et appréciations

- **Dépend de** : P2-14b. Décision D27.
- **Tâches** : après le début de la jam, « J'y étais » (sans XP) ;
  écran « Qui était là ? » : les présent·es en **grille de photos de
  profil** (initiales et instrument si pas de photo) pour reconnaître
  les gens, un toucher pour apprécier ;
  pendant 7 jours, appréciation d'un autre présent : qualité
  (« bon groove », « à l'écoute », « belle impro », « fiable ») ou
  instrument ; une par paire et par jam ; TL1 requise pour en donner ;
  événement `endorsement.received` (≈ 40 XP, rendements décroissants
  par paire) ; l'hôte retire un faux présent (et les appréciations
  liées sont reprises par transaction négative) ; « Rejouer ensemble »,
  « Garder le contact » ; succès fun (_Noctambule_, _Touche-à-tout_,
  _Brise-glace_, _Chef d'orchestre_) sans XP ; affichage sur le profil ;
  RGPD.
- **Fin** : « J'y étais » ne rapporte rien (test) ; appréciation
  impossible sans présence commune (test) ; e2e « deux présents,
  l'une apprécie l'autre, ses points montent ».

> **Découpé le 05/11/2026.** P2-15a (livré) : « J'y étais », « Qui était
> là ? », appréciations et XP, retrait d'un faux présent, appréciations
> sur le profil, « Rejouer ensemble » (nouvelle jam au même lieu) et
> « Garder le contact » (message), RGPD. P2-15b : succès fun sans XP
> (_Noctambule_, _Touche-à-tout_, _Brise-glace_, _Chef d'orchestre_),
> « Rejouer ensemble » prérempli avec les mêmes invité·es, photos de
> profil dans la grille (à l'arrivée des photos de profil). Le réseau
> musical (« Garder le contact » qui ajoute vraiment au réseau) est fait
> avec P2-16.

### P2-16 — Carnet de jams et réseau musical

- **Dépend de** : P2-15.
- **Tâches** : carnet façon souvenirs (jams, personnes rencontrées,
  instruments croisés, styles, communes) ; réseau musical (gens avec
  qui l'on a vraiment joué) ; quand on cherche quelqu'un (recherche,
  annonce), le réseau est proposé en premier ; RGPD.
- **Fin** : le carnet reflète les jams où l'on était (e2e) ; le réseau
  remonte en tête d'une recherche correspondante.

### P2-17 — Conseils en contexte

- **Dépend de** : P2-12b.
- **Tâches** : sur chaque écran clé, un **conseil court** qui explique
  comment jouer le jeu : créer du lien (écrire, proposer de jouer,
  « Garder le contact »), **apprécier** les gens avec qui l'on a joué,
  trouver des musicien·nes pour un projet ; un conseil à la fois, ton
  d'encouragement (07 §7), masquable (« J'ai compris »), mémorisé par
  personne ; catalogue pur `#lib/guide/tips` (écran, condition,
  texte, lien) testé ; jamais sur un écran déjà guidé par « Ta prochaine
  étape ».
- **Fin** : un conseil masqué ne revient pas (e2e) ; aucun écran clé sans
  conseil (test du catalogue).

### P2-18 — Suggestions de musicien·nes selon styles et niveaux

- **Dépend de** : P2-01, P2-16.
- **Tâches** : sur son profil et dans l'espace, « Des musicien·nes pour
  toi » ; sur le profil d'un autre, « Dans le même style » ; calcul pur
  de compatibilité : genres en commun, **niveau déclaré proche**,
  instrument complémentaire (une guitariste se voit proposer basse,
  batterie, voix), distance par tranches, réseau musical en premier ;
  **jamais l'XP** ni le palier ; filtre de visibilité
  (`publicActorWhere`), mineur·es jamais suggéré·es aux adultes
  inconnu·es (D5) ; « Pas intéressé·e » retire une suggestion.
- **Fin** : l'XP ne change pas l'ordre (test) ; un·e mineur·e n'apparaît
  pas (test) ; e2e « je vois une batteuse rock de mon niveau ».

**Revue de fin de phase 2 (06/11/2026)** : ✅ critères d'acceptation de
la phase ([conception/05 §3](../conception/05-mvp-roadmap.md#3-roadmap))
couverts par des tests (recherche par rayon et tranches, rendements
400/200/100/0, quota TL0 au 11ᵉ message, appréciation sans
collaboration refusée, blocage, e2e annonce → collaboration → XP des
deux côtés) ; barème calibré sur 6 personas, aucune valeur changée
([conception/02 §2.3](../conception/02-progression.md#23-calibrer-le-barème)) ;
palier « En réseau » ouvert aux jams appréciées (**D36**) ; morceau
minimal tranché (**D35**) ; fiches de la phase 3 relues (P3-01, P3-03,
P3-04, P3-08, P3-11, P3-13 ajustées). Démo du parcours : scénario dans
[revue-phase-2.md](./revue-phase-2.md).

---

## Phase 3 — Groupes, morceaux, étapes, preuves, carrière

**But** : un groupe existe, recrute, crée des morceaux, franchit des
épreuves prouvées ; le mode carrière se joue sur ses trois premiers
actes. Puis LinkMusician s'ouvre au public.

### P3-01 — Groupe et adhésions

- **Dépend de** : P2-06.
- **Tâches** : table `Organization` liée à un `Actor` de type
  `ORGANIZATION` (le type existe, pas la table), avec un
  `OrganizationKind` extensible (`BAND` d'abord ; studio, lieu, label
  plus tard) ; le `@handle` est partagé avec les personnes
  (`Actor.handle`) ; `Membership` (invitation, demande, départ ; rôles
  OWNER, ADMIN, MEMBER ; `startedAt`, `endedAt`) ; un groupe sans OWNER
  est impossible ; transfert de propriété ; **agir au nom du groupe**
  (une garde unique « OWNER ou ADMIN de ce groupe », réutilisée par les
  annonces, les médias et les morceaux) ; mineur·es : inviter un·e
  mineur·e suit les règles de la messagerie restreinte (D5) ; événement
  `membership.accepted` (règle existante, rendements décroissants) ;
  l'étape « Formation » vérifiée à la 2ᵉ adhésion acceptée ; RGPD.
- **Revue P2** : le moteur sait déjà tout (`membershipAccepted`,
  `milestoneBand`, `milestoneMember`, `bandTier`) ; le lot est surtout
  du modèle, des droits et de l'UX.
- **Fin** : historique des adhésions juste après départs et retours
  (intégration) ; e2e « je crée un groupe, j'invite Malik ».

### P3-02 — Page de groupe

- **Dépend de** : P3-01.
- **Tâches** : page publique `/@handle-du-groupe` (mêmes composants et
  même visibilité que le profil, JSON-LD `MusicGroup` déjà prévu) ;
  effectif actuel et passé (comme un club) ; médias ; étapes (P3-04).
- **Fin** : membres passés affichés avec leurs dates ; e2e.

### P3-03 — Recrutement

- **Dépend de** : P3-01, P2-02.
- **Tâches** : annonce « cherche un membre » émise par le groupe
  (`RECRUIT_MEMBER` et `Opportunity.issuerActorId` existent déjà : le
  groupe devient l'émetteur, publiée par un·e OWNER ou ADMIN) ;
  candidatures reçues par les OWNER et ADMIN ; l'acceptation ouvre la
  conversation (comme P2-03) et crée l'adhésion ; quête remplie, XP des
  deux côtés.
- **Fin** : e2e « le groupe recrute une batteuse ».

### P3-04 — Étapes : définitions et déclaration

- **Dépend de** : P3-01.
- **Décisions** : liste finale des étapes et preuves recevables.
- **Tâches** : `MilestoneDefinition` versionné (seed), `Milestone` ;
  déclaration d'une étape (1 à 6 au MVP) ; émission de
  `milestone.attested` (règle existante, XP différentielle) ; « Première
  composition » corroborée par un morceau composé du groupe (P3-11,
  D35).
- **Fin** : une étape déclarée rapporte l'XP « déclarée » ; seed
  rejouable.

### P3-05 — Preuves et attestations

- **Dépend de** : P3-04.
- **Tâches** : `Evidence` (lien, média, référence externe) et
  `Attestation` ; règles pures « qui peut corroborer quoi » (tiers
  **hors groupe** pour les étapes 6 et plus ; confiance TL2) ; passage
  de statut en XP différentielle.
- **Fin** : un concert corroboré uniquement par un membre reste
  `DECLARED` (unitaire et e2e).

### P3-06 — Contestation et reprise d'XP

> **Réalisé le 08/11/2026** (D49). Écarts : le gel n'a lieu que pour un
> signalement d'une personne de confiance ≥ 1 ; une étape retenue est
> supprimée (redéclarable) après la reprise liée de son XP ; la
> confirmation mensongère se juge avec l'étape (pas de signalement
> séparé) ; seules les étapes déclarées se contestent. Retrait par la
> gestion du groupe livré. Voir [docs/etapes](../etapes/README.md).

- **Dépend de** : P3-05.
- **Tâches** : signaler une étape (`ReportTarget.MILESTONE`), la geler,
  décision du modérateur ; reprise par transaction négative liée
  (`reversesId`) ; rétrogradation de la confiance de l'attestant.
- **P3-04** : une étape déclarée par erreur ne se retire pas encore (seules
  sa date et sa précision se corrigent) ; prévoir son retrait par la gestion
  du groupe, avec la même reprise liée.
- **Fin** : une contestation retenue écrit la transaction liée et
  rétrograde l'attestant (intégration).

### P3-07 — Vérification de sortie par API

- **Dépend de** : P3-05.
- **Tâches** : vérification d'une démo publique et d'un EP via l'API
  Spotify ou MusicBrainz (ISRC, UPC, nom d'artiste) ; gestion des faux
  positifs ; mock en e2e ; disjoncteur (`circuit-breaker.ts`).
- **Fin** : une sortie connue passe `VERIFIED` (mock) ; un nom qui ne
  correspond pas est refusé.

### P3-08 — Rangs de groupe et part des membres

> **Réalisé le 08/11/2026.** La part des membres présents à la date était
> déjà versée par `attest` (P3-04) ; le lot ajoute le rang (`bandTierOf`,
> sans les étapes gelées), son badge (page publique, gestion, « Mes
> groupes ») et le test du membre arrivé après. Voir
> [docs/etapes](../etapes/README.md).

- **Dépend de** : P3-05.
- **Tâches** : rang de groupe = dernière étape corroborée (Projet →
  Signé) ; 25 % de l'XP aux membres **présents à la date** de l'étape ;
  TierBadge du groupe. Les règles pures existent déjà (`bandTier`,
  `milestoneMember`) : reste le service qui fixe `memberIds` d'après
  l'historique des adhésions à la date de l'étape.
- **Fin** : un membre arrivé après une étape n'en reçoit pas la part
  (intégration).

### P3-09 — Modération étendue

> **Réalisé le 08/11/2026.** File des contestations livrée avec P3-06.
> Vérification manuelle des organisations (groupes au MVP : SIRET et lien
> officiel, badge « Groupe vérifié ») ; journal `/moderation/journal`
> (filtre par type de décision) ; un test exige un libellé pour chaque
> action `moderation.*` écrite dans le code. Voir
> [docs/moderation](../moderation/README.md).

- **Dépend de** : P3-06.
- **Tâches** : file des contestations ; vérification manuelle
  d'organisations (préparation de la phase 5) ; journal d'audit
  (`audit-log.ts`).
- **Fin** : chaque décision est tracée.

### P3-11 — Morceau minimal

- **Dépend de** : P3-01 ; D20 et **D35** (modèle et barème, tranchés
  le 06/11/2026).
- **Tâches** : `Work` (titre, état, genres, porteur : personne ou
  groupe), `WorkContributor` (rôles : instrument du référentiel,
  composition, paroles, arrangement ; confirmation), maquette rattachée
  (média) ; fiche morceau avec **rôles à pourvoir** et bouton
  « Recruter » (annonce ciblée) ; états idée → composé : **seul·e**, une
  maquette suffit (déclaré, sans XP) ; **à plusieurs**, ≥2 rôles
  confirmés et une maquette (corroboré) ; une idée n'est visible que de
  son équipe, un morceau composé apparaît sur le profil ou la page de
  groupe ; événement `work.composed` et règle pure : 150 XP par
  contributeur confirmé, une fois par morceau, × rendement décroissant
  par paire × confiance (comme `collaborationCompleted`), part versée à
  qui confirme plus tard ; persona de calibrage « deux ami·es qui
  enchaînent les morceaux » ; l'étape « Première composition » s'appuie
  sur un morceau composé du groupe ; RGPD. Pas de `Collaboration.workId`
  ni de `WorkPitch` (phase 4).
- **Fin** : seul·e avec une maquette, le morceau est composé sans XP ;
  à plusieurs, il passe « composé » quand ≥2 contributeurs ont confirmé
  et qu'une maquette est jointe, et chacun reçoit sa part ; un 4ᵉ
  morceau avec la même personne ne rapporte rien (unitaires) ; une idée
  n'est pas visible hors de l'équipe (intégration) ; e2e.

### P3-12 — Ambition et écran de carrière

- **Dépend de** : P2-12, P3-11.
- **Tâches** : choix de l'ambition (jouer en groupe, scène,
  enregistrer et sortir, devenir pro), modifiable, sans échec ; écran
  de carrière : carte (P3-13), campagnes en cours (morceaux et places
  libres), équipe, trois objectifs, agenda (jams, répètes, dates),
  journal de bord ; les objectifs mis en avant suivent l'ambition.
- **Fin** : changer d'ambition change les objectifs mis en avant, sans
  rien retirer (unitaire) ; e2e.

### P3-13 — Carte de carrière (actes I à III)

- **Dépend de** : P3-05, P3-12.
- **Décisions** : liste des déblocages par épreuve (07 §4.5).
- **Tâches** : règles pures de la carte (acte en cours, épreuves
  franchies, suivantes dans le brouillard), calculées depuis les
  preuves et les rangs, **jamais depuis l'XP** ; affichage de la carte ;
  célébration d'épreuve (P2-11) ; déblocages réels de l'acte I et II.
- **Fin** : une jam où l'on a reçu une appréciation (ou une
  collaboration confirmée) franchit l'acte I ; un morceau composé à
  plusieurs l'acte II, pas un morceau composé seul·e (unitaires et
  e2e).

### P3-14 — Fiche de carrière et cartes souvenirs

- **Dépend de** : P2-08, P3-13.
- **Tâches** : fiche façon joueur (jams, rencontres, collaborations,
  morceaux, concerts, villes, crédits) ; version publique = faits
  confirmés seulement (D1) ; carte souvenir partageable générée côté
  serveur à chaque épreuve (image Open Graph).
- **Fin** : la fiche publique ne contient ni XP ni confiance (test du
  payload) ; l'image se génère.

### P3-16 — Carnet de contacts et discussions de groupe

- **Dépend de** : P2-16. Fait juste après P3-05 (choix du 07/11/2026).
- **Décisions** : D44, D45.
- **Idée** : aller à une jam sans connaître personne, en repartir avec des
  contacts qu'on recontacte par l'app, sans échanger son numéro. À mettre
  en avant (après-jam, aide du mode jam, présentation du mode jam).
- **P3-16a — Messagerie à trois messages (D44)** : jusqu'à 3 messages
  tant que l'autre n'a pas répondu ; la réponse débloque la conversation ;
  « Refuser » et « Bloquer » restent ; quota de premières demandes et
  règles des mineur·es inchangés. Mettre à jour `sendPermission`, les
  écrans, l'aide (`rencontrer`) et les e2e de la messagerie.
- **Découpage (07/11/2026, D46)** : P3-16b = onglet Contacts, carnet et
  groupes de contacts ; P3-16c = discussions de groupe sur invitation.
- **P3-16b — Carnet et groupes de contacts (D45)** : page « Contacts » dans
  la navigation (le réseau musical : comment on s'est rencontrés, projets
  en cours partagés : groupes, morceaux, collaborations ; « Écrire ») ;
  groupes de contacts privés (« Projet funk ») ; discussion de groupe
  ouverte depuis un groupe de contacts (conversations à plusieurs :
  consentement de chaque personne, blocages, mineur·es à trancher) ;
  « Garder le contact » mis en avant après la jam ; RGPD.
- **Fin** : e2e « après une jam, je garde le contact de Malik et Zoé, je
  crée le groupe « Projet funk » et j'ouvre une discussion à trois » ;
  e2e « 3 messages puis bloqué jusqu'à la réponse ».
- **P3-16c — Discussions de groupe** (réalisé le 08/11/2026, D46) : ouverte
  depuis un groupe de contacts, invitation (Rejoindre, Non merci) sans rien
  voir avant, quitter ; seul l'auteur invite ses contacts ; mineur·es
  exclu·es sans dire pourquoi ; blocages vérifiés à l'invitation et au
  « Rejoindre ». Écarts : « Non merci » et « Quitter » sont définitifs (pas
  de réinvitation) ; un blocage posé après coup ne ferme pas la discussion.
  Voir [docs/contacts](../contacts/README.md#discussions-de-groupe-p3-16c-d46).

### P3-17 — Assistant IA de préremplissage de l'inscription

- **Dépend de** : P1-10 (onboarding), P2-17 (conseils en contexte).
- **Décision** : D47 (Proposée) — périmètre, consentement et garde-fous.
- **Problème** : les personnes doivent traduire leur situation musicale
  en plusieurs formulaires successifs. Le jargon ou l'incertitude sur
  quoi répondre peut les faire abandonner avant le premier résultat.
- **Objectif** : conserver le parcours actuel, déjà limité à six écrans,
  et proposer une entrée facultative « Décris ta situation avec tes mots ».
  La personne écrit librement ; l'IA prépare des suggestions qu'elle
  peut examiner, modifier ou ignorer avant de continuer.
- **Périmètre initial** : uniquement les étapes de l'onboarding
  `/qui-es-tu` et `/demarrer/*` : instruments et rôles, niveau déclaré,
  genres, commune et intention. Le niveau ne peut être suggéré que si la
  personne l'énonce explicitement ; une durée de pratique ne suffit pas à
  l'inférer. Pour la commune, l'IA ne propose qu'un nom à retrouver et à
  choisir dans le sélecteur existant ; aucune adresse, coordonnée ou
  position GPS n'est acceptée. Le rayon n'est proposé que s'il est
  explicitement donné. Ne pas générer de bio ni élargir aux formulaires
  d'annonce, de groupe ou de profil dans ce lot.
- **UX et comportement** :
  - Aide facultative et contournable, accessible au clavier et annoncée
    aux lecteurs d'écran ; l'inscription manuelle reste toujours
    utilisable et les six écrans ne sont pas augmentés.
  - Version initiale en saisie texte ; la dictée éventuellement fournie
    par le clavier ou le système d'exploitation peut être utilisée sans
    téléverser d'audio. Pas de capture micro ni de transcription audio
    côté serveur dans ce lot.
  - La personne déclenche elle-même l'analyse après avoir lu un avis
    clair sur le traitement du texte.
  - Chaque valeur suggérée est présentée comme une proposition,
    modifiable et supprimable ; la personne confirme chaque champ.
    Aucun envoi de formulaire, enregistrement de profil ou publication
    n'est déclenché par l'IA.
  - Les valeurs confirmées passent ensuite par les formulaires,
    référentiels, schémas Zod et validations existants. Si l'analyse
    échoue ou n'est pas disponible, le parcours manuel fonctionne et
    l'erreur est expliquée sans faire croire que des données ont été
    enregistrées.
- **Architecture et sécurité** :
  - Appel au modèle exclusivement côté serveur, après action explicite ;
    sortie structurée, taille et durée bornées, et validation Zod stricte.
    Le modèle ne choisit que des identifiants présents dans les
    référentiels servis par le serveur ; toute valeur inconnue est
    écartée et signalée, jamais enregistrée.
  - N'envoyer ni email, mot de passe, date de naissance, identifiant de
    compte, données de paiement ou coordonnées précises. Ne pas demander
    ces données dans le texte ; prévoir une minimisation des coordonnées
    personnelles évidentes avant transmission.
  - Le texte original et la réponse brute du modèle ne sont ni stockés,
    ni journalisés, ni réutilisés pour l'entraînement. Avant de choisir
    un fournisseur, vérifier ses conditions de conservation, d'usage et
    de sous-traitance ; ne pas lancer la fonctionnalité si ces garanties
    ne sont pas établies.
  - Limiter les appels par compte avec le rate limiter existant et un
    plafond de taille ; quota précis et fournisseur à décider avant
    l'implémentation. Le modèle est une source non fiable : il ne peut
    appeler aucun outil ni agir sur le compte.
  - Aucun score, classement, recommandation d'autres personnes ou
    décision de progression n'est produit. L'IA ne remplace pas les
    intentions exprimées par la personne.
- **Mesure** : suivre uniquement des compteurs sans texte ni valeurs de
  profil : usage de l'aide, champs proposés/acceptés/modifiés/ignorés,
  échecs et coût. Comparer le taux de fin d'inscription et le temps
  jusqu'au premier résultat au parcours sans aide ; aucun contenu libre
  dans l'analytique.
- **Fin** :
  - tests unitaires des correspondances référentielles, des sorties
    invalides et des cas où l'information est absente ou ambiguë ;
  - tests d'intégration avec fournisseur simulé : aucun appel sans
    consentement, données interdites exclues, limite de débit appliquée,
    aucune écriture de profil avant confirmation ;
  - e2e avec sortie déterministe simulée : propositions modifiables,
    ignorables, puis onboarding achevé par les actions habituelles ;
  - chemin manuel sans IA toujours fonctionnel ; aucune régression du
    seuil actuel de six écrans ou de l'objectif « premier résultat en
    moins de 2 minutes ».
- **Après le pilote** : étudier séparément l'aide à d'autres formulaires
  (bio du profil, annonces, création de groupe) à partir des mesures et
  retours ; aucun élargissement automatique du périmètre.

### P3-15 — Guide des démarches

- **Dépend de** : P2-17, P3-04, P3-11.
- **Décisions** : D42 (périmètre, relecture, responsabilité du contenu).
- **Conception** : [09-demarches.md](../conception/09-demarches.md).
- **P3-15a — Fiches et déclencheurs** : `/demarches` et
  `/demarches/[fiche]` ; les fiches du lancement (protéger un morceau,
  écrire à plusieurs, première démo et déclaration des œuvres, premier
  concert et programme des œuvres, être payé·e pour un concert, jouer
  gratuitement, l'association du groupe, les mineur·es sur scène) ; une
  phrase et un lien là où la question se pose (09 §3), une à la fois,
  « J'ai compris » ; contenu versionné avec sources et date de
  vérification.
- **P3-15b — Documents préremplis** : bulletin de partage d'un morceau
  (crédits confirmés et rôles, parts à saisir et à signer à la main) ;
  programme des œuvres d'un concert (morceaux composés du groupe).
- **Fin** : chaque fiche a ses sources officielles, un « en bref » et une
  date de vérification de moins d'un an (test) ; fiches relues par
  quelqu'un du métier avant l'ouverture ; e2e « je télécharge le bulletin
  de partage de notre morceau ».

### P3-10a — Audit de sécurité avant production

- **Dépend de** : tous les lots du lancement (D28). **Bloquant** pour
  P3-10 : aucune ouverture tant qu'un point de la checklist reste ouvert.
- **Checklist** :
  1. Specs de sécurité du boilerplate au vert (`e2e/admin/security.spec.ts`,
     `users.spec.ts`, `exports.spec.ts`, `auth/gdpr-data.spec.ts`,
     remontée n° 18) : cause établie, corrigée ou remontée en amont.
  2. Lieux (D26) : aucune jam possible dans un lieu non validé ; lieux
     ajoutés par un compte récent invisibles jusqu'à confirmation par un
     second membre ou un modérateur (P2-14c).
  3. Mineur·es (D5) : chaque fonction (jams, formation du lead,
     invitations, suggestions, messagerie, appréciations) respecte le
     couvre-feu de 22 h, la dispo invisible, la messagerie restreinte et
     l'absence de suggestion à des adultes inconnu·es ; un test par
     fonction.
  4. Limiteurs de débit : tous sur Redis (Upstash) en production, aucun
     en mémoire ; test de charge (k6) sur les actions limitées.
  5. HTML injecté : chaque `{@html}` (blog, données structurées) nettoyé ;
     aucun texte d'utilisateur rendu en HTML (test XSS).
  6. Service worker : aucune page connectée ni réponse privée en cache.
  7. Accès par identifiant : pour chaque route `[id]` et chaque action, un
     test avec l'identifiant d'un autre compte (non-membre, bloqué,
     mineur·e, contenu retiré).
  8. En-têtes (CSP, HSTS, cookies `Secure`, `HttpOnly`, `SameSite`),
     origine des actions, `npm audit` sans faille haute ou critique.
  9. Données qui ne sortent jamais : score interne de réputation, date de
     naissance, point de localisation, e-mail ; test qui inspecte les
     réponses JSON de chaque page.
  10. Abus de jeu : collusion d'appréciations (P2-10), faux présents à une
      jam, rendements décroissants vérifiés.
  11. RGPD : export et anonymisation couvrent chaque donnée personnelle
      (relecture de bout en bout du schéma).
  12. Secrets et accès : variables d'environnement de production, comptes
      admin avec double authentification, journal d'audit des actions de
      modération.
- **Outils** : commande `/security-review` sur tout le code ; pentest
  externe si le budget le permet (atout pour les écoles et les
  incubateurs).
- **Fin** : checklist entièrement cochée, consignée dans
  `docs/securite/audit-lancement.md` avec les preuves (tests, sorties).

### P3-10 — Ouverture publique

- **Dépend de** : tous les lots des phases 2 et 3.
- **Décisions** : D4 (zone de communication au lancement) ; D9 (nom et
  domaine, déjà tranchée en P0-05).
- **Tâches** : pages légales réécrites (CGU, confidentialité, registre
  RGPD, mentions) et revue juridique ; revue de sécurité
  (`/security-review`) ; déploiement en production (Vercel, Neon
  production, Upstash, Cloudinary, domaine) ; supervision et alertes
  (`alerting.ts`) ; sauvegardes ; page d'accueil publique ; tableau des
  indicateurs (P1-13) suivi chaque semaine.
- **Fin** : l'app est ouverte au public ; inscription, onboarding,
  jam, collaboration et profil public fonctionnent en production
  (smoke test) ; **point d'étape après 3 mois d'usage réel** sur les
  indicateurs (conception 05 §2).
