# Plan d'exécution — pilotage du projet

Le dossier [conception/](../conception/README.md) dit **quoi** construire
et **pourquoi**. Ce dossier dit **dans quel ordre**, **comment on s'organise**
et **où on en est**.

## 1. Le découpage : phase → lot → tâche

| Niveau    | Taille                                                      | Exemple                                    | Où il vit                                       |
| --------- | ----------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------- |
| **Phase** | 2 à 6 semaines, un incrément produit utilisable             | Phase 1 : identité musicale et progression | Ce fichier et `phase-N.md`                      |
| **Lot**   | 1 à 4 jours, **une session de travail, commité sur `main`** | P1-05 : localisation floutée               | `phase-N.md` (fiche du lot)                     |
| **Tâche** | Moins d'une demi-journée                                    | Écrire la migration PostGIS                | Liste de tâches dans la PR ou la session Claude |

Règle d'or : **un lot laisse toujours le projet dans un état vert**
(`check`, `lint`, tests unitaires et e2e concernés). On ne commence pas un
lot si le précédent dont il dépend n'est pas fusionné.

## 2. Planification « en vague »

Le projet est trop gros pour tout détailler maintenant. Le détail suit
l'horizon :

| Horizon                           | Niveau de détail                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Phase en cours et suivante (0, 1) | Lots complets : objectif, périmètre, dépendances, critères de fin, tests                                          |
| Phases 2-3 (fin du MVP)           | **Fiches complètes** ([phase-2-3.md](./phase-2-3.md)) : objectif, dépendances, décisions, tâches, critères de fin |
| Phases 4-6                        | **Fiches rédigées** ([phase-4-6.md](./phase-4-6.md)) ; barèmes calibrés par personas en début de phase            |

Depuis le 05/11/2026, **toutes les phases ont leurs fiches** : la revue
de fin de phase (§6) les relit et les ajuste au lieu de les écrire.

## 3. Cycle de vie d'un lot

```
1. Choisir   → premier lot ⬜ du tableau §5 dont les dépendances sont ✅
2. Cadrer    → relire sa fiche, trancher les décisions qu'il référence (docs/decisions)
3. Préparer  → se placer sur main, à jour (pas de branche de lot)
4. Réaliser  → tâches, tests au fil de l'eau
5. Vérifier  → critères de fin de la fiche + « Définition de terminé » (§4)
6. Livrer    → commits sur main, messages suffixés « (P1-05) », puis push
7. Tracer    → statut ✅ et commit dans le tableau §5, doc mise à jour
```

### Travailler avec Claude Code

Une session = un lot. Pour démarrer :

> « On attaque le lot P1-05. »

Claude lit [CLAUDE.md](../../CLAUDE.md), la fiche du lot et les sections
de conception qu'elle référence, propose les tâches, puis réalise.
En fin de session, il met à jour le tableau §5. Si un lot déborde, on le
**coupe** en deux lots (P1-05a, P1-05b) plutôt que de le prolonger.

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

## 4 bis. Le chemin, pas à pas

L'ordre conseillé des prochaines sessions (une session = un lot, on
avance ensemble). Les **décisions** à trancher avant un lot sont
indiquées : on les tranche en début de session.

