# Données de démonstration

> Le guide pour **voir chaque situation de l'app** avec des comptes fictifs :
> qui se connecte, où aller, ce qu'on doit y voir. Mis à jour le 11/11/2026
> (phases 1 à 5 : jusqu'aux écoles, P5-11).

## 1. Lancer

```bash
npm run db:deploy            # la base de dev est à jour
npm run seed:referentiels    # instruments, genres, étapes (rejouable)
npm run seed:demo            # comptes et scénarios (rejouable)
```

- `seed:demo` **ajoute** des données sans rien vider. Chaque bloc est
  rejouable : il ne se refait pas s'il est déjà en place (repère entre
  parenthèses dans le tableau du §3). Pour repartir de zéro sur une base
  jetable : `npm run seed` (**vide toute la base**, boilerplate compris).
- Le seed demande la commune de référence (Toulouse par défaut) et place
  les personnages dans les communes voisines (API geo.api.gouv.fr, réseau
  nécessaire).
- Mot de passe de tous les comptes : `DemoPass!2026` (ou
  `SEED_DEMO_PASSWORD` dans `.env`).
- **Adresses** : `<handle>@demo.linkmusician.test`. Si un handle est déjà
  pris dans la base, le seed ajoute `-demo` (puis `-demo-2`…) ; la fin de
  `npm run seed:demo` affiche **toujours** les adresses exactes. Dans la
  base de dev actuelle, les 13 premiers comptes portent le suffixe `-demo`
  (`malik-batterie-demo@…`), les 4 comptes de la scène non.
- `--avec-moi` (`npm run seed:demo -- --avec-moi`) ajoute ton propre compte
  aux jams passées, pour voir l'app de ton point de vue.
- Toute la progression passe par le **vrai moteur** (`emitAndProcess`) :
  XP, niveaux, confiance, succès et rangs ne sont jamais écrits à la main.

Fichiers : [`prisma/seed-demo.ts`](../../prisma/seed-demo.ts) (comptes),
[`seed-scenarios.ts`](../../prisma/seed-scenarios.ts) (phases 1 à 3),
[`seed-jam-life.ts`](../../prisma/seed-jam-life.ts) (vie de jam),
[`seed-scene.ts`](../../prisma/seed-scene.ts) (vie pro et scène, phases 4
et 5).

## 2. Les personnages (19)

| Handle           | Qui                                 | Métiers                     | Ce qu'il ou elle illustre                                                                                                              |
| ---------------- | ----------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `malik-batterie` | Malik, 32 ans, batteur semi-pro     | Musicien                    | Responsable des Rats du Mardi ; batteur de Fanfare Pirate ; organise des jams ; groupes de contacts                                    |
| `ines-chant`     | Inès, 27 ans, chanteuse soul        | Musicienne                  | Membre des Rats ; son titre « Lumière » produit par Nora                                                                               |
| `theo-basse`     | Théo, 38 ans, bassiste pro          | Musicien, ingé son          | Co-gère les Rats et La Cave Studio ; profil d'ingé son (home studio) ; responsable de l'**École du Faubourg**                          |
| `clara-guitare`  | Clara, 25 ans, guitariste rock indé | Musicienne                  | Lead d'une jam à venir ; nouvelle venue des Rats ; **invitée à animer** au Comptoir Jazz                                               |
| `samir-son`      | Samir, 41 ans, ingé son             | Ingé son, musicien          | Responsable de **La Cave Studio** ; enregistre Orbital, mixage à confirmer ; invite Nora à co-gérer le studio                          |
| `nora-prod`      | Nora, 30 ans, productrice           | Productrice, musicienne     | Profil de productrice ; produit « Lumière » ; Néon Lagune en formation ; invitée au studio                                             |
| `lucas-sax`      | Lucas, 34 ans, saxophoniste         | Musicien                    | Responsable de **Fanfare Pirate** : plateau accepté, concerts vérifiés, **tournée** ; anime au Comptoir Jazz                           |
| `zoe-violon`     | Zoé, 23 ans, violoniste             | Musicienne                  | Responsable des **Lucioles** (groupe neuf) : candidature à une scène découverte, hors conditions ailleurs                              |
| `kevin-metal`    | Kévin, 35 ans, guitariste metal     | Musicien                    | Responsable d'**Orbital** (avec une mineure) : enregistrement vérifié, concert corroboré, candidature en attente                       |
| `awa-clavier`    | Awa, 29 ans, claviériste            | Musicienne                  | Co-gère Fanfare Pirate ; **invitée à co-gérer Le Comptoir Jazz**                                                                       |
| `hugo-dj`        | Hugo, 28 ans, DJ et organisateur    | Musicien, organisateur      | **Soirées Disco Club** (vérification en attente) ; invité à co-gérer Bruit Rose ; « Je suis dispo »                                    |
| `manon-ukulele`  | Manon, 19 ans, débutante            | Musicienne                  | Membre des Lucioles ; messagerie (premier contact à répondre) ; élève de l'École du Faubourg                                           |
| `elise-booker`   | Élise, 36 ans, booker               | Booker                      | **Booker de Fanfare Pirate** (confirmé par Lucas) ; a booké l'apéro-concert des Coteaux ; propose aux Lucioles                         |
| `marc-manager`   | Marc, 45 ans, manager               | Manager, musicien           | **Manager des Rats du Mardi** depuis leurs débuts : 200 points, rang « Développement d'artistes »                                      |
| `jade-batterie`  | Jade, **16 ans**                    | Musicienne                  | **Mineure (D5)** : jams finies avant 22 h, jamais dispo affichée, batteuse d'Orbital (ne candidate pas) ; élève de l'École du Faubourg |
| `yanis-orga`     | Yanis, 39 ans, programmateur        | Organisateur, musicien      | Responsable de **l'Asso Bruit Rose** et du **Festival des Coteaux** (vérifiés) ; plateau rock                                          |
| `lina-orga`      | Lina, 33 ans, organisatrice         | Organisatrice, musicienne   | Co-gère Bruit Rose ; **Collectif Nuits Courtes** (vérifié) ; scène découverte **à son nom**                                            |
| `sophie-bar`     | Sophie, 42 ans, gérante de bar      | Musicienne (sans le métier) | **Le Comptoir Jazz** revendiqué, fiche publiée, vérifié ; publie ses dates **sans être organisatrice** (Q34)                           |
| `paul-salle`     | Paul, 47 ans, gérant de café        | Musicien                    | **Revendication du Café des Sons en attente** de la modération                                                                         |

