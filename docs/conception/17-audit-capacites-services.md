# 17 — Audit des capacités et services métier (ARCH-MET-01, #55)

Audit documentaire du 15/11/2026. **Aucune refactorisation ni fonctionnalité
produit livrée par ce document.** Les contrats et lots proposés demandent
validation puis réalisation dans des issues séparées. Le monolithe modulaire
SvelteKit, ses façades et ses référentiels restent le cadre.

## 1. Base, méthode et limites de preuve

Départ propre sur `main`, HEAD `b0dadf2e96087a26383c1805347be4c2eb815f83`.
`git ls-remote origin refs/heads/main`, puis `git fetch origin main` confirment
le même distant : **DASH-05m (`5c7f706`) et sa préparation (`b0dadf2`) sont
publiés**. La mention « m local » du prompt et des issues au démarrage est
périmée. Ce lot ajoute ensuite un commit documentaire local, sans push.

L'application de la migration `20261115154332_work_credit_acts` en développement
et E2E est une preuve rapportée de DASH-05m, non rejouée ici. Ni publication
GitHub ni migration appliquée dans ces environnements ne prouvent un déploiement
applicatif ou une migration de production.

Sources relues : `CLAUDE.md`, `CONTRIBUTING.md`, plan et questions ouvertes,
conceptions 03, 06, 08, 10–16, documents morceaux, collaborations, structures,
onboarding et recherche. Issues et commentaires #14, #26–#30, #35–#37, #41–#55
consultés au 15/11/2026. #29 est clos pour son **audit produit** ; #26, #27 et
#28 gardent des critères non réalisés. Les anciens bilans de conception 06/08
ne décrivent pas à eux seuls la disponibilité actuelle.

Méthode : routes → services appelés → règles et requêtes → schéma/migrations →
tests existants. Les tests cités ci-dessous sont **lus, pas exécutés dans ce
lot**. Les résultats de DASH-05m dans le suivi restent des résultats antérieurs.
Pas de migration, seed, tests, E2E ou contrôle de types relancé : aucun code
exécutable modifié. Les contrôles de ce lot sont documentaires et statiques.
Ce n'est ni un audit de sécurité complet ni une mesure de performances en charge.

## 2. Vocabulaire et sources de vérité

| Notion                  | Source actuelle                                                                          | Ce qu'elle ne prouve pas                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Métier déclaré          | `actors/tracks.ts`, `PersonTrack`, principal et contexte de navigation distincts         | Compétence, autorisation sur un projet ou consentement                                 |
| Compétence / spécialité | Instruments, genres, `actors/specializations.ts`, profils son/production                 | Offre active, preuve indépendante, droits d'auteur                                     |
| Offre / besoin          | `actors/catalog/`, `PersonTrackIntent`, direction OFFER/NEED et codes par métier         | Commande, engagement contractuel ou mandat                                             |
| Capacité fonctionnelle  | Action existante d'un service, par exemple créditer ou terminer un mandat                | Permission accordée à chaque personne qui voit un menu                                 |
| Permission contextuelle | Propriété, adhésion active, mandat/délégation et garde propre à l'action                 | Compétence professionnelle ou accord personnel d'un tiers                              |
| Responsabilité de tâche | **Pas de modèle de tâche de production actuellement** ; cible #51                        | Crédit, métier, preuve ou droit de gestion global                                      |
| Crédit                  | `WorkContributor`, `WorkRole`, confirmation personnelle ou origine automatique existante | Tâche terminée, part de composition pour un rôle du son, clearance juridique           |
| Consentement            | Dates et auteurs des accords réellement conservés ; conditions propres au circuit        | Une attribution par gestion, un changement de rôle décidé par autrui, une notification |
| Preuve indépendante     | Collaborations confirmées, attestations et règles des étapes                             | Auto-déclaration, XP, journal d'actes ou libellé « professionnel »                     |
| Progression             | `DomainEvent`, règles pures, `XpTransaction`, projections                                | Droit, preuve, compétence ou critère de tri                                            |

Les chemins abrégés `actors/`, `works/`, etc. de ce document sont relatifs à
`src/lib/`, sauf mention `server/` ou autre racine. Les symboles cités sont des
points de recherche stables ; les liens de fichiers de la section 3 ouvrent les
sources. Les noms de fichiers **proposés** sont explicitement signalés.

## 3. Cartographie vérifiée des chemins disponibles

**D** = disponible dans le code ; **P** = partiel, avec limite ci-dessous ;
**F** = futur, aucun parcours complet à présenter comme jouable.

