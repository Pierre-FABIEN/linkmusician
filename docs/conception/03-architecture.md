# 03 — Architecture

## 1. Architecture fonctionnelle

Douze domaines. Les flèches indiquent qui dépend de qui. La
**progression** ne dépend d'aucun domaine métier : elle consomme des
événements.

```
                ┌──────────────┐
                │  Identité    │  (auth, compte, âge, RGPD)
                └──────┬───────┘
          ┌────────────┼────────────────────┐
   ┌──────▼─────┐ ┌────▼──────┐      ┌──────▼──────┐
   │  Acteurs   │ │  Médias   │      │ Modération  │◄── signalements de tous les domaines
   │ personnes, │ │ audio,    │      └─────────────┘
   │ organisa-  │ │ vidéo,    │
   │ tions,     │ │ images    │
   │ adhésions  │ └────┬──────┘
   └──┬───┬─────┘      │
      │   │   ┌────────▼───────┐   ┌─────────────┐   ┌────────────────┐
      │   └──►│ Compétences    │   │ Découverte  │◄──│ Localisation   │
      │       │ instruments,   │──►│ recherche,  │   │ zones, rayons  │
      │       │ genres, endos. │   │ filtres     │   └────────────────┘
      │       └────────────────┘   └──────┬──────┘
      │                                   │
   ┌──▼──────────────┐   ┌────────────────▼─┐   ┌──────────────┐
   │ Collaborations  │◄──│ Opportunités     │──►│ Messagerie   │
   │ & étapes        │   │ (annonces/quêtes)│   └──────┬───────┘
   │ (preuves)       │   └──────────────────┘          │
   └───────┬─────────┘                                 │
           │  événements de domaine                    │
   ┌───────▼─────────────────────────┐          ┌──────▼────────┐
   │ Progression                      │────────►│ Notifications │
   │ XP · paliers · succès · confiance│         └───────────────┘
   │ · réputation · quêtes système    │
   └──────────────────────────────────┘
```

| Domaine        | Responsabilité                                                                                     | MVP                     |
| -------------- | -------------------------------------------------------------------------------------------------- | ----------------------- |
| Identité       | Compte, email, 2FA, sessions, âge, export et suppression RGPD                                      | ✅ (existant)           |
| Acteurs        | Personne, organisations (groupe, studio, label, organisateur), adhésions et rôles internes, suivis | ✅ (personne et groupe) |
| Compétences    | Instruments et niveaux déclarés, genres, influences, endossements                                  | ✅                      |
| Localisation   | Zone approximative, rayon de déplacement, distances arrondies                                      | ✅                      |
| Médias         | Upload direct signé, transcodage, modération, quotas                                               | ✅                      |
| Découverte     | Recherche multicritère géographique, suggestions                                                   | ✅                      |
| Opportunités   | Annonces et quêtes émises, candidatures, conditions d'éligibilité                                  | ✅ (recrutement)        |
| Collaborations | Cycle de vie, étapes, preuves, confirmations, contestations                                        | ✅                      |
| Messagerie     | Conversations 1:1 et de groupe, demandes de contact, blocage                                       | ✅ (polling)            |
| Progression    | Registre XP, niveaux, paliers, succès, confiance, réputation, quêtes système                       | ✅                      |
| Notifications  | In-app, email (et push plus tard), préférences                                                     | ✅ (in-app et email)    |
| Modération     | Signalements, file d'attente admin, sanctions, journal                                             | ✅ (minimale)           |

## 2. Architecture technique

### 2.1 Ce que le boilerplate apporte déjà