Un compte de modération n'est pas créé par `seed:demo` : passe un compte
en rôle admin (`/admin`) pour voir les files de `/moderation`.

## 3. Les situations, et où les voir

Pour chaque ligne : **se connecter avec** → **aller sur** → ce qu'on doit
voir.

### Profils, découverte, messagerie (phases 1 et 2)

| Situation                                                            | Se connecter avec               | Où                                                                                           |
| -------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| Profils complets, démos, niveaux, influences                         | n'importe qui                   | `/@malik-batterie`, `/decouvrir`                                                             |
| Recherche par métier (son, production, organisation, accompagnement) | n'importe qui                   | `/decouvrir?metier=inge-son`, `?metier=producteur`, `?metier=organisateur`, `?metier=booker` |
| Messagerie : 3 messages sans réponse (D44)                           | `hugo-dj`                       | `/messages`                                                                                  |
| Premier contact à accepter ou refuser                                | `manon-ukulele`                 | `/messages`                                                                                  |
| Contacts et groupes de contacts                                      | `malik-batterie`, `awa-clavier` | `/messages/contacts`                                                                         |
| Suggestions, indicateurs vivants                                     | n'importe qui                   | `/espace`                                                                                    |

### Mode jam (phase 2, `seed-scenarios` et `seed-jam-life`)

| Situation                                                   | Se connecter avec             | Où                                |
| ----------------------------------------------------------- | ----------------------------- | --------------------------------- |
| ~12 jams à venir sur le mois, plusieurs lieux               | n'importe qui                 | `/jam/agenda`                     |
| Jam **en cours** au Café des Sons                           | n'importe qui                 | `/jam`                            |
| « Je suis dispo » (6 personnes, jamais Jade)                | un·e adulte                   | `/jam`                            |
| Lead d'une jam, formation, invitation en attente            | `clara-guitare`, `ines-chant` | `/jam`, la fiche de la jam        |
| ~20 jams passées, présences, ~300 appréciations, Noctambule | `malik-batterie`              | `/jam/carnet`, `/jams/…/presents` |
| Appréciations à donner (7 derniers jours)                   | n'importe qui                 | `/jam/apprecier`                  |
| Atelier à la MJC avec une mineure, fini avant 22 h          | `jade-batterie`               | `/jam/carnet`                     |
| Discussions de groupe (deux membres actifs, autres invités) | `malik-batterie`              | `/messages`                       |

Repères : « Les Rats du Mardi » (scénarios), « Jeudi jazz au Comptoir »
en jam passée (vie de jam).

### Groupes, étapes, morceaux (phase 3)

| Situation                                                                                                              | Se connecter avec                            | Où                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| **Les Rats du Mardi** : formé, effectif passé, étapes déclarées/corroborées, **premier concert vérifié** (au Comptoir) | `malik-batterie`                             | `/@les-rats-du-mardi`, `/groupes/les-rats-du-mardi` |
| Une confirmation d'étape demandée à une personne extérieure                                                            | `samir-son`                                  | notifications, `/etapes/…`                          |
| Une démo publique à vérifier                                                                                           | un·e admin                                   | `/moderation`                                       |
| Recrutement « Les Rats cherchent un·e claviériste »                                                                    | n'importe qui                                | `/annonces`                                         |
| **Néon Lagune** : en formation, invitation, idée de morceau, rôle à pourvoir                                           | `nora-prod`, `hugo-dj`                       | `/groupes`, `/morceaux`                             |
| Morceau écrit à plusieurs, crédits                                                                                     | `malik-batterie`                             | `/morceaux`                                         |
| Collaborations confirmées et à confirmer                                                                               | `ines-chant`, `clara-guitare`, `kevin-metal` | `/espace`, conversations                            |

### Métiers du son, studio, production (phase 4, `seed-scene`)

| Situation                                                                                    | Se connecter avec         | Où                                          |
| -------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------- |
| Ingé son : travaux en écoute et rang ; spécialités, matériel aux membres (Q70)               | membre connecté·e         | `/@samir-son`, `/profil/son` (Samir)        |
| Productrice : productions ; styles aux membres ; tarifs pour Nora seule (Q70)                | membre connecté·e         | `/@nora-prod`, `/profil/production` (Nora)  |
| **La Cave Studio** : fiche publiée, 2 salles, horaires, vérifié, co-gestion Samir + Théo     | n'importe qui             | `/@la-cave-studio`                          |
| Gérer le studio, sessions, rang                                                              | `samir-son`               | `/studios/la-cave-studio`                   |
| **Invitation à co-gérer le studio** en attente                                               | `nora-prod`               | `/studios`, notifications                   |
| Enregistrement d'Orbital au studio : crédit de Samir, « Premier enregistrement » **vérifié** | `kevin-metal`             | `/@orbital-prog`, `/morceaux` (« Gravité ») |
| **Mixage à confirmer** (prestation de Samir)                                                 | `kevin-metal`             | `/espace` (« À confirmer »)                 |
| Répète des Lucioles au studio : une session confirmée par une cliente                        | `zoe-violon`              | conversation avec Théo                      |
| Production de « Lumière » : XP sur la piste productrice, crédit confirmé                     | `nora-prod`, `ines-chant` | `/espace/objectifs`, `/morceaux`            |