| Capacité et état                            | Route → appels / données                                                                                                                                                                        | Règles, tests et limites                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Multirôle **D**                             | `/qui-es-tu`, `/reglages/metiers` → [tracks.ts](../../src/lib/prisma/actors/tracks.ts) `setPersonTracks` ; `Actor`/`Person` uniques, `PersonTrack` multiples                                    | Sélection normalisée, un principal, transaction Serializable avec trois tentatives ; synchro legacy ensuite, hors transaction. `actors/actors.test.ts`, `onboarding-metiers.spec.ts`. Retirer un métier ne supprime pas le registre XP.                                                                                                                |
| Fiches, spécialités, offres/besoins **D/P** | `/demarrer/metier/[slug]`, `/profil/metier/[slug]`, `/profil/pratique`, pages son/production/organisateur → `server/actors/trackStep.ts`, `prisma/actors/specializations.ts`, `prisma/crafts/`  | `actors/catalog/`, `trackFields.ts`, `roles.ts` restent les référentiels. `checkFields` et validation serveur. Portfolio/matériel/conditions avancées et visibilité historique rate/gear : ONB-12c/#26 restant, pas un chantier soldé par ce socle.                                                                                                    |
| Visibilité **D/P**                          | `/@handle`, fiches métier → `server/actors/publicProfile.ts`, `trackSheets.ts` → [trackSheet.ts](../../src/lib/actors/trackSheet.ts)                                                            | Trois blocs selon lecteur, conditions privées par défaut, sollicitations null = inconnu. `profil-metiers.spec.ts`, `trackSettings.integration.test.ts`. Les pages historiques ont encore le périmètre #26 ; pas de garantie globale de visibilité par champ.                                                                                           |
| Navigation / priorités **D**                | `/jouer`, `/espace` → `server/actors/navigation.ts`, `server/space/priorities.ts`                                                                                                               | Cookie de contexte ≠ métier principal ≠ permission ; aperçus bornés et filtrés. `navigation-metiers.spec.ts`, `actions-metiers.spec.ts`, `space/priorities.integration.test.ts`. Aucun moteur de tâches derrière le menu.                                                                                                                              |
| Structures et équipes **D**                 | `/structure`, groupes, studios, lieux gérés, organisations, écoles, agences → [organizations/access.ts](../../src/lib/server/organizations/access.ts) et services spécialisés                   | Six types `BAND/STUDIO/VENUE/PROMOTER/SCHOOL/AGENCY` dans `structures/rules.ts`. ACTIVE OWNER/ADMIN pour gestion, MEMBER/élève/collaborateur distincts. Type exact, structure vivante ; invitation, revendication du lieu, majorité, métier, quotas et blocage restent spécifiques. `organizations/access.integration.test.ts`, `structures.spec.ts`.  |
| Mandats / délégations **D/P**               | `/accompagnement`, `/delegations/[id]` → [representation/service.ts](../../src/lib/server/representation/service.ts), `delegations.ts`, `delegationAccess.ts`                                   | CAREER_SUPPORT et BOOKING_CREDIT ; délégation READ_MANDATE, END_MANDATE seulement. Deux accords, périodes précises d'adhésion, durée/territoire/activité, révocation relue. Pas de candidature pour autrui, signature, gestion de morceau ou lecture de conversation par mandat. `delegations.integration.test.ts`, `booker.spec.ts`.                  |
| Morceaux / crédits **D/P**                  | `/morceaux`, `/nouveau`, `/[id]` → [works/service.ts](../../src/lib/server/works/service.ts), `forms.ts`, `works/rules.ts`                                                                      | IDEA/COMPOSED, maquette unique, crédits et rôles libres, composition et faits de production. Gestion propriétaire ou groupe OWNER/ADMIN ; équipe plus large en lecture. Crédit existant refusé par `creditPerson`, pas d'édition manuelle des rôles existants (#52). `service.integration.test.ts`, `history.integration.test.ts`, `morceaux.spec.ts`. |
| Collaborations **D**                        | `/messages/[id]` → [collaborations/service.ts](../../src/lib/server/collaborations/service.ts) `propose/respond/confirm/cancel`, `endorse.ts`                                                   | Deux personnes, conversation acceptée, contrôle du prestataire par métier pour les services concernés, achèvement confirmé, liaison morceau/studio/concert. Ne convient pas à SELF. `work.integration.test.ts`, `history.integration.test.ts`, `gigs.integration.test.ts`, `collaborations-morceau.spec.ts`.                                           |
| Parcours de production **P**                | `/morceaux/[id]` → [works/journey.ts](../../src/lib/server/works/journey.ts), `workPage.stages` ; carrière → `server/career/nudges.ts`                                                          | Dates Work mises par collaborations terminées ; journey lit aussi ces collaborations. Aucun SELF/HOME/TODO/IN_PROGRESS/DONE. Versions approuvées, livrables de tâche et revalidation #36 : **F**.                                                                                                                                                      |
| Opportunités / candidatures **D/P**         | `/annonces`, `/plateaux` → [opportunities/service.ts](../../src/lib/server/opportunities/service.ts), `applications.ts`, `gigSlots.ts`                                                          | Candidature personnelle, recrutement de membre, candidature d'un groupe géré à GIG_SLOT, acceptation et conversation existent. `targeted.integration.test.ts`, `recruitment.integration.test.ts`, `gigSlots.integration.test.ts`. Conditions qualifiées #27 et candidatures déléguées/étapes/propositions #37 restent à faire.                         |
| Notifications / historique **D/P**          | `/notifications`, `/structure/historique`, `/morceaux`, journal dans `/messages/[id]` → [notifications/service.ts](../../src/lib/server/notifications/service.ts), `activity/`, lecteurs métier | `notify(db, input)`, préférences, blocages, pas d'auto-notification ; digest séparé. Historique minimal privé ≠ file de tâches ni source de permissions. Couverture journal a–m, options/propositions et nouveaux actes futurs restant #35.                                                                                                            |
| Recherche **D/P**                           | `/decouvrir` → [search/musicians.ts](../../src/lib/server/search/musicians.ts), `search/filters.ts` ; suggestions et nudges distincts                                                           | Offres exigées hors MUSICIAN, spécialités, remote/références, visibilité et blocages ; PostGIS qualifié et distances par tranches. Recherche, découverte de pairs et coups de pouce n'ont pas le même contrat (#27/#37). `musicians.integration.test.ts`, `recherche.spec.ts`.                                                                         |
| Progression / carrière **D/P**              | `/espace`, objectifs, carte → [progression/processor.ts](../../src/lib/server/progression/processor.ts), `core/`, `career/`                                                                     | Le cœur reste pur ; ledger en ajout seul et projections. Cartes/rangs fondés sur faits, pas sur XP. Extensions autonomes #53 et futurs métiers restent à réaliser. `core/personas*.test.ts`, `progression.integration.test.ts`, `carriere.spec.ts`.                                                                                                    |

