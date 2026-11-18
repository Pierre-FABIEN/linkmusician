# 07 — Les modes de jeu : carrière et jam

LinkMusician se vit comme un **jeu**. Comme dans un jeu de foot, l'écran
d'accueil propose deux modes (D21) :

| Mode         | L'esprit                                 | Dans un jeu de foot | Ce qu'on y fait                                                                     |
| ------------ | ---------------------------------------- | ------------------- | ----------------------------------------------------------------------------------- |
| **Carrière** | Construire son parcours, étape par étape | Mode carrière       | Monter une équipe, créer des morceaux, enregistrer, jouer sur scène, sortir, signer |
| **Jam**      | Jouer pour le plaisir, ici et maintenant | Match rapide        | Jammer avec des gens dispos près de chez soi, faire des rencontres musicales        |

On passe de l'un à l'autre quand on veut (depuis le 05/11/2026 : écran
`/jouer`, accueil de l'espace, qui retient le dernier mode choisi ; hub
`/jam` pour le mode jam). Le jam ne sert pas à lancer
un projet : il sert à **jouer et à rencontrer**. Mais les rencontres
d'un soir sont souvent celles avec qui l'on monte un projet plus tard,
et la carrière peut aller les rechercher quand on en a besoin (§6.2). Le ton est toujours celui de l'**encouragement** : on félicite, on
montre la suite, on ne met jamais la pression (§7).