### Organisateur·rices et organisations (phase 5, `seed-scene`)

| Situation                                                                                  | Se connecter avec                    | Où                                                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------- |
| Profils d'organisateur·rice : ce qu'ils organisent, genres, jauge, événements passés, rang | n'importe qui                        | `/@yanis-orga`, `/@lina-orga`, `/@hugo-dj`                  |
| **Asso Bruit Rose** : vérifiée, co-gérée par Yanis et Lina, plateaux ouverts               | n'importe qui                        | `/@asso-bruit-rose`                                         |
| Gérer une organisation : fiche, plateaux, candidatures, vérification, gestion              | `yanis-orga`                         | `/organisations`, `/organisations/asso-bruit-rose`          |
| **Invitation à co-gérer** Bruit Rose en attente                                            | `hugo-dj`                            | `/organisations`, notifications                             |
| Une organisation **non vérifiée**, demande en attente                                      | `hugo-dj`                            | `/organisations/soirees-disco-club` ; admin : `/moderation` |
| Festival des Coteaux, Collectif Nuits Courtes : deux autres communes (pour la tournée)     | n'importe qui                        | `/@festival-des-coteaux`, `/@collectif-nuits-courtes`       |
| Objectifs d'organisateur·rice, rang (« Premier événement »)                                | `yanis-orga`, `lina-orga`, `hugo-dj` | `/espace/objectifs`                                         |

### Lieux (phase 5, `seed-scene`)