Les tests navigateur cités sont dans `e2e/linkmusician/`. Aucun modèle `Task`
ou `WorkPitch` n'est défini dans `prisma/schema.prisma`. Les objectifs de
carrière et rôles à pourvoir existent mais n'ont ni responsable de tâche,
versions approuvées ni cycle de validation de livrable. Les champs de catalogue
« home studio » décrivent un profil : ils ne stockent pas le lieu d'une tâche.

### Matrice métier × capacité × service partagé × règle spécifique

Chaque ligne distingue le socle utilisable de la capacité future. Les fonctions
communes de profil, recherche, messages, notifications et progression ci-dessus
sont réutilisées ; elles ne sont pas neuf implémentations indépendantes.

| Métier (ouverture réelle) | Capacités D/P et F                                                                                                                | Services communs à réutiliser                                                                   | Règle spécifique conservée                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MUSICIAN — ouvert         | D : pratique, groupes, morceaux/crédits, jams, candidatures ; F : tâches personnelles de production                               | `works`, `bands`, `opportunities`, `jam`, `career` ; futur service de tâches de #36             | Instruments exigés seulement pour ce parcours ; crédit du son possible sans SOUND_ENGINEER, sans devenir auteur/compositeur ni tiers indépendant                              |
| SOUND_ENGINEER — ouvert   | D : profil, références, studios, collaborations/crédits du son ; F : devis, versions et approbations                              | `prisma/crafts`, `studios`, `collaborations`, `works` ; tâches #36, prestations DASH-09         | Contrôle du métier pour être prestataire dans la collaboration existante ; pas une obligation professionnelle pour SELF ; ingénieur membre du groupe ≠ validateur indépendant |
| PRODUCER — ouvert         | D : profil, références, collaborations production, crédits ; F : catalogue beats/licences et projets EP/album complets            | Même pipeline `works/collaborations`, références communes ; catalogue DASH-10                   | Production et arrangement distincts ; rôle du son ne donne pas de part d'auteur ; disponibilité d'un beat et licence restent déclaratives                                     |
| MANAGER — ouvert          | D : accompagnement, agence, affectation consentie ; F : tâches de carrière, candidature déléguée                                  | `representation`, `agencies`, `career`, puis #36/#37                                            | Majorité, artiste consentant, CAREER_SUPPORT ; aucune permission d'écriture projet ni candidature induite par le seul mandat                                                  |
| BOOKER — ouvert           | D : mandat borné, attribution Booké par, tournée constatée ; F : options, négociations, itinéraires                               | `representation`, `opportunities/gigSlots`, `collaborations`, `milestones`                      | BOOKING_CREDIT à la date/territoire ; concert joué confirmé par parties distinctes ; le booker ne remplace pas l'artiste ou l'hôte                                            |
| PROMOTER — ouvert         | D : organisation, plateau, lieu revendiqué, séries/jams et concert ; F : festival multi-scènes, budgets et délégation d'événement | `organizations`, `venues`, `jam/series`, `opportunities`, `collaborations` ; tâches futures #36 | Lieu ≠ personne ≠ événement ; majorité/gestion selon action ; gestion d'un événement futur ne devra pas donner administration du lieu                                         |
| LABEL_PRO — bientôt       | D : catalogue déclaratif et fiche de base ; F : A&R, roster, sorties et signature                                                 | Hypothèse : profils/référentiels, projets #36, catalogue DASH-10                                | Notes A&R privées ; relation déclarée ≠ contrat vérifié ; pas d'Organization LABEL actuelle à prétendre opérationnelle (#47)                                                  |
| PUBLISHER — bientôt       | D : catalogue déclaratif et fiche de base ; F : œuvres/coédition, sync et placements                                              | Hypothèse : référentiels, tâches/versions #36 et soumissions futures                            | ISWC ≠ ISRC ; créateur de fiche ≠ propriétaire ; autorisation de soumettre ≠ clearance (#48)                                                                                  |
| MUSIC_COMMS — bientôt     | D : catalogue déclaratif et fiche de base ; F : missions/campagnes/contenus approuvés                                             | Hypothèse : profil, tâches/versions #36, prestations/catalogue futurs                           | Données presse privées, droit technique ≠ droit juridique de publier ; aucune activation implicite (#49)                                                                      |

Un métier bientôt peut être déclaré pour mesurer la demande ; son catalogue
ne constitue ni une structure de ce métier ni son outil professionnel. Le
`available: false` de `TRACKS` doit rester inchangé jusqu'à décision produit.

## 4. Responsabilités, doublons et couplages mesurés

### Mesures statiques et cycles

Sur la base `b0dadf2`, analyse avec l'AST TypeScript installé : fichiers `.ts`
de `src/lib`, hors `.test.ts`, `.spec.ts` et `.d.ts` ; résolution locale des
imports/exports statiques relatifs et alias `#lib/` et `#server/`, avec fichier
ou index. **520 fichiers, 1 198 arêtes distinctes par fichier**, types compris.
Après exclusion des déclarations `import type` / `export type` : **1 094 arêtes,
aucun cycle trouvé**. Cela exclut les `.svelte`, autres alias, paquets externes,
imports dynamiques et dépendances de données ; pas de preuve d'acyclicité globale.

Deux composantes cycliques existent dans le graphe comprenant les types :

- `actors/specializations.ts` → `catalog/index.ts` → catalogues →
  `catalog/helpers.ts` ou `catalog/types.ts` → **import type IntentInfo** depuis
  `specializations.ts` (14 fichiers dans la composante) ;
- `venues/rules.ts` → `venues/siret.ts` → **import type VenueKindValue** depuis
  `rules.ts` (2 fichiers).

