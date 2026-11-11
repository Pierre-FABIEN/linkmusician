# Données de démonstration

> Le guide pour **voir chaque situation de l'app** avec des comptes fictifs :
> qui se connecte, où aller, ce qu'on doit y voir. Mis à jour le 11/11/2026
> (phases 1 à 5 : jusqu'aux scènes ouvertes récurrentes, P5-04a).

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

## 2. Les personnages (17)

| Handle           | Qui                                 | Métiers                     | Ce qu'il ou elle illustre                                                                                        |
| ---------------- | ----------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `malik-batterie` | Malik, 32 ans, batteur semi-pro     | Musicien                    | Responsable des Rats du Mardi ; batteur de Fanfare Pirate ; organise des jams ; groupes de contacts              |
| `ines-chant`     | Inès, 27 ans, chanteuse soul        | Musicienne                  | Membre des Rats ; son titre « Lumière » produit par Nora                                                         |
| `theo-basse`     | Théo, 38 ans, bassiste pro          | Musicien, ingé son          | Co-gère les Rats et La Cave Studio ; profil d'ingé son (home studio)                                             |
| `clara-guitare`  | Clara, 25 ans, guitariste rock indé | Musicienne                  | Lead d'une jam à venir ; nouvelle venue des Rats                                                                 |
| `samir-son`      | Samir, 41 ans, ingé son             | Ingé son, musicien          | Responsable de **La Cave Studio** ; enregistre Orbital, mixage à confirmer ; invite Nora à co-gérer le studio    |
| `nora-prod`      | Nora, 30 ans, productrice           | Productrice, musicienne     | Profil de productrice ; produit « Lumière » ; Néon Lagune en formation ; invitée au studio                       |
| `lucas-sax`      | Lucas, 34 ans, saxophoniste         | Musicien                    | Responsable de **Fanfare Pirate** : plateau accepté, concerts vérifiés, **tournée**, un concert à confirmer      |
| `zoe-violon`     | Zoé, 23 ans, violoniste             | Musicienne                  | Responsable des **Lucioles** (groupe neuf) : candidature à une scène découverte, hors conditions ailleurs        |
| `kevin-metal`    | Kévin, 35 ans, guitariste metal     | Musicien                    | Responsable d'**Orbital** (avec une mineure) : enregistrement vérifié, concert corroboré, candidature en attente |
| `awa-clavier`    | Awa, 29 ans, claviériste            | Musicienne                  | Co-gère Fanfare Pirate ; **invitée à co-gérer Le Comptoir Jazz**                                                 |
| `hugo-dj`        | Hugo, 28 ans, DJ et organisateur    | Musicien, organisateur      | **Soirées Disco Club** (vérification en attente) ; invité à co-gérer Bruit Rose ; « Je suis dispo »              |
| `manon-ukulele`  | Manon, 19 ans, débutante            | Musicienne                  | Membre des Lucioles ; messagerie (premier contact à répondre)                                                    |
| `jade-batterie`  | Jade, **16 ans**                    | Musicienne                  | **Mineure (D5)** : jams finies avant 22 h, jamais dispo affichée, batteuse d'Orbital (ne candidate pas)          |
| `yanis-orga`     | Yanis, 39 ans, programmateur        | Organisateur, musicien      | Responsable de **l'Asso Bruit Rose** et du **Festival des Coteaux** (vérifiés) ; plateau rock                    |
| `lina-orga`      | Lina, 33 ans, organisatrice         | Organisatrice, musicienne   | Co-gère Bruit Rose ; **Collectif Nuits Courtes** (vérifié) ; scène découverte **à son nom**                      |
| `sophie-bar`     | Sophie, 42 ans, gérante de bar      | Musicienne (sans le métier) | **Le Comptoir Jazz** revendiqué, fiche publiée, vérifié ; publie ses dates **sans être organisatrice** (Q34)     |
| `paul-salle`     | Paul, 47 ans, gérant de café        | Musicien                    | **Revendication du Café des Sons en attente** de la modération                                                   |

Un compte de modération n'est pas créé par `seed:demo` : passe un compte
en rôle admin (`/admin`) pour voir les files de `/moderation`.

## 3. Les situations, et où les voir

Pour chaque ligne : **se connecter avec** → **aller sur** → ce qu'on doit
voir.

### Profils, découverte, messagerie (phases 1 et 2)

| Situation                                            | Se connecter avec               | Où                                                                         |
| ---------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| Profils complets, démos, niveaux, influences         | n'importe qui                   | `/@malik-batterie`, `/decouvrir`                                           |
| Recherche par métier (son, production, organisation) | n'importe qui                   | `/decouvrir?metier=inge-son`, `?metier=producteur`, `?metier=organisateur` |
| Messagerie : 3 messages sans réponse (D44)           | `hugo-dj`                       | `/messages`                                                                |
| Premier contact à accepter ou refuser                | `manon-ukulele`                 | `/messages`                                                                |
| Contacts et groupes de contacts                      | `malik-batterie`, `awa-clavier` | `/messages/contacts`                                                       |
| Suggestions, indicateurs vivants                     | n'importe qui                   | `/espace`                                                                  |

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
| Profil d'ingé son : spécialités, matériel, travaux en écoute, rang                           | n'importe qui             | `/@samir-son`, `/profil/son` (Samir)        |
| Profil de productrice : spécialités, styles, tarifs indicatifs, productions                  | n'importe qui             | `/@nora-prod`, `/profil/production` (Nora)  |
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

### Mineur·es (D5)

| Situation                                                  | Se connecter avec | Où                      |
| ---------------------------------------------------------- | ----------------- | ----------------------- |
| Jams visibles seulement si finies avant 22 h               | `jade-batterie`   | `/jam/agenda`           |
| Jamais affichée « dispo », pas de discussion de groupe     | `jade-batterie`   | `/jam`, `/messages`     |
| Membre d'un groupe, mais **ne candidate pas** à un plateau | `jade-batterie`   | un plateau              |
| Démarche « Jouer sur scène avant 18 ans » sur le groupe    | `kevin-metal`     | `/groupes/orbital-prog` |

## 4. Ce que la démo ne couvre pas encore

Les lots suivants n'existent pas encore dans l'app :

- jams publiques **récurrentes** des lieux, animateur·rices (P5-04) ;
- photos des lieux (P5-03d) ;
- acte V jouable de la carte de carrière (P5-08) ;
- booker et manager (P5-07) ;
- écoles, MJC, conservatoires (P5-11) ;
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