| Situation                                                                                                                         | Se connecter avec          | Où                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------- |
| **Le Comptoir Jazz** : « Géré par le lieu », fiche « Jouer ici », dates à venir, rang **Scène ouverte** (2 dates et 1 jam tenues) | n'importe qui              | `/lieux` puis la fiche                                                            |
| Gérer le lieu : prochaines étapes, dates, fiche, apprendre le métier, vérification, gestion                                       | `sophie-bar`               | « Gérer la fiche du lieu »                                                        |
| Décision de revendication notifiée (Q29)                                                                                          | `sophie-bar`               | notifications                                                                     |
| **Invitation à co-gérer le lieu** en attente                                                                                      | `awa-clavier`              | `/organisations` (« Mes lieux »)                                                  |
| **Revendication en attente** de la modération (code publié, lien de preuve)                                                       | `paul-salle` ; un·e admin  | fiche du Café des Sons ; `/moderation`                                            |
| Un lieu revendiqué publie ses dates **sans le métier d'organisatrice** (Q34)                                                      | `sophie-bar`               | « Publier une date »                                                              |
| Photos du lieu (P5-03d) : envoi, état, retrait ; galerie sur la page du lieu                                                      | `sophie-bar`               | « Gérer la fiche du lieu », section Photos (l'envoi demande Cloudinary configuré) |
| **Scène ouverte récurrente** (P5-04a) : « Bœuf jazz du mercredi », 20 h 30-23 h 30, ce mercredi et les 3 suivants ; « Arrêter »   | `sophie-bar`               | « Gérer la fiche du lieu », section Scènes ouvertes                               |
| La scène ouverte dans le calendrier, « Tous les mercredis », hôte : le lieu ; Théo vient au prochain bœuf                         | n'importe qui (à Toulouse) | `/jam/agenda`                                                                     |
| Le bœuf de mercredi dernier **tenu** (4 « J'y étais ») : 50 points pour Sophie, rien pour les présent·es (D27)                    | `sophie-bar`               | `/espace/objectifs`, historique des points                                        |
| **Qui anime** (P5-04b) : Lucas anime et mène le bœuf par défaut, Clara invitée ; suggestions de leads autour du lieu, jamais l'XP | `sophie-bar`               | « Gérer la fiche du lieu », section Scènes ouvertes, « Qui anime »                |
| « Un lieu t'invite à animer » : accepter ou décliner l'invitation du Comptoir Jazz                                                | `clara-guitare`            | notifications, `/jam/mes-jams`                                                    |
| « Tu animes » : le Comptoir Jazz, Bœuf jazz du mercredi mené par défaut ; « Arrêter d'animer »                                    | `lucas-sax`                | `/jam/mes-jams`                                                                   |

### Plateaux et candidatures (phase 5, `seed-scene`)

| Plateau                                                        | Publié par                   | Conditions            | Candidatures                                              |
| -------------------------------------------------------------- | ---------------------------- | --------------------- | --------------------------------------------------------- |
| **Jeudi jazz au Comptoir** (un jeudi, dans 10 à 16 jours)      | le lieu, par Sophie          | rang « Live », jazz   | Fanfare Pirate **acceptée** (conversation Lucas ↔ Sophie) |
| **Plateau rock du vendredi** (un vendredi, dans 18 à 24 jours) | Bruit Rose, par Yanis        | rang « Répète », rock | Orbital **envoyée** ; Les Rats **présélectionnés**        |
| **Scène découverte folk** (J+9)                                | Lina, **à son nom**          | folk, ouvert à tous   | Les Lucioles **envoyée** (leur toute première scène)      |
| **Disco live** (J+25)                                          | Soirées Disco Club, par Hugo | disco                 | aucune                                                    |

À voir :

- `zoe-violon` sur « Jeudi jazz » : Les Lucioles **ne peuvent pas
  candidater** (rang et genre), l'écran dit pourquoi.
- `jade-batterie` sur un plateau : **avant 18 ans, on ne candidate pas**.
- `yanis-orga` ou `lina-orga` sur le plateau rock : la co-gestion voit
  les candidatures et leur rang (« rang Live », « rang Répète »).
- `lucas-sax` : « Mes candidatures » sur `/annonces`, au nom du groupe.

### Concerts vérifiés et tournée (phase 5, `seed-scene`)

| Situation                                                                                                                                           | Se connecter avec                                  | Où                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| **Fanfare Pirate** : 3 concerts chez des hôtes vérifiés, dans 3 communes en 30 jours → « Premier concert » et « **Première tournée** » **vérifiés** | n'importe qui                                      | `/@fanfare-pirate`                                   |
| **Orbital** chez une organisation non vérifiée → « Premier concert » **corroboré** (Q36)                                                            | n'importe qui                                      | `/@orbital-prog`                                     |
| Les Rats au Comptoir : leur premier concert passe de corroboré à **vérifié**                                                                        | n'importe qui                                      | `/@les-rats-du-mardi`                                |
| L'hôte gagne « Événement tenu » (piste organisateur·rice), pas la collaboration                                                                     | `sophie-bar`, `yanis-orga`, `lina-orga`, `hugo-dj` | `/espace` (historique d'XP)                          |
| « Première date d'un groupe » (100) pour qui a accueilli Fanfare Pirate et Orbital la première fois                                                 | `sophie-bar`, `hugo-dj`                            | `/espace`                                            |
| **Concert à confirmer** côté organisateur (apéro-concert des Coteaux, J-2)                                                                          | `yanis-orga`                                       | `/espace` (« À confirmer »), conversation avec Lucas |
| Proposer un concert : type « Concert », groupe et hôte préremplis                                                                                   | `lucas-sax`                                        | conversation avec Sophie                             |
| Carte, **acte V franchi** et tournée faite (« Faite ! ») ; carte souvenir du concert sur la fiche                                                   | `lucas-sax`, `awa-clavier`, `malik-batterie`       | `/espace/carte`, `/espace/fiche`                     |
| Carte, **acte V ouvert** : le concert d'Orbital n'est que corroboré ; « Candidater à un plateau »                                                   | `kevin-metal`                                      | `/espace/carte`                                      |

### Booker et manager (phase 5, `seed-scene`)

| Situation                                                                                                                                                                               | Se connecter avec                            | Où                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Profil de booker : genres, ce qu'elle cherche, **Fanfare Pirate** dans « Artistes accompagnés » (confirmé), rang « Premier artiste »                                                    | n'importe qui                                | `/@elise-booker`                                              |
| Fiche du métier booker (ONB-12b) : intentions publiques ; précisions (structure, territoire, artistes) visibles des membres seulement ; « Qui voit quoi » et complétude dans son espace | anonyme, puis un membre, puis `elise-booker` | `/@elise-booker`, `/profil/metier/booker`                     |
| Profil de manager : **Les Rats du Mardi**, rang « Développement d'artistes » (le groupe est passé de Projet à Live depuis)                                                              | n'importe qui                                | `/@marc-manager`                                              |
| **Proposition d'accompagnement à trancher** (Élise, comme booker) : confirmer ou décliner                                                                                               | `zoe-violon`                                 | notifications, `/accompagnement`, `/espace` (« À confirmer ») |
| Qui accompagne le groupe ; « Mettre fin »                                                                                                                                               | `lucas-sax`                                  | `/accompagnement`                                             |
| Les artistes que j'accompagne, la proposition en attente ; « Retirer »                                                                                                                  | `elise-booker`                               | `/accompagnement`, `/espace/objectifs`                        |
| **Concert booké par Élise** à confirmer : Yanis confirme, et Élise gagne « Date bookée et jouée » (piste booker)                                                                        | `yanis-orga`                                 | `/espace` (« À confirmer »), conversation avec Lucas          |
| « Proposer d'accompagner » sur la page d'un groupe, pour une personne qui a le métier                                                                                                   | `marc-manager`                               | `/@orbital-prog`                                              |
| « Booké par » dans le formulaire de concert (seulement les bookers confirmés du groupe)                                                                                                 | `lucas-sax`                                  | conversation avec Sophie, type « Concert »                    |

### École (phase 5, `seed-scene`)

| Situation                                                                                                | Se connecter avec | Où                                         |
| -------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------ |
| **École de musique du Faubourg** gérée par Théo : lien d'invitation actif, élèves (visibles de lui seul) | `theo-basse`      | `/ecoles`, `/ecoles/ecole-du-faubourg`     |
| Publier un atelier jam réservé aux élèves                                                                | `theo-basse`      | « Publier un atelier »                     |
| Élève : les deux ateliers à venir, « Je viens » déjà dit au premier ; quête « De l'atelier à la scène »  | `manon-ukulele`   | Mode jam › Mon école, `/espace/objectifs`  |
| Élève **mineure** : seul l'atelier de 17 h 30 apparaît (celui de 20 h finit à 22 h 30)                   | `jade-batterie`   | Mode jam › Mon école                       |
| Rejoindre l'école par le lien (affiché à la fin de `seed:demo` quand l'école est créée)                  | un·e autre        | `/ecole/…`                                 |
| Hors de l'école : ni l'atelier dans l'agenda, ni la page de l'école (404)                                | `hugo-dj`         | `/jam/agenda`, `/ecoles/ecole-du-faubourg` |

