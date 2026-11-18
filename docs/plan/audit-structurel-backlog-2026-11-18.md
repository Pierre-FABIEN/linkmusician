# Audit structurel Collab et réorganisation du backlog — 18 novembre 2026

> **Document de pilotage complémentaire** à [README.md](README.md), [fin-du-projet.md](fin-du-projet.md) et [a-trancher.md](a-trancher.md). Ne remplace pas les anciennes preuves de livraison et ne modifie pas le statut de lots sans recette.
>
> **Source** : schéma Prisma de `main`, documentation de conception et de planification, état des issues GitHub consultés le 18/11/2026. **Pas d'exécution de tests, pas d'audit exhaustif des services** dans cette revue. Les statuts code/performance sont des constats statiques, pas une preuve de mise en production.

## 1. Vision et décisions produit

- **Rencontre** : découvrir lieux, personnes, événements et jams ; **Collab** : créer, contribuer, faire avancer des initiatives musicales. Les deux univers sont accessibles à tous les métiers ; l'ancien vocabulaire « Jam/Carrière » peut subsister temporairement dans les routes et enums.
- **Une jam n'est pas un événement culturel générique** : interaction, présence, appréciation et protection spécifiques. Agenda transversal possible par projection, sans fusion forcée des modèles.
- **Une organisation/groupe n'est pas un projet** : collectif durable ≠ initiative portant un objectif. Une initiative peut être personnelle, portée par un groupe ou par une structure, avec plusieurs acteurs externes.
- **Une œuvre/un enregistrement, une prestation et une contribution ne sont pas un projet** : cycles de vie et preuves différents. Ne pas imposer de groupe factice ni d'ordre composition → studio → scène.
- **Permissions, crédits, preuves et XP sont indépendants** ; déclaration ou contexte métier ne donne pas de droit implicite.
- La gestion doit être simple pour l'utilisateur : « Créer un projet » et « Créer un groupe » restent deux choix distincts ; une création de morceau solo ne doit pas être bloquée par la création d'un projet formalisé.

## 2. Constat sur les modèles existants (schéma Prisma de main)

