# 04 — Modèle de données

Ce schéma Prisma est une **cible de conception**, pas une migration. Il
sera introduit par phases (colonne « Phase »). `User` et les tables
d'authentification existantes sont conservées telles quelles.

## 1. Choix structurant : l'`Actor` comme supertype

La progression, les médias, la localisation, les suivis et les
collaborations concernent **indifféremment** une personne ou une
organisation (un groupe gagne de l'XP, un studio publie des médias, on
suit un groupe comme une personne).

Plutôt que des relations polymorphes du type `ownerType` + `ownerId`,
sans clé étrangère, une table **`Actor`** sert de supertype. `Person` et
`Organization` la référencent en 1:1. Toutes les tables transverses
pointent sur `actorId`, avec une vraie clé étrangère.

```
User 1──1 Person 1──1 Actor ◄── XpTransaction, Media, ActorLocation, Follow,
                                 CollaborationParticipant, Milestone, ActorProgress…
          Person n──n Organization (via Membership)
               Organization 1──1 Actor
```

Un compte = une personne. Une personne peut avoir plusieurs **pistes de
métier** (`PersonTrack` : musicien, producteur, manager…) et administrer
plusieurs organisations (son groupe, son studio).

## 2. Schéma

```prisma
// ─── ACTEURS ─────────────────────────────────────────────────────────────

enum ActorKind { PERSON ORGANIZATION }
enum OrgKind { BAND STUDIO LABEL PROMOTER MANAGEMENT PUBLISHER MEDIA VENUE } // VENUE : proposé (D22, 06 §3.10)
enum TrackKind { MUSICIAN PRODUCER SOUND_ENGINEER MANAGER BOOKER PROMOTER LABEL_PRO PUBLISHER MUSIC_COMMS } // pistes d'une personne (D15)
enum OrgRole { OWNER ADMIN MEMBER }
enum MembershipStatus { INVITED REQUESTED ACTIVE LEFT REMOVED }

model Actor {                                   // Phase 1
  id         String    @id @default(cuid())
  kind       ActorKind
  handle     String    @unique                  // @nom public, URL de profil
  displayName String
  avatarUrl  String?
  bio        String?                           // texte brut, 600 caractères (P1-06b)
  trustLevel Int       @default(0)              // §7 de 02-progression
  createdAt  DateTime  @default(now())
  deletedAt  DateTime?                          // anonymisation RGPD
  hidden     Boolean   @default(false)          // profil public masqué (D19) : /@handle en 404
  person       Person?
  organization Organization?
}

> **Identifiant public** (05/11/2026) : `handle` sert seulement à l'URL ;
> toutes les relations passent par `id` (cuid). Le jour où l'on permet de
> changer d'identifiant, il faudra un historique des anciens handles qui
> redirige (301) vers le nouveau, et un délai avant qu'un ancien handle
> puisse être repris. Condition à inscrire dans la fiche de ce lot.

model Person {                                  // Phase 1
  actorId     String   @id
  actor       Actor    @relation(fields: [actorId], references: [id])
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  birthDate   DateTime                          // âge minimum, jamais public
  tracks      PersonTrack[]
  instruments PersonInstrument[]
  memberships Membership[]
  availability Json?                            // créneaux hebdo grossiers (soirs, week-ends…)
  proStatus    ProStatus?                       // D17, déclaré
  lookingFor   LookingFor[]                     // D18 : « ce que je recherche »
  equipment    Equipment[]                      // D18 : sono, local de répète, véhicule…
  practiceSince Int?                            // D18 : année de début (affichée en années de pratique)
  travelRadiusKm Int?                           // D18 : 10, 25, 50, 100 (tranches, jamais une adresse)
  links        ProfileLink[]                    // D18
}

enum ProStatus { AMATEUR SEMI_PRO PROFESSIONAL }  // D17
enum LookingFor { BAND REPLACEMENTS JAMS STUDIO_SESSIONS LESSONS_GIVE LESSONS_TAKE COLLABORATION }
enum Equipment { PA_SYSTEM REHEARSAL_SPACE VEHICLE HOME_STUDIO }
enum LinkKind { SPOTIFY YOUTUBE BANDCAMP SOUNDCLOUD INSTAGRAM WEBSITE }

model ProfileLink {                             // D18, Phase 1
  personId String
  kind     LinkKind
  url      String                               // https uniquement, domaine contrôlé selon `kind`
  @@id([personId, kind])
}

model PersonTrack {                             // Phase 1 : tous enregistrables, MUSICIAN seul complet (D15)
  personId String
  track    TrackKind
  isPrimary Boolean @default(false)             // exactement un par personne, garanti par setPersonTracks
  @@id([personId, track])
}

model Organization {                            // Phase 3 (BAND), 4+ (autres)
  actorId    String  @id
  actor      Actor   @relation(fields: [actorId], references: [id])
  kind       OrgKind
  verifiedAt DateTime?                          // organisation vérifiée (SIRET…), §4 de 02
  legalId    String?                            // SIRET, chiffré
  website    String?
  memberships Membership[]
}

model Membership {                              // Phase 3
  id        String  @id @default(cuid())
  orgId     String
  personId  String
  role      OrgRole @default(MEMBER)
  title     String?                             // « bassiste », « ingé son »
  status    MembershipStatus
  startedAt DateTime?
  endedAt   DateTime?                           // l'historique attribue les étapes aux membres présents
  @@index([orgId, status])
  @@index([personId, status])
}

// ─── COMPÉTENCES ─────────────────────────────────────────────────────────

model Instrument { id String @id; slug String @unique; name String; family String } // référentiel (voix incluse)
model Genre      { id String @id; slug String @unique; name String; parentId String? } // arborescence

model PersonInstrument {                        // Phase 1 (P1-06)
  personId     String
  instrumentId String
  declaredLevel Int                             // 1..5, échelle à descripteurs observables (D11)
  isPrimary    Boolean @default(false)          // exactement un, garanti par saveMusicalProfile
  @@id([personId, instrumentId])                // 1 à 5 par personne ; ancienneté : Person.practiceSince (D18)
}

model ActorGenre { actorId String; genreId String; @@id([actorId, genreId]) }   // Phase 1
model Influence  { id String @id @default(cuid()); actorId String; label String; sortOrder Int } // texte brut, 10 au plus

model Endorsement {                             // Phase 2
  id            String @id @default(cuid())
  fromPersonId  String
  toActorId     String
  kind          String                          // "instrument:<slug>" | "quality:reliable" | …
  collaborationId String                        // OBLIGATOIRE : preuve d'une collaboration commune
  createdAt     DateTime @default(now())
  revokedAt     DateTime?
  @@unique([fromPersonId, toActorId, kind])
}

// ─── LOCALISATION ────────────────────────────────────────────────────────

model ActorLocation {                           // Phase 1
  actorId    String  @id
  zone       Unsupported("geography(Point,4326)") // point FLOUTÉ (centroïde de commune / grille de 2 km)
  cityLabel  String                             // affiché publiquement
  postalCode String?
  travelRadiusKm Int  @default(20)
  hidden     Boolean @default(false)
  @@index([zone], type: Gist)                   // via migration SQL manuelle
}

// ─── MÉDIAS ──────────────────────────────────────────────────────────────

enum MediaKind { AUDIO VIDEO IMAGE EXTERNAL_LINK }
enum MediaStatus { UPLOADING PROCESSING PENDING_REVIEW PUBLISHED REJECTED }

model Media {                                   // Phase 1
  id          String @id @default(cuid())
  actorId     String
  kind        MediaKind
  status      MediaStatus
  providerId  String?                           // public_id Cloudinary
  externalUrl String?                           // YouTube / SoundCloud / Bandcamp
  title       String
  durationSec Int?
  instrumentId String?                          // démo d'instrument → preuve de compétence
  isOriginal  Boolean @default(false)
  createdAt   DateTime @default(now())
  credits     MediaCredit[]                     // qui joue / produit sur ce média
  @@index([actorId, status])
}

model MediaCredit { mediaId String; actorId String; role String; confirmedAt DateTime?; @@id([mediaId, actorId, role]) }
// Proposé (D20) : le morceau `Work`, ses contributeurs `WorkContributor` et ses
// propositions `WorkPitch` relient les métiers (voir 06-metiers.md §4.5).

// ─── OPPORTUNITÉS (annonces = quêtes émises) ─────────────────────────────

enum OpportunityKind { RECRUIT_MEMBER JAM SESSION_WORK PRODUCTION GIG_SLOT CALL_FOR_PROJECTS }
enum OpportunityStatus { DRAFT OPEN FILLED CLOSED EXPIRED }

model Opportunity {                             // Phase 2
  id           String @id @default(cuid())
  issuerActorId String
  kind         OpportunityKind
  status       OpportunityStatus
  title        String
  description  String
  instrumentId String?
  genreIds     String[]
  zone         Unsupported("geography(Point,4326)")?
  radiusKm     Int?
  requirements Json?                            // conditions d'éligibilité : palier, genre… (jamais d'XP)
  slots        Int    @default(1)
  expiresAt    DateTime
  applications Application[]
}

enum ApplicationStatus { SENT SEEN SHORTLISTED ACCEPTED DECLINED WITHDRAWN }
model Application {                             // Phase 2
  id String @id @default(cuid())
  opportunityId String
  applicantActorId String
  message String
  status ApplicationStatus
  collaborationId String?                       // créée à l'acceptation confirmée
  @@unique([opportunityId, applicantActorId])
}

// ─── COLLABORATIONS & ÉTAPES ─────────────────────────────────────────────

enum CollabKind { JAM BAND_MEMBERSHIP SESSION_WORK PRODUCTION RECORDING GIG RELEASE }
enum CollabStatus { PROPOSED ACCEPTED IN_PROGRESS COMPLETED CANCELLED DISPUTED }

model Collaboration {                           // Phase 2
  id        String @id @default(cuid())
  kind      CollabKind
  status    CollabStatus
  title     String
  startedAt DateTime?
  completedAt DateTime?                         // = toutes les parties ont confirmé
  participants CollaborationParticipant[]
}

model CollaborationParticipant {
  collaborationId String
  actorId         String
  role            String                        // « batteur », « producteur », « organisateur »
  acceptedAt      DateTime?
  confirmedCompletionAt DateTime?
  @@id([collaborationId, actorId])
  @@index([actorId])
}

enum ProofStatus { DECLARED CORROBORATED VERIFIED DISPUTED REJECTED }

model MilestoneDefinition {                     // Phase 3, référentiel versionné
  id        String @id                          // "band.first_gig"
  scope     ActorKind
  orgKind   OrgKind?
  ordinal   Int
  xpByStatus Json                               // { DECLARED: 50, CORROBORATED: 400, VERIFIED: 1000 }
  proofRules Json                               // qui peut corroborer / vérifier
  repeatable Boolean @default(false)
}

model Milestone {                               // Phase 3
  id           String @id @default(cuid())
  definitionId String
  actorId      String
  status       ProofStatus
  occurredAt   DateTime
  collaborationId String?                       // ex. le concert
  evidence     Evidence[]
  attestations Attestation[]
  @@index([actorId, definitionId])
}

model Evidence { id String @id @default(cuid()); milestoneId String; kind String; url String?; mediaId String?; externalRef String? } // ISRC, UPC, lien d'événement
model Attestation {                             // corroboration ou vérification par un tiers
  milestoneId String
  attesterActorId String
  level       ProofStatus                       // CORROBORATED | VERIFIED
  createdAt   DateTime @default(now())
  revokedAt   DateTime?
  @@id([milestoneId, attesterActorId])
}

// ─── PROGRESSION ─────────────────────────────────────────────────────────

model DomainEvent {                             // Phase 1, outbox ajout seul
  id          String   @id @default(cuid())
  type        String                            // "collaboration.completed", "milestone.attested"…
  payload     Json
  actorIds    String[]
  occurredAt  DateTime @default(now())
  processedAt DateTime?
  @@index([processedAt])
}

model XpTransaction {                           // Phase 1, registre en AJOUT SEUL
  id            String   @id @default(cuid())
  actorId       String
  track         String                          // "account" | "MUSICIAN" | "BAND" | …
  amount        Int                             // négatif pour une annulation
  sourceEventId String
  ruleId        String
  ruleVersion   Int
  multiplier    Decimal  @db.Decimal(4, 3)
  reason        String                          // lisible : « Concert vérifié par Le Sonic »
  reversesId    String?  @unique
  createdAt     DateTime @default(now())
  @@unique([sourceEventId, ruleId, actorId, track]) // idempotence
  @@index([actorId, createdAt])
}

model ActorProgress {                           // Phase 1, PROJECTION reconstructible
  actorId   String
  track     String
  xp        Int
  level     Int
  tier      String?                             // palier nommé de la piste
  updatedAt DateTime @updatedAt
  @@id([actorId, track])
}

model AchievementDefinition { id String @id; scope ActorKind; name String; description String; icon String; secret Boolean @default(false) }
model ActorAchievement { actorId String; achievementId String; unlockedAt DateTime @default(now()); sourceEventId String; @@id([actorId, achievementId]) }

model ReputationSnapshot {                      // Phase 2, recalculé par job
  actorId String @id
  confirmedCollabs Int
  distinctCounterparts Int
  verifiedMilestones Int
  endorsementsByKind Json
  responseRateBucket String                     // "<24h" | "<48h" | "lent"
  internalScore Float                           // tri de recherche uniquement, jamais affiché
  computedAt DateTime
}

// ─── SOCIAL ──────────────────────────────────────────────────────────────

model Follow { followerActorId String; followedActorId String; createdAt DateTime @default(now()); @@id([followerActorId, followedActorId]) }
model Block  { blockerActorId String; blockedActorId String; createdAt DateTime @default(now()); @@id([blockerActorId, blockedActorId]) }

model Conversation {                            // Phase 2
  id String @id @default(cuid())
  opportunityId String?                         // contexte : candidature à une annonce
  orgActorId String?                            // conversation de groupe
  lastMessageAt DateTime
  participants ConversationParticipant[]
}
model ConversationParticipant { conversationId String; actorId String; state ConversationState /* REQUEST | ACCEPTED | DECLINED (P2-04) */; lastReadAt DateTime?; @@id([conversationId, actorId]) }
model Message { id String @id @default(cuid()); conversationId String; senderActorId String; body String; createdAt DateTime @default(now()); @@index([conversationId, createdAt]) }

model ActorActivityDay { actorId String; day DateTime @db.Date; @@id([actorId, day]) } // P1-13 : rétention (D13), rien d'autre n'est tracé

model Notification { id String @id @default(cuid()); recipientActorId String; type String; payload Json; readAt DateTime?; createdAt DateTime @default(now()); @@index([recipientActorId, readAt]) }

// ─── MODÉRATION ──────────────────────────────────────────────────────────

model Report {                                  // Phase 1
  id String @id @default(cuid())
  reporterActorId String
  targetType String                             // ACTOR | MEDIA | MESSAGE | OPPORTUNITY | MILESTONE
  targetId   String
  reason     String
  details    String?
  status     String                             // OPEN | ACTIONED | DISMISSED
  handledByUserId String?
  createdAt  DateTime @default(now())
}
model Sanction { id String @id @default(cuid()); actorId String; kind String /* WARNING | TRUST_DOWNGRADE | SUSPENSION */; reason String; until DateTime?; reportId String?; createdAt DateTime @default(now()) }
```