### Mineur·es (D5)

| Situation                                                  | Se connecter avec | Où                      |
| ---------------------------------------------------------- | ----------------- | ----------------------- |
| Jams visibles seulement si finies avant 22 h               | `jade-batterie`   | `/jam/agenda`           |
| Jamais affichée « dispo », pas de discussion de groupe     | `jade-batterie`   | `/jam`, `/messages`     |
| Membre d'un groupe, mais **ne candidate pas** à un plateau | `jade-batterie`   | un plateau              |
| Démarche « Jouer sur scène avant 18 ans » sur le groupe    | `kevin-metal`     | `/groupes/orbital-prog` |

## 4. Ce que la démo ne couvre pas encore

Les lots suivants n'existent pas encore dans l'app :

- tout ce qui est payant (P5-09, P5-10).

Chaque lot qui ajoute une situation l'ajoute à la démo **et** à ce guide
(définition de terminé, `docs/plan/README.md` §4).

## 5. Ajouter un scénario

1. Écrire dans le fichier du domaine (`seed-scene.ts` pour la scène),
   avec les outils existants : `formedBand`, `org`, `collab`, `gigHeld`,
   `plateau`, `apply`, `raise`, `chat`, `talk`, `emit`.
2. Ne jamais écrire d'XP, de niveau, de confiance ou de rang : émettre
   l'événement de domaine (`emit`) et laisser le moteur calculer.
3. Reproduire la règle du service (et la citer en commentaire) : la démo
   doit montrer ce que l'app ferait vraiment.
4. Garder le bloc rejouable (un repère : un handle, un titre).
5. Ajouter la ligne au §3 : qui, où, ce qu'on voit.

## Navigation multirôle (DASH-01, #31)

Les comptes existants du seed permettent de jouer ce parcours sans nouvelle
donnée ni modification des faits de progression :

| Compte (adresse exacte affichée par le seed) | Ouvrir `/espace`                             | Vérifier                                                                 |
| -------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| `samir-son`                                  | Ingé son principal, puis choisir Musicien·ne | Travaux/matériel et studios, puis retour au parcours musical             |
| `nora-prod`                                  | Producteur·rice, puis Musicien·ne            | Productions, studios, morceaux/crédits ; données conservées              |
| `yanis-orga`                                 | Organisateur·rice                            | Plateaux, organisations/lieux et événements passés                       |
| `elise-booker`                               | Booker seul                                  | Accompagnements, échanges et annonces ; pas de carte de musicien imposée |
| `marc-manager`                               | Manager, puis Musicien·ne                    | Accompagnements ; bascule sans modifier le principal                     |

Dans le sélecteur **Mon espace**, choisir puis **Changer**. Ouvrir une
recherche, poser des filtres, changer de contexte : les filtres restent.
Sur `/aide`, le sélecteur et la navigation restent disponibles. Retirer
un métier actif depuis les réglages fait revenir au principal au prochain
chargement. Les scénarios techniques de métier non détenu, cookie invalide
et métiers bientôt sont dans `navigation-metiers.spec.ts` et les tests
unitaires ; il n'est pas nécessaire d'ajouter des métiers fictifs aux
comptes de démo.

### Actions prioritaires métier — DASH-03 (#33)

Réutilise le seed existant (`npm run seed:demo`) : aucun compteur ou scénario
professionnel futur n'est fabriqué pour cet accueil. Les dates de démo sont
relatives au lancement du seed ; le relancer pour disposer de dates à venir.

1. `yanis-orga` : ouvrir `/espace`, volet **priorités**. Les candidatures des
   annonces personnelles et des organisations gérées apparaissent dans
   **Candidatures reçues** ; ouvrir **Annonces**, puis une annonce pour répondre.
   Le concert avec Lucas attend aussi une validation. L'accueil ne marque
   aucune candidature comme vue.
2. `kevin-metal` : **Collaborations à valider** mène au mixage de Samir via
   **À confirmer**. Ne pas attendre ce même signal pour Samir : il a déjà
   répondu de son côté. Ce sont les réponses réellement attendues qui comptent.
3. `manon-ukulele` : **Demandes de contact** ouvre les demandes dans Messages.
   Les invitations aux discussions restent dans Messages, sans faux compteur
   professionnel ajouté.
4. `samir-son`, puis Musicien·ne dans **Mon espace** : les mêmes faits du compte
   restent partagés, tandis que les outils et l'ordre à égalité changent. Aucun
   doublon de collaboration ni modification du métier principal.
5. `nora-prod`, `marc-manager`, `elise-booker` : une catégorie sans réponse
   attendue l'explique ; chaque tuile ouvre l'écran existant. Les accompagnements
   et studios restent dans les menus habituels, sans réservation inventée.
6. `jade-batterie` : la tuile des demandes explique la restriction aux adultes ;
   elle ouvre les échanges existants. Aucun appel à recevoir des sollicitations.
7. Compte neuf avec un métier ouvert : quatre phrases d'absence, aucun zéro
   présenté comme une activité ni bouton inactif. Label/édition/communication :
   aucun volet de priorités professionnelles.

Recette automatisée dédiée : `e2e/linkmusician/actions-metiers.spec.ts` crée des
comptes et objets dans le schéma e2e pour les six métiers, les états vides,
la perte de gestion, les blocages dans les deux sens, un profil masqué, un
compte mineur, le clavier et le mobile 390 px. Elle conserve des captures du
mobile et du bureau dans le rapport Playwright.

