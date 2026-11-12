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
- [ ] Démo : la situation nouvelle est jouée par `npm run seed:demo` et
      décrite dans `docs/demo/README.md` (qui, où, ce qu'on voit).
- [ ] Tableau §5 mis à jour.

## 5. Tableau de suivi

Statuts : ⬜ à faire · 🟡 en cours · ✅ fait · ⏸ bloqué · ✂️ découpé.
Étapes A à F : voir [fin-du-projet.md §1](./fin-du-projet.md#1-où-on-en-est).
Un lot terminé reste dans le tableau avec ✅ jusqu'à la fin de son étape.

**Terminé : 113 lots sur 132.** Phases 0, 1 et 2 complètes ; phase 3
complète sauf P3-10a et P3-10 ; phase 4 complète pour le lancement ;
phase 5 : P5-01, P5-02, P5-03a, P5-03b, P5-03d, P5-04a, P5-04b, P5-05a, P5-05b, P5-06, P5-07, P5-08 et P5-11 ;
étape B : MET-01, MET-02 et MET-07 ; inscription : ONB-01 à ONB-12b et ONB-13a (restent ONB-12c, 13b et 14, fiches dans [fin-du-projet.md §3.1](./fin-du-projet.md#31-inscription-adaptative-multirôle-épopée-14)). Le détail de chaque lot terminé est
dans le `git log` (messages préfixés par l'ID).

| Lot     | Intitulé                                           | Dépend de             | Statut | Étape | Notes                                                                                                                                                                                                                                                                                                                                 |
| ------- | -------------------------------------------------- | --------------------- | ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P5-05a  | Organisateur·rice : profil et plateaux             | P5-02                 | ✅     | A     | Lancement. Piste `PROMOTER` ouverte, `/profil/organisateur`, plateaux `GIG_SLOT` (rang, genre, zone ; jamais l'XP), candidature au nom d'un groupe, rang lu dans `gig.held` ; e2e `organisateur.spec.ts` ; Q31, Q32                                                                                                                   |
| P5-05b  | Organisateur·rice : organisation `PROMOTER`        | P5-05a                | ✅     | A     | Lancement. `/organisations` : association ou collectif géré à plusieurs, vérifiable (P5-02), plateaux en son nom, page publique `/@handle` ; e2e `organisation-organisateurs.spec.ts` ; Q33                                                                                                                                           |
| P5-03b  | Lieux : fiche, agenda et rang                      | P5-03a                | ✅     | A     | Lancement. `VenueProfile`, `/lieux/[id]/gerer` (fiche, publication, dates, co-gestion, vérification), page du lieu enrichie, rang lu dans les faits ; e2e `lieu-fiche.spec.ts` ; Q29 (notification), Q34                                                                                                                              |
| P5-03d  | Lieux : photos                                     | P5-03b                | ✅     | A     | Lancement. Photos portées par l'organisation du lieu, envoyées par sa gestion, 8 au plus ; galerie sur `/lieux/[id]` ; e2e `lieu-photos.spec.ts`                                                                                                                                                                                      |
| P5-06   | Concerts vérifiés                                  | P5-03b, P5-05b        | ✅     | A     | Lancement. Collaboration `GIG` (groupe, hôte lieu ou organisation), « Premier concert » vérifié par un hôte vérifié (corroboré sinon), tournée (`firstTour`), `gig.held` ; e2e `concerts.spec.ts` ; Q35, Q36                                                                                                                          |
| P5-04   | Jams publiques des lieux                           | P5-03b, P2-14b        | ✂️     | A     | Découpé en P5-04a et P5-04b                                                                                                                                                                                                                                                                                                           |
| P5-04a  | Jams des lieux : scène ouverte récurrente          | P5-03b, P2-14b        | ✅     | A     | Lancement. `JamSeries` (« tous les jeudis »), jams des 4 semaines créées par le job, gestion du lieu hôte, « jam publique tenue » (`jam.held`, 50 × confiance, rang du lieu), mineur·es et lieu `ADULTS` ; e2e `scene-ouverte.spec.ts` ; Q30 corrigé ; Q42 à Q44                                                                      |
| P5-04b  | Jams des lieux : animateur·rices                   | P5-04a                | ✅     | A     | Lancement. `VenueHost` (le lieu invite, la personne accepte dans Mes jams), suggestions de leads à 30 km (appréciations, jams animées, jamais l'XP), lead par défaut d'une série ; e2e `animation-lieu.spec.ts` ; Q45 à Q47                                                                                                           |
| P5-08   | Carte : acte V                                     | P5-06                 | ✅     | A     | Lancement. Acte V jouable (« Premier concert » vérifié, membre à la date), tournée en épreuve de plus, carte souvenir du concert ; e2e `carriere.spec.ts` (acte V)                                                                                                                                                                    |
| P5-07   | Booker et manager                                  | P5-01                 | ✅     | A     | Lancement. Pistes `MANAGER` et `BOOKER` ouvertes ; `Representation` confirmée par l'artiste (`management.confirmed`), « Booké par » sur un concert (`gig.held`), tournée bookée (`tour.booked`, 400), rang `agentTier` lu dans les faits ; e2e `booker.spec.ts` ; Q48 à Q51                                                           |
| P5-11   | Écoles, MJC, conservatoires (D29)                  | P5-02, P2-14c         | ✅     | A     | Lancement. Organisation `SCHOOL`, lien d'invitation haché et plafonné (`/ecole/[token]`, repris après l'inscription), ateliers jam réservés aux élèves (`audience: SCHOOL`, lead = le prof), mineur·es : finis avant 22 h (testé), quête « De l'atelier à la scène », aucune liste d'élèves publique ; e2e `ecole.spec.ts` ; Q52, Q53 |
| P0-01   | Environnement local et état de référence           | —                     | ⏸      | B     | Suite e2e complète à faire passer (échecs d'authentification, `lieux.spec.ts` Q30), à l'étape B                                                                                                                                                                                                                                       |
| MET-01  | Metro : socle                                      | —                     | ✅     | B     | Lancement. Coquille en `.lm-metro`, en-tête, fil d'Ariane, toasts, `TierBadge`, composants (`MetroMenu`, `MetroField`…), CSS rangé, passe de contrôle de toutes les pages (D55, `docs/design` §7)                                                                                                                                     |
| MET-02  | Metro : accueils                                   | MET-01                | ✅     | B     | Lancement. `/jouer`, `/jam`, `/espace` en panorama de tuiles (D50), héros, Aurora                                                                                                                                                                                                                                                     |
| MET-07  | Metro : premiers pas et public                     | MET-01                | ✅     | B     | Lancement. `qui-es-tu`, `demarrer/*`, accueil, aide, démarches, erreurs, authentification (Q40)                                                                                                                                                                                                                                       |
| MET-03  | Metro : mode jam                                   | MET-02                | 🟡     | B     | Lancement. Agenda, dispos, jams, carnet, apprécier, lieux                                                                                                                                                                                                                                                                             |
| MET-04  | Metro : carrière                                   | MET-02                | 🟡     | B     | Lancement. Objectifs, carte, groupes, morceaux, étapes, à confirmer                                                                                                                                                                                                                                                                   |
| MET-05  | Metro : se trouver, se parler                      | MET-01                | 🟡     | B     | Lancement. Découvrir, annonces, plateaux, messages, contacts, notifications                                                                                                                                                                                                                                                           |
| MET-06  | Metro : profils et pros                            | MET-01                | 🟡     | B     | Lancement. `/@handle`, `/profil/*`, studios, organisations, gestion des lieux, réglages                                                                                                                                                                                                                                               |
| ONB-01  | Inscription : référentiel des spécialités          | —                     | ✅     | B     | Épopée #14, ticket #15. Spécialités des 9 métiers, catalogues « Je propose » / « Je recherche » (vides), tables `person_track_specializations` et `person_track_intents`, recopie des profils existants (D56, Q54, Q55)                                                                                                               |
| ONB-02  | Inscription : parcours adaptatif selon les métiers | ONB-01                | ✅     | B     | Ticket #16. Fiche par métier `TRACK_ROLES`, étapes calculées selon les métiers, écran `/demarrer/metier/[slug]`, `PersonTrack.detailsConfirmedAt`, fin sans intention, résultat selon le métier principal (D57, Q56 à Q58)                                                                                                            |
| ONB-03  | Inscription : profil de musicien·ne                | ONB-02                | ✅     | B     | Ticket #17. Expérience et engagement requis, « Je propose » / « Je recherche », écriture, précisions selon l'instrument ; `musician_profiles`, `person_track_attributes`, `lookingFor` en copie ; page « Ma pratique » (D58, Q54 tranchée)                                                                                            |
| ONB-04  | Inscription : ingé son                             | ONB-02                | ✅     | B     | Ticket #18. Catalogue en données (D59) : offres, besoins, champs — environnement requis ; DAW, mixage, mastering, enregistrement, live, HF selon spécialité                                                                                                                                                                           |
| ONB-05  | Inscription : producteur·rice                      | ONB-02                | ✅     | B     | Ticket #19. Catalogue en données (D59) : offres, besoins, champs — environnement requis ; beatmaking (sans contrat), production, arrangement, topline                                                                                                                                                                                 |
| ONB-06  | Inscription : manager                              | ONB-02                | ✅     | B     | Ticket #20. Catalogue en données (D59) : offres, besoins, champs — statut, territoire, nouveaux projets requis ; stade ciblé si prospection ; tournée, agence                                                                                                                                                                         |
| ONB-07  | Inscription : booker / programmateur·rice          | ONB-02                | ✅     | B     | Ticket #21. Catalogue en données (D59) : offres, besoins, champs — structure, territoire ; jauge, formations, événements si programmation ; catégories si booking                                                                                                                                                                     |
| ONB-08  | Inscription : organisateur·rice                    | ONB-02                | ✅     | B     | Ticket #22. Catalogue en données (D59) : offres, besoins, champs — situation, territoire ; jams, festival, concerts ; aucune fiche d'événement                                                                                                                                                                                        |
| ONB-09  | Inscription : label                                | ONB-02                | ✅     | B     | Ticket #23. Catalogue en données (D59) : offres, besoins, champs — territoire ; cible et politique de démos si A&R ; métier « bientôt »                                                                                                                                                                                               |
| ONB-10  | Inscription : éditeur·rice                         | ONB-02                | ✅     | B     | Ticket #24. Catalogue en données (D59) : offres, besoins, champs — territoire ; soumissions si recherche d'œuvres ; synchro, administration ; « bientôt »                                                                                                                                                                             |
| ONB-11  | Inscription : communication                        | ONB-02                | ✅     | B     | Ticket #25. Catalogue en données (D59) : offres, besoins, champs — territoire ; éditorial / prestation, formats, plateformes ; « bientôt »                                                                                                                                                                                            |
| ONB-12a | Inscription : récapitulatif                        | ONB-03 à ONB-11       | ✅     | B     | Ticket #26. Écran `/demarrer/recapitulatif` qui termine l'onboarding, « Modifier » sans perte (D60, Q62, Q63)                                                                                                                                                                                                                         |
| ONB-12b | Profil : complétude et visibilité par métier       | ONB-12a               | ✅     | B     | Ticket #26. Complétude par métier (ce qui rend exploitable, sans score), « Qui voit quoi » en 3 blocs et « ouvert aux sollicitations », `/@handle` filtré par lecteur (D61 à D64, Q64 à Q66, audit #29)                                                                                                                               |
| ONB-12c | Profil : informations avancées par métier          | ONB-12b               | ⬜     | B     | Ticket #26. Portfolio, matériel, tarifs indicatifs, en réutilisant `/profil/son`, `/production`, `/organisateur`                                                                                                                                                                                                                      |
| ONB-13a | Découverte : recherche par offres                  | ONB-12b               | ✅     | B     | Ticket #27. Par métier, une offre cochée est exigée (D62) ; filtres « ce que la personne propose », à distance, avec références ; bloc privé et « pas en ce moment » écartés (Q68, Q69) ; scénario #29 n° 2                                                                                                                           |
| ONB-13b | Découverte : annonces qualifiées                   | ONB-13a, ONB-12c      | ⬜     | B     | Ticket #27. Rémunération, formation, engagement, présence sur l'annonce (D63, migration additive), rapprochement annonces et profils                                                                                                                                                                                                  |
| ONB-14  | Inscription : E2E transverse                       | ONB-12a               | ⬜     | B     | Ticket #28. Matrice de tests multirôle, mobile et accessibilité                                                                                                                                                                                                                                                                       |
| DT-01a  | Prisma 7 : adaptateur pg, config, erreurs          | —                     | 🟡     | C     | Dette. Fabrique `createPrismaClient` (schéma), `db-errors.ts` (P2034, P2002) ; e2e à rejouer                                                                                                                                                                                                                                          |
| DT-01b  | Prisma 7 : SQL brut typé, nouveau générateur       | DT-01a                | ⬜     | C     | Dette. TypedSQL pour les 33 requêtes brutes ; générateur `prisma-client` via le boilerplate                                                                                                                                                                                                                                           |
| P3-10a  | Audit de sécurité avant production (bloquant)      | Lots du lancement     | ⬜     | C     | Lancement. Bloquant pour P3-10                                                                                                                                                                                                                                                                                                        |
| P3-10   | Ouverture publique (pas de bêta, D23)              | P3-10a, tout le reste | ⬜     | D     | Lancement. Objectif début mars 2027                                                                                                                                                                                                                                                                                                   |
| P5-00   | Validation juridique de la monétisation (D25)      | —                     | ⬜     | E     | Après le lancement ; avant P5-09 et P5-10                                                                                                                                                                                                                                                                                             |
| P4-11   | Radar des pros                                     | P2-08                 | ⬜     | E     | Après le lancement                                                                                                                                                                                                                                                                                                                    |
| P5-09   | Offre pro                                          | P4-11, P5-00          | ⬜     | E     | Après le lancement                                                                                                                                                                                                                                                                                                                    |
| P5-10   | Réservation de studio                              | P4-03, P5-00          | ⬜     | E     | Après le lancement ; vérifie « Première répétition »                                                                                                                                                                                                                                                                                  |
| P5-03c  | Lieux : gérant vérifié (niveau 2)                  | P5-03a                | ⬜     | E     | Après le lancement (Q20) : dirigeants de l'API Recherche d'entreprises, ProConnect                                                                                                                                                                                                                                                    |
| P4-08   | Vitrine des propositions                           | P4-07                 | ⬜     | E     | Après le lancement ; gratuité à trancher                                                                                                                                                                                                                                                                                              |
| P4-12   | Messagerie temps réel                              | P2-04 ; D8            | ⬜     | E     | Après le lancement                                                                                                                                                                                                                                                                                                                    |
| P6-01   | Personas et barème de la sortie                    | —                     | ⬜     | F     | Après le lancement                                                                                                                                                                                                                                                                                                                    |
| P6-02   | Label                                              | P6-01, P5-02          | ⬜     | F     | Après le lancement                                                                                                                                                                                                                                                                                                                    |
| P6-03   | Éditeur·rice                                       | P6-01                 | ⬜     | F     | Après le lancement                                                                                                                                                                                                                                                                                                                    |
| P6-04   | Communication musicale                             | P6-01                 | ⬜     | F     | Après le lancement                                                                                                                                                                                                                                                                                                                    |
| P6-05   | Carte : actes VI à VIII                            | P3-07, P6-02          | ⬜     | F     | Après le lancement                                                                                                                                                                                                                                                                                                                    |
| P6-06   | Défis collectifs par ville                         | P5-04 ; D3            | ⬜     | F     | Après le lancement                                                                                                                                                                                                                                                                                                                    |
| P6-07   | Autres rôles                                       | P1-13                 | ⬜     | F     | Après le lancement                                                                                                                                                                                                                                                                                                                    |

## 6. Rituels

| Quand            | Quoi                                                                    | Durée  |
| ---------------- | ----------------------------------------------------------------------- | ------ |
| Début de session | Choisir le lot, relire sa fiche                                         | 5 min  |
| Fin de session   | Mettre le tableau à jour, consigner les questions dans `a-trancher.md`  | 5 min  |
| Chaque semaine   | Relire le tableau. Un lot 🟡 depuis plus d'une semaine est découpé      | 15 min |
| Fin d'étape      | Démo du parcours livré, critères vérifiés, questions ouvertes tranchées | ½ jour |

## 6. Navigation et espaces métier — épopée #30

Suivi complémentaire des tickets DASH créés sur GitHub. Ne pas les confondre
avec les lots d'inscription encore ouverts dans #26 et #27.

| Lot     | Issue                                                          | État     | Périmètre                                                                                                                                                                                 |
| ------- | -------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DASH-01 | [#31](https://github.com/Pierre-FABIEN/linkmusician/issues/31) | ✅ local | Navigation globale et contexte métier validé côté serveur ; filtres et principal conservés ; 4 E2E et 1 315 tests unitaires réussis, types sans erreur ni avertissement                   |
| DASH-03 | [#33](https://github.com/Pierre-FABIEN/linkmusician/issues/33) | ✅ local | Audit des services, menus Metro de priorités pour les six métiers ouverts, données réelles et états vides ; droits/visibilité/blocages/âge filtrés ; recette détaillée dans la conception |

Conception : [navigation et contextes](../conception/10-navigation-metiers.md).
Les dépendances fonctionnelles encore ouvertes de #26/#27 (profils avancés,
annonces qualifiées) restent dans leurs lots ; ce socle ne les remplace pas.

Recette DASH-03 (12/11/2026) : 1 319 tests unitaires réussis (247 tests
conditionnels non exécutés), deux tests d'intégration sur le
schéma e2e (gestion des annonces et visibilité des dates) et cinq E2E réussis :
six métiers/données/vides/clavier/mobile 390 px, navigation DASH-01, choix des
modes Jam/Carrière et deux parcours d’aide. Contrôle des types sans erreur ni avertissement.
Les scripts locaux préexistants `.shot-metro.mjs` et `.shot-tmp.mjs` restent
inchangés : le lint global y signale du formatage, et ESLint signale une
variable inutilisée dans `.shot-metro.mjs`. Formatage et ESLint passent hors
ces fichiers (avertissements de navigation Svelte préexistants conservés).
Audit et limites : [actions métier](../conception/11-actions-metiers.md).