Ces retours sont effacés à l'exécution. Pas de cycle exécutable démontré entre
`works/service.ts` et `collaborations/service.ts` : collaboration importe works,
works n'importe pas collaboration. Déplacer un type peut simplifier les contrats,
mais ne résout pas un défaut d'exécution constaté ; priorité faible.

| Mesure AST                                          | `server/works/service.ts`                             | `server/collaborations/service.ts`                                                      |
| --------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Lignes physiques (séparateur final compris)         | 1 163                                                 | 805                                                                                     |
| Déclarations de fonctions avec corps                | 37                                                    | 14                                                                                      |
| Dépendances locales statiques distinctes            | 13                                                    | 13                                                                                      |
| Fonctions les plus longues, signature/corps compris | `workPage` 162, `creditPerson` 105, `markComposed` 59 | `proposeCollaboration` 170, `settle` 105, `gigPartiesOfPair` 90, `collabFormContext` 87 |

Ce ne sont pas des seuils d'extraction. `workPage` est surtout une sélection
Prisma et une projection de visibilité ; `settle` enchaîne plusieurs mutations
et émissions sur des ensembles d'acteurs différents. Le second a un risque
transactionnel plus élevé malgré moins de lignes. Pas de chiffre de complexité
cyclomatique ou de fragilité globale des tests inventé : T1/T2 et P0-01 restent
les réserves de recette existantes, pas une conséquence démontrée de la longueur.

### Constats exploitables

| ID  | Preuve concrète                                                                                                                                                                             | Responsabilité et conséquence                                                                                                                                   | Traitement proposé                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `works.canManage` relit ACTIVE OWNER/ADMIN ; `manageableWorks` recopie le prédicat ; `bands.requireManager` passe par `structureAccess`                                                     | Politique d'accès écrite sous plusieurs formes (ponctuelle et liste). Ni mandat ni crédit ne doivent élargir ces droits.                                        | Extraire une politique works testée, utilisable en transaction ; conserver les différences lecture équipe / gestion / public.                                               |
| C2  | `studios.answerStudioInvite` et `organizations/comanagement.answerInvite` : état INVITED, relecture de l'invitant, décision et notification ; départ/succession analogues                   | Duplication réelle de séquences, mais `studio:` ≠ `org:`, métiers et publication/quota différents. Agence et groupe ont encore d'autres règles.                 | Garder pour l'instant ; extraction limitée à un helper de décision déjà prouvée identique si une évolution le justifie. Aucun moteur générique Membership.                  |
| C3  | `works.authorProgress`, `markComposed` et `collaborations.settle` appellent `emitAndProcess`, `syncComposition` ou vérifications d'étapes ; `settle` écrit aussi directement les dates Work | Orchestration croisée entre état, preuve, crédits et progression ; un simple déplacement de fonction peut changer l'ordre des verrous.                          | Contrats internes avec le même `tx`, orchestration conservée à un seul niveau, lot de concurrence préalable §5.                                                             |
| C4  | `works.workPage`, `publicWorksOf`, `creditActsFor` sélectionnent/projettent des données ; `prisma/actors/person.ts` appelle `worksExport` et de nombreux lecteurs métier                    | La couche nommée prisma orchestre aussi l'export et l'anonymisation : la règle cible de 03 « pas d'accès aux tables d'autrui » n'est pas appliquée strictement. | Accepter ce point d'intégration RGPD explicite ; ne pas créer un repository pour chaque table. Extraire des queries seulement là où elles permettent une politique commune. |
| C5  | `publicActorWhere` et SQL `search/musicians.ts` réécrivent hidden/deleted/suspension/blocages ; SQL ajoute onboarding et critères d'offre                                                   | Risque de divergence de filtres, pas de doublon fonctionnel exact.                                                                                              | Tests de parité ciblés ; ne pas convertir aveuglément une condition Prisma en SQL générique.                                                                                |
| C6  | `career/nudges.ts` lit profils legacy son/production ; `/decouvrir` exige des offres et visibilité du bloc métier                                                                           | Un coup de pouce réseau n'est pas une offre commerciale trouvée. Absence de tâche SELF rend l'enregistrement toujours suggérable tant que recordedAt est nul.   | #53 doit lire la prise en charge réelle ; auditer séparément le filtre d'offre des suggestions, sans prétendre que #27 couvre déjà tous les lecteurs.                       |
| C7  | `proposeCollaboration` et `collabFormContext` déclarent chacun un `tracksOf` ; mêmes lectures PersonTrack                                                                                   | Petit doublon local, sans enjeu nécessitant un framework de capacités.                                                                                          | Helper privé dans le même module lors d'une évolution ; pas de lot bloquant seul.                                                                                           |
| C8  | Commentaires « seul point d'écriture » dans works/bands, mais `collaborations.settle`, RGPD, autres structures écrivent les mêmes tables                                                    | Façade d'usage distincte de propriété physique exclusive des tables.                                                                                            | Documenter les exceptions ; interdire de nouveaux appels directs au rôle/crédit depuis des routes métier parallèles.                                                        |

## 5. Transactions, événements, verrous et registres

### Ordres réellement observés

Les verrous sont transactionnels PostgreSQL ; ils protègent uniquement les
chemins qui prennent la même clé. Une lecture après verrou ne sérialise pas
un changement de blocage, profil ou adhésion qui emploie une autre clé.

