# Phase 1 — Identité musicale et moteur de progression

**But** : un musicien s'inscrit, décrit qui il est (instruments, genres,
zone, démos), voit son niveau, sa barre d'XP et ses prochains objectifs,
et dispose d'un profil public. Le moteur de progression est complet et
fiable, même si peu d'événements l'alimentent encore.

**Fin de phase** : les critères d'acceptation de la phase 1 dans
[conception/05 §3](../conception/05-mvp-roadmap.md#3-roadmap) sont tous
vérifiés.

**Parallélisme possible** : P1-01 (code pur) et P1-02 (maquettes)
peuvent démarrer pendant la phase 0.

---

## P1-01 — Noyau de progression pur

- **Référence** : [conception/02](../conception/02-progression.md) en
  entier, [conception/03 §2.4](../conception/03-architecture.md#24-moteur-de-progression).
- **Périmètre** : `src/lib/server/progression/core/`, avec **aucun
  import** de Prisma, de SvelteKit ou de `$env`.
  - `events.ts` : union discriminée des événements de domaine
    (`profile.completed`, `media.published`, `collaboration.completed`,
    `milestone.attested`…), typés et validés par Zod.
  - `rules/` : une règle par fichier. Signature
    `(event, ctx) => XpGain[]`, plus un `id` et une `version`.
  - `levels.ts` : courbe `50·n·(n−1)`, et `levelFromXp` / `xpForLevel`.
  - `tiers.ts` : conditions des paliers musicien et groupe (prédicats
    sur un résumé d'état).
  - `multipliers.ts` : rendements décroissants par contrepartie, poids de
    confiance.
  - `trust.ts` : calcul de TL0 à TL3 à partir d'un résumé d'état.
  - `quests.ts` : les trois prochains objectifs atteignables à partir de
    l'état.
- **Garde-fou** : une règle ESLint `no-restricted-imports` sur
  `progression/core/**` interdit `@prisma/client`, `$app/*` et `$env/*`.
- **Fin** : couverture ≥ 95 % sur `core/`. Les tests de chaque règle sont
  écrits en tables (`it.each`). La règle ESLint échoue sur un import
  interdit (vérifié une fois à la main).
- **Pourquoi en premier** : c'est l'identité du produit, le seul code
  sans dépendance, et le plus facile à tester de façon exhaustive.

## P1-02 — Maquettes

- **Objectif** : fixer l'expérience avant de coder les écrans.
- **Écrans** : les 6 étapes de l'onboarding, le premier résultat, le
  tableau de bord (niveau, barre d'XP, palier, 3 quêtes, succès récents),
  le profil public (identité, instruments avec niveau déclaré et démos,
  carte de réputation vide, étapes), les états vides.
- **Composants à extraire** : `XpBar`, `LevelBadge`, `TierBadge`,
  `QuestCard`, `AchievementBadge`, `InstrumentSkill`, `DistanceTag`.
- **Format** : au choix, maquettes Figma ou pages Svelte statiques dans
  une route `/_lab` (non indexée, hors production).
- **Fin** : les maquettes sont validées par le porteur du projet. Les
  libellés de l'échelle de niveau d'instrument sont fixés (décision
  D11).

## P1-03a — Inscription : personne, âge minimum, rôle MODERATOR ✅

> **Réalisé le 03/11/2026.** Règles pures dans `src/lib/actors/` (âge et
> handle, 34 tests), accès aux données dans `src/lib/prisma/actors/person.ts`,
> écran `/bienvenue`, garde `src/routes/(app)/+layout.server.ts`, page
> provisoire `/espace`. Vérifié dans le navigateur : mineur refusé et CGU
> obligatoires (aucun compte créé), adulte avec `Actor` et `Person`
> créés, compte sans personne → `/bienvenue` (identifiant réservé ou pris
> refusé) → `/espace`. **Reste à faire** : convertir ce parcours en spec
> e2e (`e2e/linkmusician/inscription.spec.ts`) et relancer la suite e2e du
> boilerplate (l'assistant `fillSignupForm` a été adapté). Avec Google, la
> date de naissance n'est demandée qu'à l'entrée dans `(app)` ; la
> redirection systématique après connexion viendra avec la coquille
> (P0-05).

- **Décisions** : D5, D14, D16.
- **Tâches** :
  - Ouvrir la section `LINKMUSICIAN` en fin de `schema.prisma` :
    `Actor`, `Person`, `PersonTrack` (enum `TrackKind`). Ajouter
    `MODERATOR` à l'enum `Role` (une ligne marquée). Une migration.
  - Règles pures et testées dans `src/lib/server/actors/` : calcul de
    l'âge (16 ans minimum, 29 février compris), génération et validation
    du `handle` (slug, longueur, mots réservés, collisions).
  - Formulaire d'inscription : champs date de naissance et acceptation
    des CGU (schéma Zod du boilerplate étendu, avec marqueur). Refus sous
    16 ans **avant** la création du compte. Création de `Actor` et
    `Person` juste après `signUpEmail`.
  - Compte sans `Person` (Google, comptes existants, comptes créés par
    les tests du boilerplate) : la garde est posée **uniquement** à
    l'entrée de la zone LinkMusician `(app)`, qui redirige vers l'écran de
    complétion `/bienvenue` (date de naissance, et handle si absent). Les
    pages du boilerplate restent accessibles, donc sa suite e2e ne casse
    pas.
  - Mettre à jour le spec e2e d'inscription du boilerplate
    (`e2e/auth/journey.spec.ts`) pour le nouveau champ, avec un marqueur.
- **Fin** :
  - inscription d'un majeur : `User`, `Actor` et `Person` créés ;
    inscription d'un mineur : refusée, aucun compte créé ;
  - compte Google sans `Person` : redirigé vers `/bienvenue` en entrant
    dans `(app)`, puis admis après complétion ;
  - tests unitaires (âge, handle), test d'intégration (création
    atomique), e2e d'inscription au vert.

## P1-03b — Choix des métiers (« Qui es-tu ? »)

- **Décisions** : D15.
- **Tâches** : écran affiché après la vérification de l'email (ou après
  `/bienvenue`) : un ou plusieurs métiers parmi musicien,
  producteur·rice, ingé son, manager, booker / programmateur·rice,
  organisateur·rice, professionnel·le de label, éditeur·rice,
  communication musicale. Un métier principal. Les métiers autres que
  musicien affichent « bientôt » et créent un profil de base. Les
  métiers restent modifiables dans les réglages. Proposer ensuite
  « créer ou rejoindre une structure » (bientôt, sauf groupe en phase 3).
- **Fin** : au moins un métier enregistré pour toute personne qui a
  terminé l'écran. Un e2e choisit deux métiers et vérifie le métier
  principal.

## P1-04 — Référentiels instruments et genres

- **Tâches** : tables `Instrument` et `Genre` (arborescence), seed
  versionné dans `prisma/seed-data/`. Environ 60 instruments regroupés
  par familles, voix incluse. Environ 80 genres sur 2 niveaux.
- **Décision** : D12, la source des genres (liste maison ou dérivée de
  MusicBrainz).
- **Fin** : le seed est idempotent (on peut le relancer sans doublon).
  Écran admin en lecture seule.

## P1-05 — Localisation floutée

- **Référence** : [conception/03 §2.2](../conception/03-architecture.md#22-décisions-techniques-et-compromis).
- **Tâches** :
  - `ActorLocation` avec `geography(Point,4326)` et un index GiST
    (migration SQL écrite à la main).
  - Géocodage commune ou code postal via `geo.api.gouv.fr/communes`
    (centroïde, gratuit, sans clé). Pour la recherche de commune, on
    réutilise le modèle de `api/address-search`, qui appelle déjà la
    Base Adresse Nationale.
  - `geo/fuzz.ts` : on ne stocke que le centroïde de la commune. Pour
    les grandes communes, on aligne le point sur une grille d'environ
    2 km.
  - `geo/distance.ts` : arrondi par tranches.
  - Un seul fichier `geo/queries.ts` contient le `$queryRaw`.
- **Fin** : un test unitaire montre que le point stocké ne dépend que
  de la commune, jamais d'une saisie plus précise. Un test d'intégration
  montre que `ST_DWithin` renvoie les bons acteurs sur un jeu de données
  connu (5 communes). Le mode e2e fonctionne sans appel réseau (mock,
  sur le modèle de `SECRET_ADDRESS_SEARCH_MODE`).

## P1-06 — Compétences : instruments, genres, influences

- **Tâches** : formulaires (superforms et Zod) pour 1 à 5 instruments
  avec niveau déclaré (1-5, descripteurs de D11), 1 à 5 genres, et des
  influences libres (texte limité, sanitisé). Une page « Mon profil
  musical ».
- **Émet** : `profile.updated`, puis `profile.completed` quand les
  conditions sont réunies pour la première fois.
- **Fin** : un e2e édite le profil musical. Un unitaire couvre la
  détection de « profil complété ».

## P1-06b — Profil complet : statut pro, recherche, matériel, mobilité, liens

- **Décisions** : D17, D18.
- **Tâches** : bio (`Actor.bio`, texte brut, 600 caractères, nécessaire au
  « profil complété »), champs de `Person` et table `ProfileLink` (modèle de
  données §2). Formulaires dans « Mon profil » : statut pro (3 choix,
  affiché « déclaré »), « ce que je recherche » (choix multiples),
  matériel et année de début de pratique, rayon de déplacement par
  tranches (10, 25, 50, 100 km), liens externes (https, domaine contrôlé
  selon le type, jamais intégrés sans clic). Libellés dans un référentiel
  pur et testé, comme les métiers.
- **RGPD** : export et anonymisation couvrent les nouveaux champs.
- **Fin** : unitaires (référentiels, validation des liens), un e2e édite
  ces champs. Le seuil « profil complété » n'en dépend pas (D18).

## P1-07 — Registre XP, outbox, projecteur, succès

- **Référence** : [conception/03 §2.4](../conception/03-architecture.md#24-moteur-de-progression),
  [conception/04](../conception/04-modele-donnees.md) (`DomainEvent`,
  `XpTransaction`, `ActorProgress`, succès).
- **Tâches** :
  - Reporté de P1-06 : émettre `profile.updated` à chaque
    `saveMusicalProfile`, et `profile.completed` la première fois que
    `isProfileComplete` (`src/lib/skills/profile.ts`) devient vrai.
  - `progression/events.ts` : `emit(tx, event)` écrit le `DomainEvent`
    dans la transaction de l'appelant.
  - `progression/processor.ts` : charge le contexte, appelle `core`, et
    appelle `ledger.append`, avec idempotence assurée par une contrainte
    d'unicité.
  - `projector.ts` : met à jour `ActorProgress` et les succès, puis émet
    les événements dérivés.
  - Commande d'administration `progression:rebuild` (rejoue tout le
    registre).
- **Fin** :
  - Un test d'intégration montre que traiter deux fois le même événement
    produit une seule transaction.
  - Un test de cohérence montre que la somme du registre égale la
    projection, pour un jeu de 200 événements générés aléatoirement.
  - Le rebuild produit des projections identiques.

## P1-08 — Médias : upload direct, traitement, modération

- **Tâches** :
  - `api/media/sign` : vérifie le quota de confiance, le type et la
    taille, et renvoie une signature Cloudinary limitée au dossier de
    l'acteur.
  - `api/media/webhook` : signature Cloudinary vérifiée, passe le média
    de `PROCESSING` à `PENDING_REVIEW`.
  - Validation par un modérateur (P1-12), ou automatique pour les
    acteurs TL1+ si la modération automatique de Cloudinary ne lève pas
    d'alerte.
  - Liens externes YouTube, SoundCloud et Bandcamp en `EXTERNAL_LINK`,
    affichés en oEmbed.
  - Lecteur audio et vidéo.
  - CSP mise à jour pour les domaines médias.
- **Limites v1** : audio ≤ 10 min, vidéo ≤ 3 min et ≤ 200 Mo.
- **Émet** : `media.published`.
- **Fin** : un e2e publie un lien externe. Un test d'intégration couvre
  le webhook (signature valide et invalide). Un média non `PUBLISHED`
  renvoie une 404 publiquement.

## P1-09 — Confiance TL0/TL1 et quotas

- **Tâches** : recalcul de la confiance à chaque événement significatif
  (via `core/trust.ts`). Table de quotas par palier. Buckets
  `rate-limit.ts` nommés par quota, avec une capacité qui dépend du
  palier. Affichage « ton palier de confiance » dans les réglages.
- **Fin** : des tests unitaires couvrent la table de quotas. Un test
  d'intégration montre qu'un TL0 est bloqué au-delà de son quota de
  médias.

## P1-10 — Onboarding

- **Référence** : [conception/05 §1](../conception/05-mvp-roadmap.md#1-onboarding)
  et les maquettes P1-02.
- **Tâches** : parcours en 6 étapes avec reprise possible (l'état est
  dérivé du profil, pas stocké à part). Écran « premier résultat ». À ce
  stade, il montre les musiciens proches via une requête simple ; la
  recherche complète arrive en P2-01.
- **Fin** : un e2e va de l'inscription au tableau de bord en ≤ 6 écrans.
  Une reprise après fermeture ramène à la bonne étape. Le test a11y
  passe.

## P1-11 — Profil public et tableau de bord de progression

- **Tâches** : route `@[handle]` avec SEO, données structurées
  `Person`/`MusicGroup` et respect de `hidden`. Tableau de bord `(app)`
  avec niveau, barre d'XP, palier, 3 quêtes, historique des gains
  (lecture du registre, avec le libellé `reason`) et succès.
- **Fin** : un e2e montre que le profil public d'un acteur masqué renvoie
  une 404 et que le tableau de bord reflète un gain après la publication
  d'une démo.

## P1-12 — Signalements, modération minimale, RGPD étendu

- **Tâches** : bouton « Signaler » sur les profils et les médias.
  `Report`. File `/admin/moderation` (accessible aux modérateurs) avec
  les actions valider ou rejeter un média, avertir, suspendre. `Sanction`
  et `AdminAuditLog`. Extension de `gdpr/exportUserData.ts` et de
  `anonymizeUser.ts` aux nouvelles tables.
- **Fin** : un e2e déroule « signalement → décision modérateur ».
  L'export RGPD contient l'acteur, les instruments, la zone (commune),
  les médias et le registre XP.

## P1-13 — Instrumentation des indicateurs produit

- **Objectif** : pouvoir mesurer le go / no-go de la fin du MVP
  ([conception/05 §2](../conception/05-mvp-roadmap.md#2-stratégie-mvp)).
- **Décision** : D13, entre une table d'événements produit maison
  (recommandé : on a déjà `DomainEvent`) et un outil sans cookie
  (Plausible ou Umami).
- **Tâches** : vue admin des indicateurs : inscrits, onboarding terminé,
  conversation réciproque à 14 jours (disponible à partir de la
  phase 2), rétention à 30 jours.
- **Fin** : la page `/admin/metrics` affiche les indicateurs disponibles
  à date.