| Besoin du brief                                             | Déjà en place                                                                          | Écart à combler                                                                                                  |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| SvelteKit, Svelte 5 en runes, TS strict                     | ✅ SvelteKit 3, Svelte 5.57, TS 6, eslint `svelte/*`                                   | —                                                                                                                |
| PostgreSQL et ORM                                           | ✅ Prisma 5.22, Neon (pooler et `directUrl`)                                           | Activer PostGIS, envisager une mise à jour de Prisma (dette séparée)                                             |
| Authentification sécurisée                                  | ✅ Better Auth : email et mot de passe, Google, 2FA TOTP, sessions, alertes d'appareil | Champ date de naissance (âge minimum), rôle `MODERATOR`                                                          |
| Validation Zod                                              | ✅ Zod 3 et superforms                                                                 | —                                                                                                                |
| Rate limiting                                               | ✅ `src/lib/server/rate-limit.ts` (Upstash Redis, Lua atomique, repli en mémoire)      | Nouveaux buckets nommés par domaine, quotas modulés par la confiance                                             |
| Médias externes                                             | ✅ Cloudinary (images, upload par le serveur, 5 Mo max)                                | **Upload direct signé** navigateur → Cloudinary pour l'audio et la vidéo, webhook de fin de traitement           |
| Traitement asynchrone                                       | ✅ QStash (`qstash.ts`, `jobs/`, `job-attempts.ts`, `lock.ts`), crons Vercel           | Jobs : progression asynchrone, confiance nocturne, détection de cliques, vérifications externes                  |
| XSS, CSRF, CSP                                              | ✅ `sanitizeHtml`, CSRF de SvelteKit, rapport CSP                                      | Origines Cloudinary média dans la CSP                                                                            |
| Anti-fraude                                                 | ✅ `fraud.ts`, domaines jetables, empreinte d'appareil                                 | À rebrancher sur l'inscription et la détection de collusion                                                      |
| RGPD                                                        | ✅ Export de données, anonymisation, purge                                             | Étendre l'export et l'anonymisation aux nouveaux domaines                                                        |
| Admin, journal d'audit                                      | ✅ `/admin`, `AdminAuditLog`                                                           | Écrans de modération, de vérification d'organisations, de révision d'XP                                          |
| Cartes                                                      | ✅ MapLibre (`svelte-maplibre-gl`)                                                     | Carte de découverte (zones, jamais de points précis)                                                             |
| Observabilité                                               | ✅ Sentry, pino, métriques                                                             | —                                                                                                                |
| UI                                                          | ✅ shadcn-svelte, Tailwind 4, GSAP                                                     | Direction artistique « tableau de bord RPG » à concevoir                                                         |
| Temps réel                                                  | ❌                                                                                     | Polling au MVP. Ensuite un fournisseur managé (Vercel ne tient pas de WebSocket)                                 |
| E-commerce (produits, panier, Stripe, Sendcloud, factures…) | ⚠️ hors sujet au MVP                                                                   | **Mis en veille** (D6) : interrupteur `SHOP_ENABLED`, code et tests conservés, réutilisables en phase 5 (Stripe) |

### 2.2 Décisions techniques et compromis

**Prisma, pas Drizzle.** Le projet a 40 migrations, des conventions par
domaine (`src/lib/prisma/<domaine>/`), des helpers e2e et des tests bâtis
sur Prisma. Le seul vrai manque est le type `geography`, qu'on gère
proprement avec `Unsupported("geography(Point,4326)")` plus des requêtes
`$queryRaw` typées, isolées dans un seul fichier. Migrer d'ORM coûterait
des semaines pour un gain marginal.

**Géographie : PostGIS sur Neon.**

- On stocke un **point flouté** : centroïde de la commune, ou point
  aligné sur une grille d'environ 2 km. Aucun point GPS précis n'est
  jamais stocké (minimisation RGPD).