| Circuit                                   | Ordre observé / frontière                                                                                                      | Garantie et limite                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Crédits manuels, composition, suppression | `work:` → mutations et moteur ; `syncComposition` prend `band:`                                                                | Transition et WorkCreditAct dans le même tx ; ce n'est pas un ordre global work → band → acteurs sur tous les chemins.                   |
| Collaboration liée, réponse/confirmation  | `load` : `collaboration:` → `work:` puis relecture avant écriture participant/collaboration ; `settle` → moteur/crédits/étapes | Correction m conservée, y compris suppression concurrente mettant workId à null. `creditFromCollaboration` reprend work dans le même tx. |
| Concert                                   | `collaboration:` → work si présent → `band:` avant progression de `settle`                                                     | Le groupe protège les validations du concert/mandat ; hostOrg, profils et toutes les adhésions ne sont pas verrouillés globalement.      |
| Appréciation / reprise                    | `collaboration:` → acteurs de l'événement → mutation/registre/notification dans tx                                             | Reprise possible après blocage ; attribution garde ses gardes. Aucun work nécessaire.                                                    |
| Groupes / étapes                          | `band:` avant mutations et événements ; `afterJoin` peut émettre plusieurs événements                                          | Chaque événement trie ses acteurs ; l'union de tous les acteurs de la transaction n'est pas préverrouillée.                              |
| Mandat                                    | `band:<artistId>` (aussi pour personne) → `rep:<agent>:<artist>` ; proposition ajoute `rep-agent:`                             | Relecture droits/périmètre après attente ; délégation : artiste puis `org:<agency>` ; fin déléguée conserve cet ordre.                   |
| Agence / co-gestion / école               | `org:` ; création agence `agency-owner:`                                                                                       | Autres clés : studio emploie `studio:`, jamais à remplacer silencieusement par org. Les clés protègent leurs propres transitions.        |
| Moteur                                    | `processEvent` trie `actorIdsOf(event)`, verrous sur `hashtext(actorId)`                                                       | Ordre stable **pour cet événement**. Verrous gardés jusqu'au commit ; nouvel événement peut demander un autre acteur.                    |

**R1 — inversion préexistante possible, démontrée par les appels, interblocage
non reproduit ici.** `works.authorProgress` émet work.composed (acteurs) puis
appelle `milestones.syncComposition` (band). `markComposed` suit aussi cette
séquence lorsqu'il corrobore. En face, `bands.afterJoin` tient band avant
membership.accepted (acteur personne + groupe). Une transaction de composition
peut donc tenir l'acteur qu'une entrée attend tout en attendant son band.
`collaborations.settle` peut également appeler verifyRecordingFromCollaboration
qui prend band **après** un premier passage moteur. Un tri des acteurs par
événement ne suffit pas non plus pour deux événements d'une transaction dont
les ensembles d'acteurs diffèrent. À caractériser avant d'ajouter des effets
aux nouvelles tâches ; ne pas déclarer DASH-05m exempt de tout interblocage.

**R2 — droits de gestion et réglages concurrents.** `works.requireManage` relit
l'adhésion sous work, tandis que les rôles/départs de groupe sont sous band.
Une révocation peut être validée entre la lecture et le commit. Plusieurs
contrôles de cible (profil, blocage, mineur) sont avant le tx. `setDemo` contrôle
les droits puis ajoute/choisit le média et écrit Work sans work commun ;
`removeOpenRole` a un DELETE conditionnel sans ce verrou. Aucun nouveau contrat
ne doit leur attribuer une garantie qu'ils n'ont pas. Scénarios à programmer,
pas contournement établi de toutes les permissions ni correction livrée ici.

**R3 — doublon concurrent à la proposition.** `proposeCollaboration` fait un
count conversation/jour/statuts actifs avant son tx de création. Le schéma
Collaboration n'a qu'un index conversation, pas d'unicité correspondante.
Deux propositions peuvent passer le contrôle simultanément. L'idempotence du
ledger sur un même sourceEventId ne déduplique pas deux collaborations ou
deux événements distincts. Définir la clé de l'intention et le comportement des
annulations avant d'ajouter verrou/contrainte dans une issue de correction.

**R4 — relecture et effets après plusieurs événements.** `processEvent` lit
processedAt avant ses verrous d'acteur. Le ledger utilise skipDuplicates et
l'unicité `(sourceEventId, ruleId, actorId, track)` ; cela ne démontre pas une
exécution unique de tous les recalculs/effets du processeur. La transaction
commune protège le rollback des écritures SQL ; pas de livraison exactement
une fois universelle ni de bus asynchrone déjà opérationnel à annoncer.
`notify` n'a pas de clé métier générale de déduplication. Préserver les gardes
par transition et les appels uniques ; l'audit ne propose pas de déplacer les
effets vers des jobs sans nouveau protocole de reprise.

### Réception et correction R1 — ARCH-MET-02a (#56, 15/11/2026)

L'audit `b30edaa` est confirmé publié sur `origin/main`. L'utilisateur a demandé
la suite le 15/11/2026 ; les recommandations et le premier lot de concurrence
sont reçus. L'issue distincte [#56](https://github.com/Pierre-FABIEN/linkmusician/issues/56)
porte cette correction ; les constats ci-dessus décrivent la base auditée.

R1 est reproduit sur cette base avec une barrière : `answerInvite` détient
`band:` avant ses événements, `markComposed` détient déjà l'acteur auteur et
attend `band:` ; libérer l'adhésion provoque **PostgreSQL 40P01, deadlock detected**.
Le même scénario est conservé dans `works/locking.integration.test.ts`.

Contrat appliqué aux orchestrations concernées :

- Composition et confirmations : sous `work:`, prendre `band:` avant le moteur,
  puis préverrouiller l'union triée des auteurs confirmés, du crédit confirmé et
  des acteurs potentiels des étapes du groupe. Inclure les périodes ACTIVE,
  LEFT et REMOVED ; `membersAt` décide toujours qui reçoit réellement l'étape.
- Formation/adhésion : sous `band:`, préparer l'union avant le premier
  `membership.accepted`, `recordFormation` ou `syncComposition`.
