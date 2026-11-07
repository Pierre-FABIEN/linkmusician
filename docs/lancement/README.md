# LinkMusician, de l’idée à la startup

_Feuille de route de création et de lancement de l’entreprise : MusicTech et CultureTech, lancement à Toulouse et dans sa métropole._

> **En bref**
>
> - **Objectif** : transformer LinkMusician en une startup viable, avec une communauté musicale active et un modèle économique durable.
> - **Six phases** : structurer le projet, préparer le produit, lancer à Toulouse, intégrer un incubateur, créer l’entreprise, se développer.
> - **Calendrier déjà fixé** : ouverture publique à Toulouse **début mars 2027**, sans bêta fermée (D23, D28).
> - Chaque étape indique, dans un encart **📍 Dans le projet**, ce qui existe déjà et ce qui reste à faire (état au 07/11/2026).

## Où en est-on {#etat}

| Phase                      | Objectif principal       | Résultat attendu              | État        |
| -------------------------- | ------------------------ | ----------------------------- | ----------- |
| 1. Structuration           | Définir le projet        | Vision et modèle économique   | 🟡 en cours |
| 2. Préparation             | Stabiliser le produit    | MVP prêt à être utilisé       | 🟡 en cours |
| 3. Lancement local         | Construire la communauté | Premières expériences réelles | ⬜ à venir  |
| 4. Incubation              | Accélérer le projet      | Accompagnement et réseau      | ⬜ à venir  |
| 5. Structuration juridique | Créer l’entreprise       | Société opérationnelle        | ⬜ à venir  |
| 6. Développement           | Construire la croissance | Modèle reproductible          | ⬜ à venir  |

Les trois prochaines actions hors code, qui ne dépendent pas du produit :

1. **Les entretiens** (étape 2) : 40 personnes à interroger, à commencer dès maintenant dans les jams et les écoles.
2. **La situation de salarié·e** (étape 6) : relire son contrat de travail (exclusivité, propriété intellectuelle) avant toute création d’entreprise.
3. **Le nom et le domaine** (étapes 5 et 6) : vérifier la marque LinkMusician à l’INPI et réserver le domaine définitif.

---

## Phase 1 — Structurer le projet {#phase-1}

_Objectif : transformer l’idée en projet entrepreneurial clairement défini._

### Étape 1 — Définir la vision de LinkMusician

Définir précisément ce que LinkMusician souhaite devenir.

**Positionnement envisagé** : LinkMusician est une plateforme qui accompagne les musiciens dans leur développement artistique et professionnel, depuis les premières rencontres musicales jusqu’à la réalisation de projets, la création de groupes et l’accès aux opportunités professionnelles.

**Les trois piliers du produit :**

1. **Mode jam** : faciliter les rencontres musicales et les sessions de jeu.
2. **Mode carrière** : accompagner les collaborations, les groupes, les compositions et les expériences musicales.
3. **Écosystème professionnel** : connecter les musiciens aux salles, studios, organisateurs et professionnels de l’industrie musicale.

**Actions :**

- Définir la proposition de valeur.
- Identifier les problèmes prioritaires des utilisateurs.
- Déterminer les fonctionnalités indispensables au lancement.
- Définir les fonctionnalités qui peuvent attendre.

**Livrable** : une présentation synthétique du projet (1 à 2 pages).

> 📍 **Dans le projet** : la vision, les acteurs et leurs besoins, et ce qu’on refuse de construire sont écrits (`docs/conception/01-analyse-produit.md`, `07-modes-de-jeu.md`, `08-carrieres-par-role.md`). Reste à en tirer la **synthèse de 1 à 2 pages**, pour un public extérieur.

### Étape 2 — Étudier le marché

Vérifier que les problèmes identifiés correspondent à une demande réelle.

**Actions :**

- Identifier les concurrents directs et indirects.
- Étudier leurs fonctionnalités, leurs tarifs et leur positionnement.
- Identifier leurs points faibles.
- Comprendre les habitudes des musiciens.
- Identifier les opportunités commerciales auprès des établissements et professionnels.

**Entretiens à réaliser**, au minimum :

| Profil                                              | Nombre |
| --------------------------------------------------- | ------ |
| Musiciens amateurs                                  | 15     |
| Musiciens semi-professionnels ou professionnels     | 10     |
| Responsables de groupes                             | 5      |
| Organisateurs de jams ou responsables de lieux      | 5      |
| Professionnels (studios, salles, producteurs, etc.) | 5      |

**Questions essentielles :**