| Objet actuel | Faits vérifiés dans le schéma | Limite / question structurante |
|---|---|---|
| `Organization` / `Membership` / `BandProfile` | `OrgKind` : BAND, STUDIO, VENUE, PROMOTER, SCHOOL, AGENCY ; adhésions avec rôle, statut et périodes ; dissolution et vérification. | Une organisation n'est pas une initiative ; aucun lien générique Organisation→N projets. Ne pas dupliquer BAND. |
| `Work` / `WorkContributor` / `WorkRole` | Un `ownerId` ; contributeurs confirmables, rôles et crédits ; état de composition et jalons de production. | Pas de regroupement transversal des œuvres dans un projet ; distinguer œuvre, enregistrement, sortie et droits avant extension. |
| `WorkStep` | Étapes par `workId`, type unique par morceau, assignee, lieu, statut et `revision`. | Ne représente ni une tâche générique de projet ni une session sur plusieurs morceaux. Les fonctionnalités SELF ont été livrées (#51–#54). |
| `Collaboration` / `CollaborationParticipant` | Collaboration datée, participants et confirmations ; liens facultatifs à Work, Studio, BAND ou hôte, booker. | Fait ponctuel ≠ appartenance durable à une équipe projet. |
| `Representation` / `ApplicationGrant` | Mandats et délégations bornés ; candidature déléguée distinguée. | Mandat de carrière ≠ gestion globale de projet ou propriété d'œuvre. |
| `Milestone` | Jalons enregistrés pour `bandId`, preuve et référence Work éventuelle. | Les jalons de groupe ne couvrent pas automatiquement les initiatives solo ou multi-structures. |
| `Venue` / `VenueClaim` / `OrganizationVerification` | Lieu à identifiant propre, clés de déduplication géographique et nom ; revendication de lieu avec code/preuve/validation ; vérification d'organisation SIRET/site. | **Le système de revendication existe déjà** : #79 doit traiter extension aux imports, fraude, concurrence, réclamations, pas créer un second moteur concurrent. `Venue.createdById` requis : besoin d'une identité système/import réfléchie. |
| `Opportunity` | Jams actuellement représentées dans Opportunity, début/fin, lieu, présences, série ; annonces professionnelles. | Ne pas transformer arbitrairement tout événement culturel en jam ou annonce ; auditer GIG/plateaux avant créer le domaine généraliste #77. |

**Constats négatifs bornés au schéma Prisma** : pas de `model Project` généraliste, pas de `model Event` générique, pas de relation directe type projet↔groupe↔œuvres. Le mot « campagne » présent dans l'interface ne prouve pas l'existence d'un modèle Campaign générique. Une nouvelle table n'est **pas** décidée par ce constat.

### Angles morts prioritaires à trancher (#84 puis #83)

1. Qui porte une initiative : personne, groupe ou plusieurs structures ? Mono-porteur avec mandats ou co-portage explicite ?
2. Comment rattacher N morceaux à une initiative sans modifier leur auteur, leur porteur d'origine, leurs crédits ni leurs droits ?
3. Quelle différence entre gestion du projet, membre du groupe, contributeur d'un titre, prestataire et agent mandaté ?
4. Que devient chaque historique au départ du fondateur, dissolution, transfert ou contestation ?
5. Une prestation (studio/production) peut-elle couvrir N morceaux et produire N contributions vérifiables sans XP dupliquée ?
6. Quelle distinction œuvre/composition, master/enregistrement, interprétation, publication, événement et campagne doit être introduite **uniquement lorsqu'un usage réel l'impose** ?

### Modèle conceptuel de travail (pas un schéma Prisma décidé)

```text
Personne ── détient plusieurs métiers ──> Compétences / intentions
   │
   ├── adhère à ──> Organisation (BAND, studio, salle, ...)
   │                    └── peut porter plusieurs initiatives
   └── peut porter ou contribuer à ──> Initiative / projet (facultatif)
                                       ├── a des responsables mandatés
                                       ├── mobilise intervenants/prestataires
                                       └── relie des réalisations
                                            ├── œuvres / enregistrements
                                            ├── concerts / événements
                                            └── campagnes / sorties
```

Toutes les relations suggérées ne sont pas des tables existantes : vérifier cardinalités, provenance, droits et cycles de vie avant code.

## 3. Inventaire de toutes les issues — état GitHub du 18/11/2026

La série d'issues existantes est **#14 à #66, puis #70 à #84** : 68 issues au total (24 fermées, **44 ouvertes**). La recherche groupée « ouvertes » a omis l'issue **#75**, pourtant confirmée `open` via l'API individuelle ; elle est incluse ici. Les numéros #67–#69 n'appartiennent pas à l'inventaire des issues ; ne pas déduire un statut de leur absence.

**Fermées (preuve de périmètre livré, non preuve d'une recette de production globale)** :
- ONB : #15–#25, #29.
- Navigation/structures/mandats : #31–#34.
- Réalisations autonomes : #51–#54.
- Audit et correctifs de concurrence : #55–#58.

**Ouvertes, regroupées par chantier et priorité de traitement proposée** :

| Chantier | Issues ouvertes | Rôle dans le plan |
|---|---|---|
| Gouvernance / inscription | #14, #26, #27, #28 | Clore les critères résiduels et synchroniser les preuves de lots déjà livrés, sans relancer l'inscription entière |
| Socle métiers et opérations | #30, #35, #36, #37, #39, #40 | Historique, tâches/projets, candidatures, devis, œuvres/crédits ; organiser en extensions dépendantes |
| Espaces métiers | #41, #42, #43, #44, #45, #46 | Développer uniquement les fonctions métier appuyées sur les services et permissions transverses ; ne pas créer neuf plateformes |
| Métiers non ouverts | #47, #48, #49 | **Backlog ultérieur** label, édition, communication ; garder « bientôt » jusqu'à ouverture décidée |
| Qualité transverse | #50 | Recette incrémentale et sécurité avant ouverture, jamais « terminée » par un test ciblé |
| Jam, Metro, idéation | #59, #60, #61, #62, #63, #64, #65, #66, #70 | UX Jam en tant que module de Rencontre ; #59 exploration non bloquante, #70 design transversal |
| Collab produit et domaine | #71, #72, #83, #84 | #84 audit actuel/cible ; #83 décisions sur les relations ; #72 parcours ; #71 UX ; garder séparés sans réaliser de doublons |
| Rencontre et annuaire (epic) | #73, #74, #75, #76, #77, #78, #79, #80, #81, #82 | Nouvelles entrées, agenda culturel, sources autorisées, revendication et pilote Toulouse |
| Événements transverses | #38 | Socle partagé aux organisateurs, jams et événements ; coordonner avec #76/#77/#81 au lieu de réimplémenter |
 
**Total des lignes : 44 issues ouvertes**, une issue n'apparaissant qu'une fois. Les issues fermées ne sont pas rouvertes sans bug ou exigence nouvelle démontrée.

## 4. Ordre de travail révisé (dépendances, pas numéros)

### P0 — Stabiliser le suivi et figer le modèle avant refonte

1. **Réaligner la vérité du suivi** : comparer #14/#26/#27/#28/#30/#35/#36/#37 aux bilans du 17/11 et aux commits. Les textes anciens peuvent mentionner #51–#54 ou ONB-13b comme non livrés alors que le bilan les décrit comme publiés. Ne fermer qu'après vérification critère par critère.
2. **#84** : audit structurel effectif sur modèles **et services / routes / autorisations**. Le présent document est une première matrice statique, non la clôture de #84.
3. **#83** : arbitrage documenté du concept projet et des liens ; production d'une ADR, migration additive uniquement si nécessaire.
4. **#74/#75** : vocabulaire Rencontre/Collab et compréhension des neuf métiers ; aucun changement destructif de routes ni enums persistées.
5. **#50** : maintenir les contrôles sécurité/recette en parallèle, blocants pour la sortie publique.

**Jalon de décision D0** : règles du porteur de projet, des droits, des contributions et des relations projet↔groupe↔œuvre validées avant modification structurelle.

### P1 — Construire Collab à partir des capacités existantes

6. **#71** : accueil Collab « Mes projets », création facultative d'un groupe, parcours solo, contributions externes ; intégrer les espaces métier existants.
7. **#72 + #36 + #40** : branches non linéaires et avancement des réalisations ; ne pas dupliquer WorkStep ni les objets existants. Distinguer tâche opérationnelle, preuve et progression.
8. **#37 + #39**, puis **#41–#46** selon besoins réels : opportunités, prestations et interfaces adaptées aux rôles ; #35 suit les actes métier nouvellement créés.
9. **#70** : composants de tuiles Metro communs aux modules. Ne pas lancer une refonte visuelle intégrale pour débloquer la logique domaine.

**Jalon D1** : un utilisateur solo, un groupe multi-projets et un prestataire externe accomplissent leurs parcours de référence avec droits et preuves corrects.

### P1 parallèle — Rencontre et agenda local

10. **#76** (architecture UX Rencontre) coordonné à **#60–#66** (Jams) : conserver le module Jam.
11. **#77 + #38** : modèle et parcours événements génériques, distincts des jams et des concerts vérifiés.
12. **#78** : étude sources/licences/RGPD + import de lieux avec déduplication et corrections.
13. **#79** : **adapter le `VenueClaim` existant** et les vérifications d'organisation aux fiches importées ; pas de deuxième système de propriété.
14. **#80** : administration, publication et équipe avec autorisations déjà utilisées par les organisations.
15. **#81** : imports d'agendas partenaires après contrat événement et provenance, pas avant.

**Jalon D2** : un lieu pré-référencé apparaît sourcé, peut être revendiqué sans usurpation et publie un événement distinct d'une jam.

### P2 — Recette et élargissement

16. **#28**, **#50** et **#82** : matrice E2E multirôle, droits, vieillissement des données, mobile/a11y, retours partenaires toulousains ; corriger avant ouverture.
17. **#47–#49** : métiers « bientôt » ouverts progressivement après preuve de demande et capacité réelle.
18. **#59** : super Jam / battle = exploration facultative, **hors chemin critique** de lancement.

**Jalon D3** : validation de lancement, preuves CI et revue légale avant déploiement, sans faire passer la simple fermeture des issues pour une homologation de production.

## 5. Doublons apparents et frontières de responsabilité

| Issues liées | Responsabilité à préserver |
|---|---|
| #71 / #83 / #84 | UX « projet au centre » / **contrat de domaine** / **audit actuel-cible**. Ne pas fusionner tant que les livrables diffèrent. |
| #72 / #36 / #40 | Graphe d'activités / services de tâches et validation / œuvres et crédits. Réutilisation avant implémentation. |
| #38 / #77 / #81 / #46 | Calendriers existants / domaine événement générique / ingestion externe / outillage organisateur. |
| #60–#66 / #76 | Améliorer la Jam spécialisée / la placer dans l'univers Rencontre sans la diluer. |
| #32 (close) / #79 / #80 | Socle permissions déjà livré / sécuriser la revendication importée / fonctionnalités d'administration. |
| #14 / #26–#28 | Epic inscription / reste réel des profils, matching et recettes. Réconcilier les corps des issues avec les commits. |
| #70 / #74 / #71 | Design Metro transversal / shell des deux univers / espace Collab. |

## 6. Plan de vérification avant de modifier le code

- **Audit domaines** : `prisma/schema.prisma`, `src/lib/server/{bands,organizations,works,collaborations,representation,venues,opportunities}`, services d'accès, `src/routes/(app)`.
- **Sécurité** : scénario propriétaire vs gestionnaire vs artiste invité vs prestataire ; tests concurrence/transfert/retrait/mineurs ; accès serveur et absence d'élévation de privilège.
- **Non-régression métier** : création Work solo et BAND, SELF WorkStep, crédit sans statut d'auteur, mandats bornés, concerts corroborés, Jam sans XP d'événement culturel.
- **Data** : migrations additives, index/contraintes, import idempotent, provenance et dates, suppression/correction, RGPD, attribution et licence.
- **UI** : Svelte 5 runes, partage composants Metro, clavier, mobile 320/390 px, états vides réalistes et wording métier.
- **Traçabilité** : pour chaque lot, test et commit vérifiés, statut « spécifié / en cours / publié / recette complète » distincts.

## 7. Prochaine décision

Ne pas ouvrir dix développements parallèles : commencer par **#84 → #83**, puis livrer le wording **#74/#75** en parallèle non destructif. Après l'ADR domaine, choisir un premier vertical slice Collab (solo + groupe + externe), puis un vertical slice Rencontre (lieu importé + événement + revendication). Les tickets ouverts restent la source des travaux ; ce document est la **carte des dépendances**.
