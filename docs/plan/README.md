# Plan d'exécution — pilotage du projet

Le dossier [conception/](../conception/README.md) dit **quoi** construire
et **pourquoi**. Ce dossier dit **dans quel ordre**, **comment on s'organise**
et **où on en est**.

## 1. Le découpage : phase → lot → tâche

| Niveau    | Taille                                                       | Exemple                                    | Où il vit                                       |
| --------- | ------------------------------------------------------------ | ------------------------------------------ | ----------------------------------------------- |
| **Phase** | 2 à 6 semaines, un incrément produit utilisable              | Phase 1 : identité musicale et progression | Ce fichier et `phase-N.md`                      |
| **Lot**   | 1 à 4 jours, **une branche, une PR, une session de travail** | P1-05 : localisation floutée               | `phase-N.md` (fiche du lot)                     |
| **Tâche** | Moins d'une demi-journée                                     | Écrire la migration PostGIS                | Liste de tâches dans la PR ou la session Claude |

Règle d'or : **un lot laisse toujours le projet dans un état vert**
(`check`, `lint`, tests unitaires et e2e concernés). On ne commence pas un
lot si le précédent dont il dépend n'est pas fusionné.

## 2. Planification « en vague »

Le projet est trop gros pour tout détailler maintenant. Le détail suit
l'horizon :