### Mes structures et droits de gestion — DASH-02a (#32)

Les données du seed existant suffisent : ne créer aucune structure en double.
Ouvrir **Mes structures** dans le menu du compte ou dans **Mon espace**.

- `theo-basse` : retrouver ses groupes, La Cave Studio et l'École du Faubourg
  dans un menu commun. Chaque participation précise son type et son rôle.
- `samir-son` : ouvrir La Cave Studio, puis ses outils de gestion. Basculer
  Musicien·ne / Ingé son conserve la participation et ses droits.
- `nora-prod` : retrouver l'invitation au studio ; la participation en attente
  ne donne pas accès à sa gestion. Répondre sur l'écran Studios existant.
- `yanis-orga` et `sophie-bar` : organisations et lieux revendiqués utilisent
  leurs fiches et leur co-gestion déjà disponibles.
- `jade-batterie` : sa participation à l'école indique **Élève**, sans liste
  des camarades ni outil de gestion. Les règles des ateliers restent appliquées.
- Compte neuf : état vide et chemins de création existants selon l'âge et les
  métiers réellement détenus. Aucune agence ni délégation nouvelle annoncée.

La recette `structures.spec.ts` ajoute des données isolées dans le schéma e2e
pour vérifier les cinq types, une invitation acceptée, le retrait immédiat des
accès, les refus serveur d'un membre et d'un élève, un identifiant étranger,
une structure dissoute, le contexte multirôle, le clavier et 390 px.

## Mandat borné (DASH-04a)

Sur une installation neuve des scénarios, Élise Booker propose aux Lucioles
un accompagnement limité aux départements 31 et 32 pour 90 jours. Zoé voit
les conditions dans `/accompagnement` avant de confirmer. Les mandats déjà
présents sont conservés ; ce scénario ne les réécrit pas. L’accompagnement
confirmé d’Élise auprès de la Fanfare et celui de Marc auprès des Rats restent
sans échéance et sans limite territoriale.

## Agence et équipe (DASH-02b)

`seed:demo` ajoute « Agence Scène Démo » si son identifiant est libre, sans
modifier une structure existante : Marc Manager responsable, Élise Booker à
la co-gestion, Nora Production invitée comme collaboratrice. Les trois
comptes proviennent exclusivement de `@demo.linkmusician.test`. Marc et
Élise consultent `/agences` et l’équipe ; Nora accepte dans « Ma participation »
et ne voit pas l’équipe. Aucun artiste ni mandat ne sont rattachés implicitement.

## Affectation d’un mandat (DASH-04b)

Après l’agence de démo, Élise propose de confier son accompagnement de la
Fanfare Pirate à Marc : consultation des conditions et droit facultatif de terminer la relation
applicative. La proposition attend les accords de Marc et de Lucas (gestion
de la Fanfare), dans `/delegations`. Elle ne donne aucun accès avant les deux accords.
Le seed ne recrée pas la proposition si elle a déjà été retirée ou refusée,
ne change aucun mandat existant et ne sollicite que les comptes démo.

## Droit de candidater (DASH-07a)

Élise (booker de la Fanfare Pirate) a demandé le droit de candidater aux
plateaux au nom du groupe, jusqu’à 90 jours au plus. Lucas, qui gère la
Fanfare, le voit dans `/accompagnement` › **Droit de candidater →** et peut
l’accorder ou le refuser ; l’un comme l’autre peut ensuite le révoquer. Le
seed ne donne jamais l’accord à sa place et ne recrée pas une demande déjà
tranchée.

DASH-07b ajoute l’annonce **Scène ouverte aux projets accompagnés** (plateau
sans condition de genre ou de rang, rayon de 100 km, quatre places), créée une
seule fois par `seedDelegatedOpportunity`. Après l’accord de Lucas, ouvrir ce
plateau avec `elise-booker`, choisir Fanfare Pirate dans **Candidater au nom
d’un artiste**, puis envoyer un message. Lucas reçoit une notification et
peut retirer depuis l’annonce ; l’émetteur peut accepter et échanger avec
Élise, sans gain d’XP de réciprocité. Le seed n’accorde aucun droit et n’envoie
aucune candidature. Il conserve l’état d’une annonce déjà créée.

### Historique privé des affectations — DASH-05a

Le scénario d’agence et d’affectation de `seedDelegations` sert aussi de démo
du journal : depuis `/delegations`, ouvrir la proposition de l’agence
`agence-demo-scene`. Sa fiche montre la proposition datée et son auteur.
Après accord du collaborateur et de la gestion de l’artiste, leurs actes
apparaissent séparément ; le retrait ajoute une clôture. Le seed reste
idempotent et ne donne aucun accord à la place des comptes de démonstration.
Un administrateur d’agence étranger à l’affectation ne voit pas cet historique.

### Mandats et invitations dans le journal — DASH-05b

Les mandats de démonstration existants sont accessibles depuis
`/accompagnement/historique` pour leurs titulaires et la gestion actuelle
des groupes concernés. Ouvrir une fiche montre proposition et confirmation ;
après une fin donnée dans Accompagnement, la fiche reste accessible depuis
la liste historique avec l’auteur réel de fin. Aucun accord de démonstration
supplémentaire n’est généré par ce lot.

Depuis `/structure`, ouvrir une participation invitée par un autre compte
de démonstration : par exemple Nora (`nora-prod`), invitée par Marc
(`marc-manager`) à l’Agence Scène Démo (`agence-demo-scene`). « Mon invitation »
reprend son auteur et sa date. Une
participation fondée directement, sans invitant conservé, montre un historique
vide. Le seed existant reste la source de ces situations, sans nouvelle donnée.

