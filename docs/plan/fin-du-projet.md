# Finir LinkMusician

> Rédigé le 11/11/2026. **Seul document de route** jusqu'à la fin du
> projet : ce qui reste, dans l'ordre, avec la fiche de chaque lot.
> L'état d'avancement vit dans le tableau §5 de [README.md](./README.md) ;
> les questions laissées pour plus tard dans [a-trancher.md](./a-trancher.md).
>
> Les fiches des lots terminés (phases 0 à 4, P5-01 à P5-03a), les revues
> de phase et les anciens prompts ont été retirés de `docs/plan/` le
> 11/11/2026. Ils restent dans l'historique git (commit `2e1cb24` et
> avant) ; le code et `docs/conception/` disent ce qui a été construit.

## 1. Où on en est

**24 issues GitHub fermées sur 56 (42,9 %), 32 ouvertes au 17/11/2026.**
Le [bilan consolidé](bilan-issues-2026-11-16.md) distingue les livraisons partielles,
les épopées et la publication des commits. Le décompte ne mesure pas la charge
restante ni un taux de préparation au lancement ; l’ancienne estimation
111/129 et « ≈90 % du lancement » n’est plus un indicateur courant fiable.
L’étape A est terminée ; les critères des étapes B à D restent à satisfaire.

| Étape                              | Lots                                                                                                    | Quand                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------- |
| A. Finir la scène                  | ✅ (P5-07, P5-11 le 12/11/2026)                                                                         | Nov. → déc. 2026          |
| B. Revue de phase 5 et revue UX    | Revue de fin de phase, Metro (MET-01 à 07), suite e2e (P0-01), inscription (ONB-12c, ONB-13b et ONB-14) | Déc. 2026 → janv. 2027    |
| C. Audit de sécurité (bloquant)    | P3-10a                                                                                                  | Janv. → fév. 2027         |
| D. Ouverture publique à Toulouse   | P3-10                                                                                                   | Objectif début mars 2027  |
| E. Après le lancement              | P5-00, P5-09, P5-10, P5-03c, P4-08, P4-11, P4-12                                                        | Après 3 mois d'usage réel |
| F. Phase 6 : sortie, développement | P6-01 à P6-07                                                                                           | Selon les indicateurs     |

On a de l'avance sur la feuille de route (D28, février pour la phase 5) :
le temps gagné va à la revue UX et à l'audit, **pas** à de nouveaux lots.

**Méthode inchangée** (CLAUDE.md, [README §3-4](./README.md)) : une
session = un lot, sur `main`, commits préfixés par l'ID ; définition de
terminé ; une question ouverte prend un défaut et une ligne dans
`a-trancher.md`, sans bloquer.

## 2. Étape A — Finir la scène (lancement)

Repérage technique de chaque lot (modèle à copier, schéma, pièges) :
[preparation-phase-5.md](./preparation-phase-5.md). Ordre conseillé : les
concerts s'appuient sur l'organisateur et le lieu, les jams publiques
sur l'organisation du lieu.

### P5-05 — Organisateur·rice ✅ (découpé)