| Horizon                           | Niveau de détail                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Phase en cours et suivante (0, 1) | Lots complets : objectif, périmètre, dépendances, critères de fin, tests                         |
| Phases 2-3 (fin du MVP)           | Liste des lots avec objectif et dépendances. Les fiches sont détaillées au démarrage de la phase |
| Phases 4-6                        | Intentions seulement ([conception/05 §3](../conception/05-mvp-roadmap.md#3-roadmap))             |

À la **fin de chaque phase**, une revue d'une demi-journée (§6) détaille
la phase suivante.

## 3. Cycle de vie d'un lot

```
1. Choisir   → premier lot ⬜ du tableau §5 dont les dépendances sont ✅
2. Cadrer    → relire sa fiche, trancher les décisions qu'il référence (docs/decisions)
3. Brancher  → git switch -c lot/P1-05-localisation
4. Réaliser  → tâches, tests au fil de l'eau
5. Vérifier  → critères de fin de la fiche + « Définition de terminé » (§4)
6. Livrer    → PR « [P1-05] Localisation floutée », fusion dans main
7. Tracer    → statut ✅ et lien de la PR dans le tableau §5, doc mise à jour
```

### Travailler avec Claude Code

Une session = un lot. Pour démarrer :

> « On attaque le lot P1-05. »

Claude lit [CLAUDE.md](../../CLAUDE.md), la fiche du lot et les sections
de conception qu'elle référence, propose les tâches, puis réalise.
En fin de session, il met à jour le tableau §5. Si un lot déborde, on le
**coupe** en deux lots (P1-05a, P1-05b) plutôt que de laisser une branche
traîner.

## 4. Définition de terminé (pour tout lot)

- [ ] Critères de fin de la fiche vérifiés.
- [ ] `npm run check`, `npm run lint` et `npm run test:unit -- --run` au
      vert. Specs e2e du domaine touché au vert.
- [ ] Nouvelle logique métier couverte par des tests (unitaires pour le
      pur, intégration pour Prisma, e2e pour un parcours utilisateur).
- [ ] Migration Prisma nommée et réversible, ou justifiée sinon.
- [ ] Aucune valeur de progression (XP, niveau, palier, confiance)
      acceptée depuis le client.
- [ ] Toute donnée personnelle nouvelle est couverte par l'export et
      l'anonymisation RGPD.
- [ ] Doc mise à jour : conception si une règle a changé, `docs/<domaine>/README.md`
      si un module est créé, décision consignée si une a été prise.
- [ ] Tableau §5 mis à jour.

## 5. Tableau de suivi

Statuts : ⬜ à faire · 🟡 en cours · ✅ fait · ⏸ bloqué · ✂️ découpé

### Phase 0 — Préparer le socle pour LinkMusician → [phase-0.md](./phase-0.md)

| Lot    | Intitulé                                                   | Dépend de         | Statut | PR                                                                                                               |
| ------ | ---------------------------------------------------------- | ----------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| P0-01  | Environnement local et état de référence                   | —                 | ⏸      | Tout est vert sauf e2e : en attente d'une base dédiée, voir [état de référence](./etat-de-reference.md)          |
| P0-01b | Rapatrier la réparation du socle (faite en amont)          | —                 | ✅     | Synchro `fe82121`, historique relié (`d24aed5`)                                                                  |
| P0-02  | Trancher les décisions de lancement                        | —                 | 🟡     | D6 et D10 tranchées le 03/11                                                                                     |
| P0-03  | Mettre la boutique en veille (interrupteur `SHOP_ENABLED`) | P0-01             | ✅     | Boutique en veille (`f430e13`), sur `main` le 04/11                                                              |
| P0-04  | Base dédiée, PostGIS, rôle MODERATOR                       | P0-01             | ✅     | PostGIS 3.6 en dev et en e2e, CI sur `postgis/postgis:16-3.4`, gardes `requireModerator`. Suite e2e non relancée |
| P0-05  | Coquille de l'application et identité visuelle de base     | P0-03, P0-02 (D9) | ⬜     |                                                                                                                  |
| P0-06  | Documentation et synchro amont outillée                    | P0-05             | ⬜     |                                                                                                                  |

### Phase 1 — Identité musicale et moteur de progression → [phase-1.md](./phase-1.md)

| Lot    | Intitulé                                                          | Dépend de                    | Statut | PR                                                                                                    |
| ------ | ----------------------------------------------------------------- | ---------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| P1-01  | Noyau de progression pur (`progression/core`)                     | — _(parallélisable avec P0)_ | ⬜     |                                                                                                       |
| P1-02  | Maquettes : onboarding, profil, tableau de bord                   | P0-02                        | ⬜     |                                                                                                       |
| P1-03a | Inscription : personne, âge minimum, rôle MODERATOR               | P0-03                        | ✅     | Parcours vérifié dans le navigateur ; spec e2e dédié à écrire, suite e2e non relancée                 |
| P1-03b | Choix des métiers (« Qui es-tu ? »)                               | P1-03a                       | ✅     | Parcours vérifié dans le navigateur ; spec `e2e/linkmusician/metiers.spec.ts` écrit, pas encore lancé |
| P1-04  | Référentiels instruments et genres                                | P0-04                        | ⬜     |                                                                                                       |
| P1-05  | Localisation floutée                                              | P1-03a                       | ⬜     |                                                                                                       |
| P1-06  | Compétences : instruments, genres, influences                     | P1-03a, P1-04                | ⬜     |                                                                                                       |
| P1-06b | Profil complet : statut pro, recherche, matériel, mobilité, liens | P1-06                        | ⬜     |                                                                                                       |
| P1-07  | Registre XP, outbox, projecteur, succès                           | P1-01, P1-03a                | ⬜     |                                                                                                       |
| P1-08  | Médias : upload direct, traitement, modération                    | P1-03a                       | ⬜     |                                                                                                       |
| P1-09  | Confiance TL0/TL1 et quotas                                       | P1-07                        | ⬜     |                                                                                                       |
| P1-10  | Onboarding                                                        | P1-02, P1-05, P1-06, P1-07   | ⬜     |                                                                                                       |
| P1-11  | Profil public et tableau de bord de progression                   | P1-08, P1-10                 | ⬜     |                                                                                                       |
| P1-12  | Signalements, modération minimale, RGPD étendu                    | P1-08                        | ⬜     |                                                                                                       |
| P1-13  | Instrumentation des indicateurs produit                           | P1-10                        | ⬜     |                                                                                                       |

### Phase 2 — Découverte, annonces, messagerie, collaborations → [phase-2-3.md](./phase-2-3.md)

| Lot   | Intitulé                                      | Dépend de    | Statut | PR  |
| ----- | --------------------------------------------- | ------------ | ------ | --- |
| P2-01 | Recherche géographique multicritère           | P1-05, P1-06 | ⬜     |     |
| P2-02 | Annonces (opportunités)                       | P1-09        | ⬜     |     |
| P2-03 | Candidatures                                  | P2-02        | ⬜     |     |
| P2-04 | Messagerie (demandes, conversations, polling) | P1-09        | ⬜     |     |
| P2-05 | Blocage                                       | P2-04        | ⬜     |     |
| P2-06 | Collaborations à double confirmation          | P2-03, P1-07 | ⬜     |     |
| P2-07 | Endossements                                  | P2-06        | ⬜     |     |
| P2-08 | Réputation (job et carte publique)            | P2-06, P2-07 | ⬜     |     |
| P2-09 | Notifications in-app et email                 | P2-04, P2-06 | ⬜     |     |
| P2-10 | Confiance TL2 et détection de collusion       | P2-06        | ⬜     |     |

### Phase 3 — Groupes, étapes et preuves (fin du MVP) → [phase-2-3.md](./phase-2-3.md)

| Lot   | Intitulé                                             | Dépend de     | Statut | PR  |
| ----- | ---------------------------------------------------- | ------------- | ------ | --- |
| P3-01 | Organisation « groupe » et adhésions avec historique | P2-06         | ⬜     |     |
| P3-02 | Page de groupe                                       | P3-01         | ⬜     |     |
| P3-03 | Annonces « cherche un membre » liées au groupe       | P3-01, P2-02  | ⬜     |     |
| P3-04 | Étapes : définitions et déclaration                  | P3-01         | ⬜     |     |
| P3-05 | Preuves et attestations                              | P3-04         | ⬜     |     |
| P3-06 | Contestation et reprise d'XP                         | P3-05         | ⬜     |     |
| P3-07 | Vérification de sortie par API                       | P3-05         | ⬜     |     |
| P3-08 | Paliers de groupe, part d'XP aux membres             | P3-05         | ⬜     |     |
| P3-09 | Modération étendue et vérification manuelle          | P3-06         | ⬜     |     |
| P3-10 | Bêta fermée dans la zone de lancement                | Tout le reste | ⬜     |     |

## 6. Rituels

| Quand            | Quoi                                                                                                                                | Durée  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Début de session | Choisir le lot, relire sa fiche                                                                                                     | 5 min  |
| Fin de session   | Mettre le tableau à jour, noter un blocage éventuel dans la colonne PR                                                              | 5 min  |
| Chaque semaine   | Relire le tableau. Un lot 🟡 depuis plus d'une semaine est découpé ou re-cadré                                                      | 15 min |
| Fin de phase     | Démo du parcours livré. Vérifier les critères de la phase. Détailler les fiches de la phase suivante. Revoir le barème XP si besoin | ½ jour |

## 7. Piste parallèle non technique : amorcer la communauté

Le risque n°1 du projet est le démarrage à froid
([conception/01 §4.2](../conception/01-analyse-produit.md#42-risques-de-conception)),
et il ne se règle pas avec du code. À mener **dès la phase 1** :

| Quand   | Action                                                                                                                                                                                                                |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 | Choisir la zone (D4). Lister 30 lieux relais : écoles de musique, salles de répétition, magasins, scènes ouvertes. Interviewer 10 musiciens (est-ce qu'ils cherchent vraiment des gens, comment font-ils aujourd'hui) |
| Phase 2 | Liste d'attente sur une page d'accueil. Recruter 50 bêta-testeurs dans la zone                                                                                                                                        |
| Phase 3 | Saisir avec eux les premières annonces réelles. Bêta fermée (P3-10). Mesurer les indicateurs de [conception/05 §2](../conception/05-mvp-roadmap.md#2-stratégie-mvp)                                                   |

## 8. Ordre de grandeur

Pour une personne à plein temps, assistée par Claude Code. Indicatif
seulement, à recalibrer après la phase 0.

| Phase   | Lots   | Durée estimée        |
| ------- | ------ | -------------------- |
| 0       | 8      | 1 à 2 semaines       |
| 1       | 13     | 4 à 6 semaines       |
| 2       | 10     | 4 à 5 semaines       |
| 3       | 10     | 4 à 5 semaines       |
| **MVP** | **41** | **≈ 3,5 à 4,5 mois** |