## 3. Notes

- **Polymorphisme résiduel** : `Report.targetType` et `targetId` restent
  polymorphes. C'est acceptable pour une table de modération consultée
  en back-office. Partout ailleurs, on passe par `Actor`.
- **`Membership.startedAt` / `endedAt`** : un concert d'octobre crédite
  les membres actifs en octobre, pas le bassiste arrivé en décembre.
- **Registre protégé par la base** : un déclencheur refuse tout `UPDATE`
  ou `DELETE` sur `xp_transactions` (migration
  `linkmusician_progression`). `ActorProgress` porte aussi une ligne
  `ACCOUNT` (niveau de compte, somme des pistes).
- **`ActorProgress` est jetable** : un test d'intégration vérifie que la
  somme de `XpTransaction` est égale à `ActorProgress.xp` pour chaque
  paire (acteur, piste).
- **Index géographiques** : Prisma ne génère pas d'index GiST sur un
  type `Unsupported`. On les ajoute dans le SQL de migration, à la main
  (`CREATE INDEX … USING GIST (zone)`). PostGIS est installé une fois,
  dans `public` (migration `linkmusician_postgis`) : depuis le schéma
  `e2e`, types et fonctions se qualifient (`public.geography`,
  `public.ST_DWithin`), sinon ils sont introuvables.
- **Anonymisation** : `Actor.deletedAt` et des champs vidés. Les
  `CollaborationParticipant`, `Attestation` et `XpTransaction` de la
  contrepartie restent valides.
- **Métier principal unique** : chaque personne qui a passé l'écran
  « Qui es-tu ? » a au moins un `PersonTrack`, dont exactement un
  `isPrimary`. Il n'y a pas d'index unique partiel : Prisma 5 ne sait
  pas le décrire, et la `migrate dev` suivante le supprimerait (même
  piège que les index `transactions_*`). La règle est donc tenue par
  `setPersonTracks` (`src/lib/prisma/actors/tracks.ts`), seul point
  d'écriture, en transaction sérialisable. Libellés et règles pures :
  `src/lib/actors/tracks.ts`.
