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

- **Dépend de** : P2-06.
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

### P2-14 — Mode jam : salons

- **Dépend de** : P2-02, P2-13.
- **Tâches** : un salon est une annonce `JAM` enrichie : créneau, type
  de lieu (**public ou professionnel seulement**, D26 : bar, café-concert,
  salle, scène ouverte, MJC, local de répétition, studio), **places libres**
  par instrument ; « Trouve-moi une jam » (salons ouverts et personnes
  dispos selon instrument et genres) ; demander à rejoindre, l'hôte
  accepte ; **lieu exact révélé aux seules personnes acceptées** ;
  conversation de salon (P2-04).
- **Fin** : le lieu exact n'apparaît dans aucune réponse pour une
  personne non acceptée (test) ; e2e « je lance une jam, quelqu'un la
  rejoint ».

### P2-15 — Mode jam : fin de match

- **Dépend de** : P2-06, P2-14.
- **Tâches** : après le créneau, écran de fin de partie ; chacun
  confirme qui était là → collaboration `JAM` à double confirmation
  (XP de P2-06) ; réactions (« 🔥 groove », « on remet ça ») sans XP ;
  « Rejouer ensemble » (salon prérempli) ; « Garder le contact » (ajout
  au réseau musical) ; succès fun (_Noctambule_, _Touche-à-tout_,
  _Brise-glace_, _Chef d'orchestre_) dans `core/achievements.ts`.
- **Fin** : une jam non confirmée ne rapporte rien ; une réaction ne
  rapporte rien ; e2e « fin de match, XP des deux côtés ».

### P2-16 — Carnet de jams et réseau musical

- **Dépend de** : P2-15.
- **Tâches** : carnet façon souvenirs (jams, personnes rencontrées,
  instruments croisés, styles, communes) ; réseau musical (gens avec
  qui l'on a vraiment joué) ; quand on cherche quelqu'un (recherche,
  annonce), le réseau est proposé en premier ; RGPD.
- **Fin** : le carnet reflète les jams confirmées (e2e) ; le réseau
  remonte en tête d'une recherche correspondante.

**Revue de fin de phase 2** : démo du parcours ; calibrage du barème
sur les données de test (temps pour atteindre le niveau 5 et le rang
« Collaborateur ») ; relecture des fiches de phase 3 ; trancher D20
(modèle du morceau).

---

## Phase 3 — Groupes, morceaux, étapes, preuves, carrière

**But** : un groupe existe, recrute, crée des morceaux, franchit des
épreuves prouvées ; le mode carrière se joue sur ses trois premiers
actes. Puis LinkMusician s'ouvre au public.

### P3-01 — Groupe et adhésions

- **Dépend de** : P2-06.
- **Tâches** : `Organization(BAND)` et `Membership` (invitation,
  demande, départ ; rôles OWNER, ADMIN, MEMBER ; `startedAt`,
  `endedAt`) ; un groupe sans OWNER est impossible ; transfert de
  propriété ; événement `membership.accepted` (règle existante,
  rendements décroissants) ; RGPD.
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
- **Tâches** : annonce « cherche un membre » émise par le groupe ;
  l'acceptation crée l'adhésion ; quête remplie, XP des deux côtés.
- **Fin** : e2e « le groupe recrute une batteuse ».

### P3-04 — Étapes : définitions et déclaration

- **Dépend de** : P3-01.
- **Décisions** : liste finale des étapes et preuves recevables.
- **Tâches** : `MilestoneDefinition` versionné (seed), `Milestone` ;
  déclaration d'une étape (1 à 6 au MVP) ; émission de
  `milestone.attested` (règle existante, XP différentielle).
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

- **Dépend de** : P3-05.
- **Tâches** : signaler une étape (`ReportTarget.MILESTONE`), la geler,
  décision du modérateur ; reprise par transaction négative liée
  (`reversesId`) ; rétrogradation de la confiance de l'attestant.
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

- **Dépend de** : P3-05.
- **Tâches** : rang de groupe = dernière étape corroborée (Projet →
  Signé) ; 25 % de l'XP aux membres **présents à la date** de l'étape ;
  TierBadge du groupe.
- **Fin** : un membre arrivé après une étape n'en reçoit pas la part
  (intégration).

### P3-09 — Modération étendue

- **Dépend de** : P3-06.
- **Tâches** : file des contestations ; vérification manuelle
  d'organisations (préparation de la phase 5) ; journal d'audit
  (`audit-log.ts`).
- **Fin** : chaque décision est tracée.

### P3-11 — Morceau minimal

- **Dépend de** : P3-01 ; **D20** (modèle) tranchée.
- **Tâches** : `Work` (titre, état, genres, porteur : personne ou
  groupe), `WorkContributor` (rôle, confirmation), maquette rattachée
  (média) ; fiche morceau avec **rôles à pourvoir** et bouton
  « Recruter » (annonce ciblée) ; états idée → composé ; événements
  `work.composed`, `work.credit_confirmed` et règles d'XP ; l'étape
  « Première composition » s'appuie sur un morceau composé ; RGPD.
- **Fin** : un morceau passe « composé » quand ≥2 contributeurs ont
  confirmé et qu'une maquette est jointe (unitaire, e2e).

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
- **Fin** : un jam confirmé franchit l'acte I ; un morceau composé
  l'acte II (unitaires et e2e).

### P3-14 — Fiche de carrière et cartes souvenirs

- **Dépend de** : P2-08, P3-13.
- **Tâches** : fiche façon joueur (jams, rencontres, collaborations,
  morceaux, concerts, villes, crédits) ; version publique = faits
  confirmés seulement (D1) ; carte souvenir partageable générée côté
  serveur à chaque épreuve (image Open Graph).
- **Fin** : la fiche publique ne contient ni XP ni confiance (test du
  payload) ; l'image se génère.

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