- Comment trouvez-vous actuellement des musiciens ?
- Quelles sont vos principales difficultés ?
- Comment organisez-vous vos collaborations ?
- Qu’est-ce qui vous manque dans les outils actuels ?
- Utiliseriez-vous LinkMusician ?
- Pour quelle fonctionnalité seriez-vous prêt à payer ?

**Livrable** : étude de marché initiale et synthèse des besoins.

> 📍 **Dans le projet** : un premier tour des plateformes comparables et de leurs revenus existe (conception 01 §5.1). Les **40 entretiens restent à faire** : c’est l’action la plus utile maintenant, et la démo (`npm run seed:demo`) sert de support pour montrer l’app pendant les entretiens.

### Étape 3 — Définir le modèle économique

Identifier les personnes qui utiliseront la plateforme et celles qui pourront financer son développement.

**Pistes de revenus :**

- Abonnement Premium pour musiciens.
- Abonnement pour groupes.
- Abonnements professionnels pour établissements et organisateurs.
- Mise en avant d’opportunités.
- Services de mise en relation professionnelle.
- Commissions éventuelles sur certaines prestations.

**Actions :**

- Définir les fonctionnalités gratuites.
- Identifier les fonctionnalités payantes.
- Estimer les coûts de fonctionnement.
- Établir plusieurs scénarios de revenus.
- Déterminer le coût d’acquisition potentiel d’un utilisateur.

**Livrable** : premier Business Model Canvas et hypothèses financières.

> 📍 **Dans le projet** : les sources de revenus sont classées, avec ce qu’on refuse (jamais d’XP ni de visibilité à vendre, conception 01 §5.2 à §5.4) ; la monétisation arrive **après** le lancement (D28). Restent le **Business Model Canvas**, les coûts réels (hébergement, base, emails, médias) et les scénarios chiffrés. À cadrer : la « mise en avant d’opportunités » (une annonce ou un appel à projets en avant) doit rester distincte d’un boost de profils dans la recherche, refusé, comme la messagerie payante.

---

## Phase 2 — Préparer le lancement du produit {#phase-2}

_Objectif : disposer d’un produit suffisamment fiable pour accueillir les premiers utilisateurs._

### Étape 4 — Définir le périmètre de lancement

Ne pas chercher à développer immédiatement toutes les fonctionnalités imaginées.

| Prioritaires                          | Dans l’app                                                              |
| ------------------------------------- | ----------------------------------------------------------------------- |
| Inscription et authentification       | ✅                                                                      |
| Création du profil musicien           | ✅ profil musical, démos, profil public                                 |
| Recherche de musiciens                | ✅ Découvrir, suggestions                                               |
| Disponibilités et mode jam            | ✅ « Je suis dispo », lieux, jams publiques                             |
| Organisation de jams                  | ✅ formation, matériel, après-jam, carnet                               |
| Messagerie                            | ✅ trois messages avant une réponse, contacts                           |
| Création et gestion des groupes       | ✅ groupes, page publique, recrutement                                  |
| Collaborations                        | ✅ confirmées des deux côtés, appréciations                             |
| Premières étapes du parcours carrière | 🟡 étapes et preuves faites ; carte de carrière à venir (P3-12 à P3-14) |

**Fonctionnalités secondaires** (après le lancement) : outils avancés de gestion de groupe, réseau professionnel, booking, gestion financière, EPK automatique, outils de production musicale.

**Actions :**

- Vérifier les parcours utilisateurs.
- Corriger les bugs bloquants.
- Tester les fonctionnalités essentielles.
- Vérifier la sécurité des données.
- Optimiser les performances.
- Préparer les outils de suivi et d’analyse.

**Livrable** : version de lancement stable (MVP).

> 📍 **Dans le projet** : phases 0 à 2 terminées, phase 3 en cours (tableau §5 de `docs/plan/README.md`). Avant l’ouverture : discussions de groupe (P3-16c), contestation (P3-06), paliers de groupe (P3-08), modération étendue (P3-09), carrière (P3-12 à P3-14), démarches (P3-15), **audit de sécurité** (P3-10a, bloquant) et mise en production (P3-10). Le suivi existe déjà : `/admin/indicateurs`.

### Étape 5 — Préparer les éléments de communication

Créer une identité de lancement cohérente.

**Éléments à produire :** site de présentation, présentation courte de LinkMusician, logo et identité graphique, flyers avec QR code, affiches pour les établissements partenaires, visuels pour les réseaux sociaux, démonstration vidéo de l’application, adresse email professionnelle, page de contact.

**Message marketing envisagé :**

« Trouve tes musiciens. Monte ton groupe. Fais vivre tes projets. »