- Requête : `ST_DWithin(zone, :centre, :rayon)` avec un index GiST, et un
  filtre réciproque (« dans _mon_ rayon **et** je suis dans le rayon de
  déplacement de l'autre », selon le mode de recherche).
- Affichage : distances arrondies par tranches (< 5 km, ~10 km, ~20 km,
  puis par 10 km au-delà).
- Géocodage : `geo.api.gouv.fr/communes` (centroïdes, gratuit, sans
  clé), sur le modèle de `api/address-search` qui appelle déjà la Base
  Adresse Nationale, mock compris en e2e. Couverture France uniquement
  au MVP.
- CI et dev : l'image `postgis/postgis` remplace `postgres` dans
  `ci.yml`. L'extension doit aussi être activée sur chaque branche Neon.
- Alternative écartée : latitude et longitude en `Float` avec un calcul
  de Haversine en SQL. Plus simple, mais sans index spatial, donc ne
  passe pas à l'échelle.

**Médias.** Upload direct depuis le navigateur vers Cloudinary avec une
signature émise par le serveur (contrôle du quota, du type MIME, de la
taille et de la durée maximale). Cloudinary transcode (HLS pour la
vidéo, normalisation de l'audio) et appelle un webhook. Le média passe
de `PROCESSING` à `PENDING_REVIEW`, puis à `PUBLISHED`. Le passage par
une fonction Vercel est exclu (limite de 4,5 Mo par requête).

**Temps réel.** Vercel serverless ne maintient pas de connexion. Au MVP,
on interroge le serveur toutes les 10-15 s quand une conversation est
ouverte, et toutes les 60 s pour le badge de notifications. C'est
suffisant pour un usage de mise en relation, pas de chat intensif.
Phase 3+ : Ably ou Pusher (canal par conversation, autorisation par
token signé côté SvelteKit). Écarté : un serveur WebSocket séparé, car il
ajoute de l'infrastructure à opérer.

**Modularité.** On suit la convention du boilerplate : chaque domaine a
son dossier `src/lib/prisma/<domaine>/` (accès aux données),
`src/lib/schema/<domaine>/` (Zod) et `src/lib/server/<domaine>/`
(logique métier). Un domaine n'importe pas les tables d'un autre : il
passe par ses fonctions exportées ou par les événements.

### 2.3 Arborescence cible

```
src/lib/server/
  actors/          personnes, organisations, adhésions
  skills/          instruments, genres, endossements
  geo/             floutage, recherche PostGIS (seul fichier à faire du $queryRaw géo)
  media/           signatures d'upload, webhook Cloudinary, quotas
  discovery/       recherche, suggestions
  opportunities/   annonces, candidatures, éligibilité
  collaborations/  cycle de vie, étapes, preuves, contestations
  messaging/       conversations, demandes, blocages
  notifications/   distribution in-app et email, préférences
  moderation/      signalements, sanctions
  progression/
    core/          ← PUR : aucune dépendance à Prisma ni à SvelteKit
      rules/       une règle = une fonction (événement, contexte) → gains[]
      levels.ts    courbe de niveau, paliers par métier (conditions)
      trust.ts     calcul du palier de confiance
      reputation.ts
      multipliers.ts  rendements décroissants, poids de confiance
    ledger.ts      écriture idempotente des transactions XP
    projector.ts   recalcul des projections (ActorProgress, paliers, succès)
    events.ts      émission d'événements de domaine (outbox)
src/routes/
  (app)/           tableau de bord, profil, découverte, annonces, messages, groupes
  @[handle]/       profil public
  api/media/       signature, webhook
  api/jobs/        progression, confiance, cliques, vérifications externes
  admin/moderation, admin/organisations, admin/progression
```

### 2.4 Moteur de progression

```
Action utilisateur (intention)
   │  form action SvelteKit, Zod, rate limit, permission (trust)
   ▼
Service métier (ex. collaborations.confirmCompletion)
   │  dans UNE transaction Prisma :
   │    1. écrit l'état métier
   │    2. insère DomainEvent { type, payload, actorIds, occurredAt }   ← outbox
   ▼
Processeur de progression (même transaction au MVP, job QStash ensuite)
   │  charge le contexte (historique des contreparties, confiance, étapes)
   │  core/rules/* → gains[] (fonctions pures, versionnées)
   │  ledger.append(gains) — UNIQUE(sourceEventId, ruleId, actorId, track)
   │  projector.update(actorIds) → ActorProgress, paliers, succès débloqués
   ▼
Événements dérivés (LevelReached, TierReached, AchievementUnlocked) → Notifications
```

Propriétés garanties :

- **Calcul exclusivement serveur.** Aucune route n'accepte de valeur
  d'XP, de niveau ou de palier.
- **Traçabilité.** Le registre `XpTransaction` est en ajout seul.
  `ActorProgress` n'est qu'une projection, **reconstructible** à tout
  moment en rejouant le registre (commande d'administration et test de
  cohérence).
- **Idempotence.** La contrainte d'unicité empêche le double crédit en
  cas de rejeu QStash.
- **Réversibilité.** Une annulation est une transaction négative liée
  (`reversesId`), jamais une suppression.
- **Testabilité.** `core/` est 100 % pur, testé par tables (événement +
  contexte → gains attendus).

Au MVP, le processeur tourne **dans la même transaction** que l'action
(simple et cohérent). Comme le cœur est pur et que l'outbox existe déjà,
on peut passer à un traitement asynchrone par QStash sans réécrire les
règles, quand la latence le justifiera.

### 2.5 Sécurité et conformité

| Sujet         | Mesure                                                                                                                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permissions   | Rôles d'application (`ADMIN`, `MODERATOR`, `USER`) séparés des **rôles dans une organisation** (`OWNER`, `ADMIN`, `MEMBER`) et des **droits de confiance**. Une seule fonction `can(actor, action, resource)` par domaine, testée |
| Rate limiting | Buckets nommés existants, plus des quotas journaliers modulés par la confiance (messages à des inconnus, annonces, uploads, signalements)                                                                                         |
| Uploads       | Signature serveur, liste blanche MIME, taille et durée max, scan de modération Cloudinary, aucun média public avant validation                                                                                                    |
| XSS           | Textes riches limités (bio) passés par `sanitizeHtml`. Messages en texte brut                                                                                                                                                     |
| Mineurs       | Date de naissance à l'inscription, 16 ans minimum. Pour les 16-17 ans : pas de premier message d'un adulte inconnu hors candidature à une annonce, localisation limitée à la ville                                                |
| Localisation  | Point flouté uniquement, distances arrondies, zone masquable                                                                                                                                                                      |
| Modération    | Signalement sur tout contenu et tout profil, file admin, sanctions graduées (avertissement, rétrogradation de confiance, suspension), journal d'audit                                                                             |
| RGPD          | Registre des traitements à étendre. Export JSON de tous les domaines. Suppression = anonymisation (les collaborations restent pour la contrepartie, avec « Compte supprimé »). Consentement des notifications par email           |

### 2.6 Mobile d'abord, PWA, puis app des stores (D24)

La plupart des musicien·nes utiliseront LinkMusician **sur leur
téléphone** (en répète, en sortant d'un concert, en jam). L'app est donc
conçue **mobile d'abord**, installable comme une app (PWA), et pourra
devenir une app des stores **sans second code**.

| Étape                      | Quand                     | Comment                                                                                                                                   |
| -------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Responsive, mobile d'abord | Depuis P0-07              | Barre d'onglets en bas sur téléphone, onglets en haut sur ordinateur ; zones sûres (`env(safe-area-inset-*)`) ; zones tactiles ≥ 44 px    |
| PWA installable            | Depuis P0-07              | Manifeste (raccourcis « Mon parcours » et « Jammer ce soir »), icônes `any` et `maskable`, service worker prudent (`src/service-worker/`) |
| Notifications push         | Avec P2-09                | Web Push (installé sur l'écran d'accueil pour iOS 16.4+), préférences par type, ton d'encouragement                                       |
| App des stores             | Après l'ouverture (P3-10) | La PWA emballée (Capacitor pour iOS et Android, ou TWA pour Android seul). Même code, même serveur ; on n'écrit pas d'app native séparée  |

**Règles de conception** (valables pour chaque nouvel écran) :

- concevoir l'écran à 390 px de large d'abord, puis l'élargir ;
- aucune action uniquement au survol : tout se fait au doigt ;
- zones tactiles de 44 px au moins ; formulaires avec le bon clavier
  (`type`, `inputmode`, `autocomplete`) ;
- rien ne déborde en largeur : vérifié par `e2e/linkmusician/mobile.spec.ts`
  (ajouter chaque nouvelle page à sa liste) ;
- le service worker ne met **jamais** en cache les données personnelles,
  l'authentification ou l'API : seulement les icônes et les fichiers
  versionnés de l'app, plus une page « hors ligne ».

**Service worker** : enregistré en production seulement
(`#lib/linkmusician/pwa`), car en dev `hooks.client.ts` retire les
workers d'autres projets qui partagent `localhost:2000`. Son comportement
réel (installation, hors ligne) se vérifie donc après un déploiement.
