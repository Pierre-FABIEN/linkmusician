# Plan d'exécution — pilotage du projet

Le dossier [conception/](../conception/README.md) dit **quoi** construire
et **pourquoi**. Ce dossier dit **dans quel ordre** et **où on en est**.

## 1. Le découpage : phase → lot → tâche

| Niveau    | Taille                                                       | Où il vit                              |
| --------- | ------------------------------------------------------------ | -------------------------------------- |
| **Phase** | Un incrément produit utilisable                              | [fin-du-projet.md](./fin-du-projet.md) |
| **Lot**   | 1 à 4 jours, **une session de travail, commitée sur `main`** | Fiche dans `fin-du-projet.md`          |
| **Tâche** | Moins d'une demi-journée                                     | La session Claude                      |

Règle d'or : **un lot laisse toujours le projet dans un état vert**
(`check`, `lint`, tests unitaires et e2e concernés). On ne commence pas un
lot si celui dont il dépend n'est pas terminé.

## 2. Les documents

| Document                                               | Rôle                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| Ce fichier                                             | Méthode, définition de terminé, **tableau d'avancement (§5)**     |
| [fin-du-projet.md](./fin-du-projet.md)                 | **La route jusqu'au bout** : étapes A à F, fiche de chaque lot    |
| [preparation-phase-5.md](./preparation-phase-5.md)     | Repérage technique des lots de la scène (modèles, schéma, pièges) |
| [a-trancher.md](./a-trancher.md)                       | Questions laissées pour plus tard, avec le défaut appliqué        |
| [remontees-boilerplate.md](./remontees-boilerplate.md) | Problèmes du boilerplate signalés en amont                        |
| [prompt-reprise.md](./prompt-reprise.md)               | Prompt pour reprendre une session                                 |

Les fiches des lots terminés, les revues de phase et les anciens prompts
ont été retirés le 11/11/2026 : ils restent dans l'historique git
(commit `2e1cb24` et avant).

## 3. Cycle de vie d'un lot

```
1. Choisir   → premier lot ⬜ du tableau §5 (ordre des étapes) dont les dépendances sont ✅
2. Cadrer    → relire sa fiche (fin-du-projet.md) et son repérage (preparation-phase-5.md)
3. Réaliser  → sur main, à jour ; tâches, tests au fil de l'eau
4. Vérifier  → critères de fin de la fiche + « Définition de terminé » (§4)
5. Livrer    → commits sur main, préfixés par l'ID (« (P5-05) ») ; l'utilisateur pousse
6. Tracer    → statut ✅ au tableau §5, doc mise à jour
```

Une question ouverte ne bloque pas un lot : on applique le défaut le plus
prudent et on l'ajoute à [a-trancher.md](./a-trancher.md). Un lot qui
déborde est **coupé** (P5-05a, P5-05b) plutôt que prolongé.

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
- [ ] Page d'aide mise à jour si le lot change ce que vit l'utilisateur
      (`src/lib/aide/pages/`, voir `docs/aide/README.md`).
- [ ] Tableau §5 mis à jour.

## 5. Tableau de suivi