**P5-05a ✅** (11/11/2026) : piste `PROMOTER` ouverte, profil
(`/profil/organisateur`), plateaux `GIG_SLOT` publiés dans un lieu validé
avec conditions (rang de groupe, genre, zone ; **jamais l'XP**),
candidature au nom d'un groupe, recherche `?metier=organisateur`, carte
publique, objectifs, rang lu dans `gig.held`, RGPD, e2e.

**P5-05b ✅** (11/11/2026) : organisation `PROMOTER` (`/organisations`)
gérée à plusieurs, vérifiable (SIRET, P5-02), plateaux publiés en son nom,
page publique `/@handle`. Festivals : jams « off » publiées comme des jams ;
stages et masterclasses avec les écoles (P5-11). Voir
[docs/scene](../scene/README.md).

### P5-03b — Lieux : fiche, agenda et rang ✅ (découpé)

**P5-03b ✅** (11/11/2026) : `VenueProfile`, `/lieux/[id]/gerer` (fiche,
publication, dates publiées au nom du lieu, quêtes et « apprendre le
métier », vérification, co-gestion), page `/lieux/[id]` enrichie (fiche,
dates à venir, rang), rang lu dans les faits, notification de la décision
de revendication (Q29). Voir [docs/jam](../jam/README.md#fiche-du-lieu-p5-03b).

### P5-03d — Lieux : photos ✅

**P5-03d ✅** (11/11/2026) : photos de la fiche du lieu (8 au plus),
portées par son organisation, envoyées et retirées par sa gestion ;
galerie sur `/lieux/[id]`.

### P5-06 — Concerts vérifiés ✅

**P5-06 ✅** (11/11/2026) : collaboration `GIG` entre le groupe et l'hôte
(lieu ou organisation), « Premier concert » vérifié par un hôte vérifié
(corroboré sinon), « Première tournée » (≥3 concerts vérifiés, ≥3
communes, 30 jours), `gig.held` (organisateur·rice et rang du lieu). Voir
[docs/etapes](../etapes/README.md#concerts-et-tournée-vérifiés-p5-06).

### P5-04 — Jams publiques des lieux (découpé)

**P5-04a ✅** (11/11/2026) : scène ouverte **récurrente** publiée par la
gestion du lieu (`JamSeries`, `/lieux/[id]/gerer/scene-ouverte`), jams des
4 semaines à venir créées par le job quotidien, toute la gestion du lieu
hôte, « Tous les jeudis » dans le mode jam ; « jam publique tenue » au 3ᵉ
« J'y étais » (`jam.held`, 50 × confiance pour qui l'a publiée, une date
pour le rang du lieu ; rien pour les présent·es, D27) ; mineur·es : lieu
`ADULTS` caché ; `lieux.spec.ts` corrigé (Q30) ; e2e « je trouve la scène
ouverte du jeudi dans le mode jam ». Voir [docs/jam](../jam/README.md).

**P5-04b ✅** (12/11/2026) : animateur·rices affilié·es au lieu
(`VenueHost` : la gestion invite une personne D51, elle accepte dans « Mes
jams », notification `VENUE_HOST_INVITE`) ; page « Qui anime »
(`/lieux/[id]/gerer/animation`) avec suggestions à moins de 30 km, triées
par appréciations reçues puis jams animées, jamais l'XP, sans mineur·e ni
personne bloquée ; lead par défaut d'une série (`JamSeries.leadId`),
copié sur les jams à venir et suivantes ; RGPD ; e2e « le lieu invite une
animatrice suggérée, elle devient lead du prochain jeudi ». Q45 à Q47.

### P5-08 — Carte : acte V ✅

**P5-08 ✅** (12/11/2026) : acte V « La scène » jouable, épreuve lue dans
les faits (« Premier concert » vérifié par un hôte vérifié, d'un groupe
dont on était membre à la date ; un concert corroboré ne suffit pas) ;
la tournée vérifiée en épreuve de plus, affichée, jamais bloquante ;
appel « Candidater à un plateau » ; carte souvenir du concert (groupe,
hôte, mois) ; radar des pros « bientôt » (P4-11). e2e de l'acte V dans
`carriere.spec.ts`. Voir [docs/carriere](../carriere/README.md#carte-de-carrière-p3-13-d53).

### P5-07 — Booker et manager ✅

**P5-07 ✅** (12/11/2026) : pistes `MANAGER` et `BOOKER` ouvertes ;
accompagnement (`Representation`) proposé par l'agent, confirmé par
l'artiste ou la gestion du groupe (`management.confirmed` : 200 au
manager, rien au booker) ; **un accompagnement non confirmé ne rapporte
rien** (test d'intégration) ; « Booké par » sur un concert, parmi les
bookers confirmés (`gig.held`), tournée bookée (`tour.booked`, 400) ; rang
`agentTier` (artistes confirmés, groupes passés deux rangs) ; profil
léger, recherche, carte publique, objectifs, RGPD ; e2e `booker.spec.ts`.
Q48 à Q51. La part de 10 % reste reportée (Q21). Voir
[docs/scene](../scene/README.md#booker-et-manager-p5-07).

### P5-11 — Écoles, MJC, conservatoires (D29) ✅

**P5-11 ✅** (12/11/2026) : organisation `SCHOOL` (un·e responsable
majeur·e, Q52) ; lien d'invitation des élèves (jeton haché, 30 jours,
plafond d'usages, révocable), page publique `/ecole/[token]` reprise
après l'inscription ; ateliers jam publiés au nom de l'école, réservés à
ses membres (`audience: SCHOOL`, lead = le prof), jamais « tenus » (Q53) ;
mineur·es : seuls les ateliers finis avant 22 h (test d'intégration) ;
quête « De l'atelier à la scène » ; aucune liste d'élèves publique ;
RGPD (l'école ne passe jamais à un·e élève) ; parrainage des
responsables : non (Q23). e2e `ecole.spec.ts`. Voir
[docs/ecoles](../ecoles/README.md).

## 3. Étape B — Revue de fin de phase 5 et revue UX

Une session de revue, puis des lots courts de corrections si besoin
(`UX-01`, `UX-02`…), un par parcours.

- **Direction visuelle Metro dans toute l'app (D55)** : lots `MET-01`
  (socle) à `MET-07`, par parcours, dans l'ordre MET-01, MET-02, MET-07,
  MET-03, MET-04, MET-05, MET-06. Règles, correspondance, méthode et
  liste de contrôle par page : [docs/design](../design/README.md). La
  revue UX par rôle se fait sur les écrans **migrés**.

- **Revue de phase** : critères de fin vérifiés ; calibrage des
  personas de la scène relu sur les vrais écrans ; questions Q18 à Q30 de
  [a-trancher.md](./a-trancher.md) passées en revue avec l'utilisateur.
- **Revue UX, mobile d'abord**, un parcours par rôle : musicien·ne
  (jam et carrière), groupe, ingé son, studio, producteur·rice, lieu,
  organisateur·rice, booker et manager, école. Vérifier la navigation en
  menus (D50) et le fil d'Ariane (D52).
- **Avant l'ouverture** (repris des points ouverts) :
  - **P0-01** : faire passer la **suite e2e complète** (interrompue par
    des échecs d'authentification ; `lieux.spec.ts`, Q30) ;
  - e2e « quota TL0 » instable dans `messagerie.spec.ts` (dépend de
    l'ordre des specs) ;
  - tests d'intégration lancés ensemble qui se gênent sur le schéma
    `e2e` (isoler les données ou `--no-file-parallelism`) ;
  - multiplicateur « ×0,1 » affiché le premier jour, quand tout le monde
    est TL0 : préinscrire les leads du réseau (D29) et les passer TL1, ou
    masquer le multiplicateur du libellé ;
  - vocabulaire du mode Carrière : « projet » plutôt que « groupe » dans
    les interfaces, sans renommer les modèles ;
  - relecture des 8 fiches `/demarches` par quelqu'un du métier (V1, V2).

### 3.1 Inscription adaptative multirôle (épopée #14)

**Fait** : ONB-01 à ONB-11 (référentiel, moteur d'étapes, écran de chaque
métier, catalogues des 9 métiers en données, D56 à D59) et **ONB-12a ✅**
(12/11/2026) : récapitulatif `/demarrer/recapitulatif` qui termine
l'onboarding, « Modifier » sans perte, spécialité « Graphisme » (D60, Q62,
Q63). Label, éditeur·rice et communication restent « bientôt » (D15, Q62) :
les ouvrir est une décision produit à part.

Reste à faire, dans l'ordre :

#### ONB-12b — Profil : complétude et visibilité par métier ✅

- **Ticket** #26. Dépend d'ONB-12a.
- **À faire** : sur `/profil`, une fiche de complétude **par métier**
  (spécialités, « Je propose », « Je recherche », champs requis et
  facultatifs non remplis), avec le bénéfice concret de chaque ajout ;
  jamais d'XP ni de rang pour la complétude. Visibilité par champ
  (public, membres, privé ; privé par défaut pour le sensible), lue par
  `/@handle` et la recherche. Rouvrir Q63 (texte libre court par métier
  et par direction, privé par défaut) avec la visibilité.
- **Migration** : additive seulement (colonne de visibilité, table de
  notes si Q63 est acceptée). Stratégie à présenter **avant** de
  l'exécuter ; `--create-only`, `db:nettoyer-migration`, relecture,
  `db:deploy` puis `db:deploy:e2e`.
- **Acceptation** : compte à 2 métiers, complétudes séparées, ville
  demandée une fois ; export et anonymisation RGPD couvrent les nouvelles
  colonnes ; aucune donnée privée dans `/@handle`.
- **État (12/11/2026)** : D61 à D64 consignées après l'audit #29
  (matrice : [conception/06 §1.3](../conception/06-metiers.md#13-qualification-pour-la-mise-en-relation-29-onb-12b-d61-à-d64)) ;
  Q63 et Q59 tranchées, Q64 à Q66 ouvertes. Terminé : migration
  `20261112170320_visibilite_par_metier` appliquée (`public`, `e2e`),
  intégration et E2E (`profil-metiers.spec.ts` et specs voisines) au vert.

#### ONB-12c — Profil : informations avancées par métier (découpé : 12c1 ✅, 12c2 ✅, 12c3 ✅)

- **ONB-12c1 — Formation et répertoire du groupe ✅** (17/11/2026, D64) :
  table additive `band_profiles` (`formation`, `repertoire`, valeurs
  facultatives), écrite par la gestion du groupe dans sa fiche sous le verrou
  `band:` ; « Sur scène » public sur `/@handle`, présenté comme déclaré ;
  écart avec l'effectif signalé sans correction. Règles de rapprochement
  `formationMatch`/`repertoireMatch` (`unknown` n'exclut jamais) prêtes pour
  ONB-13b. Données de l'organisation : hors export personnel, cascade.
  Détail : [groupes](../groupes/README.md#formation-et-répertoire-onb-12c1-d64).
- **ONB-12c2 — Fiches historiques sous D61, postproduction ✅** (17/11/2026,
  Q70, local) : les cartes « Ingé son », « Producteur·rice » et
  « Organisateur·rice » de `/@handle` sont filtrées côté serveur par bloc
  (`#lib/actors/craftCardVisibility`, appliqué dans `getPublicProfile`) :
  anonyme, membre inscrit·e ou la personne. Tarifs en conditions, donc privés
  par défaut, y compris ceux déjà saisis ; références, crédits confirmés et
  rang restent publics. Résultats de Découvrir : spécialités historiques
  tues si le bloc d'intentions est privé. Note « Qui voit quoi » sur
  `/profil/son`, `/production`, `/organisateur`, avec lien vers les
  réglages. Spécialité et offre **postproduction** de l'ingé son : codes du
  référentiel, **sans migration** (la recherche lit
  `person_track_specializations`). Aucun champ ni crédit supprimé.
  Recette : `check` 0 erreur ; unitaires 1440 ✓ (dont 8 nouveaux) ;
  intégration `craftCards` 4 ✓, recherche, crafts et actors ✓ ; E2E
  `producteur` (tarifs masqués puis ouverts, 390 px, clavier, axe),
  `inge-son`, `organisateur`, `profil-metiers`, `recherche`,
  `onboarding-metiers` ✓.
- **ONB-12c3 — Disponibilités, invitations, niveaux de preuve ✅**
  (17/11/2026, Q71, local) : champs `availability_start` et
  `availability_rhythm` dans le catalogue de chaque métier hors
  musicien·ne, sans migration (`person_track_attributes`, export et
  anonymisation existants). Nouvelle propriété `stage: 'profile'` : champ
  de la page du métier seulement, ni demandé, ni accepté, ni effacé par
  l'écran de l'inscription (`fieldsAt`, `trackFieldOps`). Sur une annonce,
  chaque critère « non précisé » propose la page qui le règle
  (`completeLinks` : engagement, façon de travailler, fiche du groupe géré),
  avec `?annonce=<id>` et un lien de retour (`BackToAnnonce`), identifiant
  seulement. Candidature jamais bloquée. Sur `/@handle`, « Déclaré »,
  « Confirmé », « Vérifié » (`#lib/actors/proofLevels`) et leur légende.
  Recette : `check` 0 erreur ; unitaires ✓ (stage, disponibilités, liens,
  retour forgé) ; intégration specializations, opportunités, actors 48 ✓ ;
  E2E `profil-avance` (390 px, clavier, axe, retour forgé) et 20 specs
  voisines ✓ (`onboarding-metiers`, `profil-metiers`, `inge-son`,
  `producteur`, `organisateur`, `annonces-qualifiees`, `annonces-metier`,
  `candidatures`, `candidature-deleguee`, `collaborations-morceau`,
  `profil*`, `organisation-organisateurs`).
  Restent hors lot pour #26 : invitation contextuelle dans la recherche,
  « expériences » et « compétences avancées » au-delà des catalogues.

- **Ticket** #26. Dépend d'ONB-12b.
- **À faire** : portfolio et médias, matériel, logiciels, références,
  disponibilités, conditions et tarifs indicatifs, par métier, en
  **réutilisant** `/profil/son`, `/profil/production`,
  `/profil/organisateur` et « Ma pratique » (pas de doublon). Invitation à
  compléter au moment où le champ sert (candidature, annonce), sans
  bloquer l'application. Distinguer déclaré, confirmé et vérifié.
- **Questions** : visibilité de `rate` et `gear` des pages historiques et
  « postproduction » : traitées par ONB-12c2 (Q70 ; la postproduction est un
  code du référentiel, sans enum ni migration).
- **Acceptation** : une spécialité retirée ne détruit aucun crédit ;
  profils existants intacts ; mobile et clavier.

#### ONB-13 — Découverte selon offres et besoins (découpé : 13a ✅, 13b ✅)

- **ONB-13a — Recherche par offres ✅** (D62) : `searchMusicianIds` filtre
  sur `person_track_intents` (offre ou besoin, métier, spécialité), source
  de distance `CraftMobility`, respect du bloc « spécialités et
  intentions » d'ONB-12b. Sans migration. Scénarios #29 : 2 et 7.
- **ONB-13b — Annonces qualifiées ✅** (D63, 17/11/2026, [annonces](../annonces/README.md#annonces-qualifiées-onb-13b-27-d63)) : rémunération, formation,
  engagement, présence sur `opportunities` (migration additive), puis
  rapprochement annonces et profils (formation du groupe : ONB-12c1 ✅,
  `#lib/bands/lineup`). Scénarios #29 : 1, 3 et 4 ; 5 et 6
  (métiers fermés, Q62) en tests unitaires seulement.

- **Ticket** #27. Dépend d'ONB-12a (ONB-12b pour la visibilité).
- **À faire** : `/decouvrir` et le moteur géographique existants filtrés
  par codes « Je propose » / « Je recherche » **par métier**, spécialités,
  champs et zone. Filtres stricts seulement si le besoin les exige, puis
  affinités souples ; pondération propre au besoin, jamais l'XP. Un champ
  absent reste « inconnu », jamais « non ». Exclure comptes suspendus,
  masqués, bloqués ; règles des mineur·es.
- **Acceptation** : les 3 scénarios du ticket (batteur rock pour un
  groupe, ingé enregistrement à Toulouse, programmateur qui cherche un
  duo acoustique) ; un métier sans offre n'apparaît pas comme
  prestataire ; aucune donnée privée dans les réponses.

#### ONB-14 — Inscription : E2E transverse ✅

- **Ticket** #28. Dépend d'ONB-12a, en continu jusqu'à ONB-13.
- **Déjà couvert avant** : musicien·ne seul·e, ingé son sans instrument,
  producteur·rice, manager, organisateur·rice jam, éditeur·rice seul·e,
  musicien·ne + producteur·rice + booker, reprise dans un second
  navigateur, correction sans perte, axe.
- **Livré** (`e2e/linkmusician/inscription-transverse.spec.ts`, 7 tests) :
  label + éditeur·rice + communication ensemble (rien d'exigé, même un champ
  « requis » d'A&R ; réponse d'un champ masqué non gardée) ; booker
  programmateur puis booker d'artistes (champs `when`, jauge cochée puis
  masquée écartée par le serveur) avec organisatrice de festival (pas les
  champs jams ni concerts) ; disponibilités (`stage: 'profile'`) absentes de
  `/demarrer/metier/[slug]` et intactes après un nouvel enregistrement de
  l'étape ; POST forgés (métier non choisi et étape future renvoyés vers
  l'étape à faire, page d'un métier non choisi en 403, codes et champs d'un
  autre métier en 400, compte visé pris de la session, jamais du
  formulaire) ; parcours musicien·ne + ingé son à 390 px au clavier, axe et
  débordement à chaque écran ; premier résultat d'un adulte sans mineur·e
  inconnu·e ni profil masqué (mineure visible une fois dans son réseau) ;
  mineure organisatrice de scènes ouvertes sans la case D51. Aide partagée
  `horizontalOverflow` déplacée de `mobile.spec.ts` vers
  `e2e/support/linkmusician.ts`.
- **Défauts trouvés et corrigés** (chacun reproduit par un test du spec,
  en échec avant la correction) :
  1. **Disponibilités bloquant l'inscription** : l'étape d'inscription
     chargeait toutes les réponses du métier, disponibilités comprises, et
     les renvoyait ; le serveur les refusait (« Disponible pour un nouveau
     projet : Précision inconnue. »). Une personne qui avait saisi ses
     disponibilités ne pouvait plus réenregistrer l'étape. `trackStepData`
     ne charge plus que les champs de l'écran.
  2. **Premier résultat sans D5** : `nearbyMusicians` montrait à un adulte
     des mineur·es inconnu·es, des profils masqués, des comptes bloqués et
     des inscriptions non finies. Il applique désormais les garde-fous des
     suggestions (`publicActorWhere`, réseau musical, `adultBirthCutoff`).
- **Recette** (17/11/2026, `--retries=0`) : `inscription-transverse`
  (7), `onboarding-metiers` (6), `onboarding`, `assistant-inscription`
  (D47, non-régression), `mobile`, `profil-metiers`, `profil-avance` :
  17/17. `check` (0 erreur), unitaires (1 445), ESLint et Prettier sur les
  fichiers du lot.
- **Pistes laissées à #50** : le premier résultat envoie encore la
  distance en mètres dans les données de la page (affichée par tranche,
  mais lisible dans la réponse : à arrondir côté serveur, comme les
  suggestions) ; `preload_data_failed` (Internal Error) sur `/jam/carnet`
  vu dans le journal pendant le test de la mineure, non creusé.
- **Limites de la machine** : M1, T1 et T2 (`a-trancher.md`), sans effet
  sur cette passe.

### DT-01 — Prisma 7 (découpé : 01a, 01b)

Dette technique, avancée avant l'audit P3-10a à la demande de
l'utilisateur (12/11/2026) : Prisma 5.22 date de 2024, son moteur Rust
alourdit les fonctions Vercel, et le SQL brut PostGIS n'est pas typé (D7).

#### DT-01a — Passage à Prisma 7.10 🟡 (e2e à rejouer)

- `prisma`, `@prisma/client` 7.10.1 et `@prisma/adapter-pg` (pilote `pg`).
  Générateur `prisma-client-js` gardé : les imports `@prisma/client` du
  boilerplate restent tels quels (pas de conflit de fusion).
- URL de la CLI dans `prisma.config.ts` (plus dans `schema.prisma`).
  `scripts/prisma-direct.mjs` reste le seul chemin des migrations.
- **Fabrique unique `createPrismaClient`** (`prisma/client.js`) pour
  l'application, les seeds, les scripts, les tests d'intégration et l'e2e.
  Mesuré : l'adaptateur **ignore `?schema=`** ; la fabrique le passe en
  option, sinon les tests écriraient dans `public`.
- **Erreurs changées**, reconnues par `src/lib/server/db-errors.ts` : un
  conflit sérialisable remonte en `DriverAdapterError` (plus `P2034`), et
  `P2002` ne porte plus `meta.target`, seulement le nom de l'index. Sans
  ce module, la relance de `setPersonTracks` et la reprise des collisions
  de pseudo à l'inscription (`createPersonForUser`) ne jouaient plus.
- Passage par la version 6 sans migration : aucune relation n-n implicite.
- Critères de fin : `check`, `lint`, unitaires, 210 tests d'intégration et
  build au vert (fait) ; **e2e complet à rejouer par l'utilisateur**.

#### DT-01b — SQL brut typé et nouveau générateur

- Les 33 requêtes brutes (22 fichiers, PostGIS d'abord) en fichiers `.sql`
  typés (TypedSQL), en gardant `qualifiedTable` pour le schéma.
- Générateur `prisma-client` (le `prisma-client-js` sera retiré), à faire
  d'abord dans le boilerplate (Q70 du tableau T).
- Dépend de DT-01a ; après le lancement si P3-10a presse.

## 4. Étape C — P3-10a Audit de sécurité avant production

- **Dépend de** : toute l'étape A. **Bloquant** pour P3-10 : aucune
  ouverture tant qu'un point reste ouvert.
- **Checklist** :
  1. Specs de sécurité du boilerplate au vert (`e2e/admin/security.spec.ts`,
     `users.spec.ts`, `exports.spec.ts`, `auth/gdpr-data.spec.ts`,
     remontée n° 18) : cause établie, corrigée ou remontée en amont.
  2. Lieux (D26) : aucune jam dans un lieu non validé ; lieux ajoutés par
     un compte récent invisibles jusqu'à confirmation.
  3. Mineur·es (D5) : chaque fonction (jams, formation du lead,
     invitations, suggestions, messagerie, appréciations, ateliers)
     respecte le couvre-feu de 22 h, la dispo invisible, la messagerie
     restreinte et l'absence de suggestion à des adultes inconnu·es ; un
     test par fonction.
  4. Limiteurs de débit : tous sur Redis (Upstash) en production ; test
     de charge (k6) sur les actions limitées.
  5. HTML injecté : chaque `{@html}` nettoyé ; aucun texte d'utilisateur
     rendu en HTML (test XSS).
  6. Service worker : aucune page connectée ni réponse privée en cache.
  7. Accès par identifiant : pour chaque route `[id]` et chaque action, un
     test avec l'identifiant d'un autre compte (non-membre, bloqué,
     mineur·e, contenu retiré).
  8. En-têtes (CSP, HSTS, cookies `Secure`, `HttpOnly`, `SameSite`),
     origine des actions, `npm audit` sans faille haute ou critique.
  9. Données qui ne sortent jamais : score de réputation, date de
     naissance, point de localisation, e-mail, SIRET d'une organisation ;
     test qui inspecte les réponses JSON de chaque page.
  10. Abus de jeu : collusion, faux présents à une jam, faux concerts
      (farmeur de dates, P5-01), rendements décroissants vérifiés.
  11. RGPD : export et anonymisation couvrent chaque donnée personnelle
      (relecture de bout en bout du schéma).
  12. Secrets et accès : variables de production, comptes admin avec
      double authentification, journal d'audit de la modération.
- **Outils** : `/security-review` sur tout le code ; pentest externe si
  le budget le permet.
- **Fin** : checklist cochée, consignée dans
  `docs/securite/audit-lancement.md` avec les preuves.

## 5. Étape D — P3-10 Ouverture publique (pas de bêta, D23)

- **Dépend de** : P3-10a et tout le reste.
- **Hors code, à lancer tôt** : nom de domaine et DNS (SPF, DKIM, DMARC,
  `SMTP_FROM` définitif) ; comptes de production (Vercel, Neon,
  Upstash, Cloudinary) ; revue juridique des pages légales ; feuille de
  route de la startup ([docs/lancement](../lancement/README.md)).
- **Tâches** : pages légales réécrites (CGU, confidentialité, registre
  RGPD, mentions) ; déploiement en production ; supervision et alertes
  (`alerting.ts`) ; sauvegardes ; page d'accueil publique ; tableau des
  indicateurs (P1-13) suivi chaque semaine.
- **Fin** : l'app est ouverte au public ; inscription, onboarding, jam,
  collaboration et profil public fonctionnent en production (smoke
  test) ; **bilan après 3 mois d'usage réel** sur les indicateurs
  (conception 05 §2).

## 6. Étape E — Après le lancement

Dans l'ordre où le pilote les rendra utiles.

### P5-00 — Validation juridique de la monétisation (D25)

- **Avant** P5-09 et P5-10 : faire valider par un juriste la commission
  sur prestations (présomption de salariat des artistes, GUSO, statut de
  la plateforme, CGV) ; choisir le partenaire de portage éventuel.

### P4-11 — Radar des pros

- **Dépend de** : P2-08 ✅.
- **Tâches** : flux « projets qui montent » (réputation, rangs, vitesse
  de franchissement) ; alertes par genre et zone ; jamais d'XP.
- **Fin** : un groupe qui franchit deux rangs en un mois remonte dans le
  flux (intégration).

### P5-09 — Offre pro

- **Dépend de** : P4-11, P5-00.
- **Tâches** : abonnements **lieux** (agenda, appels à groupes, jams
  publiques, aide licence et GUSO) et **pros** (Stripe) : recherche
  avancée, alertes, flux étendu ; **jamais** de visibilité organique, de
  place dans le mode jam ni d'XP achetée.
- **Fin** : aucun produit payant n'écrit dans le registre XP (test).

### P5-10 — Réservation de studio

- **Dépend de** : P4-03 ✅, P5-00.
- **Tâches** : agenda et réservation, paiement par Stripe Connect
  (commission) ; une réservation honorée **vérifie** l'étape « Première
  répétition » ; réservation honorée 100 pour le studio (02 §2.2).
- **Fin** : e2e « je réserve et paie un créneau » (Stripe en mode test).

### P5-03c — Lieux : gérant vérifié (niveau 2, D31)

- **Dépend de** : P5-03a ✅ ; réponse de la DINUM sur ProConnect.
- **Tâches** : identité comparée aux dirigeants (API Recherche
  d'entreprises, champ `dirigeants`), sinon documents en modération ;
  exigé pour les outils payants et pour contester une fiche (Q20).

### P4-08 — Vitrine des propositions

- **Dépend de** : P4-07 ✅ ; gratuité ou offre pro à trancher.
- **Tâches** : `WorkPitch` (morceau, ce qui est cherché, public visé,
  expiration) ; proposer et retirer (opt-in de l'équipe) ; vitrine
  filtrée par genre, zone, besoin, **jamais triée par XP** ; contact par
  la messagerie ; règles des mineur·es.
- **Fin** : un morceau retiré disparaît aussitôt ; ni XP ni confiance
  dans la vitrine (test) ; e2e « Nora découvre le morceau et propose une
  production ».

### P4-12 — Messagerie temps réel

- **Dépend de** : P2-04 ✅ ; D8.
- **Tâches** : Ably ou Pusher à la place du polling ; présence ; repli
  sur le polling si le service tombe (`circuit-breaker.ts`).
- **Fin** : un message arrive en moins d'une seconde ; le repli marche.

## 7. Étape F — Phase 6 : sortie et développement (actes VI à VIII)

**But** : sorties vérifiées et accompagnées, labels et éditeurs, défis
collectifs, carrière complète. Chaque métier ouvert suit la liste de
08 §16 (référentiel pur, organisation et vérification, règles d'XP
calibrées par personas, rangs, quêtes, carte, `available: true`, RGPD,
e2e du parcours).

### P6-01 — Personas et barème de la sortie

- **Tâches** : personas (label indépendant, éditeur, attachée de presse,
  webzine local) ; barème ; preuves de placement de l'éditeur.
- **Fin** : barème consigné (02, 08 §11 à §13).

### P6-02 — Label

- **Dépend de** : P6-01, P5-02 ✅.
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

- **Dépend de** : P3-07 ✅, P6-02.
- **Tâches** : actes sortie, développement, carrière jouables ; quêtes
  de méthode (préparer une sortie 4 semaines avant, dossier de presse,
  clip) ; épreuves « sortie vérifiée », « signature ».
- **Fin** : e2e de la carte complète sur un jeu de données.

### P6-06 — Défis collectifs par ville

- **Dépend de** : P5-04 ; D3.
- **Tâches** : défis coopératifs opt-in (« 50 morceaux enregistrés à
  Toulouse ce mois-ci », la fête de la musique) ; jamais de classement
  entre personnes.
- **Fin** : un défi réussi crédite un succès collectif.

### P6-07 — Autres rôles

- **Dépend de** : indicateurs par métier (P1-13 ✅).
- **Tâches** : ouvrir les rôles de 06 §3.11 selon la demande mesurée
  (vidéastes, graphistes, DJ, techniciens, magasins, loueurs, profs,
  tremplins, radios…), un lot par rôle.
- **Fin** : chaque rôle ouvert suit la liste de 08 §16.

## 8. À surveiller pendant le pilote (hors lots)

Une ligne réglée est retirée ; le `git log` en garde la trace.

| Sujet                               | Ce qui reste                                                                                                                       | Quand                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Désabonnement email en un clic      | `List-Unsubscribe-Post` (RFC 8058) : route exemptée de la protection CSRF ; aujourd'hui l'en-tête mène à la page de confirmation   | Avant 5 000 emails par jour                    |
| Heure du digest                     | Cron à 17 h UTC (18 h l'hiver, 19 h l'été) ; à revoir selon les retours                                                            | Après le pilote                                |
| Web Push                            | Reporté (D34), avec l'app des stores ou si des demandes sont ratées faute d'alerte                                                 | Après le pilote                                |
| Réputation et tri de la recherche   | Poids `ln(1 + n)`, seuil de réactivité et D33 posés sans données réelles : à calibrer                                              | Revue après le pilote                          |
| Coût du traitement des événements   | Chaque événement recalcule confiance et réputation : passer en job QStash si les actions ralentissent                              | Dès le pilote                                  |
| Coût du digest et des suggestions   | Requêtes par personne (digest), PostGIS sur 200 candidat·es à chaque ouverture (suggestions) : regrouper, mettre en cache          | Au-delà de quelques milliers de comptes        |
| Détection de collusion              | Seuils posés sans données ; une collusion confirmée ne reprend pas encore l'XP du cercle ; empreinte limitée aux sessions vivantes | Au premier cas confirmé, revue après le pilote |
| Suggestions et attentes réciproques | Ajuster selon « Pas intéressé·e », distinguer pairs, recrutement et transmission, sans faire du niveau un filtre (07 §7.1)         | Revue après le pilote                          |
| Plafond des habitué·es des jams     | Un même cercle donne au plus 70 XP par personne et par an (voulu) : vérifier sur les données                                       | Revue après le pilote                          |
| Mémoire de `svelte-check`           | Portée à 6 Go ; pistes : types Prisma plus légers, `skipLibCheck` sur `@prisma/client`                                             | Surveiller                                     |
| Amorcer la communauté               | Lieux relais, écoles, liste d'attente : piste non technique, suivie dans [docs/lancement](../lancement/README.md)                  | En continu                                     |

## Espaces métier — suite du socle de l'épopée #30

Après DASH-01 et DASH-03, **DASH-02a est livré localement** : structures
existantes et autorisations communes. Les dépendances des issues #32 et #34
sont circulaires ; le découpage évite de considérer l'une des deux terminée
avant d'avoir livré ses fonctions.

1. DASH-02a : réutiliser les cinq types actuels, centraliser leurs capacités
   et les contrôles serveur, fournir le menu privé des participations.
2. DASH-04a : mandats individuels bornés (dates, départements, activités),
   consentement et révocation ; livré localement, voir
   [le cadrage](../conception/13-mandats-individuels.md).
3. DASH-02b : agences privées et équipes livrées localement, voir
   [le cadrage](../conception/14-agences-equipes.md).
4. DASH-04b : affectations nominatives et droits explicites consentis, voir
   [le cadrage](../conception/15-affectations-delegations.md).
5. DASH-05 : journal d'activité commun après les permissions et délégations.
   DASH-05a : historique privé des affectations et contrat de lecture partagé ;
   invitations, mandats, validations et autres propositions restent dans la suite.
   Voir [audit du journal](../conception/16-journal-activite.md).
   DASH-05b : lecture privée des mandats, y compris terminés, et des invitations
   personnelles conservées. DASH-05c conserve les nouveaux refus et retraits de propositions
   d’accompagnement. Transitions de participation, validations de collaboration
   et options restent à suivre.

DASH-02a seul ne clôturait pas DASH-02 ; les agences DASH-02b et les
affectations DASH-04b complètent ce périmètre. Les autres modules DASH et les parties ouvertes
ONB-12c/ONB-13b restent dans leurs lots. Voir
[l'audit et le découpage](../conception/12-structures-equipes.md).

DASH-05c : conservation minimale des nouveaux refus et retraits de propositions
d’accompagnement, transactionnelle, sans message ni conditions privées. Les
historiques gardent leurs accès actuels ; export des actes pour un groupe et
anonymisation des auteurs couverts. Les participations, validations de
collaboration et futures options restent dans les lots suivants ; DASH-05 reste
ouvert. Les commits DASH-05a/b/c sont désormais vérifiés publiés sur `origin/main` à
`8827f11` lors de la reprise du 14/11/2026 ; aucun push effectué pendant cette
reprise. Le correctif du compteur des objectifs et le complément de suivi
restent locaux, dans le commit de reprise `(DASH-05c)`. Preuves de recette dans
[le suivi](README.md#6-navigation-et-espaces-métier--épopée-30).

DASH-05d : actes transactionnels de co-gestion PROMOTER/VENUE et historique
personnel des périodes, y compris closes, sans accès aux outils ni aux collègues.
Export/anonymisation couverts, aucun fait ancien reconstruit. Livraison locale
sur `main`, sans push ; `7253877` (correctif DASH-05c) est maintenant vérifié
publié. Les autres circuits (groupes, studios, agences, écoles), validations de
collaboration et futures options restent à suivre ; DASH-05 reste ouvert.
Preuves de recette et périmètre détaillés dans [le suivi](README.md) et
[la conception](../conception/16-journal-activite.md).

DASH-05e : la co-gestion des studios conserve maintenant ses actes dans le
journal de participations existant, sous son verrou `studio:`, avec auteur
réel, date, refus et annulation distingués. L’historique personnel commun
inclut les studios vivants, même après départ, sans outils ni accès aux
collègues. Export/anonymisation réutilisés, aucune migration ni reprise des
anciens états. Livraison locale sur `main`, sans push, après DASH-05d lui aussi
local à cette date. Restent les groupes, agences, écoles, validations de
collaboration et futures options ; DASH-05 reste ouvert. Détail et recette
dans [le suivi](README.md) et [la conception](../conception/16-journal-activite.md).

DASH-05f : les participations aux agences conservent maintenant leurs actes
avec auteur réel et date, sous le verrou `org:` dans la transaction de mutation,
y compris lors d’une fermeture. L’historique personnel commun inclut les
agences vivantes après refus ou départ sans accès aux collègues ou aux outils.
Les agences fermées restent exclues du lecteur ; leurs actes restent dans
l’export RGPD. Export et anonymisation réutilisés, aucune migration ni
reconstruction d’anciens actes. Livraison locale sur `main`, sans push ;
DASH-05d et DASH-05e restent également locaux, `origin/main` vérifié à
`7253877`. Groupes, écoles, validations et futures options restent à suivre ;
DASH-05 reste ouvert. Preuves de recette dans [le suivi](README.md).

DASH-05g : entrées et sorties des groupes journalisées sous verrou `band:`
dans la transaction de mutation : invitations, demandes, recrutement,
départ/retrait et clôtures par dissolution. Lecture strictement personnelle
après départ/refus, sans outils ni journal de collègues ; export/anonymisation
communs réutilisés. Migration additive de six types d’acte, sans reprise des
anciens états. Les rôles et transmissions des groupes, répétables sur une même
période, restent dans un lot distinct ; écoles, validations et options restent
également à suivre. `origin/main` revérifié à `4e7e0ff` : DASH-05d/e/f sont
publiés ; DASH-05g livré localement sur `main`, sans push. Recette détaillée
dans [le suivi](README.md). DASH-05 reste ouvert.

DASH-05h : rôles et transmissions répétables des groupes conservés dans la
transaction sous verrou `band:` ; chaque transmission porte ses deux actes
personnels et son auteur réel. Appels identiques, répétés et concurrents,
rollback et RGPD couverts. Les douze anciens types gardent leur unicité via un
index partiel ; quatre types nouveaux répétables, aucune reprise historique.
Aide, démo et conception actualisées. `origin/main` vérifié à `6b1db48` : les
lots jusqu’à DASH-05g sont publiés ; DASH-05h reste **local**, sans push.
Écoles, validations de collaboration et futures options restent à suivre ;
DASH-05/#35 et #30 restent ouverts. Recette dans [le suivi](README.md).

DASH-05i : participations aux écoles journalisées (acceptation de lien,
départ personnel, retrait par la gestion) sous verrou transactionnel `org:`,
auteurs réels et dates conservés. Historique personnel après départ sans
outils ni accès aux journaux des élèves pour la gestion ; export/anonymisation
réutilisés. Aucune migration ni reprise des anciens actes. Documentation,
aide et démo actualisées. `origin/main` vérifié à `ce87a90` : DASH-05h est
publié ; DASH-05i reste local, sans push. La suite porte sur les validations
de collaboration et les futures options ; DASH-05/#35 et #30 restent ouverts.
Preuves de recette dans [le suivi](README.md).

DASH-05j : validations de collaboration conservées par participant, lues dans
la conversation avec auteurs et dates réels. Acceptation, confirmation et
règlement métier atomiques sous verrou partagé avec refus/annulation ; export
RGPD étendu et anonymisation existante reflétée. Aucun état ancien ni notification
converti, aucune migration. Aide et démo actualisées. Livraison **locale** après
DASH-05i (`2341488`), désormais vérifié publié lors du contrôle final. Aucun push
de l’agent ; seul DASH-05j est nouveau et local.
DASH-05/#35 et #30 restent ouverts. Recette dans [le suivi](README.md).

#### DASH-05k — refus et annulations de collaboration (livré localement)

Dépend de DASH-05j. Livré : `declinedAt` et `cancelledAt` sur la participation
de l’auteur réel, après audit des chemins de refus, annulation et suppression.
Écriture atomique avec la mutation sous le verrou `collaboration:`, sans doublon
ni écrasement lors de rejeux/concurrence, sans notification ou progression ajoutée.
Lecture strictement privée, export/anonymisation RGPD, tests, aide et deux
situations fictives de démo. Aucune reprise depuis états, `updatedAt` ou notifications.
Migration additive relue et appliquée en développement et sur `e2e`, deux colonnes
nullable seulement. DASH-05j (`6aff0dc`) et DASH-05k restent locaux sur `main`,
sans push ; distant vérifié à `2341488` (DASH-05i publié). Recette dans
[le suivi](README.md). DASH-05 et #35/#30 restent ouverts.
Les appréciations et crédits ont leurs propres circuits à auditer dans un autre
lot ; les futures options et propositions restent également dans leur lot propre.

#### DASH-05l — actes d’appréciation de collaboration (livré localement)

Dépend de DASH-05k. Périmètre : audit attribution/reprise/réattribution,
conservation des nouveaux actes répétables avec auteur réel et date, lecture
privée, export et anonymisation RGPD. Aucun ancien acte reconstruit ; aucun
effet métier ajouté par le journal. Les crédits manuels et futures
options/propositions restent hors du lot.

Modèle retenu : registre minimal indépendant de l’état courant de
`CollabEndorsement`, sous le verrou transactionnel commun `collaboration:`.
Critères : cycles successifs, rejeux/concurrence, droits/blocage, rollbacks,
effacement des auteurs et cascades, sans multiplier notifications ni progression.

Livré : registre répétable minimal, transactions sous verrou commun, projection
privée, export/anonymisation, aide et démo dédiée. Migration additive
`20261115152721_collaboration_appreciation_acts` appliquée en développement
et sur `e2e`, sans reprise ancienne. Recette dans [le suivi](README.md).
Distant revérifié à `2341488` ; DASH-05j/k/l restent locaux sur `main`, sans push.
DASH-05 et #35/#30 restent ouverts.

#### DASH-05m — actes humains des crédits manuels (livré localement)

Dépend de DASH-05l. État réel vérifié le 15/11/2026 : main propre à
`cd7f155`, origin/main à `cd7f1557fc18853f7694a59ee31e462e6c65b135` ;
DASH-05j/k/l publiés. Travail directement sur main, commit local sans push.

Périmètre : audit de création, attribution, auto-attribution, confirmation,
refus, retrait personnel et retrait par la gestion ; nouveaux actes humains
uniquement, conservation indépendante de la ligne de crédit supprimable.
Aucun crédit automatique transformé en consentement manuel. Lecture personnelle
minimale après retrait/perte de gestion, export/anonymisation, migration additive,
tests de cycles, concurrence, rollback et absence d'effets métier ajoutés.
Les options/propositions et les autres circuits restent séparés ; DASH-05 et
#35/#30 restent ouverts.

Livré : registre `WorkCreditAct`, types distincts et unicité par période,
mutations et effets atomiques, correction de l'ordre collaboration/morceau/
progression, lecture privée minimale, export complet et anonymisation, aide
et démo idempotente. Migration additive `20261115154332_work_credit_acts`
appliquée en développement et e2e ; aucune reprise des crédits existants.
Recette : 1 368 unitaires, 74 intégrations distinctes et 4 E2E sans reprise,
types sans erreur/avertissement hors E2E. Formatage et ESLint ciblés sans erreur ;
lint global toujours bloqué par les scripts `.shot-*` préexistants. Détails
dans [le suivi](README.md). `seed:demo` joué deux fois : cinq actes, deux périodes.
Seul DASH-05m est nouveau et local ; les mentions locales historiques des lots
j/k/l ci-dessus sont remplacées par la vérification publiée à `cd7f155`.
DASH-05 et #35/#30 restent ouverts. Aucun push.

#### ARCH-MET-01 — audit des capacités et services métier (#55, livré documentaire)

Audit du 15/11/2026 sur `b0dadf2` propre, confirmé publié par ls-remote puis
fetch. DASH-05m et sa préparation sont donc publiés. Ce nouvel audit est livré
par un commit **local**, sans push ; aucune migration, activation ou fonctionnalité
produit. [Audit, matrice et scénarios](../conception/17-audit-capacites-services.md).
[Prompt suivant](prompt-reprise.md).

Les propositions suivantes demandent validation de l'audit, puis des **issues
séparées pour les corrections/extractions** ; les sous-lots fonctionnels #51–#54
restent dans #36. Aucun de ces changements de code n'est réalisé par ARCH-MET-01.
Ne pas transformer tout le plan en préalable obligatoire aux fonctions indépendantes.

##### Ordre et contrats des prochains lots

Les nouveaux noms de fichiers ci-dessous sont des propositions. Chaque lot
reste court (1 à 4 jours) ; découper si ses critères ne tiennent pas dans cette
borne. Les tests indiqués sont **à exécuter avec le code correspondant**, pas
une recette déjà passée. Retour applicatif conservant les données par défaut ;
aucune migration descendante destructive automatique.

| Lot proposé                                   | Bénéfice / risque                                  | Dépendances et périmètre exact                                                                                                                          |
| --------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-MET-02a — ordre des verrous              | Élevé / élevé, avant nouveaux effets de production | Validation #55 et issue distincte. Caractériser R1 puis corriger les seuls chemins en cause ; conserver collaboration → work avant toute écriture.      |
| ARCH-MET-02b — gestion et mutations Work      | Élevé / moyen                                      | Validation #55, contrat de verrous 02a pour les chemins partagés. Relecture de gestion et révocation, maquette/rôle libre ; aucune nouvelle permission. |
| ARCH-MET-02c — proposition concurrente        | Moyen / moyen, indépendant de SELF                 | Validation #55 et issue distincte. Unicité de proposition conversation/jour, annulation et nouvel essai explicites.                                     |
| ARCH-MET-03 — politique et lectures works     | Moyen / faible à moyen, facultatif avant SELF      | Après caractérisation des gardes ; extraction ciblée, façade publique identique. Pas de réécriture de toutes les couches Prisma.                        |
| DASH-06a / #51 — enregistrement SELF          | Élevé / moyen                                      | Audit validé, contrats de gestion/concurrence traités pour ce chemin. Premier incrément produit ; MEMBER et EXTERNAL exclus.                            |
| DASH-06b / #52 — rôles existants              | Élevé / élevé sur consentement                     | #51 si écrans partagés. Une ligne contributeur, plusieurs rôles, acte répétable spécifique.                                                             |
| DASH-06c / #53 — faits, preuve, suggestions   | Élevé / élevé sur projections                      | #51 et #52 ; source cohérente pour état et journey, préservation des preuves indépendantes.                                                             |
| DASH-06d / #54 — parcours et recette          | Élevé / moyen                                      | #51–#53 ; #50 en continu, non-régression ONB #28.                                                                                                       |
| DASH-06 suite — équipe, versions, validations | Élevé / élevé, découper en nouvelles issues        | SELF éprouvé ; mandats/permissions ne donnent aucun droit supplémentaire par défaut. #36 reste ouvert.                                                  |

##### ARCH-MET-02a — concurrence avant extension

Issue distincte [#56](https://github.com/Pierre-FABIEN/linkmusician/issues/56),
engagée le 15/11/2026 après validation de la suite par l'utilisateur et livrée
localement le 16/11/2026, sans push. Audit
`b30edaa` confirmé publié ; R1 reproduit sur cette base par barrières SQL
(`40P01`). Correction et recette : [suivi](README.md#arch-met-02a--ordre-des-verrous-56-15112026).

- **Fichiers/contrats** : `server/works/service.ts` (`authorProgress`,
  `markComposed`), `collaborations/service.ts` (`settle`), `milestones/service.ts`
  (`syncComposition`, `verifyRecordingFromCollaboration`), `bands/service.ts`
  (`afterJoin`), `progression/processor.ts`/`events.ts` si nécessaire. Ces chemins
  partagent un `Prisma.TransactionClient`, jamais un tx imbriqué indépendant.
- **Invariants** : `collaboration:` → `work:` avant écriture de participant ;
  décider les verrous de groupe avant les acteurs sur les chemins concernés ;
  examiner l'union d'acteurs des émissions successives. Ne pas prétendre fixer
  tous les ordres par un helper qui trie seulement un événement. Relecture après
  attente, y compris Work supprimé, et mêmes règles de preuve/crédits/XP.
- **Migration** : aucune attendue. **Fin** : courses contrôlées composition de
  groupe contre adhésion, finalisation recording contre mutation de groupe,
  événements successifs à acteurs communs ; absence d'interblocage dans ces
  scénarios et rollback atomique en cas d'échec. Ajouter des barrières déterministes
  dans l'intégration, pas seulement des Promise.all sans contrôle d'ordre.
- **Non-régression** : historiques works/collaborations, milestones, bands et
  moteur ; E2E morceaux/collaborations/concerts selon chemins touchés, types et
  lint. **Retour** : revert applicatif cohérent de ce lot, sans retirer registres
  ni index ; documenter qu'il réintroduit le risque initial.

##### ARCH-MET-02b — garde Work et concurrence de révocation

Issue distincte : [#57](https://github.com/Pierre-FABIEN/linkmusician/issues/57), ouverte le 16/11/2026 avant le code.
**Livré localement le 16/11/2026, sans push ni migration.** Gardes et listes
harmonisées, maquette atomique, 36 cas de gestion et 11 barrières 02a au vert ;
recette complète et réserves de lint préexistantes dans [le suivi](README.md#arch-met-02b--gestion-work-et-révocation-57-16112026).

- **Fichiers** : `works/service.ts`, `organizations/access.ts`,
  `bands/service.ts`, `works/access.ts`, `media/service.ts`, `trust/quotas.ts`
  et tests works/domaines concernés.
  Faire converger la décision de gestion et son prédicat de liste sans confondre
  équipe, gestion et visibilité publique. Contrôler `setDemo`, `removeOpenRole`
  et création pour groupe ; ne pas tenir un verrou SQL durant un appel réseau
  d'ajout de média sans analyse de durée/compensation.
- **Invariants/fin** : révocation validée pendant l'attente interdit la mutation ;
  MEMBER, crédit, métier actif ou mandat n'accordent pas la gestion ; données
  privées et règles mineurs/blocages/quotas préservées. Choisir explicitement
  les opérations partageant band/work, avec le même ordre que 02a.
- **Migration** : aucune attendue. **Tests** : révocation/attribution et
  maquette/suppression, payload public/équipe, accès direct service et POST forgé.
  **Retour** : rétablir façade et gardes précédentes par revert cohérent,
  sans effacement de données ; le risque antérieur redevient connu.

##### ARCH-MET-02c — une proposition effective

**Publié, confirmation au bilan du 16/11/2026** (`9a73d45`), issue distincte
[#58](https://github.com/Pierre-FABIEN/linkmusician/issues/58) créée avant code.
Publication distante à `cba0234` au démarrage, puis préparation `aa9e043`
confirmée publiée pendant la recette ; code 02c ensuite publié avant BILAN-01. Aucun push par l’agent ni
déploiement de production établi.

- **Contrat livré** : clé partagée conversation/date de prestation UTC,
  indépendante du proposant et du type ; count relu dans le tx sous cette clé,
  collaboration/participants/notification atomiques. Refus par CollaborationError
  pour PROPOSED/ACCEPTED/COMPLETED ; CANCELLED autorise une nouvelle ligne,
  sans réactivation, suppression ni transfert des actes et consentements.
- **Annulation** : une décision non validée peut laisser refuser ; nouvel essai
  après commit. Une annulation validée pendant l’attente est relue. Aucun verrou
  d’annulation supplémentaire ni inversion collaboration/work/band.
- **Preuves** : rouge conservé, deux collaborations et deux notifications ;
  17 scénarios PostgreSQL du lot, attentes observées dans pg_locks ; courses de
  création/finalisation, clés distinctes, statuts, annulation et rollback.
  [Preuves](preuves-arch-met-02c.md) et
  [recette](README.md#arch-met-02c--proposition-effective-58-16112026).
- **Migration** : aucune, seul point de création applicatif protégé ; les INSERT
  directs des seeds/fixtures restent des données de scénario. Aucun audit ou
  nettoyage de doublons historiques. **Retour** : revert applicatif cohérent
  conservant les données ; réintroduit R3. R4 et SELF restent distincts.

##### ARCH-MET-03 — extraction limitée et façade stable

- **Fichiers** : propositions `server/works/access.ts`, `queries.ts`,
  `credit-history.ts` ; `works/service.ts` conserve les exports actuellement
  consommés par routes, publicProfile, career/nudges et export RGPD.
- **Contrats** : db fourni par l'appelant, projections autorisées distinctes ;
  aucun cache de permission. Garder les écritures/crédits automatiques et leurs
  effets dans leurs transactions. Ne pas déplacer `CollaborationError` ni créer
  un repository générique pour une simple préférence de classement de fichiers.
- **Migration** : aucune. **Fin/tests** : même payload pour chaque lecteur,
  historique 100 actes / export complet, auteur effacé, perte de gestion ;
  suites works et consommateurs touchés seulement. **Retour** : déplacer les
  fonctions dans la façade avec les mêmes signatures, revert sans SQL.
  Si SELF n'a besoin que d'un helper d'accès, limiter l'extraction à celui-ci.

##### DASH-06a / #51 — premier pas réalisable de DASH-06

**Livré localement le 17/11/2026** (modèle validé par l'utilisateur, D68) :
`WorkStep`/`WorkStepAct`, écran `/morceaux/[id]/etapes`, révision attendue,
seul·e responsable fait avancer, libération par la gestion. Écarts assumés
avec la fiche ci-dessous : fichiers nommés `steps.ts` (et non `stages.ts`, pour ne pas confondre avec
`WORK_STAGES`, les étapes franchies par collaboration) ; pas de projection dans
`lib/activity/` (journal commun hors périmètre, historique propre à
l'étape) ; notes et livrables reportés. Reste de #51 : rien côté critères
d'acceptation ; #52 à #54 restent ouverts. Détail : [morceaux](../morceaux/README.md#étapes-prises-en-charge-dash-06a-d68).

- **Avant de coder** : valider la modélisation exacte proposée dans l'audit,
  puis consigner la règle produit dans conception/decisions. Conserver Work ;
  proposer une ligne d'étape de production par `(workId, kind)` et des actes
  de transition indépendants, sans introduire Project/Task universel. Aucun
  ancien recordedAt ou crédit n'est converti en acte humain.
- **Fichiers/contrats** : nouveaux `lib/works/stages.ts` (transitions/Zod),
  `server/works/stages.ts` (commandes/queries), tests voisins ; façade
  `works/service.ts`, route `/morceaux/[id]`, schéma/migration additive,
  export/anonymisation dans `prisma/actors/person.ts`, projection `lib/activity/`.
  Contrat SELF de la conception 17 : identité serveur, action explicite,
  expectedRevision, même tx ; aucune exigence SOUND_ENGINEER.
- **Persisté** : responsable réel, SELF, HOME privé sans adresse/studio public,
  TODO et dates nulles ; START, COMPLETE confirmé, RESET et REOPEN ; auteur/date,
  révision et acte répétable. Un changement devenu périmé est refusé sans acte ;
  un rejeu sans transition ne multiplie rien. Durée et modalités de conservation,
  droits de lecture et cascades définis avant migration.
- **Fin** : tout #51, dont accès gestion individuel/groupe, relecture après
  attente, idempotence et concurrence. Ce premier lot ne remplit pas #52–#54 :
  tant que #53 n'est pas livré, afficher l'état autonome séparément, sans annoncer
  que le parcours global enregistré/journey/suggestions est déjà achevé.
- **Tests** : transitions pures, révision périmée, course COMPLETE/REOPEN,
  perte de gestion/tiers, échec d'acte avec rollback, export complet, anonymisation
  et cascade ; E2E Thomas sans métier du son, rechargement et HOME privé.
- **Retour** : désactiver les nouvelles actions/lecture puis revert compatible
  en conservant tables/actes ; aucune suppression des données collectées.

##### DASH-06b / #52 — enrichissement de ses propres rôles

- **Fichiers** : `works/rules.ts`, `server/works/service.ts` et helper crédit
  interne si utile, route morceau, modèle d'actes, `activity/`, export/RGPD.
- **Contrat/fin** : ajouter RECORDING/MIXING/etc. à son contributeur existant
  sous verrou work, clé rôle/instrument, pas de doublon ; acte répétable propre,
  pas ASSIGNED initial rejoué. Pas de nouveau consentement aux rôles d'autrui
  déduit de confirmedAt. Si #52 couvre des ajouts à autrui, les découper avec
  accord explicite avant leur livraison ; pas d'extension silencieuse.
- **Migration** : additive selon modèle retenu pour l'acte ; choisir l'unicité
  par transition et préserver WorkCreditAct/périodes existantes. **Tests** :
  ajout manuel/automatique concurrent, crédit en attente, plafonds, rejeu,
  absence d'XP de composition, journal privé/export/anonymisation et rollback.
- **Retour** : supprimer les actions nouvelles, garder rôles et actes lisibles ;
  ne pas restaurer une contrainte période/type empêchant les répétitions.

##### DASH-06c / #53 — production déclarée et preuve indépendante

- **Fichiers** : `server/works/journey.ts`, nouvelle query de production sous
  works, `server/career/nudges.ts`, règles pures journey/nudges, lectures de
  `workPage`, événements/core uniquement si contrat d'événement distinct requis.
- **Contrat** : une query explicite réunit réalisation autonome et faits acquis
  par collaboration ; décider la projection des dates Work avec provenance.
  DONE personnel vaut DECLARED ; réouverture ne détruit aucune preuve ou date
  issue d'une collaboration confirmée. Aucun collaboration.completed artificiel.
- **Migration** : éventuelle provenance additive, aucune reprise historique
  transformée en acte. **Fin/tests** : cohérence détail/journey/carrière,
  mélange autonome + collaboration, réouverture/transfert, succès existants
  audités sans gain abusif ; SELF attribué/DONE ne devient pas besoin implicite
  de recrutement, recherche volontaire d'aide conservée ; mixage proposé selon
  état réel. Test d'absence d'événement/gain bilatéral et de preuve indépendante.
- **Retour** : replier les projections nouvelles, garder actes et preuves
  acquises, ne pas remettre les dates à null ni recalculer l'XP depuis le journal.

##### DASH-06d / #54 et suite de #36

- **Fichiers** : `/espace`, `/morceaux`, `/morceaux/[id]`,
  `e2e/linkmusician/`, `prisma/seed-scenarios.ts`, aide et démo aux chemins
  réellement utilisés par le dépôt. Aucun nouveau modèle dans le lot de recette.
- **Fin/tests** : parcours Thomas complet #54, unicité crédit, persistance,
  privé HOME, réouverture, tiers/membre refusés, absence de faux gain/preuve ;
  390 px, clavier, axe ; garder collaborations et parcours métier voisins.
  Contrôle de types hors E2E, scripts du dépôt ; migration aucune attendue.
- **Retour** : revert UI/fixtures cohérent sans effacer données réelles ;
  aide/démo ne présentent jamais un parcours replié comme encore utilisable.
- **Après** : #36 exige encore affectation à membre avec accord et autorité
  limitée, prestataire externe, versions/livrables/approbations invalidées à la
  modification. Découper chacun avec ses mutations, actes répétés, droits,
  migration additive éventuelle, tests de concurrence/consentement/RGPD et
  retour applicatif conservant les données. Ne pas déclarer #36 terminé par SELF.

##### DASH-07a / #37 — droit de candidater ✅ (publié : ad36147)

- **Décision** : D71, [conception 18](../conception/18-candidature-deleguee.md).
- **Livré** : `ApplicationGrant` et `ApplicationGrantAct` (migration additive
  `20261117150401_application_grants`), demande par l'agent titulaire,
  accord ou refus par l'artiste majeur·e ou la gestion majeure du groupe,
  retrait et révocation, état lu à la date, page
  `/accompagnement/[id]/candidatures`, notification `APPLICATION_GRANT`, export
  et anonymisation, démo Élise → Fanfare Pirate, aide « Candidater pour un·e
  artiste ». Aucune candidature n'est encore envoyée par ce droit.

##### DASH-07b / #37 — candidature déléguée ✅ (local)

- **Dépend** : DASH-07a.
- **Livré** : depuis une annonce (plateau pour un groupe ; jam ou session
  pour une personne), « Candidater au nom de » pour l'agent qui a un droit
  actif ; dans la transaction : `lockGrantPair` puis verrou de l'annonce,
  `usableGrant`, mêmes conditions que la candidature directe sur l'artiste
  (`eligibilityFor`, `checkBand`, blocages avec l'artiste **et** l'agent,
  visibilité), doublon, acte `USED` avec `applicationId`. `applicantActorId` =
  artiste, `sentById` = agent. Notification de l'artiste (ou de sa gestion),
  candidature visible « envoyée en ton nom par … », retrait par l'artiste sous
  verrou avec auteur. À l'acceptation, conversation avec l'agent, réciprocité
  sans XP pour personne (marquer la conversation déléguée). `RECRUIT_MEMBER`
  refusé. Retraits existants passés sous verrou avec auteur.
- **Tests** : intégration (droit absent, révoqué, échu, hors type ; course
  révocation contre envoi ; mineur·e ; groupe ; doublon artiste/agent ; aucune
  XP), E2E 390 px, clavier, axe, POST forgé.
- **Recette (17/11/2026)** : `check` 0 erreur ; ESLint et Prettier propres sur
  les fichiers du lot ; unitaires 1432 ✓ ; intégration opportunités,
  représentation et messagerie 70 ✓ ; E2E `candidature-deleguee`,
  `droit-de-candidater`, `candidatures`, `annonces`, `annonces-metier`,
  `annonces-qualifiees`, `messagerie` ✓. Correctif de test : `candidatures`
  attend la fin du toast avant le scan axe (contraste faussé pendant le fondu,
  aléa antérieur au lot). Migration appliquée aux schémas `public` et `e2e`.

##### DASH-20a / #50 — recette transverse, première tranche ✅ (local)

- **Dépend** : ONB-14 (#28), P5-07, DASH-07a/b. Ne remplace pas la recette
  continue de #50.
- **Choix des parcours** : les deux plus courts parmi ceux de #50 encore
  absents, manager + artiste et booker + groupe (avec une organisatrice
  tierce). Groupe + lieu et projet + prestataire passent en DASH-20b.
- **Livré** (`e2e/linkmusician/recette-transverse.spec.ts`, 4 tests) :
  premier résultat dont les données de page (`__data.json`) ne portent que la
  tranche de distance ; carnet de jams d'un·e mineur·e (page, données et
  préchargement en 200, axe) ; manager + artiste (artiste mineur·e refusé·e,
  manager mineur sans formulaire et POST `propose` en 403, POST forgés d'un
  tiers sur `answer` et `end` en 403, l'agent ne confirme pas sa propre
  proposition, confirmation à 390 px au clavier avec axe et sans débordement,
  fin par l'artiste) ; booker + groupe (groupe géré par une mineure seulement :
  pas de proposition ; gestion mixte : seule l'adulte est notifiée et voit la
  proposition ; POST forgés de la mineure, de l'organisatrice et du booker en
  403 ; confirmation à 390 px, axe). Les contextes navigateur
  supplémentaires reçoivent chacun leur IP (limiteur d'inscription).
- **Défauts trouvés et corrigés** (chacun reproduit par un test, en échec
  avant la correction) :
  1. **Distance en mètres dans la page** : `nearbyMusicians` envoyait
     `meters` (par exemple `801.76`) dans les données de
     `/demarrer/resultat`, lisibles par le client. Il n'envoie plus que
     `distance` (`distanceBand`) ; `DistanceTag` reçoit une tranche, plus
     des mètres (maquettes `_lab` alignées).
  2. **Gestion mineure sollicitée (Q48)** : un groupe géré seulement par
     des mineur·es recevait les propositions de managers et de bookers, que
     personne ne pouvait confirmer ; la mineure d'une gestion mixte était
     notifiée, voyait la proposition et ses termes, et un bouton
     « Confirmer » voué au 403. `adultAnswerersOf` filtre désormais la
     gestion majeure pour proposer, notifier et confirmer ;
     `representationsForMe` et `pendingRepresentationCount` ne montrent une
     proposition qu'à une personne majeure. Une mineure de la gestion voit
     l'accompagnement confirmé et peut y mettre fin. Test d'intégration
     « seule la gestion majeure est sollicitée ».
- **Analysé, non corrigé** : `preload_data_failed` sur `/jam/carnet`
  (piste d'ONB-14) : reproduit uniquement quand le compte est supprimé
  pendant que la page reste ouverte (démontage de la fixture `account`). La
  garde du layout redirige (302), aucune donnée ne sort ; la page lit
  `locals.user!` en parallèle et journalise une ERROR. 46 pages ont ce
  motif : T9 dans `a-trancher.md`.
- **Recette** (17/11/2026, `--retries=0`) : `recette-transverse` (4),
  `booker`, `droit-de-candidater`, `candidature-deleguee`, `delegations`,
  `agences`, `inscription-transverse` (7), `onboarding`, `suggestions` :
  17/17. Intégration représentation (4 fichiers, 42 tests). `check`
  0 erreur, 1 445 unitaires, ESLint et Prettier sur les fichiers du lot.
- **Reste pour DASH-20b** : groupe + lieu (plateau, candidature au nom du
  groupe, POST forgé d'un non-membre, mineur·e du groupe), projet +
  prestataire, concurrence et révocation pendant une attente, export et
  anonymisation dans les parcours, extensions #51–#54 au fil des
  livraisons.

##### DASH-20b / #50 — recette transverse, deuxième tranche : groupe + lieu ✅ (local)

- **Dépend** : DASH-20a, P5-03b (un lieu publie ses dates), P5-05a/b
  (plateaux, candidature au nom du groupe), DASH-07a/b.
- **Périmètre** : groupe + lieu de bout en bout. Le lieu publie une date. Le
  groupe candidate par sa gestion majeure. Les POST forgés d'un non-membre,
  d'un MEMBER sans gestion et d'une co-gestionnaire mineure sont refusés, de
  même que ceux d'un tiers sur l'acceptation. Restent à vérifier un retrait de
  gestion pendant l'attente, une acceptation à 390 px avec axe, et l'export
  RGPD de la personne qui a envoyé la candidature.
- **Hors périmètre, passe en DASH-20c** : projet + prestataire (session
  d'ingé son, crédit).
- **Critères** : aucun contournement côté serveur (codes 403/404, aucune
  ligne créée) ; aucune duplication avec `organisateur.spec.ts` ni avec
  `gigSlots.integration.test.ts`. Tout défaut trouvé est reproduit par un
  test en échec avant sa correction.
- **Livré** (`recette-transverse.spec.ts`, 5ᵉ test). Le lieu publie une date
  depuis sa gestion. Une tierce, un MEMBER sans gestion et une co-gestionnaire
  de 17 ans forgent `applyBand` : 403, aucune ligne créée, et la mineure voit
  pourquoi. Malik (co-gestion) candidate au nom du groupe et le lieu est
  notifié. Une tierce forge `accept` (404) ; une tierce et le MEMBER forgent
  `withdrawBand` (403). Léa retire la co-gestion à Malik **pendant
  l'attente** : son `withdrawBand` répond 403 et il ne voit plus le groupe sur
  le plateau. Paul accepte à 390 px (axe, aucun débordement) : la
  conversation s'ouvre avec Léa, seule notifiée. L'export de Malik contient la
  candidature envoyée, acceptée ; après l'effacement de son compte, la
  candidature reste au groupe (`sentById` oublié) et le lieu la voit toujours.
- **Défaut trouvé et corrigé** (reproduit par l'intégration et par l'E2E,
  tous deux en échec avant la correction). Une personne qui ne gérait plus le
  groupe pouvait encore **retirer** sa candidature, puisque `sentById`
  suffisait, et l'acceptation ouvrait la conversation **avec elle**. Si son
  compte avait été effacé, l'acceptation devenait impossible alors que le
  groupe ne pouvait plus recandidater. Désormais, `withdrawApplication` ne
  retient `sentById` que pour une candidature déléguée (l'agent).
  `decideApplication` passe, pour un plateau, par `bandContact` : l'expéditeur
  s'il gère encore le groupe et est majeur, sinon la gestion majeure restante
  (responsable d'abord, puis la plus ancienne), sinon un refus. Défaut
  appliqué : Q72. Conception 08 (plateaux) et 18, aide « Les plateaux »
  mises à jour. Démo inchangée : le cas ne se joue qu'au moment d'une
  révocation.
- **Recette** (17/11/2026, `--retries=0`) : `recette-transverse` 5/5 ;
  `organisateur`, `organisation-organisateurs`, `lieu-fiche`, `concerts`,
  `groupes`, `candidature-deleguee`, `delegations`, `candidatures` et
  `droit-de-candidater` : 9/9. `gdpr-data` : 2 échecs **antérieurs**,
  reproduits sur HEAD sans le lot (T10). Intégration `opportunities`,
  `bands` et `representation` : 11 fichiers, 121 tests. `check` 0 erreur,
  1 445 unitaires, ESLint et Prettier sur les fichiers du lot.
- **Reste pour DASH-20c** : projet + prestataire (session d'ingé son,
  crédit), concurrence (deux acceptations simultanées dans un parcours), et
  les extensions #51–#54 au fil des livraisons.

##### Réutilisation dans les modules métier

Impacts détaillés de #30, #36/#37, #41–#50 et #51–#54 :
[conception 17 §8](../conception/17-audit-capacites-services.md#8-suite-dépendances-et-réception).
#41–#46 consomment progressivement les mêmes projets/tâches/versions/actes,
avec leurs gardes propres. #42/#43 gardent DASH-09/10, #44/#45 les nouveaux
pouvoirs de candidature/booking ; #46 les limites événement/lieu. #37 attend
ONB-13b/#27 et, pour duo/reprises, ONB-12c/#26 ; ces critères ne sont pas requis
pour SELF. #50 et ONB-14/#28 restent une recette continue, jamais remplacée par
une matrice documentaire. #47–#49 restent bientôt après décision distincte.
#35 et #30 restent ouverts ; aucun WorkPitch/option créé pour les clôturer.