| #   | Session                                 | Ce qu'on livre                                                                                       | À trancher avant                        |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | P1-13 Indicateurs produit               | `/admin/metrics` : inscrits, onboarding terminé, rétention                                           | —                                       |
| 2   | P0-05 Coquille et identité visuelle     | L'app porte enfin son nom, navigation de l'espace                                                    | **D9** (nom et domaine)                 |
| 3   | P0-06 Doc et synchro amont outillée     | Fin de la phase 0                                                                                    | —                                       |
| 4   | Revue de fin de phase 1                 | Relecture des fiches de phase 2, démo                                                                | **D4** (zone de communication)          |
| 5   | P2-11 Célébrations                      | Chaque gain s'annonce, la montée de niveau se fête                                                   | —                                       |
| 6   | P2-01 Recherche                         | Trouver des musicien·nes par instrument, genre, distance                                             | —                                       |
| 7   | P2-04 Messagerie, puis P2-05 Blocage    | Se parler, en sécurité                                                                               | —                                       |
| 8   | P2-02 Annonces, puis P2-03 Candidatures | Les quêtes émises                                                                                    | —                                       |
| 9   | P2-06 Collaborations                    | Le cœur : jouer ensemble rapporte aux deux                                                           | —                                       |
| 10  | P2-12 Accueil à deux modes              | Le menu « Carrière / Jam »                                                                           | —                                       |
| 11  | P2-13 à P2-16 Mode jam                  | « Je suis dispo », salons, fin de match, carnet de jams                                              | Règles des jams pour les mineur·es (D5) |
| 12  | P2-07 à P2-10                           | Endossements, réputation, notifications, confiance TL2                                               | —                                       |
| 13  | Revue de fin de phase 2                 | Calibrage du barème, relecture des fiches de phase 3                                                 | Modèle du morceau (**D20**)             |
| 14  | P3-01 à P3-03 Groupes                   | Le groupe comme un club, recrutement                                                                 | —                                       |
| 15  | P3-11 Morceau minimal                   | Les campagnes commencent                                                                             | —                                       |
| 16  | P3-04 à P3-09 Étapes et preuves         | Les épreuves vérifiées                                                                               | Liste finale des étapes                 |
| 17  | P3-12 à P3-14 Carrière                  | Ambition, écran de carrière, carte (actes I-III), fiche de carrière                                  | Liste des déblocages (07 §4.5)          |
| 18  | P3-10 Ouverture publique                | Production, pages légales, sécurité ; app ouverte à tous (pas de bêta, D23)                          | Pages légales                           |
| 19  | P4-01 à P4-13 Métiers du son            | Ingé son, studio, producteur, crédits, vitrine, actes III-IV, temps réel, coups de pouce             | Gratuité de la vitrine                  |
| 20  | P5-01 à P5-10 La scène                  | Lieux et jams publiques, organisateurs, concerts vérifiés, bookers, managers, offre pro, réservation | `VENUE_HOST`                            |
| 21  | P6-01 à P6-07 Sortie et développement   | Label, éditeur, communication, actes VI-VIII, défis collectifs, autres rôles                         | Preuves de placement                    |

## 5. Tableau de suivi

Statuts : ⬜ à faire · 🟡 en cours · ✅ fait · ⏸ bloqué · ✂️ découpé

### Phase 0 — Préparer le socle pour LinkMusician → [phase-0.md](./phase-0.md)

| Lot    | Intitulé                                                           | Dépend de         | Statut | PR                                                                                                                                                                                                                    |
| ------ | ------------------------------------------------------------------ | ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-01  | Environnement local et état de référence                           | —                 | ⏸      | Tout est vert sauf e2e : en attente d'une base dédiée, voir [état de référence](./etat-de-reference.md)                                                                                                               |
| P0-01b | Rapatrier la réparation du socle (faite en amont)                  | —                 | ✅     | Synchro `fe82121`, historique relié (`d24aed5`)                                                                                                                                                                       |
| P0-02  | Trancher les décisions de lancement                                | —                 | 🟡     | D6 et D10 tranchées le 03/11                                                                                                                                                                                          |
| P0-03  | Mettre la boutique en veille (interrupteur `SHOP_ENABLED`)         | P0-01             | ✅     | Boutique en veille (`f430e13`), sur `main` le 04/11                                                                                                                                                                   |
| P0-04  | Base dédiée, PostGIS, rôle MODERATOR                               | P0-01             | ✅     | PostGIS 3.6 en dev et en e2e, CI sur `postgis/postgis:16-3.4`, gardes `requireModerator`. Suite e2e non relancée                                                                                                      |
| P0-05  | Coquille de l'application et identité visuelle de base             | P0-03, P0-02 (D9) | ✂️     | Découpé en P0-05a, b et c, tous ✅                                                                                                                                                                                    |
| P0-05a | Nom et identité (LinkMusician partout, SEO, image de partage)      | P0-03, D9         | ✅     | `BRAND` central, SEO et sitemap, emails, 2FA, écran de chargement, manifeste, image OG ; D9 acceptée                                                                                                                  |
| P0-05b | Coquille de l'espace (navigation, pages « bientôt », thème sombre) | P0-05a            | ✅     | Layout `(app)` : navigation (Mon parcours, Découvrir, Annonces, Messages, Profil), pages « bientôt », couleurs LinkMusician en clair et en sombre (le thème suit l'appareil). E2E et axe au vert dans les deux thèmes |
| P0-05c | Accueil public (présentation, « Créer un compte »)                 | P0-05a            | ✅     | Accueil `/accueil` (servi à `/` en mode LinkMusician) : accroche, « Créer un compte », modes carrière et jam, trois étapes, connexion. Sans liste d'attente (D23). Bandeau cookies sans « panier » en veille          |
| P0-06  | Documentation et synchro amont outillée                            | P0-05             | ✅     | README LinkMusician d'abord, [procédure de synchro](../linkmusician/synchro-boilerplate.md) validée par une synchro de test, `npm run seed:demo` (12 musicien·nes fictifs, non destructif, points par le moteur)      |
| P0-07  | Mobile d'abord et PWA installable                                  | P0-05             | ✅     | Barre d'onglets mobile, en-têtes empilés, manifeste et icônes LinkMusician, service worker prudent (production), D24 ; correctif de la surveillance Vite (cause des lenteurs e2e). E2E mobile 390 px au vert          |