### DASH-05c — décisions de propositions d’accompagnement

`npm run seed:demo` ajoute, de façon rejouable, deux propositions fictives closes
d’Élise booker aux Lucioles : l’une déclinée par Zoé, l’autre retirée par Élise.
Elles sont distinctes de la proposition en attente existante. Seuls les comptes
`@demo.linkmusician.test` sont utilisés ; aucun message ni périmètre privé n’est
conservé. Élise et Zoé les retrouvent dans **Accompagnement → Historique des
accompagnements**, avec le type d’acte, l’auteur et l’heure de Paris. Elles ne
figurent plus dans les propositions à traiter. La gestion de l’agence ne reçoit
aucun accès supplémentaire. Aucun événement passé n’est reconstruit.

### DASH-05d — historique personnel de co-gestion

Se connecter avec **Lina** (`lina-orga@demo.linkmusician.test`), puis ouvrir
**Mes structures › Historique de mes participations**. « Démo — Mémoire de
co-gestion » présente trois périodes fictives : une invitation acceptée puis
quittée, un refus personnel et une annulation par Yanis. Chaque acte porte son
auteur et sa date ; les périodes closes ne redonnent aucun accès aux outils.
Yanis retrouve dans son export son acte d’annulation pour autrui, sans obtenir
la lecture des périodes de Lina. Les autres co-gestions existantes ne sont pas
converties en événements. Le seed est rejouable par upserts et réservé aux
comptes de démo ; il ne reconstruit aucun événement réel.

### DASH-05e — historique personnel du studio

Se connecter avec **Nora** (`nora-prod`, suffixe réel indiqué par le seed), puis
ouvrir **Mes structures › Historique de mes participations**. « Démo — Mémoire
du studio » présente trois périodes fictives : une invitation acceptée puis
quittée, un refus de Nora et une annulation par Samir. Les quatre actes portent
la personne réelle et leur date ; les périodes closes ne donnent aucun outil.
Samir retrouve son acte d’annulation pour autrui dans l’export, sans accès aux
périodes de Nora. La Cave Studio et son invitation existante restent dans leur
état actuel ; aucun consentement ni acte ancien n’y est fabriqué. Le seed est
rejouable et vérifie les comptes de démonstration avant de créer ces fixtures.

### DASH-05f — historique personnel de l’agence

Se connecter avec **Élise** (`elise-booker`, suffixe réel indiqué par le seed),
puis ouvrir **Mes structures › Historique de mes participations**. « Démo —
Mémoire de l’agence » montre trois périodes fictives : invitation acceptée puis
quittée, refus d’Élise et annulation par Marc. Les quatre actes portent leur
auteur et leur date. Marc retrouve son acte pour autrui dans son export sans
pouvoir lire les périodes d’Élise. L’agence existante et ses invitations ne
sont pas converties ; les fixtures dédiées sont rejouables par upserts et
réservées aux comptes de démonstration.

### DASH-05g — entrées et sorties du groupe

Se connecter avec **Zoé** (`zoe-violon`, suffixe réel indiqué par le seed), puis
ouvrir **Mes structures › Historique de mes participations**. « Démo — Mémoire
du groupe » comporte sept périodes fictives et treize actes : invitation
acceptée puis quittée, refus et annulation d’invitation, demande déclinée,
demande retirée par Zoé, demande acceptée par Malik puis quittée, entrée par
recrutement décidée par Malik puis départ de Zoé. Chaque acte porte son auteur
et sa date. Malik retrouve ses actes pour autrui dans son export sans accès
aux périodes de Zoé. Le groupe est dédié aux fixtures ; les groupes et
participations déjà présents ne sont pas convertis. Le seed est rejouable
par upserts et vérifie les comptes de démonstration avant création.

### DASH-05h — rôles et transmissions du groupe

Se connecter avec **Zoé**, puis **Malik**, et ouvrir **Mes structures ›
Historique de mes participations**. « Démo — Rôles du groupe » montre deux
périodes fictives actives et onze actes : Zoé voit deux attributions de co-gestion,
un retour au rôle de membre et deux allers-retours de responsabilité ; Malik
voit uniquement les quatre actes de transmission de sa propre période. Les
auteurs alternent avec les véritables cédants du scénario. Les actes pour
autrui restent exportables sans ouvrir le journal du collègue. Le seed utilise
des identifiants stables et des upserts ; aucune période préexistante n’est
convertie. L’état final est Malik responsable et Zoé en co-gestion.

### Mémoire de l’école — DASH-05i

**Démo — Mémoire de l’école** (`demo-memoire-ecole`, MJC masquée) est gérée par
Malik (`malik-batterie`). Zoé (`zoe-violon`) a deux périodes fictives closes :
acceptation du lien puis départ personnel, nouvelle acceptation puis retrait
par Malik. Quatre actes datés et attribués, sans invitation nominative ni jeton
conservé dans le journal. Avec Zoé : `/ecoles` puis **Historique de mes
participations** (`/structure/historique`). Malik ne voit pas ces périodes dans
son historique. Les fixtures sont idempotentes et n’altèrent aucune ancienne
participation réelle.

### Journal des validations de collaboration (DASH-05j)