- Finalisation : conserver `collaboration:` puis `work:` avant les écritures
  des participants, puis prendre les groupes concernés avant le moteur, y
  compris pour RECORDING. L'union inclut participants, membres historiques,
  présentateurs candidats et acteurs potentiels du concert/tournée. Les
  présentations sont figées avant les premiers verrous moteur ; une mise à jour
  conditionnelle après attente ignore celles déjà réussies ou supprimées.
- Après attente sur `band:`, les chemins de composition relisent aussi
  l’existence du morceau et de son groupe porteur avant les effets. La
  vérification d'enregistrement relit formation, dissolution et adhésions
  sous `band:` ; `load` conserve sa relecture après attente sur `work:` lorsqu'une
  suppression a pu mettre `workId` à null.

`lockProgressActors` trie une union fournie par le cas d'usage. Il ne découvre
pas les événements futurs et ne garantit aucun ordre global aux autres circuits.
Les règles pures, crédits, preuves, événements et gains restent les mêmes ; tout
reste dans le `Prisma.TransactionClient` de l'appelant, avec rollback commun.
Pas de migration, registre supplémentaire, cache de permission ou nouvelle UI.
R2 (gestion/révocation), R3 (proposition concurrente) et la relecture générale de
`processEvent` de R4 restent distincts ; ce lot n'est pas un audit de concurrence
exhaustif. Retour : revert applicatif cohérent conservant registres et index,
avec réintroduction du risque R1. Recette finale dans le suivi du plan.

### Registres minimaux et droits de lecture

| Propriété               | WorkCreditAct                                                                                                                                           | CollaborationAppreciationAct                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Écriture réelle         | `works.recordCreditAct` après transition humaine et effets existants, même tx                                                                           | `endorseCollaborator`/`revokeCollabEndorsement`, même tx après effets existants                                                                      |
| Périodes et répétitions | periodId = id opaque du crédit, sans FK vers crédit ; unique période/type ; nouvelle attribution après retrait = nouvelle période                       | Pas de période stockée ni unicité auteur/type/date : chaque don/reprise effectif ajoute une ligne ; CollabEndorsement courant réactivable            |
| Consentement            | ASSIGNED ne consent pas ; CREATOR_CREDITED/SELF_ASSIGNED sont personnels ; CONFIRMED est une transition réelle ; automatique n'ajoute aucun acte manuel | GIVEN/REVOKED désignent l'acte et son auteur, pas qualité/instrument/destinataire historique certifiés                                               |
| Lecteur privé           | `creditHistoryForMe` : acteur vivant, sujet **ou auteur réel**, 100 derniers actes ; projection sans titre, lien, rôle, destinataire tiers              | `validationHistoryForConversation` : acteur vivant participant exact, puis garde de conversation en route ; limite 100 collaborations, pas 100 actes |
| Perte de droit          | Trace minimale personnelle conservée après départ/retrait ; aucun nouvel accès au morceau                                                               | Gestion morceau/studio/groupe/mandat ne donne aucun accès ; histoire des participants conservée après blocage, sans nouveau contact                  |
| Export                  | `worksExport` → `prisma/actors/person.ts` : complet, pas limite 100, périodes opaques et concerne mon crédit                                            | Export des collaborations et `collaborationTimeline` : validations et actes, sans limite du lecteur de page                                          |
| Anonymisation           | authorId oublié partout, sujet conservé sous acteur vidé ; morceaux personnels supprimés, crédit en attente supprimé sans cascade des actes             | Acteur vidé et affichage Compte supprimé ; suppression RGPD des appréciations reçues indépendante des actes donnés par autrui                        |
| Cascades physiques      | Work et sujet → cascade ; auteur → SetNull ; crédit/rôle → aucun effacement du registre ; structure → Work → actes                                      | Collaboration et auteur → cascade ; proposant supprimé → collaboration → actes ; Work supprimé → lien collaboration à null, actes préservés          |
| Rollback et preuve      | Échec de create acte annule crédit/rôles/preuve/événements/XP/succès/notification de la mutation                                                        | Échec acte annule don/reprise, événement, gains/reprises et notification existante                                                                   |

Preuves lues : `server/works/history.integration.test.ts` (périodes, concurrence,
crédits automatiques, finalisation réelle contre suppression, quotas, accès
après perte de gestion, export 105 actes et rollback après corroboration),
`server/collaborations/history.integration.test.ts` (clôtures concurrentes,
rollback moteur/notification, accès, export), `endorse.integration.test.ts`
(cycles, concurrence, reprise après blocage, rollback),
`anonymisation.integration.test.ts` et `prisma/schema.prisma` pour les FK.
Ces tests ne couvrent pas à eux seuls R1–R4 dans leur ensemble.

Aucune de ces traces n'alimente notifications, réputation ou progression. Pas
de reconstruction historique depuis états, confirmedAt à origine multiple,
updatedAt, notifications ou événements moteur. L'ordre d'affichage à date égale
est stable, sans certifier l'ordre réel des transactions. Les actes de tâches
et de modification de rôles futurs devront choisir leur propre régime de
répétition ; l'unicité actuelle période/type ne leur convient pas telle quelle.

## 6. Frontières et contrats proposés

### Choix d'architecture

Conserver `tracks.ts`, `roles.ts`, `specializations.ts`, `catalog/`,
`structures/rules.ts` et les gardes actuelles. **Pas de nouveau registre central
de capacités** : l'inventaire ne montre pas de besoin de chargement dynamique.
Les menus configurables existent ; les permissions sont des décisions sur
ressource et action. Un registre métier → permissions confondrait ces notions.
Étendre les catalogues pour un nouveau champ ; définir une union locale d'actions
dans le domaine si elle sert ses commandes. Pas de framework de plugins.