### Phase 1 — Identité musicale et moteur de progression → [phase-1.md](./phase-1.md)

| Lot    | Intitulé                                                          | Dépend de                    | Statut | PR                                                                                                                                                                                                                                         |
| ------ | ----------------------------------------------------------------- | ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1-01  | Noyau de progression pur (`progression/core`)                     | — _(parallélisable avec P0)_ | ✅     | Noyau pur, 89 tests en tables, couverture 99 %, personas calibrés (barème v1), garde-fou ESLint                                                                                                                                            |
| P1-02  | Maquettes : onboarding, profil, tableau de bord                   | P0-02                        | ✅     | Maquettes `/_lab` (dev seulement) et 7 composants de progression, **validées le 04/11/2026** ; libellés D11 fixés                                                                                                                          |
| P1-03a | Inscription : personne, âge minimum, rôle MODERATOR               | P0-03                        | ✅     | Parcours vérifié dans le navigateur ; spec e2e dédié à écrire, suite e2e non relancée                                                                                                                                                      |
| P1-03b | Choix des métiers (« Qui es-tu ? »)                               | P1-03a                       | ✅     | Parcours vérifié dans le navigateur ; spec `e2e/linkmusician/metiers.spec.ts` au vert (04/11)                                                                                                                                              |
| P1-04  | Référentiels instruments et genres                                | P0-04                        | ✅     | 63 instruments, 94 genres, seed rejouable (`seed:referentiels`), `/admin/referentiels`. Voir [docs/skills](../skills/README.md)                                                                                                            |
| P1-05  | Localisation floutée                                              | P1-03a                       | ✅     | `/profil/ville`, centre de commune sur grille ~2 km, tranches de distance, test d'intégration PostGIS. Voir [docs/geo](../geo/README.md)                                                                                                   |
| P1-06  | Compétences : instruments, genres, influences                     | P1-03a, P1-04                | ✅     | `/profil/musical`, règles pures testées, RGPD. Événements `profile.*` reportés à P1-07 (pas encore de registre). Spec e2e au vert (04/11)                                                                                                  |
| P1-06b | Profil complet : statut pro, recherche, matériel, mobilité, liens | P1-06                        | ✅     | `/profil` : bio, statut pro déclaré, recherche, matériel, pratique, rayon, liens contrôlés ; RGPD. Spec e2e au vert (04/11)                                                                                                                |
| P1-07  | Registre XP, outbox, projecteur, succès                           | P1-01, P1-03a                | ✅     | Outbox, registre en ajout seul (déclencheur), projection reconstructible, succès ; `profile.completed` émis. Tests d'intégration au vert. Voir [docs/progression](../progression/README.md)                                                |
| P1-08a | Médias : liens externes, publication, quota                       | P1-03a                       | ✅     | `/profil/medias`, `/medias/[id]` (404 si non publié), XP de la première démo. Voir [docs/media](../media/README.md)                                                                                                                        |
| P1-08b | Médias : envoi de fichiers Cloudinary, webhook, lecteurs          | P1-08a                       | ✅     | Envoi direct signé, confirmation et webhook (signature testée), lecteurs, CSP, suppression Cloudinary. Vérifié avec un vrai envoi                                                                                                          |
| P1-09  | Confiance TL0/TL1 et quotas                                       | P1-07                        | ✅     | Confiance TL0-TL3 recalculée à chaque événement et chaque nuit (`/api/jobs/trust`), quotas par palier, `/reglages`. Test « quota médias » reporté à P1-08 (pas de table média)                                                             |
| P1-10  | Onboarding                                                        | P1-02, P1-05, P1-06, P1-07   | ✅     | 6 écrans, étape déduite du profil, reprise, premier résultat ; e2e (6 écrans, reprise, a11y) au vert. Voir [docs/onboarding](../onboarding/README.md)                                                                                      |
| P1-11  | Profil public et tableau de bord de progression                   | P1-08, P1-10                 | ✅     | `/@handle` (SEO, JSON-LD `Person`, 404 si masqué), tableau de bord `/espace` (niveau, XP, palier, 3 objectifs, gains, succès), masquage dans `/reglages` (D19). E2E au vert. Voir [docs/profil-public](../profil-public/README.md)         |
| P1-12  | Signalements, modération minimale, RGPD étendu                    | P1-08                        | ✅     | Signalements, file `/moderation` (modérateurs et admins), validation des médias, avertissement et suspension, RGPD (registre XP, signalements, sanctions). Voir [docs/moderation](../moderation/README.md)                                 |
| P1-13  | Instrumentation des indicateurs produit                           | P1-10                        | ✅     | `/admin/indicateurs` (admins) : onboarding, conversation à 14 j, collaboration à 60 j, rétention à 30 j, spam, inscriptions par semaine, demande par métier ; relevé `ActorActivityDay`. Voir [docs/indicateurs](../indicateurs/README.md) |