Après `npm run seed:demo`, ouvrir la conversation Clara ↔ Inès depuis le compte
`clara-guitare` ou `ines-chant`, puis **Journal des validations de collaboration** :
la session acoustique fictive affiche quatre validations datées et attribuées,
deux accords et deux confirmations d’achèvement. Les dates proviennent des actes
explicitement créés par `seed-scenarios.ts`, sans convertir d’anciens états.
Dans Lucas ↔ Kevin (`lucas-sax` ou `kevin-metal`), la première répète ska-punk
montre les deux validations de Lucas ; Kevin doit encore répondre. Proposer ou
accepter une date passée vaut aussi confirmation. Les autres comptes ne voient
pas ce journal. Le volet fonctionne au clavier et sur écran de 390 px.
Les scénarios existants suffisent : aucune nouvelle fixture ni reprise réelle.

### Refus et annulations de collaboration (DASH-05k)

Après `npm run seed:demo`, avec Clara ou Inès, ouvrir leur conversation puis
**Journal des validations de collaboration**. Deux collaborations fictives
supplémentaires montrent **Proposition de collaboration refusée** par Inès et
**Collaboration annulée** par Clara, avec dates explicites et accord antérieur
de Clara. Elles ne produisent aucune notification ni progression. Leurs actes
figurent aussi dans l’export personnel des deux parties. Les identifiants stables
et upserts évitent les doublons ; une base déjà semée reçoit ces situations sans
transformer ses anciennes collaborations.

### Appréciations répétables (DASH-05l)

Dans la conversation Clara/Inès, le **Journal des validations de collaboration**
contient « Appréciations après la répétition » : deux attributions et deux reprises
fictives de Clara, datées et attribuées. Le seed utilise des identifiants stables,
y compris sur une base déjà semée. Ces actes dédiés ne sont pas déduits des
appréciations existantes et n’émettent ni notification ni progression. Les
qualités et instruments ne sont pas recopiés dans le journal.

### Crédits manuels conservés (DASH-05m)

Dans **Morceaux → Historique personnel des crédits**, `ines-chant` voit un
cycle fictif dédié : attribution par Clara, refus, nouvelle attribution,
confirmation puis retrait. Deux périodes distinctes, sans crédit courant
restant pour Inès, sans titre ni lien dans le journal. `clara-guitare` voit
ses deux attributions pour autrui, pas les décisions d'Inès. Scénario idempotent
`demo-manual-credit-history`, inséré aussi quand les scénarios existaient déjà ;
aucune ancienne ligne convertie et aucun événement de progression ajouté.

### Formation et répertoire des groupes (ONB-12c1)

Après `npm run seed:demo`, la page publique de trois groupes affiche **Sur
scène**, avec la mention « Déclaré par le groupe » :

| Groupe            | Formation | Répertoire               | Où                    |
| ----------------- | --------- | ------------------------ | --------------------- |
| Les Lucioles      | Duo       | Reprises                 | `/@les-lucioles`      |
| Fanfare Pirate    | Groupe    | Reprises et compositions | `/@fanfare-pirate`    |
| Les Rats du Mardi | Groupe    | Compositions             | `/@les-rats-du-mardi` |

Orbital et Néon Lagune restent « non précisé » : rien ne s'affiche, et rien ne
les exclura d'un rapprochement (ONB-13b). Pour modifier : `zoe-violon`, puis
`/groupes/les-lucioles/modifier`. Le seed (`prisma/seed-band-lineups.ts`) ne
réécrit jamais une fiche déjà présente ; rejoué, il ne fait rien.

### Enregistrer soi-même (DASH-06a)

Se connecter avec `clara-guitare`, ouvrir **Morceaux → Midnight Groove**, puis
**Qui prend en charge ?** : Clara a pris l'enregistrement, chez elle (« Mon
home studio · aucune adresse enregistrée »), et l'a commencé il y a trois
jours. L'historique montre la prise en charge et le début. Elle peut
**Terminer** (case de confirmation), **Remettre à faire** ou **Libérer**.
Une fois terminé, l'écran propose d'ajouter « Prise de son » à son crédit et
de passer au mixage (DASH-06b à 06d). Scénario rejouable
(`prisma/seed-work-steps.ts`, identifiants stables) ; aucune progression émise.

### Enregistré chez soi, puis le mixage (DASH-06b à 06d)

Toujours avec `clara-guitare`, ouvrir **Morceaux → Night Drive** : composé
seule, enregistré chez elle il y a cinq jours. La fiche affiche « Enregistré
le … · déclaré par Clara » (jamais « vérifié »), le chemin du morceau indique
« Fait soi-même », et son crédit porte « Composition, Prise de son » sur une
seule ligne. **La suite du morceau** propose le **mixage**, pas un·e ingé son
pour l'enregistrement. Dans **Carrière → Campagnes en cours**, la ligne dit
« Enregistré · déclaré ». Rouvrir l'étape retire la mention et le besoin de
mixage ; le crédit de prise de son reste. Aucune XP, aucune collaboration.

### Équipe d’un projet (P4a)

Se connecter avec `malik-batterie`, ouvrir **Mes projets → EP des Rats**
(projet des Rats du Mardi) : bloc **Équipe** avec Nora (« Réalisation »,
Coordination), Inès, et Samir (« Ingé son », invitation en attente) ; la
gestion peut proposer ou retirer la coordination, retirer une personne ou
annuler une invitation. Avec `nora-prod` : « Je coordonne », le morceau
« Groove du mardi » en résumé, jamais « Ballade sans titre » (partage
« Rien ») ; **Modifier le projet** ne montre que les dates et la phrase.
Avec `ines-chant` : « Je participe », lecture seule, **Quitter le projet**.
Avec `samir-son` : **Mes projets → Invitations** montre seulement le nom, le
type, le porteur, qui invite et ce qui est proposé. Scénario rejouable
(`prisma/seed-projects.ts`, identifiants stables) ; aucune progression émise.
