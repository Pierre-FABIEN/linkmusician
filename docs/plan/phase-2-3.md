# Phases 2 et 3 — Fin du MVP

> **Niveau de détail volontairement réduit.** Chaque lot a un objectif,
> ses dépendances et ses points d'attention. Les fiches complètes
> (tâches, critères de fin, tests) sont rédigées lors de la revue de fin
> de phase précédente ([README §6](./README.md#6-rituels)). Les
> critères d'acceptation de phase sont déjà fixés dans
> [conception/05 §3](../conception/05-mvp-roadmap.md#3-roadmap).

## Phase 2 — Découverte, annonces, messagerie, collaborations

**But** : on se trouve, on se parle, on joue ensemble, et cela se voit
dans la progression des deux côtés.

| Lot                              | Objectif                                                                                      | Points d'attention                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| P2-01 Recherche                  | Filtres instrument, niveau, genre, distance, disponibilité. Tri par proximité puis réputation | Recherche réciproque (« je suis dans son rayon »). Pagination par curseur. Anti-scraping (`anti-scraping.ts` existe). Test de charge k6 |
| P2-02 Annonces                   | Créer, publier, expirer et clôturer une `Opportunity` (jam, recrutement, session)             | Quota d'annonces actives selon la confiance. Expiration automatique par cron. Aucune XP à la publication                                |
| P2-03 Candidatures               | Postuler avec un message, présélection, acceptation                                           | Une candidature par annonce. L'acceptation ouvre une conversation et propose une collaboration                                          |
| P2-04 Messagerie                 | Demandes de contact, conversations, polling, non-lus                                          | Premier message à un inconnu = demande (quota TL). Texte brut. Règles pour les 16-17 ans (D5)                                           |
| P2-05 Blocage                    | Bloquer et masquer, dans les deux sens                                                        | Le bloqué ne voit plus le profil et ne peut plus écrire. Pris en compte par la recherche                                                |
| P2-06 Collaborations             | Cycle proposée → acceptée → terminée, avec confirmation de chaque partie                      | **C'est le lot central de la phase** : il émet `collaboration.completed`, consommé par les règles XP avec multiplicateurs               |
| P2-07 Endossements               | Endosser une compétence ou une qualité d'un collaborateur                                     | Impossible sans collaboration confirmée commune. Révocable                                                                              |
| P2-08 Réputation                 | Job de calcul de `ReputationSnapshot` et carte publique                                       | Score interne jamais exposé (vérifier les payloads JSON)                                                                                |
| P2-09 Notifications              | In-app (badge en polling) et email, préférences par type                                      | Réutiliser `smtp-mail.ts`. Regroupement des emails (digest), pas un email par message                                                   |
| P2-10 Confiance TL2 et collusion | TL2 (corroboration), job nocturne de détection de cliques                                     | Réutiliser l'empreinte d'appareil existante. Cliques mises en revue manuelle, pas de sanction automatique                               |

**Lots ajoutés le 05/11/2026** (modes de jeu, D21 ; conception
[07](../conception/07-modes-de-jeu.md)) :

| Lot                                | Objectif                                                                                                      | Points d'attention                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| P2-11 Célébrations                 | Annonce de chaque gain avec sa raison, animations de niveau, de rang et de succès                             | Lit les événements dérivés existants (`progress.*`, P1-07). Rien n'est calculé côté client. Respecter `prefers-reduced-motion` |
| P2-12 Accueil à deux modes         | Écran d'accueil « Carrière » / « Jam », comme le menu d'un jeu                                                | Dépend de la coquille (P0-05). Le mode carrière renvoie au tableau de bord `/espace` en attendant P3-13                        |
| P2-13 Mode jam : « Je suis dispo » | Interrupteur avec créneau et envie de jeu, visible des musicien·nes compatibles de la zone, extinction auto   | Commune et distance par tranches seulement. Quota selon la confiance. Mineur·es : règles à trancher avant le lot (D5)          |
| P2-14 Mode jam : salons            | Lancer une jam (style, créneau, type de lieu, places libres), « Trouve-moi une jam », demandes et acceptation | S'appuie sur les annonces `JAM` (P2-02) et la recherche (P2-01). Lieu exact révélé aux seules personnes acceptées              |
| P2-15 Mode jam : fin de match      | Écran de fin : confirmer qui était là, réactions, « Rejouer ensemble », « Garder le contact »                 | La double confirmation crée une collaboration `JAM` (P2-06), qui rapporte son XP. Aucune XP pour une réaction                  |
| P2-16 Carnet de jams et réseau     | Souvenirs (jams, rencontres, instruments, styles, communes), réseau musical, succès fun                       | Le réseau est proposé en premier quand on recrute plus tard. RGPD : export et anonymisation du carnet                          |

**Revue de fin de phase 2** : premier vrai calibrage du barème XP sur les
données de test (combien de temps pour atteindre le niveau 5 ou le palier
« Collaborateur » ?).

## Phase 3 — Groupes, étapes et preuves

**But** : un groupe existe, recrute, franchit des étapes prouvées, et
ses membres en profitent.

| Lot                                   | Objectif                                                                                                                | Points d'attention                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| P3-01 Groupe et adhésions             | `Organization(BAND)`, `Membership` (invitation, demande, départ), rôles OWNER, ADMIN, MEMBER                            | Historique avec `startedAt` et `endedAt`. Transfert de propriété. Un groupe sans OWNER est impossible               |
| P3-02 Page de groupe                  | Page publique, membres actuels et anciens, médias, étapes                                                               | Mêmes composants que le profil public                                                                               |
| P3-03 Recrutement                     | Annonce « cherche un membre » émise par le groupe                                                                       | L'acceptation crée l'adhésion. Quête remplie, XP des deux côtés                                                     |
| P3-04 Étapes                          | Référentiel `MilestoneDefinition` versionné, déclaration                                                                | Étapes 1 à 6 au MVP                                                                                                 |
| P3-05 Preuves                         | `Evidence` et `Attestation`, règles « qui peut corroborer quoi »                                                        | Corroboration par un tiers **hors groupe** pour les étapes 6 et plus. Transitions de statut en XP différentielle    |
| P3-06 Contestation                    | Signaler une étape, la geler, décision du modérateur, reprise d'XP                                                      | Transaction négative liée, rétrogradation de confiance de l'attestant                                               |
| P3-07 Vérification de sortie          | Démo publique et EP vérifiés via l'API Spotify ou MusicBrainz                                                           | Correspondance du nom d'artiste, faux positifs, mock e2e                                                            |
| P3-08 Paliers de groupe               | Palier = dernière étape corroborée. Part d'XP aux membres présents                                                      | Basée sur l'historique des adhésions                                                                                |
| P3-09 Modération étendue              | File de contestations, vérification manuelle d'organisations (préparation de la phase 5)                                | Journal d'audit                                                                                                     |
| P3-11 Morceau minimal                 | `Work`, `WorkContributor` (rôles confirmés), maquette rattachée, fiche morceau avec rôles à pourvoir                    | Trancher le modèle de D20 avant le lot. Base des étapes « composition » et « enregistrement ». RGPD                 |
| P3-12 Ambition et écran de carrière   | Choix de l'ambition, hub : carte, campagnes en cours, équipe, objectifs, agenda, journal                                | L'ambition ne fait que mettre en avant des étapes : jamais d'échec ni de pénalité                                   |
| P3-13 Carte de carrière (actes I-III) | Carte en actes, épreuves franchies, brouillard sur la suite, déblocages réels                                           | Les déblocages reposent sur des preuves ou des rangs, jamais sur l'XP (02 §1)                                       |
| P3-14 Fiche de carrière               | Statistiques façon fiche de joueur, cartes souvenirs partageables à chaque épreuve                                      | Version publique = faits confirmés seulement (D1). Image de partage générée côté serveur                            |
| P3-10 Bêta fermée                     | Pages légales réécrites (CGU, confidentialité, registre RGPD), déploiement en production, 50 bêta-testeurs dans la zone | Revue juridique. Revue de sécurité (`/security-review`). Mesure des indicateurs pendant 3 mois, puis **go / no-go** |