### Phase 2 — Découverte, annonces, messagerie, collaborations → [phase-2-3.md](./phase-2-3.md)

| Lot   | Intitulé                                      | Dépend de    | Statut | PR                                                                                                                                                                                                                                                    |
| ----- | --------------------------------------------- | ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-01 | Recherche géographique multicritère           | P1-05, P1-06 | ✅     | `/decouvrir` : rayon, instrument et niveau, genre (parent ⊃ sous-genres), envie, statut, réciproque ; tranches seulement ; intégration PostGIS, e2e, k6 (p95 438 ms). Voir [docs/recherche](../recherche/README.md)                                   |
| P2-02 | Annonces (opportunités)                       | P1-09        | ✅     | Publier (jam, recrutement, session), conditions affichées, quota TL, liste autour de soi, mes annonces, clôture, expiration quotidienne, signalement et retrait par la modération, RGPD. Voir [docs/annonces](../annonces/README.md)                  |
| P2-03 | Candidatures                                  | P2-02        | ✅     | Postuler (conditions vérifiées), présélection, acceptation qui ouvre une conversation liée à l'annonce (+30 XP chacun à la réciprocité), annonce complète, retrait, RGPD. Voir [docs/annonces](../annonces/README.md#candidatures-p2-03)              |
| P2-04 | Messagerie (demandes, conversations, polling) | P1-09        | ✅     | Demandes, acceptation ou refus, conversations, non-lus (pastille), polling 15 s, quota TL, mineurs (D5), signalement, RGPD. Voir [docs/messagerie](../messagerie/README.md)                                                                           |
| P2-05 | Blocage                                       | P2-04        | ✅     | Bloquer depuis le profil ou la conversation, effet dans les deux sens (profil, médias, recherche, messages), liste et déblocage dans `/reglages`, blocages et refus dans la confiance. Voir [docs/messagerie](../messagerie/README.md#blocage-p2-05)  |
| P2-06 | Collaborations à double confirmation          | P2-03, P1-07 | ⬜     |                                                                                                                                                                                                                                                       |
| P2-07 | Endossements                                  | P2-06        | ⬜     |                                                                                                                                                                                                                                                       |
| P2-08 | Réputation (job et carte publique)            | P2-06, P2-07 | ⬜     |                                                                                                                                                                                                                                                       |
| P2-09 | Notifications in-app et email                 | P2-04, P2-06 | ⬜     |                                                                                                                                                                                                                                                       |
| P2-10 | Confiance TL2 et détection de collusion       | P2-06        | ⬜     |                                                                                                                                                                                                                                                       |
| P2-11 | Célébrations (gains, niveaux, rangs, succès)  | P1-11        | ✅     | Cartes gains, niveau, succès, montée de confiance, une fois et une seule (`celebrationsSeenAt`), non bloquantes, mouvement réduit respecté. Messages des formulaires simplifiés. Voir [docs/progression](../progression/README.md#célébrations-p2-11) |
| P2-12 | Accueil à deux modes : carrière et jam        | P0-05        | ⬜     |                                                                                                                                                                                                                                                       |
| P2-13 | Mode jam : « Je suis dispo »                  | P2-01, P2-12 | ⬜     |                                                                                                                                                                                                                                                       |
| P2-14 | Mode jam : salons                             | P2-02, P2-13 | ⬜     |                                                                                                                                                                                                                                                       |
| P2-15 | Mode jam : fin de match                       | P2-06, P2-14 | ⬜     |                                                                                                                                                                                                                                                       |
| P2-16 | Carnet de jams et réseau musical              | P2-15        | ⬜     |                                                                                                                                                                                                                                                       |

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
| P3-11 | Morceau minimal (`Work`, contributeurs, maquette)    | P3-01 ; D20   | ⬜     |     |
| P3-12 | Ambition et écran de carrière                        | P2-12, P3-11  | ⬜     |     |
| P3-13 | Carte de carrière (actes I à III)                    | P3-05, P3-12  | ⬜     |     |
| P3-14 | Fiche de carrière et cartes souvenirs                | P2-08, P3-13  | ⬜     |     |
| P3-10 | Ouverture publique (pas de bêta, D23)                | Tout le reste | ⬜     |     |

### Phases 4 à 6 — Les autres métiers et la carrière complète → [phase-4-6.md](./phase-4-6.md)

Lots P4-01 à P4-13 (studio, ingé son, producteur, crédits, vitrine des
propositions, actes III-IV, temps réel, coups de pouce), P5-01 à P5-10
(lieux, organisateurs, bookers, managers, concerts vérifiés, acte V),
P6-01 à P6-07 (label, éditeur, communication, actes VI-VIII, défis
collectifs, autres rôles). Fiches complètes dans
[phase-4-6.md](./phase-4-6.md) ; ils entrent dans ce tableau à la revue
de fin de la phase précédente.

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
| Phase 2 | Liste d'attente sur une page d'accueil. Faire connaître le mode jam dans les lieux relais (scènes ouvertes, écoles, magasins)                                                                                         |
| Phase 3 | Ouverture publique (P3-10). Premières annonces et jams réelles avec les lieux relais. Suivre chaque semaine les indicateurs de [conception/05 §2](../conception/05-mvp-roadmap.md#2-stratégie-mvp)                    |

## 8. Ordre de grandeur

Pour une personne à plein temps, assistée par Claude Code. Indicatif
seulement, à recalibrer après la phase 0.

| Phase   | Lots   | Durée estimée                     |
| ------- | ------ | --------------------------------- |
| 0       | 8      | 1 à 2 semaines                    |
| 1       | 13     | 4 à 6 semaines                    |
| 2       | 16     | 5 à 7 semaines                    |
| 3       | 14     | 5 à 7 semaines                    |
| **MVP** | **51** | **≈ 4,5 à 5,5 mois**              |
| 4 à 6   | 30     | à estimer à chaque revue de phase |