**Livrable** : kit de communication complet.

> 📍 **Dans le projet** : le nom est fixé (D9), le domaine `linkmusician.fr` reste provisoire. L’app explique déjà ses deux modes au public (`/aide`, pages publiques et indexées) et a une page de contact. Restent le logo, le kit imprimé, les visuels et la vidéo. Une **jam vue de l’intérieur** (aller seul·e à une jam, en repartir avec des contacts sans échanger son numéro) est un bon fil pour la vidéo.

### Étape 6 — Préparer les aspects juridiques et administratifs

Avant une commercialisation effective, clarifier les responsabilités et la structure juridique.

**Actions :**

- Vérifier la disponibilité du nom LinkMusician et les droits associés.
- Vérifier les noms de domaine et les éventuelles marques existantes.
- Étudier les formes juridiques possibles : SASU, SAS, EURL, etc.
- Vérifier les implications de la création d’une entreprise en parallèle d’une activité salariée, notamment les clauses contractuelles et la propriété intellectuelle.
- Préparer les CGU et les mentions légales.
- Préparer la politique de confidentialité et les obligations RGPD.
- Définir les règles de modération et de signalement.
- Examiner les responsabilités liées aux événements organisés via la plateforme.
- Étudier les assurances nécessaires.

**Livrable** : dossier juridique et administratif initial.

La création effective de la société sera décidée en fonction du calendrier commercial, des besoins de financement et des recommandations de l’accompagnement entrepreneurial.

> 📍 **Dans le projet** : le **RGPD** est intégré à chaque fonctionnalité (export et anonymisation testés) ; **modération et signalement** existent (file, sanctions, blocage, détection des cercles fermés) ; les **jams n’ont lieu que dans des lieux publics ou professionnels** (D26) et les mineur·es sont protégé·es (D5), ce qui limite la responsabilité liée aux événements. Les CGU et mentions légales sont des **modèles à faire valider par un·e avocat·e** (P3-10).

> ⚠️ **Important** : la création d’entreprise en parallèle d’un emploi salarié se vérifie **avant** de créer la société : clause d’exclusivité, de non-concurrence, et à qui appartient le code écrit (propriété intellectuelle). À faire relire par un·e juriste.

---

## Phase 3 — Lancer LinkMusician à Toulouse {#phase-3}

_Objectif : construire une première communauté locale et vérifier que la plateforme génère de vraies rencontres._

### Étape 7 — Cartographier l’écosystème musical toulousain

Constituer une base de prospection locale.

**Catégories de lieux à identifier :** bars et cafés-concerts, salles de répétition, studios d’enregistrement, magasins de musique, écoles de musique, associations musicales, MJC et centres culturels, scènes ouvertes, jams régulières, salles de concert, collectifs et organisateurs.

**Actions :**

- Construire une liste de 50 à 100 établissements.
- Identifier les responsables.
- Relever les coordonnées professionnelles.
- Identifier les événements musicaux réguliers.
- Prioriser les lieux accueillant déjà des musiciens amateurs et professionnels.

**Livrable** : fichier de prospection des établissements toulousains.

> 📍 **Dans le projet** : l’app a déjà une **table de référence d’environ 1 400 établissements de Toulouse Métropole**, importés par SIRET (débits de boissons, salles de spectacle, studios, enseignement culturel, MJC, P2-14d), et un annuaire des lieux de jam. C’est le point de départ du fichier : il reste à choisir les 50 à 100 lieux prioritaires et à y ajouter les responsables.

### Étape 8 — Prospecter les établissements

Privilégier le contact humain plutôt que la simple distribution de flyers.

**Actions :**

- Se présenter directement aux responsables.
- Expliquer le fonctionnement de LinkMusician.
- Présenter les avantages pour leur établissement.
- Proposer un partenariat de lancement.
- Demander l’autorisation de déposer des flyers.
- Proposer un QR code spécifique à chaque partenaire.
- Identifier les établissements intéressés pour accueillir des événements via LinkMusician.

**Objectif** : constituer un premier réseau de partenaires locaux.

**Livrable** : premiers partenariats et liste de contacts qualifiés.

> 📍 **Dans le projet** : un lieu peut déjà publier ses jams et sa fiche dit le matériel sur place. Le **QR code par partenaire** n’existe pas encore : il faudrait un lien de suivi par lieu (inscriptions venues de chaque partenaire), à ajouter au plan avant la prospection. La revendication de sa fiche par un lieu est prévue en phase 5 (P5-03).

### Étape 9 — Organiser l’acquisition auprès des musiciens

Utiliser les jams comme principal point d’entrée communautaire.