| Frontière                      | Ce qu'elle possède                                                                       | Contrat / consommateurs                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Profil et référentiels         | Déclarations et exposition par lecteur                                                   | Les catalogues décrivent les champs ; aucun accès projet accordé depuis ces données                                        |
| Structures / représentation    | Adhésions et périmètres consentis                                                        | `structureAccess(db, orgId, personId, expectedKind)` et gardes nominatives conservées ; pas de permission projet implicite |
| Works                          | Identité du morceau, politique de lecture/gestion, crédits et rôles, faits de production | `works/service.ts` reste façade des routes et consommateurs ; nouveaux modules internes réexportés si extraction utile     |
| Tâche de production (future)   | Responsable réel, mode/lieu privé, état, révision et actes répétés                       | Cas d'usage sous works, lié à Work existant ; aucune table Project générique supplémentaire pour SELF                      |
| Collaboration                  | Accord bilatéral, achèvement et orchestration des effets acquis                          | Appelle un contrat works en passant son tx, pas une seconde transaction ; ne sert pas de tâche personnelle                 |
| Opportunité                    | Besoin daté, éligibilité et candidature                                                  | Offre/profil lu séparément de la permission d'agir pour un artiste ; futurs droits de candidature à faire consentir        |
| Progression                    | Interprétation des faits prouvés, ledger et projections                                  | Appel depuis orchestration autorisée ; cœur pur ; événement autonome distinct et non rémunéré comme collaboration          |
| Activité / notification / RGPD | Projections de lecture, distribution, intégration des données personnelles               | Aucun journal central ne décide des accès ; pas d'effet de lecture ni de copie de données privées superflues               |

Exemple de **contrats TypeScript proposés**, pas de fonctions déjà disponibles :

```ts
// Types locaux du domaine works ; identités issues de la session serveur.
type StageStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
type SelfRecordingCommand = {
	workId: string;
	byId: string;
	expectedRevision: number;
	action:
		| { kind: 'TAKE_SELF'; location: 'HOME' }
		| { kind: 'START' }
		| { kind: 'COMPLETE'; confirmed: true }
		| { kind: 'RESET' }
		| { kind: 'REOPEN' };
};
type StageResult = {
	changed: boolean;
	revision: number;
	status: StageStatus;
};
```

Un cas d'usage public valide Zod et prend son tx/verrou ; son helper interne
reçoit `Prisma.TransactionClient`, l'intention et `now`. Ce helper ne commit
pas et n'ouvre pas de transaction. Une query autorisée reçoit l'identité serveur
et retourne une projection minimale ; pas d'objet « permission accordée »
cachable par le client. Les gardes restent dans les services, même en appel direct.
`expectedRevision` sert aux intentions devenues périmées ; le lot doit définir
le rejeu exact (réponse sans changement ou conflit) sans confondre un nouveau
START après REOPEN avec une répétition réseau. Aucun rôle professionnel dans
ce contrat SELF. L'affectation à un membre et EXTERNAL restent des contrats
séparés à concevoir avec accord et droits explicites.

Pour #52, proposer un cas d'usage d'ajout de rôle sur **le contributeur existant**,
clé logique rôle/instrument sans doublon. Un ajout à autrui ne doit pas hériter
silencieusement du confirmedAt de sa ligne pour prétendre son consentement au
nouveau rôle. Garder le premier sous-lot limité à ses propres rôles ; traiter
l'extension à autrui avec un mécanisme de confirmation explicite. Nouvel acte
répétable par transition, pas ASSIGNED/CONFIRMED recyclé. Les crédits automatiques
existants gardent leur comportement et n'inventent pas de clic humain.

## 7. Scénarios documentés et comparatif

Ce sont des vérifications par lecture de code et des scénarios de conception.
Les colonnes cibles ne décrivent aucun parcours actuellement jouable.

| Scénario                                | Aujourd'hui, preuve / refus                                                                                                                                                                                                                | Après les lots proposés, critère vérifiable                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compte musicien + producteur + ingé son | Une Person, plusieurs PersonTrack, champs par piste ; `setPersonTracks`, profils communs et registre unique. Le changement de contexte ne duplique aucun Work. Tests multirôle existants, sans test spécifique de toutes les combinaisons. | Même actorId et Work après bascule ; aucun appel de tâche ne crée Person, PersonTrack ou ledger. Ajouter la combinaison exacte dans #50/#54.                                                 |
| Thomas enregistre lui-même              | Peut porter un Work et avoir un rôle RECORDING à la création sans métier du son. Déjà crédité, `creditPerson` refuse l'ajout manuel. Aucun état SELF/HOME ; recordedAt/journey ne proviennent pas du crédit personnel.                     | #51 : prise en charge SELF/HOME et transitions ; #52 : enrichit son crédit existant ; #53 : preuve déclarée et projection cohérente ; aucune collaboration ni métier supplémentaire.         |
| Étape confiée à un membre autorisé      | Gestion OWNER/ADMIN peut gérer le morceau ; MEMBER voit l'idée mais ne reçoit aucun pouvoir de mutation de production. Une attribution de crédit par gestion attend son accord.                                                            | Futur sous-lot MEMBER distinct de #51 : désignation précise et accord du membre ; autorité limitée à l'étape, perte d'adhésion réévaluée. Ne pas faire passer affectation pour consentement. |
| Tiers ou simple membre forge un POST    | `workPage` masque l'idée extérieure ; `requireManage` refuse credit/openRole/compose ; tiers ne lit pas le journal des collègues. Crédit et métier seuls n'accordent pas la gestion.                                                       | Appels directs du nouveau service et POST avec workId étranger refusés ; aucune mutation/trace/notification/XP en échec ; révocation pendant attente testée.                                 |
| Organisateur / booker / manager         | GIG_SLOT et concert, mandat borné et agence fonctionnent avec règles distinctes. Pas d'option, tâche de carrière ni candidature déléguée livrée.                                                                                           | #44–#46 réutilisent tâches/versions/actes de #36, sans copier un moteur ; mandat seul insuffisant pour écrire une tâche Work ou réserver un lieu.                                            |
| Communication future                    | Métier bientôt, catalogue et formulaires déclaratifs disponibles ; pas de campagnes ou données presse professionnelles actives.                                                                                                            | Extension théorique d'un type de livrable et d'une politique après décision d'ouverture ; réutilise tâche/validation commune, aucune copie du cycle ni available=true dans ce lot.           |