Ce document suit le vrai parcours de l'industrie musicale, du premier
jam à la signature et à la tournée. Il prolonge
[06 §4](./06-metiers.md#4-la-chaîne-dun-morceau--du-jam-au-producteur)
(la chaîne d'un morceau, D20) et s'appuie sur le moteur de progression
([02](./02-progression.md)). Les éléments _(proposé)_ restent à valider
et à calibrer par personas.

## 1. La promesse

> **Si tu bosses, tu avances. Et ça se voit.**

On ne peut promettre à personne de percer : l'industrie ne dépend pas de
nous. Ce que LinkMusician promet, et tient :

1. **Chaque effort réel est compté.** Un jam, une session, un concert,
   une sortie : tout ce qui est fait avec d'autres et confirmé rapporte,
   et chaque point a une raison lisible.
2. **La suite du chemin est toujours visible.** On sait à tout moment
   quelle est la prochaine épreuve et comment la franchir.
3. **Le travail ouvre des portes.** Les ingés son, producteurs,
   organisateurs et labels découvrent les artistes par ce qu'ils ont
   **prouvé** (réputation, paliers, crédits, vitesse de progression),
   jamais par la pub ni par l'argent.

Le try-hard est récompensé, **mais seulement sur des actions réelles** :
cliquer, spammer ou se connecter tous les jours ne rapporte rien (02 §6).
C'est ce qui rend la réussite dans le jeu crédible dans la vraie vie.

## 2. Le mode carrière : la carte

La carrière est une **carte en huit actes**. Chaque acte suit une étape
réelle du métier, fait entrer de nouveaux métiers (de nouveaux
« personnages » à recruter) et se termine par une **épreuve** vérifiée
par quelqu'un d'extérieur. Les actes suivants restent dans le brouillard
tant qu'on n'y est pas, mais on voit ce qu'ils contiennent.

Un acte n'est pas un passage obligé : un artiste solo peut enregistrer
chez lui et sortir un titre sans groupe. La carte montre ce qui est
**prouvé**, pas un ordre imposé.

> **Présentation révisée par D73 (Q-NL-1), livrée par N2 le 18/11/2026.**
> À l'écran, plus d'« acte en cours », de brouillard ni de numéro romain :
> les huit épreuves ci-dessous sont rangées en six branches indépendantes,
> chacune _Franchie_, _À portée_, _Ouverte_ ou _Bientôt_, et la carte
> propose jusqu'à trois épreuves à portée. La colonne « Acte » n'est plus
> qu'un identifiant interne. Les conditions et preuves du tableau sont
> inchangées. Détail : [conception 21 §10](./21-progression-non-lineaire.md#10-proposition-ux-de-la-carte-de-carrière).

| Acte | Nom              | Dans l'industrie                                                                      | Métiers qui entrent en jeu                             | Épreuve de fin d'acte (preuve)                                    | Phase |
| ---- | ---------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- | ----- |
| I    | La rencontre     | Trouver avec qui jouer : annonces, jams, bœufs                                        | Musicien·nes                                           | Premier jam confirmé par les deux côtés                           | 2     |
| II   | La création      | Composer, monter un groupe, répéter, faire une maquette, déclarer ses œuvres          | Musicien·nes, groupe                                   | Morceau composé, rôles confirmés par toute l'équipe               | 3     |
| III  | Le studio        | Enregistrer, mixer, masteriser                                                        | Ingé son, studio                                       | Enregistrement confirmé par l'ingé son ou le studio (**vérifié**) | 4     |
| IV   | La production    | Arranger, produire, finaliser le son                                                  | Producteur·rice                                        | Production confirmée par le producteur, crédit accepté            | 4     |
| V    | La scène         | Tremplins, premières parties, dates locales, puis tournée                             | Organisateur·rice, salle, booker                       | Concert **vérifié** par l'organisateur ; tournée de 3 villes      | 5     |
| VI   | La sortie        | Distribution numérique, codes ISRC/UPC, promo, presse, réseaux, playlists, clip       | Communication musicale, (distributeur hors plateforme) | Sortie **vérifiée** par API (ISRC ou UPC)                         | 3-6   |
| VII  | Le développement | Manager, booker, éditeur (édition, synchro), label (licence, distribution, signature) | Manager, booker, éditeur·rice, label                   | Signature validée par le label vérifié                            | 5-6   |
| VIII | La carrière      | Album, tournées, festivals, vivre de la musique                                       | Tous                                                   | Palier « Référence » (sorties vérifiées, endossements)            | 6     |

### 2.1 Le détail des actes

**Acte I — La rencontre.** On répond à une annonce, on écrit, on joue
ensemble. Quêtes : « Réponds à une annonce », « Fais ton premier jam »,
« Joue avec 3 personnes différentes ». Épreuve : une jam où l'on était
et où l'on a reçu une appréciation (D27, D36), ou une collaboration
confirmée des deux côtés.

**Acte II — La création.** On compose, on forme un groupe, on répète, on
publie une maquette. On apprend aussi le métier : la plateforme guide
vers le dépôt des œuvres à la SACEM et le partage des rôles de
composition, sans jamais le gérer elle-même (06 §4.4). Quêtes :
« Crée ton premier morceau », « Recrute un·e chanteur·se » (quête émise),
« Première répète corroborée ». Épreuve : un morceau composé à
plusieurs, rôles confirmés (corroboré, D35) ; composé seul·e, il compte
pour les quêtes, pas pour l'épreuve.

**Acte III — Le studio.** On cherche un ingé son, on réserve un studio,
on enregistre, on mixe, on masterise. Quêtes : « Trouve ton ingé son »,
« Enregistre ton premier titre », « Fais masteriser un titre ». Épreuve :
l'enregistrement **vérifié** par l'ingé son ou le studio présent sur la
plateforme.

**Acte IV — La production.** On propose le morceau dans la vitrine des
propositions ; un·e producteur·rice le découvre, l'arrange, le produit.
Selon les genres, le producteur arrive plus tôt (rap, électro, pop : dès
la composition) : la carte le permet. Épreuve : production confirmée,
crédit accepté.

**Acte V — La scène.** Tremplins, premières parties, premières dates
dans sa ville, puis dans d'autres villes. Quêtes : « Réponds à un appel
à projets de salle », « Joue devant un public qui ne te connaît pas »,
« Fais ta première date hors de ta ville ». Épreuves : premier concert
**vérifié** par l'organisateur, puis la tournée (≥3 concerts dans ≥3
villes en 30 jours, 02 §2.2).

**Acte VI — La sortie.** On sort le titre ou l'EP via un distributeur
numérique (hors plateforme), avec ses codes ISRC et UPC ; on prépare la
promo : visuels, clip, presse, réseaux, soumission aux playlists. Quêtes
de méthode _(proposé)_ : « Prépare ta sortie 4 semaines avant », « Trouve
un·e attaché·e de presse », « Tourne un clip avec un·e vidéaste ».
Épreuve : sortie **vérifiée** par API.

**Acte VII — Le développement.** Les artistes qui ont prouvé deviennent
visibles des managers, bookers, éditeurs et labels (flux « projets qui
montent », 02 §5). Contrats de management, de booking, d'édition (dont la
synchro : musique à l'image), de licence, de distribution ou d'artiste.
Épreuve : la signature, que seul le label vérifié peut valider.

**Acte VIII — La carrière.** Album, tournées, festivals, statut de
professionnel·le (intermittence déclarée, D17). Le jeu ne s'arrête pas :
chaque nouveau morceau relance une campagne (§3.2).

## 3. Les mécaniques du mode carrière

### 3.1 Classes et multiclassage

Chaque **métier** est une classe (musicien·ne, ingé son, producteur·rice,
organisateur·rice…), avec sa propre barre d'XP et ses rangs (les paliers,
02 §5). On peut **multiclasser** : une guitariste ingé son monte ses deux
pistes. Le **niveau de compte** est la somme : il raconte tout le
parcours.

### 3.2 Campagnes : chaque morceau est une aventure

Chaque morceau est une **campagne** avec sa propre carte (idée → composé
→ enregistré → produit → joué sur scène → sorti → signé, 06 §4.2). On
peut mener plusieurs campagnes en parallèle. Fin de campagne = un
**récapitulatif** façon fin de partie : qui a joué quel rôle, ce que
chacun a gagné, les crédits obtenus.

### 3.3 L'équipe (la « party »)

Un morceau, c'est une équipe à composer, comme un groupe d'aventuriers :
la fiche du morceau affiche les **rôles nécessaires** et ceux qui sont
pourvus (basse ✅ · batterie ✅ · chant ❓ · ingé son ❓). Chaque rôle vide
propose « Recruter » : une annonce ciblée par métier (quête émise,
02 §8). Une équipe complète débloque l'acte suivant.

### 3.4 Quêtes

- **Quêtes principales** : l'épreuve et les étapes de l'acte en cours.
- **Quêtes secondaires** : apprendre le métier (« Déclare ton œuvre »,
  « Prépare ta sortie »), élargir son réseau (« Collabore avec un métier
  que tu n'as jamais croisé »).
- **Quêtes émises** : les annonces, missions multijoueur remplies quand
  les deux côtés confirment.
- **Le tableau de bord** montre toujours les trois prochains objectifs
  atteignables (déjà en place depuis P1-11).

### 3.5 Épreuves (les « boss »)

Les grands moments de la carrière sont des **épreuves** : elles ne se
franchissent qu'avec la confirmation de quelqu'un d'extérieur (un ingé
son, un organisateur, une API, un label). C'est ce qui leur donne de la
valeur : une épreuve franchie est **vraie**. Franchir une épreuve
déclenche une **célébration** (animation plein écran, récompense, partage
proposé) et révèle l'acte suivant sur la carte.

### 3.6 Butin et trophées

- **XP** avec sa raison, à chaque collaboration confirmée.
- **Crédits** : « enregistrement : Sam », « production : Nora ». Ce sont
  les vrais trophées, permanents, affichés sur le profil et sur le
  morceau.
- **Succès** avec leur rareté (« 4 % des musiciens »), 02 §9.
- **Rangs** (paliers) qui débloquent des droits réels : répondre aux
  appels à projets sélectifs, apparaître aux pros.
- **Cosmétiques** liés au niveau de compte : cadres de profil, titres,
  thèmes. Purement décoratifs.

### 3.7 Sensations

- Chaque gain s'annonce : « +400 XP · Enregistrement confirmé avec Sam ».
- La montée de niveau et le franchissement d'un rang ont leur animation.
- Le **journal de bord** (le registre des gains) raconte la carrière.
- Un **récap mensuel** _(proposé)_ : « Ce mois-ci : 2 sessions, 1
  concert vérifié, 3 nouvelles rencontres, +1 250 XP ».
- **Objectifs de la semaine** _(proposé)_, choisis par la personne
  parmi ses quêtes : un bonus de succès s'ils sont tenus, **aucune
  pénalité** sinon.

### 3.8 Le radar des pros : là où le try-hard paie

Ce qui fait le lien entre le jeu et la vraie réussite : les pros
cherchent des artistes par **réputation**, **paliers**, **crédits** et
**vitesse de franchissement** des paliers (02 §5). Celui ou celle qui
enchaîne les épreuves réelles **monte dans leur radar**. L'XP n'y entre
jamais (02 §1) : ce sont les preuves qui comptent, pas le farming.

## 4. Aller plus loin dans la carrière

### 4.1 Choisir son ambition

En entrant en mode carrière, on choisit **ce qu'on vise**, comme les
objectifs fixés en début de saison dans un jeu de foot. On peut en
changer à tout moment, et il n'y a **jamais d'échec** : l'ambition sert
seulement à mettre en avant les bonnes étapes de la carte.

| Ambition                         | Ce qu'elle met en avant                                    |
| -------------------------------- | ---------------------------------------------------------- |
| Jouer en groupe pour le plaisir  | Actes I et II : trouver son groupe, répéter, composer      |
| Monter sur scène                 | Actes II et V : un répertoire, des dates, puis une tournée |
| Enregistrer et sortir ma musique | Actes III, IV et VI : studio, production, sortie           |
| Devenir pro                      | Toute la carte, jusqu'aux actes VII et VIII                |
| Accompagner les autres           | Pour les autres métiers : la carrière de sa classe (§4.4)  |

### 4.2 L'écran de carrière

C'est le « hub » du mode carrière, l'équivalent du bureau du manager
dans un jeu de foot :

- **la carte** : l'acte en cours, les épreuves franchies, la suite
  dans le brouillard ;
- **les campagnes en cours** : chaque morceau, son état et ses places
  libres ;
- **l'équipe** : son groupe ou ses partenaires réguliers ;
- **les trois prochains objectifs** (déjà en place, P1-11) ;
- **l'agenda** : répètes, sessions, dates à venir ;
- **le journal de bord** : les derniers gains et leur raison.

### 4.3 Solo, groupe et projets parallèles

- **En solo**, la personne mène ses campagnes elle-même et recrute au
  morceau (un ingé son, une choriste…).
- **En groupe**, le groupe a **sa propre carrière**, comme un club : un
  effectif (les membres actuels et passés, avec leurs dates), sa carte,
  ses rangs (Projet → Répète → Compose → Enregistre → Démo → Live →
  Tournée → EP → Album → Signé, 02 §5) et son palmarès. Une arrivée ou
  un départ s'inscrit dans l'historique ; un membre arrivé après une
  étape n'en reçoit pas les points (05 §3).
- **Plusieurs projets** en même temps, c'est normal : un groupe de rock,
  des sessions de basse pour d'autres, un projet électro solo. Chaque
  projet a sa carte ; la personne a une seule carrière qui les cumule.

### 4.4 Une carrière pour chaque métier

Le détail de chaque rôle (quêtes, gains, déblocages, garde-fous) est
dans [08 — Les carrières, rôle par rôle](./08-carrieres-par-role.md).

Chaque classe a sa propre carte, et les cartes se croisent : les
épreuves des uns sont souvent validées par les autres.

| Classe              | Sa carte (rangs, 02 §5)                                                                            | Valide les épreuves de…         |
| ------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------- |
| Musicien·ne         | Premiers pas → En réseau → Collaborateur → Musicien de scène → Pilier local → Référence            | —                               |
| Ingé son, studio    | Home studio → Premiers projets → Portfolio → Établi → Référence ; studio : Ouvert → Incontournable | l'acte III des artistes         |
| Producteur·rice     | mêmes rangs, crédits de production                                                                 | l'acte IV des artistes          |
| Organisateur·rice   | Premier événement → Programmateur régulier → Scène locale → Festival                               | l'acte V des artistes           |
| Manager, booker     | Premier artiste → Développeur → Agence                                                             | l'acte VII (accompagnement)     |
| Label, éditeur·rice | Première sortie → Catalogue → Développeur d'artistes                                               | l'acte VII (signature, édition) |

Pour un pro, la carrière consiste à **faire grandir les autres** : un
producteur monte quand les artistes qu'il a produits franchissent leurs
épreuves. C'est ce qui aligne les intérêts de tout le monde.

### 4.5 Ce que chaque acte débloque

Franchir l'épreuve d'un acte débloque **de nouvelles possibilités
réelles**, pas seulement des points. Le déblocage repose toujours sur
une preuve ou un rang, jamais sur l'XP (02 §1).

| Épreuve franchie             | Débloque _(proposé)_                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| I · Premier jam confirmé     | Endosser ses partenaires de jam (avec la confiance TL1), apparaître dans « dispos ce soir » des autres |
| II · Premier morceau composé | Fiche morceau publique, recrutement par rôle, demander un ingé son                                     |
| III · Enregistrement vérifié | **Vitrine des propositions** : proposer un morceau aux producteurs                                     |
| IV · Production confirmée    | Candidater aux appels à projets de salles et tremplins                                                 |
| V · Concert vérifié          | Entrer dans le **radar des pros** (managers, bookers) ; organiser une date à plusieurs groupes         |
| VI · Sortie vérifiée         | Être proposé aux labels et éditeurs ; page de sortie avec tous les crédits                             |
| VII · Signature              | Rang « Signé » du groupe, palmarès, possibilité de parrainer (§4.8)                                    |

### 4.6 La fiche de carrière

Comme la fiche d'un joueur, avec ses statistiques : jams, personnes
rencontrées, collaborations, morceaux, sessions, concerts, villes
jouées, sorties, crédits. La version **publique** ne montre que les
faits confirmés par d'autres (la réputation, 02 §1) ; la version privée
y ajoute l'XP, le niveau et le journal de bord (D1).

Chaque épreuve franchie produit une **carte souvenir** à partager
(stories, réseaux) : « Premier concert vérifié · Le Sonic, Lyon ». C'est
une célébration pour la personne et une vitrine pour l'app.

### 4.7 Les coups de pouce

Quand on n'avance plus depuis un moment, l'app ne culpabilise pas : elle
propose une marche facile à franchir. « Trois jams ce week-end près de
chez toi », « Un ingé son de ton réseau est dispo en novembre », « Ton
morceau attend une voix : deux chanteuses de ton carnet de jams sont
dans le coin ». Le carnet de jams sert ici : les rencontres d'hier
deviennent les équipes de demain.

Règles (P4-13a) : l'entrée « Un coup de pouce » n'apparaît dans l'espace
qu'après **21 jours** sans progrès ; elle mène à un écran de trois idées
au plus, chacune tirée du **réseau réel** (personnes gardées après avoir
joué ensemble, à moins de 50 km) ou des jams de la semaine. Aucune
notification, aucune durée d'absence affichée, jamais l'XP ni le palier
dans le choix.

### 4.8 Le parrainage

Les personnes au rang Pilier local ou au-delà peuvent **parrainer** des
débutant·es : les inviter à une jam, les présenter à quelqu'un. Quand
deux personnes présentées par un parrain collaborent, le parrain obtient
le succès _Passeur_ (02 §9). On progresse aussi en faisant progresser
les autres.

Règles (P4-13b) : présenter, c'est choisir deux personnes **majeures de
son réseau musical** qui n'ont **pas encore joué ensemble**, sans
blocage entre elles, avec un mot facultatif ; chacune reçoit une
notification avec le profil de l'autre. Dix présentations par mois au
plus. Le succès _Passeur_ arrive à la première collaboration terminée
entre elles **après** la présentation ; ni XP, ni classement. Inviter un·e
débutant·e à une jam passe par l'invitation de la jam (P2-14c).

## 5. Qui gagne quoi sur toute la chaîne _(proposé, à calibrer)_

Repères indicatifs, cohérents avec le barème du musicien (02 §2.2). Les
multiplicateurs anti-abus s'appliquent partout (02 §6).

| Moment                            | Artistes du morceau | Le pro qui intervient                              |
| --------------------------------- | ------------------- | -------------------------------------------------- |
| Jam ou collaboration confirmée    | 400                 | —                                                  |
| Morceau composé (rôles confirmés) | 150                 | —                                                  |
| Enregistrement vérifié            | 400                 | Ingé son ou studio : 300 + crédit                  |
| Production confirmée              | 300                 | Producteur·rice : 400 + crédit                     |
| Concert vérifié                   | 1 000 (groupe)      | Organisateur·rice : 200 par groupe programmé       |
| Sortie vérifiée                   | 1 500 (EP)          | Chaque crédité : 300 (crédit sur sortie vérifiée)  |
| Signature                         | 3 000               | Label : palier « Première sortie », puis Catalogue |

## 6. Le mode jam : jouer pour le plaisir

Le mode jam, c'est le **match rapide** : pas d'objectif, pas de carte,
pas d'engagement, pas de projet. On a envie de jouer ce soir, on trouve
des gens, on joue, on rencontre. C'est aussi la porte d'entrée la plus
simple de l'app : on n'a pas besoin d'avoir un projet pour s'amuser.

### 6.1 Comment ça se joue

Dans la vraie vie, une jam est le plus souvent **tenue par un hôte** :
le bar qui fait son bœuf du jeudi, la MJC qui anime un atelier, le
festival qui ouvre la scène après les concerts, ou un·e musicien·ne qui
anime la scène ouverte d'un bar (D27). Les situations courantes :

| Situation                                                | Hôte                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| Scène ouverte, bœuf d'un bar ou d'un café-concert        | Le lieu                                                      |
| Jam animée par un·e musicien·ne dans un bar              | Le ou la musicien·ne animateur                               |
| Atelier jam d'une MJC, d'une école, d'une association    | La structure ou l'encadrant·e (P5-11 : réservé à ses élèves) |
| Bœuf de fin de concert ou de festival                    | L'organisateur                                               |
| Fête de la musique, scène de rue                         | L'organisateur, la collectivité                              |
| Quelques musicien·nes dans un local de répète, un studio | L'un ou l'une d'entre eux                                    |

1. **« Je suis dispo »** : un interrupteur sur l'accueil, avec un
   créneau (ce soir, demain, ce week-end) et ce qu'on a envie de jouer.
   Il s'éteint tout seul à la fin du créneau. Les musicien·nes
   compatibles près de chez soi le voient (commune et distance par
   tranches, jamais d'adresse).
2. **Publier une jam** : l'hôte choisit le **lieu dans l'annuaire**
   (ou l'y ajoute : nom, type, commune), le créneau, le style et les
   **places souhaitées** (« il manque une batterie et une voix »). Une
   jam a toujours lieu dans un **lieu public ou professionnel** : bar,
   café-concert, salle, scène ouverte, MJC, local de répétition, studio.
   **Jamais chez un particulier** (D26). Un lieu ajouté par un compte
   récent (TL0) reste invisible et n'accueille aucune jam tant qu'un
   second membre (TL1) ne l'a pas confirmé ou qu'un modérateur ne l'a
   pas validé (P2-14c).
   - Chaque jam a un **lead** (l'hôte, ou le ou la musicien·ne qu'il
     désigne). Le lead **compose sa formation** : il invite des
     musicien·nes avec qui il a des affinités sur des places réservées
     (l'invitation tient la place jusqu'à la réponse) ; les autres places
     restent ouvertes à tous, et « Je viens » ne prend jamais une place
     réservée.
   - La jam indique le **matériel sur place** (batterie, amplis, clavier,
     sono, micros, câbles), repris de la fiche du lieu et ajustable pour
     la jam : chacun sait s'il doit apporter son instrument, son ampli ou
     seulement ses baguettes.
   - Les lieux reçoivent des **suggestions de leads** parmi les
     musicien·nes « prêt·es à organiser des jams » (D51) à moins de 30 km,
     triées par réputation (appréciations reçues, jams animées), jamais par
     l'XP. Le lieu invite, la personne accepte : elle devient animatrice du
     lieu et peut mener ses scènes ouvertes par défaut (P5-04b).
3. **Trouve-moi une jam** : un bouton qui propose les jams à venir et
   les personnes dispos près de soi, selon son instrument et ses
   genres. On dit « Je viens » ; on peut venir seul, sans connaître
   personne. C'est souvent la première scène d'un·e débutant·e.
4. **On joue.** Hors de l'app, dans la vraie vie.
5. **Après la jam** : chacun peut dire **« J'y étais »**, puis voit les
   présent·es en grille de photos de profil pour les reconnaître. Ça ne rapporte
   rien en soi (D27) : ça ouvre, pendant 7 jours, la possibilité de
   laisser une **appréciation** aux autres présents (« bon groove »,
   « à l'écoute », « belle impro », un instrument) et de choisir :
   - **« Rejouer ensemble »** : une nouvelle jam préremplie ;
   - **« Garder le contact »** : la personne rejoint son **réseau
     musical** (les gens avec qui l'on a vraiment joué).

### 6.2 Ce que le mode jam rapporte

- **Venir ne suffit pas, il faut être remarqué** (D27). Être présent à
  une jam ne rapporte aucun point. Ce sont les **appréciations** des
  autres présents qui en rapportent (≈ 40 XP chacune, comme un
  endossement, 02 §2.2). Celui qui ne joue pas, ou que personne ne
  remarque, n'avance pas ; celle qui fait groover la salle avance.
- **Garde-fous** : une appréciation par personne et par jam ; entre
  deux mêmes personnes, rendements décroissants (la 2ᵉ compte moitié,
  la 4ᵉ plus rien) ; confiance TL1 requise pour en donner ; l'hôte peut
  retirer un faux présent ; la détection de collusion (P2-10) surveille
  les échanges en circuit fermé. Les appréciations sont **positives
  seulement** : pas de note, pas d'avis négatif (01 §4) ; le négatif
  passe par le signalement privé.
- Une jam n'est **pas une collaboration** à 400 XP : celles-ci restent
  réservées au travail commun (session, enregistrement, groupe).
- Le mode jam ne **montre** ni objectifs ni carte : seulement un
  **carnet de jams** façon souvenirs, avec le nombre de jams, les
  personnes rencontrées, les instruments croisés, les styles joués et
  les lieux. Le carnet est aussi un **réseau** : quand, un jour, on
  cherche une batteuse pour un projet, l'app propose d'abord celles
  avec qui l'on a déjà jammé.
- Des **succès fun** _(proposé)_ : _Noctambule_ (3 jams après 22 h),
  _Touche-à-tout_ (5 styles différents), _Brise-glace_ (une jam avec
  quelqu'un que tu ne connaissais pas), _Chef d'orchestre_ (5 jams
  tenues comme hôte). Ils ne rapportent pas de points.

### 6.3 Sécurité

- **Lieux publics ou professionnels seulement** (D26) : bar,
  café-concert, salle, scène ouverte, MJC, local de répétition, studio.
  Pas de jam chez un particulier : ni proposée, ni acceptée.
- **Mineur·es (D5)** : ils voient et rejoignent seulement les jams qui
  finissent avant 22 h ; leur « Je suis dispo » n'est montré à personne
  (on ne peut pas les solliciter) ; la prise de contact passe par la
  messagerie restreinte.
- Les quotas de confiance (02 §7) limitent le nombre de salons et de
  demandes ; blocage et signalement sont disponibles partout.

## 7. L'esprit : l'encouragement, jamais la pression

LinkMusician encourage. Il félicite chaque pas, montre toujours la
prochaine étape, et ne punit jamais une pause : une semaine sans jouer
ne fait rien perdre. Concrètement :

- **On célèbre** : chaque gain s'annonce avec sa raison, chaque épreuve
  franchie a sa célébration, chaque fin de campagne son récap.
- **On montre la suite** : les trois prochains objectifs, la carte de
  carrière, les places libres dans les jams autour de soi.
- **On ne compare pas les gens entre eux** : pas de classement entre
  personnes ; la progression se compare à soi-même (« ce mois-ci, tu
  as… »).
- **On ne récompense que le réel** : jouer, enregistrer, monter sur
  scène, sortir. Se connecter ou envoyer des messages ne rapporte rien,
  ce qui protège tout le monde du spam.
- **Les points ne s'achètent pas** : ce qu'on prouve dans l'app doit
  rester vrai pour les pros qui le regardent (01 §5).

### 7.1 Toujours savoir comment jouer _(P2-17, P2-18)_

- Sur chaque écran clé, un **conseil court** rappelle comment créer du
  lien, apprécier les gens avec qui l'on a joué, trouver des
  musicien·nes pour un projet. Un seul à la fois, masquable, jamais sur
  un écran déjà guidé par « Ta prochaine étape » (fait en P2-17, voir
  [docs/guide](../guide/README.md)).
- Le profil propose des **musicien·nes compatibles** : mêmes styles,
  niveau déclaré proche, instruments complémentaires, près de chez soi,
  le réseau musical d'abord. Jamais trié par l'XP. Un·e mineur·e n'est
  jamais suggéré·e à un adulte inconnu (fait en P2-18, voir
  [docs/recherche](../recherche/README.md#suggestions-de-musiciennes-p2-18)).
- **Ne pas confondre compatibilité et admissibilité** : un niveau proche
  aide à classer les suggestions, mais ne doit pas empêcher une personne
  débutante de découvrir ou de contacter une personne très expérimentée.
  Les intentions peuvent être différentes : rencontrer des pairs,
  recruter pour un projet ou apprendre/transmettre. À terme, rendre les
  attentes explicites et réciproques (niveau requis ou préféré, ouverture
  à accompagner ou à apprendre) afin que chacun·e puisse décider si la
  rencontre lui convient. Ne jamais utiliser l'XP comme preuve de
  compétence ; les années d'expérience restent un indice facultatif, pas
  un critère unique de classement ou d'exclusion. Cette évolution est à
  valider avec les retours du pilote.

## 8. Ce qu'il faudra construire

| Élément                                            | Repose sur                                                        | Quand _(proposé)_ |
| -------------------------------------------------- | ----------------------------------------------------------------- | ----------------- |
| Accueil à deux modes (carrière, jam)               | Coquille de l'app (P0-05)                                         | Phase 2           |
| Mode jam : « je suis dispo », salons, fin de match | Annonces `JAM` (P2-02), collaborations (P2-06), recherche (P2-01) | Phase 2           |
| Carnet de jams, réseau musical, succès fun         | Collaborations `JAM`                                              | Phase 2-3         |
| Annonces de gains et animations de niveau          | Registre XP, événements dérivés (P1-07)                           | Phase 2           |
| Carte de carrière (actes I à III visibles)         | Paliers, étapes de groupe                                         | Phase 3           |
| Fiche morceau, équipe et rôles à pourvoir          | `Work`, `WorkContributor` (D20)                                   | Phase 3           |
| Célébration des épreuves, récap de campagne        | Étapes vérifiées, crédits                                         | Phase 3-4         |
| Actes III-IV jouables (ingé son, producteur)       | Ouverture des métiers, vitrine (06 §4)                            | Phase 4           |
| Choix de l'ambition, écran de carrière             | Carte, quêtes, paliers                                            | Phase 3           |
| Fiche de carrière, cartes souvenirs à partager     | Réputation (P2-08), étapes vérifiées                              | Phase 3-4         |
| Coups de pouce, parrainage                         | Carnet de jams, réseau musical                                    | Phase 3-4         |
| Radar des pros, objectifs de la semaine            | Réputation (P2-08), quêtes                                        | Phase 4-5         |
| Actes V à VII jouables                             | Organisations vérifiées, sorties par API                          | Phases 5-6        |
| Défis collectifs par ville                         | D3                                                                | Phase 6           |