Statuts : ⬜ à faire · 🟡 en cours · ✅ fait · ⏸ bloqué · ✂️ découpé.
Étapes A à F : voir [fin-du-projet.md §1](./fin-du-projet.md#1-où-on-en-est).
Un lot terminé reste dans le tableau avec ✅ jusqu'à la fin de son étape.

**Terminé : 90 lots sur 105.** Phases 0, 1 et 2 complètes ; phase 3
complète sauf P3-10a et P3-10 ; phase 4 complète pour le lancement ;
phase 5 : P5-01, P5-02, P5-03a, P5-03b, P5-05a, P5-05b et P5-06. Le détail de chaque lot terminé est
dans le `git log` (messages préfixés par l'ID).

| Lot    | Intitulé                                      | Dépend de             | Statut | Étape | Notes                                                                                                                                                                                                               |
| ------ | --------------------------------------------- | --------------------- | ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P5-05a | Organisateur·rice : profil et plateaux        | P5-02                 | ✅     | A     | Lancement. Piste `PROMOTER` ouverte, `/profil/organisateur`, plateaux `GIG_SLOT` (rang, genre, zone ; jamais l'XP), candidature au nom d'un groupe, rang lu dans `gig.held` ; e2e `organisateur.spec.ts` ; Q31, Q32 |
| P5-05b | Organisateur·rice : organisation `PROMOTER`   | P5-05a                | ✅     | A     | Lancement. `/organisations` : association ou collectif géré à plusieurs, vérifiable (P5-02), plateaux en son nom, page publique `/@handle` ; e2e `organisation-organisateurs.spec.ts` ; Q33                         |
| P5-03b | Lieux : fiche, agenda et rang                 | P5-03a                | ✅     | A     | Lancement. `VenueProfile`, `/lieux/[id]/gerer` (fiche, publication, dates, co-gestion, vérification), page du lieu enrichie, rang lu dans les faits ; e2e `lieu-fiche.spec.ts` ; Q29 (notification), Q34            |
| P5-03d | Lieux : photos                                | P5-03b                | ⬜     | A     | Lancement. Photos de la fiche, modèle du studio (P4-03b), découpé de P5-03b                                                                                                                                         |
| P5-06  | Concerts vérifiés                             | P5-03b, P5-05b        | ✅     | A     | Lancement. Collaboration `GIG` (groupe, hôte lieu ou organisation), « Premier concert » vérifié par un hôte vérifié (corroboré sinon), tournée (`firstTour`), `gig.held` ; e2e `concerts.spec.ts` ; Q35, Q36        |
| P5-04  | Jams publiques des lieux                      | P5-03b, P2-14b        | ⬜     | A     | Lancement                                                                                                                                                                                                           |
| P5-08  | Carte : acte V                                | P5-06                 | ⬜     | A     | Lancement                                                                                                                                                                                                           |
| P5-07  | Booker et manager                             | P5-01                 | ⬜     | A     | Lancement                                                                                                                                                                                                           |
| P5-11  | Écoles, MJC, conservatoires (D29)             | P5-02, P2-14c         | ⬜     | A     | Lancement                                                                                                                                                                                                           |
| P0-01  | Environnement local et état de référence      | —                     | ⏸      | B     | Suite e2e complète à faire passer (échecs d'authentification, `lieux.spec.ts` Q30), à l'étape B                                                                                                                     |
| P3-10a | Audit de sécurité avant production (bloquant) | Lots du lancement     | ⬜     | C     | Lancement. Bloquant pour P3-10                                                                                                                                                                                      |
| P3-10  | Ouverture publique (pas de bêta, D23)         | P3-10a, tout le reste | ⬜     | D     | Lancement. Objectif début mars 2027                                                                                                                                                                                 |
| P5-00  | Validation juridique de la monétisation (D25) | —                     | ⬜     | E     | Après le lancement ; avant P5-09 et P5-10                                                                                                                                                                           |
| P4-11  | Radar des pros                                | P2-08                 | ⬜     | E     | Après le lancement                                                                                                                                                                                                  |
| P5-09  | Offre pro                                     | P4-11, P5-00          | ⬜     | E     | Après le lancement                                                                                                                                                                                                  |
| P5-10  | Réservation de studio                         | P4-03, P5-00          | ⬜     | E     | Après le lancement ; vérifie « Première répétition »                                                                                                                                                                |
| P5-03c | Lieux : gérant vérifié (niveau 2)             | P5-03a                | ⬜     | E     | Après le lancement (Q20) : dirigeants de l'API Recherche d'entreprises, ProConnect                                                                                                                                  |
| P4-08  | Vitrine des propositions                      | P4-07                 | ⬜     | E     | Après le lancement ; gratuité à trancher                                                                                                                                                                            |
| P4-12  | Messagerie temps réel                         | P2-04 ; D8            | ⬜     | E     | Après le lancement                                                                                                                                                                                                  |
| P6-01  | Personas et barème de la sortie               | —                     | ⬜     | F     | Après le lancement                                                                                                                                                                                                  |
| P6-02  | Label                                         | P6-01, P5-02          | ⬜     | F     | Après le lancement                                                                                                                                                                                                  |
| P6-03  | Éditeur·rice                                  | P6-01                 | ⬜     | F     | Après le lancement                                                                                                                                                                                                  |
| P6-04  | Communication musicale                        | P6-01                 | ⬜     | F     | Après le lancement                                                                                                                                                                                                  |
| P6-05  | Carte : actes VI à VIII                       | P3-07, P6-02          | ⬜     | F     | Après le lancement                                                                                                                                                                                                  |
| P6-06  | Défis collectifs par ville                    | P5-04 ; D3            | ⬜     | F     | Après le lancement                                                                                                                                                                                                  |
| P6-07  | Autres rôles                                  | P1-13                 | ⬜     | F     | Après le lancement                                                                                                                                                                                                  |

## 6. Rituels

| Quand            | Quoi                                                                    | Durée  |
| ---------------- | ----------------------------------------------------------------------- | ------ |
| Début de session | Choisir le lot, relire sa fiche                                         | 5 min  |
| Fin de session   | Mettre le tableau à jour, consigner les questions dans `a-trancher.md`  | 5 min  |
| Chaque semaine   | Relire le tableau. Un lot 🟡 depuis plus d'une semaine est découpé      | 15 min |
| Fin d'étape      | Démo du parcours livré, critères vérifiés, questions ouvertes tranchées | ½ jour |