### Avant / après concret : enregistrement de Midnight Groove

| Intention                     | Code actuel                                                                                                                | Cible #51 → #54                                                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Je prends la prise de son » | Crédit RECORDING possible à la création ; ajout ultérieur bloqué si contributeur déjà présent ; aucun responsable de tâche | Commande TAKE_SELF sur Work existant ; responsable Thomas, HOME privé, TODO, dates nulles ; métier inchangé                                                    |
| Commencer puis terminer       | Pas de cycle de tâche ; une collaboration à deux serait un mauvais substitut                                               | START → IN_PROGRESS puis COMPLETE confirmé → DONE, auteur/date/révision et actes dans le même tx                                                               |
| Affichage et preuve           | Collaboration terminée renseigne recordedAt ; journey lit ses faits ; crédit ≠ achèvement                                  | Une query de production unique réconcilie faits indépendants et réalisation déclarée ; réouverture de SELF n'efface jamais une collaboration confirmée         |
| Crédit / suggestions          | `creditPerson` refuse le contributeur existant ; nudge cherche composed && recordedAt null                                 | Rôle ajouté une fois à la ligne existante (#52) ; #53 retire le besoin implicite de recrutement pour SELF attribué/DONE, recherche d'aide volontaire conservée |
| Récompense                    | Collaboration réelle a ses gains ; crédit du son a ses règles/succès existants                                             | Aucun collaboration.completed, gain de collaboration ou preuve indépendante artificiels ; succès existants audités, aucune récompense créée par le journal     |

HOME ne crée ni StudioProfile ni Venue ni adresse. Une révision de livrable
approuvé devra invalider l'approbation de cette version (#36), et non effacer
un crédit ou une preuve indépendante sans règle explicite.

## 8. Suite, dépendances et réception

Le [plan de lots](../plan/fin-du-projet.md#arch-met-01--audit-des-capacités-et-services-métier-55-livré-documentaire)
ordonne les caractérisations de concurrence, l'extraction limitée d'accès/queries,
puis #51, #52, #53 et #54. Les refactorisations restent proposées et demandent
validation puis issues distinctes ; aucune n'est marquée livrée.

| Issues          | Impact concret de l'audit                                                                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #30 / #35       | Épopée et journal restent ouverts ; m publié confirmé ; aucun WorkPitch/option créé pour les fermer. Nouveaux actes de tâches/rôles à livrer avec leurs mutations.                                         |
| #36 / #51       | Première capacité autonome SELF sur Work existant, bornée à l'enregistrement ; R1/R2 à caractériser avant de multiplier les effets. Ni MEMBER ni EXTERNAL ni versions complètes livrés par ce premier pas. |
| #52             | Une personne/contributeur, plusieurs rôles ; acte répétable propre, pas d'attribution initiale ni consentement tiers réinventé.                                                                            |
| #53             | Source cohérente dates/journey et besoins réels ; distinction réalisation déclarée/preuve indépendante ; aucun gain bilatéral pour SELF.                                                                   |
| #54 / #50 / #28 | Recette multirôle continue, accès forgés, concurrence/révocation, confidentialité, mineurs, mobile/clavier/axe ; les critères ONB restants ne sont pas soldés par l'audit.                                 |
| #37 / #27 / #26 | Étendre candidatures et qualification sur sources existantes ; ONB-13b et données de formation/répertoire ONB-12c restent nécessaires aux scénarios duo/reprises, pas à SELF.                              |
| #41             | Conserve Jam/Carrière/groupes ; tâches et candidatures après #36/#37, répétitions/agenda selon DASH-08.                                                                                                    |
| #42 / #43       | Projets, versions, validations, devis/catalogue restent dépendants de DASH-06/09/10 ; aucun système de tâches par métier.                                                                                  |
| #44             | Mandat/agence ≠ accès projet ; nouveaux droits de candidature et tâches après #36/#37/09, consentements propres.                                                                                           |
| #45             | Options, territoires, conflits et itinéraires nécessitent modèle/actes spécifiques ; réutiliser GIG/GIG_SLOT et mandat, pas une nouvelle date dupliquée.                                                   |
| #46             | Délégation d'événement limitée, jamais administration du lieu induite ; programmation multi-scènes/budgets encore future, dépendances #36/07/08/09.                                                        |
| #47 / #48 / #49 | P2 et décision d'ouverture distincte maintenues ; socle commun réutilisable théoriquement, contrats A&R/clearance/presse encore spécifiques à définir.                                                     |
| #55             | Livrable documentaire terminé localement avec matrice, preuves, limites, contrats, scénarios et plan ; réception du plan ne signifie pas réalisation des extractions.                                      |

Invariants de réception : confidentialité et permissions contextuelles, accords
personnels, blocages/profils masqués, mineur·es et quotas ; progression pure,
ledger XP en ajout seul et jamais preuve/droit/tri ; pas de nouvel effet d'un
journal, pas de reconstruction historique. Les fiches d'aide et démo ne sont
pas modifiées : aucun nouveau scénario jouable dans ce lot.