**Actions :**

- Participer aux jams locales.
- Distribuer des flyers avec QR code.
- Demander aux organisateurs l’autorisation de présenter le projet.
- Créer des annonces de lancement.
- Encourager les musiciens à compléter leur profil.
- Les accompagner dans leurs premières recherches.
- Recueillir les retours directement sur le terrain.

**Objectif expérimental** : obtenir les 100 à 200 premiers inscrits locaux.

**Livrable** : première communauté active de musiciens.

> 📍 **Dans le projet** : la cible n° 1 est fixée (D29) : les élèves **majeur·es** des écoles de musiques actuelles, MJC et conservatoires, qui ne savent pas où jouer ; les musicien·nes confirmé·es servent de **leads** de jam. Point ouvert : le premier jour, tout le monde est en confiance TL0 et une collaboration n’affiche que « ×0,1 », ce qui décourage. Il faut décider avant l’ouverture de préinscrire et vérifier les leads.

### Étape 10 — Organiser les premières expériences réelles

La valeur de LinkMusician doit se démontrer sur le terrain.

**Actions :**

- Faciliter les premières rencontres.
- Accompagner les premières organisations de jams.
- Observer les difficultés rencontrées.
- Recueillir les retours après les sessions.
- Identifier les fonctionnalités réellement utilisées.
- Documenter les premières collaborations réussies.

| Indicateur à mesurer                | Dans `/admin/indicateurs`                              |
| ----------------------------------- | ------------------------------------------------------ |
| Nombre de profils complétés         | ✅ onboarding terminé                                  |
| Nombre de musiciens actifs          | ✅ rétention à 30 jours                                |
| Nombre de propositions de rencontre | 🟡 conversation réciproque dans les 14 jours           |
| Nombre de jams organisées           | ⬜ à ajouter                                           |
| Nombre de collaborations confirmées | 🟡 collaboration confirmée ou groupe dans les 60 jours |
| Nombre de groupes constitués        | ⬜ à ajouter                                           |

**Livrable** : premier bilan d’utilisation réelle.

> 📍 **Dans le projet** : le bilan est prévu trois mois après l’ouverture (D23). Ajouter aux indicateurs les **jams organisées et réellement tenues** (présences « J’y étais ») et les **groupes formés** est un petit lot à faire avant l’ouverture.

---

## Phase 4 — Intégrer un incubateur {#phase-4}

_Objectif : bénéficier d’un accompagnement entrepreneurial et professionnaliser le développement de la startup._

### Étape 11 — Identifier les structures d’accompagnement

Rechercher les incubateurs, accélérateurs et structures d’accompagnement adaptés à LinkMusician.

**Premières pistes à étudier :**

| Structure               | Rôle                                                         |
| ----------------------- | ------------------------------------------------------------ |
| Nubbo                   | Incubation de startups en Occitanie                          |
| Le Catalyseur           | Accompagnement entrepreneurial à Toulouse                    |
| Toulouse Métropole      | Dispositifs de soutien à l’innovation et à l’entrepreneuriat |
| La French Tech Toulouse | Réseau entrepreneurial et écosystème innovant                |
| BGE                     | Accompagnement à la création d’entreprise                    |
| Réseau Initiative       | Accompagnement et financement des entrepreneurs              |

Ces structures ont des missions et des critères différents. Il faudra vérifier leurs programmes, conditions d’admission et calendriers de candidature.

### Étape 12 — Préparer le dossier de candidature

**Documents à préparer :**

1. Présentation du fondateur.
2. Présentation de LinkMusician.
3. Problématique identifiée.
4. Proposition de valeur.
5. Étude concurrentielle.
6. Présentation du produit.
7. Démonstration fonctionnelle.
8. Stratégie d’acquisition locale.
9. Business Model Canvas.
10. Premières données d’utilisation.
11. Prévisionnel financier.
12. Objectifs à 12 et 24 mois.

**Livrable** : dossier de candidature et pitch deck.

> 📍 **Dans le projet** : la **démonstration fonctionnelle** est prête à montrer (`npm run seed:demo`, comptes de démo par fonctionnalité, voir le README). Les **premières données d’utilisation** viendront de `/admin/indicateurs` après l’ouverture.

### Étape 13 — Présenter le projet

Préparer un pitch de 3 à 5 minutes. Il devra expliquer :

- Quel problème LinkMusician résout.
- Pour qui le produit est conçu.
- Comment il fonctionne.
- Ce qui le différencie.
- Comment les premiers utilisateurs seront acquis.
- Comment l’entreprise pourra générer des revenus.
- Ce que l’accompagnement permettra d’accomplir.

