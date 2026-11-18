# Audit structurel et feuille de route consolidée — 18 novembre 2026

> **Statut : analyse statique du dépôt** au commit `6bddf91716752fa65fa833bd2b249711f9ddfc45` (`main`, 17/11/2026). Aucune suite de tests exécutée dans cet audit et aucun déploiement vérifié. **Pas de décision implicite de migration.** Ce document est un complément transversal à `fin-du-projet.md` (ordre des lots historiques) et à `README.md` (état des lots).
>
> Les priorités P0/P1/P2 ci-dessous sont des recommandations, **pas des labels ni des travaux livrés**. Les tickets restent source de suivi de réalisation et le code est source de vérité des capacités.

## 1. Résultat de l'audit du domaine

| Concept | Constat confirmé sur le code | Conséquence |
| --- | --- | --- |
| Groupe | `Organization.kind=BAND`, `Membership` avec OWNER/ADMIN/MEMBER et historique, `BandProfile`; service `bands/service.ts` (verrou, invitation, départ, transfert de propriété, dissolution) | **Ne pas remplacer** le groupe par un projet |
| Morceau | `Work.ownerId` désigne un `Actor` personne ou groupe ; `createWork` accepte un morceau personnel **sans groupe** ; `WorkContributor`, `WorkRole`, `WorkCreditAct` | Le solo est **déjà possible** ; ne pas le réimplémenter |
| Étapes de production | `WorkStep` et `WorkStepAct` ; statut, révision anti-concurrence, HOME/SELF ; `WorkStepMode` ne contient aujourd'hui que SELF | Les assignees MEMBER/EXTERNAL et les validations restent à cadrer dans #36 ; #51–#54 sont closes |
| Collaboration | `Collaboration` et `CollaborationParticipant` ; proposition depuis une conversation acceptée entre deux personnes ; rattachement facultatif à `Work`, studio, groupe/hôte pour un concert | Solide pour les **actes confirmés à deux**, mais ce n'est pas un conteneur de projet multi-acteurs |
| Accompagnement | `Representation` confirmée, périmètre, début/fin et délégations ; mandats de manager/booker | Réutiliser le mandat, ne pas accorder de permission en fonction du seul titre métier |
| Lieux revendiqués | `VenueClaim` existe déjà : code publié sur canal officiel et revue par modération ; organisation VENUE liée après approbation | **#79 doit étendre/auditer l'existant**, pas recréer un mécanisme parallèle |
| Projet transversal | Aucun modèle Prisma `Project` autonome repéré dans `schema.prisma` ; les fonctions actuelles sont réparties entre Work, Organization, Collaboration, Opportunity, Representation et jalons | **Décision de domaine ouverte**, à documenter dans #83 avant tout nouveau schéma |

### Références de code

