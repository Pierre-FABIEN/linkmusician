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

Correction DASH-01 du 13/11/2026 : restauration des raccourcis à icônes en haut
à droite et suppression de la ligne de navigation textuelle, à la demande
produit. Sélecteur métier conservé. Types : 0 erreur et 0 avertissement ;
ESLint ciblé sans erreur ; parcours E2E navigation multirôle réussi
(mobile 390 px, clavier, accessibilité, filtres et fiches métier). Une première
exécution a expiré au chargement initial avant les assertions de navigation ;
la relance seule passe intégralement.

Correction DASH-01 du 13/11/2026 (suite) : sélecteur de rôle réduit à une liste
déroulante « Rôle : … » à côté des icônes, qui bascule dès la sélection et
disparaît quand un seul métier est détenu ; bouton clair/sombre mémorisé dans la
coquille ; « Mon espace » passe dans le menu du compte. Types : 0 erreur et
0 avertissement ; parcours E2E navigation multirôle réussi (un seul rôle sans
sélecteur, thème sombre audité en accessibilité, clavier, filtres). Une première
exécution a planté à l'ouverture du navigateur (mémoire WSL) ; la relance passe.

| Lot      | Issue                                                          | État     | Périmètre                                                                                                                                                                                 |
| -------- | -------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DASH-01  | [#31](https://github.com/Pierre-FABIEN/linkmusician/issues/31) | ✅ local | Navigation globale et contexte métier validé côté serveur ; filtres et principal conservés ; 4 E2E et 1 315 tests unitaires réussis, types sans erreur ni avertissement                   |
| DASH-02  | [#32](https://github.com/Pierre-FABIEN/linkmusician/issues/32) | ✅ local | Structures et agences DASH-02a/02b complétées par les affectations consenties DASH-04b ; aucun droit administratif ou artistique par appartenance.                                        |
| DASH-02a | [#32](https://github.com/Pierre-FABIEN/linkmusician/issues/32) | ✅ local | Cinq types de structures, capacités communes relues côté serveur, menu privé des participations, invitations et révocation effective ; aucun droit par métier ou simple appartenance      |
| DASH-03  | [#33](https://github.com/Pierre-FABIEN/linkmusician/issues/33) | ✅ local | Audit des services, menus Metro de priorités pour les six métiers ouverts, données réelles et états vides ; droits/visibilité/blocages/âge filtrés ; recette détaillée dans la conception |
| DASH-04  | [#34](https://github.com/Pierre-FABIEN/linkmusician/issues/34) | ✅ local | Mandats individuels DASH-04a et affectations consenties DASH-04b ; les candidatures et le booking avancé restent dans leurs lots.                                                         |
| DASH-04a | [#34](https://github.com/Pierre-FABIEN/linkmusician/issues/34) | ✅ local | Périmètres immuables, dates, départements et activités consentis, contrôle des crédits concert, révocation et droits relus sous verrou ; recette ci-dessous                               |
| DASH-02b | [#32](https://github.com/Pierre-FABIEN/linkmusician/issues/32) | ✅ local | Agences privées, invitations et rôles, acceptation, révocation, transmission et fermeture ; aucun droit artistique implicite. Affectations et délégations complétées par DASH-04b.        |
| DASH-04b | [#34](https://github.com/Pierre-FABIEN/linkmusician/issues/34) | ✅ local | Affectations nominatives, double accord, droits explicites, périmètre du mandat et adhésions figées ; recette ci-dessous.                                                                 |

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

Recette DASH-02a (12/11/2026) : 1 326 tests unitaires réussis (251 tests
conditionnels non exécutés), 44 tests d'intégration distincts réussis :
40 non-régressions groupes/studios/organisateurs/lieux/écoles et 4 nouveaux
tests du socle, dont une révocation pendant l'attente d'un verrou. Six E2E
ciblés réussis : structures, école, navigation métier, actions prioritaires et
deux parcours d'aide. Types sans erreur ni avertissement, exécutés séparément
des E2E. Formatage et ESLint passent hors les deux scripts préexistants déjà
signalés ci-dessus ; ces fichiers sont préservés. Le sélecteur de commune du
support E2E est limité à sa liste de résultats pour éviter de sélectionner
une option du contexte métier.
Détail et limites : [structures et équipes](../conception/12-structures-equipes.md).

Recette DASH-04a (13/11/2026) : types sans erreur ni avertissement,
1 329 tests unitaires réussis, 255 tests conditionnels non exécutés
(`npm run test:unit -- --run --maxWorkers=2 --testTimeout=30000`). Les
premiers passages avec le délai par défaut ont dépassé les délais de tests
du socle (jobs et imports à froid) ; aucun de ces tests n’a été modifié.
Quinze tests d’intégration réussis en séquence : onze d’accompagnement et
quatre de concerts. Trois E2E Chromium réussis : parcours booker avec
périmètre consenti, crédit concert, révocation, refus du POST forgé et
mobile 390 px/accessibilité ; deux parcours d’aide. Les migrations ont été
appliquées sur le développement et sur e2e ; schéma Prisma validé.
Formatage et ESLint passent hors les deux scripts `.shot-*` préexistants ;
`npm run lint` global retrouve leur défaut de formatage déjà documenté.
Les avertissements ESLint préexistants sont conservés. Aucun push effectué.
Périmètre et limites : [mandats individuels](../conception/13-mandats-individuels.md).

Recette DASH-02b (13/11/2026) : 1 338 tests unitaires réussis, 262 tests
conditionnels non exécutés (`--maxWorkers=2 --testTimeout=30000`). Onze
tests d’intégration réussis : sept agences (rôles, quota, invitation,
blocage, révocation pendant attente du verrou, transmission, fermeture,
export et anonymisation), quatre non-régressions du socle des structures.
Quatre E2E Chromium réussis : agences, structures et deux parcours d’aide.
Le parcours agence teste les refus serveur en GET/POST après révocation,
l’absence d’équipe pour un collaborateur, le profil privé,
l’accessibilité axe et la largeur à 390 px.
Migration enum additive appliquée sur `public` et `e2e`. Scénario agence
joué en développement puis rejoué sans doublon (comptes démo exclusivement).
Formatage et ESLint passent hors `.shot-metro.mjs` et `.shot-tmp.mjs`,
défauts préexistants conservés : le lint global reste bloqué sur leur
formatage. Les sept tests d’intégration des écoles passent également ; le contrôle
des types passe sans erreur ni avertissement, séparément des E2E. Aucun push. Périmètre : [DASH-02b](../conception/14-agences-equipes.md).

Recette DASH-04b (13/11/2026) : 1 344 tests unitaires réussis, 272 tests
conditionnels non exécutés (`--maxWorkers=2 --testTimeout=30000`).
Trente-cinq tests d’intégration distincts réussis : onze mandats existants,
dix affectations (les dix rejoués après la projection légère de la liste et
le contrôle des payloads), sept agences et sept écoles. Quatre E2E distincts
réussis : booker existant, deux parcours d’aide et nouveau parcours à trois
comptes pour les affectations. Le nouveau parcours a été relancé seul après
correction de son sélecteur de case de confirmation (retour à la ligne dans
le label) ; l’action finale, les refus des POST forgés, le retour dans
l’agence, axe et 390 px sont vérifiés.
Types sans erreur ni avertissement. Formatage et ESLint au vert hors les
scripts locaux `.shot-metro.mjs` et `.shot-tmp.mjs` préexistants ; le lint
global reste bloqué par leur formatage. Migrations additives appliquées sur
`public` et `e2e`, seed joué et rejoué (une proposition, aucun accord donné).
L’index partiel est préservé par le nettoyeur de migrations, vérifié par
assertion Node. Aucun push effectué.

Suivi GitHub : synchroniser les lots au fil des livraisons, avec preuve,
commit et distinction local/publié. #31 et #33 clôturées ; DASH-02 et
DASH-04 sont réalisés localement. Les candidatures déléguées (#37/#44),
le booking avancé (#45) et le journal commun (#35) restent leurs propres lots.
Détail : [affectations et délégations](../conception/15-affectations-delegations.md).

### DASH-05 — journal d’activité (#35), découpage au 14/11/2026

Les dépendances DASH-02 et DASH-04 sont publiées et présentes dans la base
`5e7f982` récupérée depuis `origin/main`.

| Lot            | État      | Périmètre                                                                                                                              |
| -------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| DASH-05a       | ✅ publié | Audit des traces, contrat de lecture commun et historique privé des affectations, sans nouveau stockage ni notification.               |
| DASH-05b       | ✅ publié | Historiques privés des mandats conservés, dont terminés, et invitations personnelles des structures.                                   |
| DASH-05c       | ✅ publié | Refus et retraits de propositions conservés atomiquement, auteurs réels, accès privés et RGPD.                                         |
| DASH-05d       | ✅ local  | Actes de co-gestion PROMOTER/VENUE et historique des périodes personnelles, accès après départ sans outils ; autres circuits à suivre. |
| DASH-05, suite | ⬜        | Autres circuits de participation (groupes, studios, agences, écoles), validations de collaboration et futures options.                 |

Le journal commun n’est pas terminé. Conception et limites :
[journal d’activité](../conception/16-journal-activite.md).

Recette DASH-05a (14/11/2026) : 1 348 tests unitaires réussis, 273 tests
conditionnels non exécutés. Onze tests d’intégration des affectations réussis
sur le schéma `e2e`, dont le nouveau contrôle du journal, des auteurs et de
l’absence d’émission supplémentaire. Trois E2E Chromium réussis : parcours
des affectations (deux accords, retrait, droits, axe et 390 px) et deux
parcours d’aide. Aucun nouveau stockage ni migration ; la proposition du
seed existant alimente directement l’historique, sans générer de consentement.
Types sans erreur ni avertissement. Formatage des fichiers modifiés et
ESLint hors `.shot-metro.mjs` et `.shot-tmp.mjs` conformes ; le lint global
reste bloqué par ces deux scripts préexistants (formatage et variable `c`
inutilisée dans `.shot-metro.mjs`). Aucun push effectué.

Recette DASH-05b (14/11/2026) : 1 354 tests unitaires réussis, 278 tests
conditionnels non exécutés. Vingt tests d’intégration réussis sur `e2e` :
quatre nouveaux tests des mandats historiques, cinq tests des structures
(dont invitation personnelle) et onze non-régressions des affectations.
Quatre E2E distincts réussis : nouveau cycle proposition/confirmation/fin
du mandat et accès privé, structures et invitations, deux parcours d’aide.
Clavier, axe et 390 px vérifiés. Le spec des structures utilisait encore
l’ancien sélecteur « Mon espace » et son bouton de validation : il utilise
désormais « Rôle » et sa soumission automatique, comme la navigation actuelle ;
ce spec a été relancé seul et passe entièrement.
Types sans erreur ni avertissement. Formatage des fichiers modifiés et ESLint
hors les deux scripts locaux préexistants conformes, mêmes réserves de lint
global que DASH-05a. Pas de migration ni de nouveau stockage ; les scénarios
de seed existants alimentent les lectures. Aucun push effectué.

Recette DASH-05c (14/11/2026) : `origin/main` vérifié par `git ls-remote`
à `ac4d736` : DASH-05a et DASH-05b sont déjà publiés. DASH-05c est livré
localement sur `main`, sans push. Migration additive
`20261114180757_representation_proposal_decisions` générée, nettoyée et relue,
appliquée en développement et sur `e2e` ; client régénéré. Pas de retour SQL
destructif des valeurs d’enum (justification dans la conception).

35 tests d’intégration réussis : 12 historiques privés (concurrence, rollback,
refus, retrait, droits, agence, export/anonymisation), 12 accompagnements
(dont refus après attente d’une révocation de gestion), 11 affectations.
1 356 tests unitaires réussis ; 287 tests conditionnels non exécutés après ajout
des nouvelles recettes. Les premières assertions ont été adaptées : comptage
des notifications limité aux comptes du test et export incluant désormais
les propositions déclinées. L’historique isolé passait déjà avant cette relance.

Le lint global reste bloqué par le formatage des deux scripts préexistants
`.shot-metro.mjs` et `.shot-tmp.mjs`. ESLint hors ces scripts : 0 erreur,
464 avertissements existants. Aucun événement ancien reconstruit. Participations,
validations et futures options restent à traiter ; #35 et #30 restent ouverts.

Validation finale DASH-05c : types 0 erreur / 0 avertissement ; formatage et
ESLint ciblés conformes. Quatre E2E distincts réussis : cycle du mandat existant,
deux parcours d’aide et nouveau parcours refus/retrait (clavier, axe, 390 px).
Le nouveau test a été relancé seul avec succès après correction de son contrôle
sur le script SSR de la page précédente : une réponse fraîche du journal est
maintenant vérifiée. Aucun `check` exécuté en même temps que les E2E.
`npm run seed:demo` exécuté avec succès ; les deux lignes fictives sont vérifiées
avec auteur, date et périmètre vide. Le seed utilise des upserts à identifiants
stables et ne reconstruit aucune décision réelle.

Reprise et vérification DASH-05c (14/11/2026) : le lot était déjà implémenté
au début de cette session, dans `8827f11b40b7ed631a91af7486b42c2817fef99f`.
`git ls-remote origin refs/heads/main` renvoie maintenant ce même commit :
DASH-05a, DASH-05b et DASH-05c sont publiés. La mention « local » de la
recette initiale ci-dessus décrit son état au moment de la livraison ; elle
n’est plus l’état actuel. Aucun push effectué pendant cette reprise.
L’audit des services, du lecteur privé, du journal et du traitement RGPD
confirme la conservation et ses accès privés. Une correction complémentaire
exclut `DECLINED` et `WITHDRAWN` du compteur des objectifs métier : ces lignes
conservées ne valident plus « Propose d’accompagner un artiste », comme avant
lorsqu’elles étaient supprimées. Les deux décisions sont testées avant/après
dans la recette d’intégration. Aucune migration supplémentaire nécessaire.
Les 130 migrations sont à jour en développement et sur
`e2e` (`db:status`, puis `E2E=1 npm run db:status`). Les deux décisions de
démo ont été relues en base avec auteur, date et termes privés vides.

Recette de reprise : 1 356 tests unitaires réussis (287 conditionnels non
exécutés), 35 tests d’intégration réussis sur `e2e`, puis les 12 tests des
historiques privés relancés avec succès après ajout du contrôle des objectifs
pour refus et retrait. Les quatre E2E (cycle du mandat, refus/retrait et deux
parcours d’aide) passent, avec clavier, axe et 390 px. Les contrôles E2E et
types sont exécutés séparément ; types : 0 erreur, 0 avertissement. ESLint et formatage ciblés conformes ; le
lint global retrouve uniquement les deux scripts préexistants au stade
Prettier (`.shot-metro.mjs`, `.shot-tmp.mjs`). La correction et ce complément
de suivi sont livrés dans un nouveau commit local `(DASH-05c)`, sans push.
#35 et #30 restent ouvertes avec les mêmes limites de périmètre.

### DASH-05d — actes de co-gestion des lieux et organisations

Lot borné au service `organizations/comanagement.ts` (PROMOTER/VENUE), après
inventaire des circuits de participation dans [la conception](../conception/16-journal-activite.md).
Acceptation, refus personnel, annulation par la gestion, départ, retrait et
responsabilité reçue conservent auteur réel et date dans la transaction existante,
sous verrou d’organisation, avec protection d’unicité par période et type d’acte.
Le retrait relit aussi le type et la structure vivante, y compris pour soi-même.
Aucune reconstitution depuis les états, rôles, dates ou notifications.

`/structure/historique` restitue uniquement ses propres périodes conservées des
lieux et organisations, même closes, sans outils ni accès aux collègues. La fiche
courante conserve sa garde et perd son accès après départ. Les groupes, studios,
agences et écoles ne sont pas couverts par ce nouveau circuit ; validations de
collaboration et futures options restent également à suivre. DASH-05/#35 et
l’épopée #30 restent ouverts.

Migration additive `20261114184911_membership_comanagement_decisions` générée,
nettoyée, relue et appliquée via les scripts du dépôt en développement et sur
`e2e`, client régénéré. Retour destructif après écriture écarté et justifié dans
la conception ; aucun index préexistant modifié. Export des actes personnels et
des actes pour autrui ; anonymisation de toutes les références d’auteur. Aucun
message, motif ou titre privé copié. Aide, fil d’Ariane, conception et démo
actualisés. `seed:demo` exécuté ; trois périodes fictives et quatre actes avec
auteur/date vérifiés en base, sans convertir les participations existantes.

Recette : 1 359 tests unitaires réussis (301 conditionnels non exécutés),
19 tests d’intégration des historiques et accès (14 nouveaux + 5 existants),
12 tests de non-régression des lieux et organisations, et 3 E2E (structures,
deux parcours d’aide) réussis. Le parcours structures couvre acceptation,
départ réel, perte d’accès et lecture de ses propres traces, clavier, axe et
390 px. Types : 0 erreur, 0 avertissement, exécutés séparément des E2E.
ESLint et formatage ciblés conformes. Le lint global reste bloqué par les
scripts préexistants `.shot-metro.mjs` et `.shot-tmp.mjs`.

État distant revérifié le 14/11/2026 : `git ls-remote origin refs/heads/main`
renvoie `7253877e1873b575adaa0fd57a76c7064fcdd883` ; le correctif DASH-05c
est donc désormais publié, contrairement à son état lors de la reprise
précédente. DASH-05d reste un nouveau commit **local** sur `main` ; aucun
push effectué pendant cette session.