**Livrable** : présentation orale et support de pitch.

> 💡 **Astuce** : ce qui différencie LinkMusician se raconte en une scène : on va seul·e à une jam, on en repart avec des contacts, et chaque étape de sa carrière est **prouvée** par d’autres (jamais déclarée seule, jamais achetée).

---

## Phase 5 — Structurer l’entreprise {#phase-5}

_Objectif : transformer les premiers résultats en activité économique durable._

### Étape 14 — Créer la structure juridique

Une fois les premières validations réalisées et les besoins clarifiés :

- Choisir la forme juridique.
- Définir les statuts.
- Déterminer le capital social.
- Réaliser les formalités de création.
- Effectuer les déclarations nécessaires.
- Ouvrir un compte bancaire professionnel.
- Organiser la comptabilité.
- Mettre en place les outils de facturation.

Faire valider les choix par un expert-comptable ou un professionnel compétent.

### Étape 15 — Construire les premiers partenariats commerciaux

Développer le réseau au-delà des premiers établissements.

**Cibles :** salles de concert, festivals, studios, organisateurs, associations, écoles de musique, collectifs, professionnels de l’industrie musicale.

**Objectif** : faire de LinkMusician un outil utile pour les acteurs de l’écosystème musical.

> 📍 **Dans le projet** : les métiers et organisations arrivent par phases (studios et ingés son en phase 4, lieux et organisateurs en phase 5, labels en phase 6, `docs/conception/06-metiers.md` et `08-carrieres-par-role.md`). Un **compte école** est prévu (P5-11).

### Étape 16 — Développer la monétisation

Ne pas précipiter la mise en place des abonnements.

**Actions :**

- Identifier les fonctionnalités à forte valeur ajoutée.
- Tester les premières offres Premium.
- Interroger les professionnels sur leurs besoins.
- Tester des offres B2B.
- Mesurer la conversion.
- Suivre les revenus et les coûts.

**Livrable** : première offre commerciale validée.

> 📍 **Dans le projet** : le paiement existe déjà dans le socle technique (boutique du boilerplate, en veille, D6). Une offre ne vendra jamais de points ni de visibilité dans les recherches : la progression doit rester vraie (conception 01 §5.3).

---

## Phase 6 — Développer LinkMusician {#phase-6}

_Objectif : passer d’une communauté locale à une plateforme scalable._

### Étape 17 — Consolider Toulouse

Avant de changer de territoire :

- Mesurer la rétention.
- Améliorer l’expérience utilisateur.
- Augmenter le nombre de partenaires.
- Développer les usages récurrents.
- Améliorer la densité de musiciens par zone géographique.
- Identifier les fonctionnalités qui génèrent le plus de valeur.

### Étape 18 — Étendre à d’autres villes

Développer progressivement le modèle dans d’autres métropoles : **Montpellier, Bordeaux, Nantes, Lyon, Paris**.

L’expansion doit s’appuyer sur des relais locaux, des établissements partenaires et une communauté déjà active.

> 📍 **Dans le projet** : la table des établissements par SIRET se recharge pour une autre métropole (`npm run seed:etablissements`), et la recherche fonctionne partout en France (communes, distances).

### Étape 19 — Développer l’écosystème professionnel

À mesure que la communauté grandit :

- Développer les outils de booking.
- Faciliter les recrutements professionnels.
- Développer le réseau des studios et producteurs.
- Créer des opportunités de concerts.
- Développer les services aux groupes.
- Étudier les partenariats avec les structures culturelles.

### Étape 20 — Envisager le développement international

Une fois le modèle français validé :

- Étudier les marchés étrangers.
- Adapter les langues et les règles locales.
- Identifier les partenaires.
- Étudier les modèles économiques locaux.
- Organiser le déploiement par territoire.

---

## Principes stratégiques à respecter {#principes}

1. Ne pas développer des fonctionnalités sans identifier leur utilité réelle.
2. Ne pas confondre nombre d’inscrits et activité réelle.
3. Privilégier la qualité des rencontres musicales.
4. Développer Toulouse avant de multiplier les territoires.
5. Construire les partenariats avant de chercher une acquisition massive.
6. Valider le modèle économique avant d’investir lourdement.
7. Préserver une expérience simple et accessible aux musiciens.
8. Faire de la réalité des expériences musicales le fondement de la progression dans LinkMusician.

## Vision à long terme {#vision}

Faire de LinkMusician une plateforme de référence pour découvrir des musiciens, construire des projets artistiques, développer des groupes et accéder aux opportunités de l’industrie musicale.