- [Schéma Prisma](../../prisma/schema.prisma) : `Organization`, `Membership`, `Work`, `Collaboration`, `VenueClaim`, `Representation`, `WorkStep`.
- [Groupes : service](../../src/lib/server/bands/service.ts) ; [création de groupe](../../src/routes/(app)/groupes/nouveau/+page.server.ts).
- [Morceaux : service](../../src/lib/server/works/service.ts) ; [création de morceau](../../src/routes/(app)/morceaux/nouveau/+page.server.ts) ; [prédicat d'autorisation](../../src/lib/server/works/access.ts).
- [Collaborations : service](../../src/lib/server/collaborations/service.ts).
- [Navigation métier](../conception/10-navigation-metiers.md) ; [architecture des équipes](../conception/12-structures-equipes.md).

### Écarts / interrogations à ne pas masquer

1. **Lien groupe → N projets** : le concept de projet peut être nécessaire pour un EP, une tournée ou une campagne autonome ; vérifier d'abord si une composition de structures existantes suffit. **Écart de représentation identifié, solution non décidée.**
2. **Porteur / contributeur / responsable** : une personne créditée sur Work n'est pas automatiquement membre de BAND ; ne pas confondre collaboration à deux, rôle d'équipe, gestion du projet et droits d'auteur.
3. **Œuvre vs enregistrement vs exploitation** : `Work` porte une idée/composition et des étapes de production ; la dissociation juridique œuvre/master et les versions n'est pas démontrée comme entièrement traitée (#40).
4. **Projet multi-structures** : un organisateur, un studio, un groupe et un manager peuvent coopérer, mais un portage de projet commun avec droits distincts doit être modélisé/validé.
5. **Gouvernance** : transfert de responsable, dissolution, retraits d'accès, conservation de preuves ; réutiliser les systèmes de verrou et l'historique existants.
6. **Simplicité de l'UX** : « Créer un projet » et « Créer un groupe » sont deux actions différentes, mais une œuvre solo ne doit pas nécessiter de conteneur administratif supplémentaire.

## 2. État du backlog GitHub audité

Inventaire via l'API du dépôt au 18/11/2026 : **68 issues métier (44 ouvertes, 24 fermées)**, plus **16 pull requests Dependabot** comptées séparément. Attention : la liste paginée a omis #75 malgré sa présence et son état ouvert confirmés par lecture directe, d'où le rapprochement par numéros 1–84.

- **Closes à préserver** : #15–#25, #29, #31–#34, #51–#58. En particulier #51–#54 sont *déjà livrées et closes* : certaines descriptions historiques dans #30/#36 ont conservé à tort « à faire ».
- **Épopées ouvertes** : #14 (onboarding), #30 (espaces métiers), #60 (UX Jam), #73 (Rencontre/Collab).
- **Chevauchements à coordonner** : #71/#72/#83/#84 (projet), #38/#46/#77 (événementiel), #60–#66/#70/#76 (Jam vs Rencontre), #32/#78–#80 (structures et revendication), #26–#28/#75 (métiers).
- **Non prioritaire pour le lancement tant que les socles ne sont pas prêts** : #59 (idéation Super Jam), extensions label/édition/communication #47–#49, services et fonctionnalités avancées selon contraintes.
- **Restes transverses** : #35 journal, #36 projets/tâches/versions, #37 opportunités, #39 prestations, #40 œuvres/crédits, #50 recette ; poursuivre leurs critères propres, pas fermer sur la base de sous-lots ou d'une preuve de commit unique.

## 3. Nouveau plan de réalisation — par dépendances et décisions

| Porte | Travaux | Tickets | Critère de sortie |
| --- | --- | --- | --- |
| **G0 — Stabiliser le référentiel** | Confronter #84 au code ; décider la sémantique projet/groupe/œuvre, permissions et cardinalités ; réconcilier les états du backlog | **#84 → #83**, #71, #72, #36, #40 | Décision explicite documentée, aucune migration par défaut |
| **G1 — Clarifier l'expérience** | Deux univers Rencontre/Collab ; explications des métiers ; choix de projet vs groupe ; ajuster Jam et les pivots Metro | **#74 → #75 → #76**, #60–#66, #70, #71 | Parcours novice, amateur et pro compréhensibles ; UX mobile/a11y |
| **G2 — Consolidation du noyau Collab** | Seulement les relations/permissions réellement manquantes ; contribution multi-projet ; validation, matching et œuvres selon décisions G0 | #36, #37, #39, #40, #26–#28, #41–#45 | Tests permissions, concurrence, historique, preuves et intégration |
| **G3 — Rencontre culturelle** | Définir un événement générique distinct de Jam ; gérer catégories, structures, programmations ; ne pas dupliquer les calendriers partagés | **#77**, #38, #46 | Une jam reste une Jam ; concert/atelier/festival ont un cycle de vie indépendant |
| **G4 — Alimenter sans usurper** | Import légal de lieux et événements, provenance, dédoublonnage, revendication et administration ; réutiliser VenueClaim / Organization | **#78 → #79 → #80**, #81 (après #77) | Licence/RGPD vérifiés, aucun droit d'admin par import, tests d'abus |
| **G5 — Validation de lancement** | Tests multirôles, événements, sécurité, a11y, non-régression puis pilote Toulouse et critères go/no-go | **#28, #50, #82**, P0-01, P3-10a, P3-10 | Preuves d'exécution sur code publié, revue sécurité, validation partenaires |
| **G6 — Extensions** | Super Jam, label, édition, communication et monétisation/outils avancés | #59, #47–#49, suites #39/#45 | Besoins utilisateurs confirmés et socle stable |

**G0 est une porte de décision**, pas une immobilisation de tout le développement : les correctifs de sécurité, tests et UX sans migration peuvent avancer en parallèle. G2, G3 et une partie de G4 peuvent être parallélisés une fois leurs contrats respectifs stabilisés.

## 4. Ordre pratique des prochaines sessions

1. **#84 puis #83** : terminer la matrice `concept → entité → service → autorisation → cycle → test`. Trancher « projet = agrégat existant ou nouvel objet ? ».
2. **#71 / #74** : concrétiser l'entrée « Mes projets » et les univers Rencontre/Collab **sans renommer les enums ni les URLs**.
3. **#75 / #76** : vocabulaire métiers et séparation Jam/Agenda/Communauté ; conserver les parcours Jam #60–#66.
4. **#36 et #40** : ne développer que les capacités réellement absentes après G0. Auditer les statuts des issues avant chaque lot.
5. **#77 / #38 / #46** : contrat de l'événement culturel, structures porteuses et calendrier transversal.
6. **#78 / #79 / #80 / #81** : pipeline de sources autorisées, droits, revendication et synchronisation.
7. **#28 / #50 / #82 + P3-10a** : recette, risques et pilotes ; validation du go/no-go.

## 5. Règles de gouvernance des tickets

- Une issue = **un résultat vérifiable** ou un audit avec livrable clair ; l'epic conserve les liens et dépendances.
- Marquer chaque ticket **à cadrer / prêt / en cours / partiel / livré / différé**, mais ne jamais assimiler une issue fermée à une fonctionnalité déployée.
- Mettre à jour les états uniquement avec preuve (code, tests, commit publié) ; distinguer la documentation de spécification et une livraison testée.
- Préserver les tickets #60/#71/#72 : aucune fermeture de « doublon » sans comparer leurs critères et confirmer qu'ils sont réellement couverts.
- Éviter la multiplication de schémas et de tickets non justifiés. Une décision transversale prise dans G0 doit être répercutée dans la conception et les tickets dépendants.

## 6. Décisions encore ouvertes

- Projet transversal : simple projection UX, extension d'un agrégat existant ou nouvel objet persistant ?
- Portage : un seul responsable, plusieurs organisations, projets transversaux ? Quelles délégations et preuves ?
- Réalisations : lien plusieurs-à-plusieurs entre projets et œuvres/concerts ? Qui gère les droits ?
- Événements : quel sous-ensemble réutiliser de GIG, Opportunity, Venue/JamSeries sans confondre concerts et jams ?
- Revendication : compléter le `VenueClaim` actuel (niveau 1) et le faire évoluer pour les structures importées, avec anti-usurpation et arbitrage.
- Conditions de lancement : quelles fonctionnalités doivent être réellement disponibles pour Toulouse, et quelles extensions sont différées ?

**Ce document n'autorise aucune modification de schéma ; les décisions doivent être validées avant développement des modèles.**
