# 08 — Les carrières, rôle par rôle

Ce document détaille le **mode carrière** ([07](./07-modes-de-jeu.md))
pour chaque rôle de LinkMusician. Il sert de référence pour construire
chaque métier à son ouverture ([06 §5](./06-metiers.md)) et pour
calibrer les barèmes par personas ([02 §2.3](./02-progression.md)).

Les **rangs** et leurs conditions viennent de 02 §5 et 06 §3 (décidés ou
marqués _(proposé)_ là-bas). Les **quêtes, gains et déblocages** sont
_(proposés)_ et restent à calibrer. Les points indiqués sont des
**repères** : multiplicateurs, plafonds et rendements décroissants
s'appliquent partout (02 §6).

## 1. Bilan de la spécification au 05/11/2026

| Sujet                                                  | État                                                                                                                           | Où                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Moteur de progression (XP, niveaux, succès, confiance) | **Construit** (P1-01, P1-07, P1-09)                                                                                            | 02, `progression/core` |
| Profil, onboarding, médias, modération                 | **Construit** (P1-03 à P1-10, P1-12)                                                                                           | 04, 05                 |
| Profil public et tableau de bord                       | **Écrit**, en cours de validation e2e (P1-11)                                                                                  | `docs/profil-public`   |
| Musicien·ne : barème et rangs                          | **Décidé** et calibré par personas                                                                                             | 02 §2.2, §5            |
| Groupe : étapes, preuves, rangs                        | **Décidé** (phase 3)                                                                                                           | 02 §2.2, §4, §5        |
| Autres métiers : rangs                                 | **Décidé** pour producteur, ingé son, studio, organisateur, manager, booker, label ; _(proposé)_ pour éditeur et communication | 02 §5, 06 §3           |
| Chaîne d'un morceau (D20)                              | **Principe acquis**, modèle à valider avant la phase 3                                                                         | 06 §4                  |
| Modes de jeu carrière et jam (D21)                     | **Principe acquis**, mécaniques _(proposées)_                                                                                  | 07                     |
| Carrière détaillée par rôle                            | _(proposé)_ : ce document                                                                                                      | 08                     |
| Barèmes des autres métiers                             | **À calibrer** par personas au début de leur phase                                                                             | 06 §6                  |

**Questions ouvertes** : vitrine des propositions gratuite ou incluse
dans une offre pro (phase 5) ; preuves de placement pour l'éditeur ;
phase d'arrivée de la communication musicale ; liste finale des actes
débloqués par rang (07 §4.5).

## 2. Qui valide quoi : la carte commune

Les carrières se croisent : les épreuves d'un rôle sont validées par un
autre. C'est ce qui donne de la valeur aux preuves et aligne les
intérêts (07 §4.4).

| Épreuve                      | Qui la vit                     | Qui la valide (preuve)                                                                 |
| ---------------------------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| Jam, collaboration           | Musicien·nes                   | Les participants, des deux côtés                                                       |
| Adhésion à un groupe         | Musicien·ne, groupe            | Le groupe et la personne                                                               |
| Première répétition          | Groupe                         | Un membre (corroborée) ; un studio de la plateforme (vérifiée)                         |
| Morceau composé              | Musicien·nes, groupe           | Les contributeurs (rôles confirmés)                                                    |
| Enregistrement               | Artistes                       | **Ingé son ou studio** (vérifiée)                                                      |
| Production                   | Artistes                       | **Producteur·rice** (vérifiée)                                                         |
| Concert                      | Artistes                       | Un tiers hors groupe (corroboré) ; **organisateur, salle ou booker** vérifié (vérifié) |
| Tournée                      | Artistes                       | ≥3 concerts corroborés dans ≥3 villes en 30 jours                                      |
| Sortie (single, EP, album)   | Artistes, crédités             | **API** (ISRC, UPC) ; corroborée par la **communication musicale** _(proposé)_         |
| Accompagnement               | Manager, booker                | **L'artiste** accompagné                                                               |
| Contrat d'édition, placement | Auteur·rices-compositeur·rices | **Éditeur·rice** vérifié                                                               |
| Signature                    | Artistes                       | **Label** vérifié, seul                                                                |

## 3. Musicien·ne — `MUSICIAN` · ouvert

**Ambitions** : jouer en groupe pour le plaisir · monter sur scène ·
enregistrer et sortir · devenir pro.

**Carte (rangs, 02 §5)**

| Rang              | Conditions                                                               |
| ----------------- | ------------------------------------------------------------------------ |
| Premiers pas      | Profil complété                                                          |
| En réseau         | ≥1 conversation réciproque **et** (≥1 groupe **ou** ≥1 collaboration)    |
| Collaborateur     | ≥3 collaborations confirmées avec ≥2 personnes distinctes                |
| Musicien de scène | ≥3 concerts corroborés                                                   |
| Pilier local      | ≥10 collaborations avec ≥5 personnes distinctes, ≥10 concerts corroborés |
| Référence         | ≥1 sortie vérifiée **et** ≥10 endossements de collaborateurs distincts   |

**Quêtes**

- Principales : compléter son profil · publier une démo · répondre à une
  annonce · premier jam · rejoindre ou monter un groupe · premier
  morceau composé · premier enregistrement · premier concert · première
  sortie.
- Secondaires (apprendre le métier) : déclarer ses œuvres à la SACEM ·
  préparer une sortie 4 semaines avant · constituer un dossier de presse
  · jouer avec un métier jamais croisé · jammer dans une autre ville.
- Émises (annonces) : « cherche un batteur », « cherche un ingé son »,
  « cherche une date ».

**Gains (barème décidé, 02 §2.2)** : profil complété 150 · première démo
100 · démo suivante 30 (3/semaine) · conversation réciproque issue d'une
annonce 30 · adhésion à un groupe 200 · collaboration confirmée 400 ×
multiplicateurs · endossement reçu 40 · étape de groupe : 25 % de l'XP du
groupe. _(Proposé, 07 §5)_ : morceau composé 150 · enregistrement
vérifié 400 · production reçue 300.

**Déblocages** : endosser (confiance TL1) · corroborer les étapes des
autres (TL2) · vitrine des propositions (après un enregistrement
vérifié) · appels à projets de salles (après une production ou un
répertoire) · radar des pros (après un concert vérifié).

**Apporte aux autres** : des collaborations, des endossements, la
corroboration de concerts d'autres groupes (tiers hors groupe, TL2).

**Mode jam** : c'est son terrain de jeu principal ; le carnet de jams
alimente son réseau musical.

**Garde-fous** : rendements décroissants par partenaire ; démos validées
par la modération ; niveau d'instrument toujours « déclaré ».

## 4. Groupe — organisation `BAND` · phase 3

Le groupe est un **club** : il a sa propre carrière, son effectif et son
palmarès (07 §4.3).

**Ambitions** : celles de ses membres, choisies ensemble.

**Carte (rangs, 02 §5)** : le rang est la dernière étape franchie au
niveau corroboré ou au-delà.

| Rang       | Étape                  | Déclarée | Corroborée | Vérifiée | Validée par                              |
| ---------- | ---------------------- | -------- | ---------- | -------- | ---------------------------------------- |
| Projet     | Formation              | —        | —          | 100      | Automatique : ≥2 adhésions               |
| Répète     | Première répétition    | 30       | 50         | 80       | Un membre ; un studio de la plateforme   |
| Compose    | Première composition   | 50       | 150        | —        | Audio original, attestation              |
| Enregistre | Premier enregistrement | 50       | 200        | 400      | Ingé son, producteur ou studio           |
| Démo       | Première démo publique | 50       | 300        | 500      | Lien dont le nom d'artiste correspond    |
| Live       | Premier concert        | 50       | 400        | 1 000    | Tiers hors groupe ; organisateur vérifié |
| Tournée    | Première tournée       | —        | 1 000      | 1 500    | ≥3 concerts dans ≥3 villes en 30 jours   |
| EP         | Premier EP             | —        | —          | 1 500    | API (UPC, ISRC)                          |
| Album      | Premier album          | —        | —          | 3 000    | API                                      |
| Signé      | Signature              | 0        | —          | 3 000    | Label vérifié, seul                      |

**Quêtes** : recruter les rôles manquants (quêtes émises) · franchir
l'étape suivante · jouer hors de sa ville · sortir un premier titre.

**Gains** : ceux des étapes ci-dessus ; chaque membre présent à la date
de l'étape reçoit 25 % (un membre arrivé après n'en reçoit rien).

**Déblocages** : page de groupe publique · annonces « cherche un
membre » · candidatures aux plateaux et appels à projets (rangs Live et
au-delà) · visibilité des labels (rangs Démo, EP et au-delà).

**Garde-fous** : un membre du groupe ne corrobore pas seul les étapes
Live et suivantes ; contestation et reprise d'XP possibles (02 §4).

## 5. Ingé son — `SOUND_ENGINEER` · phase 4

**Ambitions** : remplir son agenda en studio · faire du live (façade,
retours) · se spécialiser (mixage, mastering) · ouvrir ou rejoindre un
studio.

**Carte (rangs, 02 §5, partagés avec le producteur)**

| Rang             | Conditions                                             |
| ---------------- | ------------------------------------------------------ |
| Home studio      | Profil avec ≥1 travail en écoute (crédité)             |
| Premiers projets | ≥1 session confirmée                                   |
| Portfolio        | ≥5 projets confirmés, ≥3 artistes distincts            |
| Établi           | ≥15 projets, ≥1 sortie vérifiée créditée               |
| Référence        | ≥5 sorties vérifiées créditées, ≥10 artistes distincts |

**Quêtes** : publier un travail en écoute (avant / après) · répondre à
une annonce « cherche ingé son » · première session d'enregistrement ·
premier mixage · premier mastering · première date en façade ·
travailler avec 3 artistes différents.

**Gains** _(proposé)_ : session d'enregistrement ou de mixage confirmée
300 · mastering confirmé 150 · date de sonorisation confirmée par le
groupe 150 · crédit sur une sortie vérifiée 300 · endossement reçu 40.

**Épreuves qu'il valide** : l'enregistrement des artistes (acte III,
vérifié) ; en live, il peut **corroborer** un concert en tant que tiers
hors groupe _(proposé)_.

**Déblocages** : recherche d'artistes dont le morceau attend un
enregistrement · fiche de tarifs et disponibilités · rattachement à un
studio · vitrine « mes crédits ».

**Mode jam** : utile pour se faire connaître, en jouant ou en sonorisant
une jam publique.

**Garde-fous** : un crédit n'existe que confirmé par l'artiste ;
rendements décroissants par artiste ; pas de points pour un devis ou
une prise de contact.

## 6. Studio — organisation `STUDIO` · phase 4

Une structure administrée par des ingés son ou des producteurs.

**Carte (rangs, 02 §5)** : Ouvert → Actif (≥5 sessions confirmées) →
Reconnu (≥20 sessions, ≥10 clients distincts) → Incontournable (≥5
sorties vérifiées enregistrées sur place).

**Quêtes** : compléter sa fiche (salles, matériel, tarifs, photos) ·
ouvrir des créneaux · première réservation honorée · première
répétition de groupe accueillie · premier enregistrement crédité.

**Gains** _(proposé)_ : réservation honorée et confirmée 100 · session
d'enregistrement confirmée 300 · sortie vérifiée enregistrée sur place 300. Les points vont à la piste des personnes qui ont travaillé, le rang
au studio.

**Épreuves qu'il valide** : la première répétition d'un groupe et son
premier enregistrement (vérifiés, 02 §2.2).

**Déblocages** : agenda et réservation en ligne, commission via Stripe
Connect (phases 4-5) ; mise en avant auprès des groupes au rang Répète
et Compose de sa zone.

**Garde-fous** : une réservation ne compte qu'honorée et confirmée par
le client ; pas de points pour une réservation annulée.

## 7. Producteur·rice — `PRODUCER` · phase 4

**Ambitions** : se constituer un portfolio · produire des artistes
locaux · placer des productions en sortie · devenir une référence d'un
genre.

**Carte** : mêmes rangs que l'ingé son (§5), comptés en projets de
production.

**Quêtes** : publier une production en écoute · parcourir la vitrine
des propositions · première production confirmée · produire 3 artistes
différents · une production sortie et vérifiée.

**Gains** _(proposé)_ : production confirmée 400 · arrangement confirmé
200 · crédit sur une sortie vérifiée 300 · endossement reçu 40.

**Épreuves qu'il valide** : la production d'un morceau (acte IV) et
l'enregistrement d'un groupe quand il l'a réalisé.

**Déblocages** : la **vitrine des propositions** (morceaux enregistrés
proposés par leurs équipes, 06 §4) · recherche d'artistes par genre,
zone et rang · alertes sur les nouveaux morceaux d'un genre.

**Mode jam** : rencontrer des musicien·nes de session pour ses
productions.

**Garde-fous** : crédit confirmé par l'artiste ; les propositions sont
triées par pertinence (genre, zone, besoin), jamais par XP ; un
producteur ne voit ni l'XP ni la confiance des artistes.

## 8. Organisateur·rice — `PROMOTER` · phase 5

Associations, collectifs, salles, festivals (organisation `PROMOTER`).

**Ambitions** : organiser des soirées régulières · faire découvrir la
scène locale · monter un festival.

**Carte (rangs, 02 §5)** : Premier événement → Programmateur régulier
(≥5 événements) → Scène locale (≥20 événements, ≥30 groupes distincts)
→ Festival (un événement de ≥10 groupes vérifié).

**Quêtes** : créer sa fiche (lieu, jauge, genres) · publier un plateau
ou un appel à projets · programmer un premier groupe · programmer 3
groupes qui n'avaient jamais joué sur scène · organiser une jam
publique.

**Gains** _(proposé)_ : événement tenu, confirmé par au moins un groupe
200 · par groupe programmé pour la première fois 100 · jam publique
tenue 50.

**Épreuves qu'il valide** : les concerts (acte V), au niveau vérifié
quand l'organisation est vérifiée (SIRET).

**Déblocages** : appels à projets avec conditions d'éligibilité (rang,
genre, zone, jamais l'XP) · section « plateaux » (offre pro, 01 §5) ·
recherche de groupes au rang Live et au-delà.

**Mode jam** : il peut **héberger des jams publiques** (bœufs), qui
apparaissent dans le mode jam des musicien·nes de sa zone.

**Garde-fous** : un événement ne rapporte qu'une fois tenu et confirmé
par les groupes ; contestation possible.

## 9. Booker — `BOOKER` · phase 5

**Ambitions** : remplir l'agenda de ses artistes · programmer une salle
ou un festival · construire des tournées.

**Carte (rangs, 02 §5, partagés avec le manager)** : Premier artiste →
Développeur (≥1 artiste ayant franchi 2 rangs sous son accompagnement)
→ Agence.

**Quêtes** : relier ses salles ou festivals · première date bookée et
jouée · première tournée bookée (3 villes) · faire jouer un artiste
hors de sa région.

**Gains** _(proposé)_ : date bookée et jouée, confirmée des deux côtés
150 · tournée bookée (≥3 dates jouées) 400 · rang franchi par un
artiste accompagné : part faible (10 %).

**Épreuves qu'il valide** : les concerts qu'il a bookés, avec la salle ;
la tournée.

**Déblocages** : radar des pros (groupes au rang Live et au-delà) ·
alertes de disponibilité des groupes · offre Scout (phase 5).

**Garde-fous** : un concert ne compte qu'une fois joué et confirmé des
deux côtés.

## 10. Manager — `MANAGER` · phase 5

**Ambitions** : accompagner un premier artiste · développer une écurie
· monter une agence.

**Carte (rangs, 02 §5)** : Premier artiste → Développeur (≥1 artiste
ayant franchi 2 rangs sous son accompagnement) → Agence.

**Quêtes** : premier accompagnement confirmé par l'artiste · aider un
artiste à franchir un rang · mettre en relation un artiste avec un ingé
son, un booker ou un label.

**Gains** _(proposé)_ : accompagnement confirmé par l'artiste 200 · rang
franchi par un artiste accompagné : part faible (10 %) · mise en
relation qui aboutit à une collaboration : succès _Passeur_.

**Épreuves qu'il valide** : aucune directement ; sa carrière monte avec
celle des artistes qu'il accompagne.

**Déblocages** : flux « projets qui montent » (rangs et vitesse de
progression) · recherche avancée et alertes (offre Scout, phases 5-6).

**Garde-fous** : l'accompagnement doit être confirmé par l'artiste ;
suivre un profil ne rapporte rien.

## 11. Professionnel·le de label — `LABEL_PRO` · phase 6

Labels indépendants (organisation `LABEL` vérifiée).

**Ambitions** : sortir un premier artiste · construire un catalogue ·
développer des artistes dans la durée.

**Carte (rangs, 02 §5)** : Première sortie → Catalogue (≥5 sorties) →
Développeur d'artistes (≥3 artistes ayant franchi un rang après
signature).

**Quêtes** : vérifier son label · repérer dans le flux « projets qui
montent » · première signature confirmée par l'artiste · première
sortie vérifiée · faire passer un artiste signé au rang Tournée.

**Gains** _(proposé)_ : signature confirmée par l'artiste 500 · sortie
vérifiée 300 · rang franchi par un artiste signé : part faible.

**Épreuves qu'il valide** : la **signature** (lui seul) ; il corrobore
les sorties de son catalogue.

**Déblocages** : flux « projets qui montent » · offre Scout · quêtes
sponsorisées clairement marquées (phase 6).

**Garde-fous** : une signature n'existe que confirmée par l'artiste et
par le label vérifié ; aucune visibilité achetée.

## 12. Éditeur·rice — `PUBLISHER` · phase 6

**Ambitions** : éditer des auteur·rices-compositeur·rices · placer des
œuvres en synchronisation (pub, film, jeu) ou auprès d'interprètes.

**Carte** _(proposé)_ : Premier contrat → Catalogue (≥10 œuvres
éditées) → Placeur (≥3 placements vérifiés).

**Quêtes** : vérifier sa structure · premier contrat d'édition confirmé
par l'auteur · premier placement · éditer 3 auteurs différents.

**Gains** _(proposé)_ : contrat d'édition confirmé 300 · placement
vérifié 400.

**Épreuves qu'il valide** : le contrat d'édition et les placements
(preuves à définir : ISWC, lien vers l'œuvre placée).

**Déblocages** : recherche d'œuvres déclarées et de morceaux sortis par
genre · alertes.

**Garde-fous** : la plateforme ne gère pas les droits ; elle trace
seulement ce que les deux parties confirment.

## 13. Communication musicale — `MUSIC_COMMS` · phase 6 _(proposé)_

Attaché·es de presse, community managers, journalistes, radios
(organisation `MEDIA`).

**Ambitions** : accompagner des sorties · faire découvrir des artistes
· devenir un média de référence d'une scène.

**Carte** _(proposé)_ : Première campagne → Relais régulier (≥5 artistes
accompagnés ou couverts) → Média de référence (≥30 artistes, ≥3 sorties
vérifiées couvertes).

**Quêtes** : première campagne confirmée par l'artiste · couvrir une
sortie vérifiée · couvrir 3 artistes de sa ville · faire découvrir un
artiste au rang Démo.

**Gains** _(proposé)_ : campagne ou publication confirmée par l'artiste
150 · couverture d'une sortie vérifiée 200.

**Épreuves qu'il valide** : il peut **corroborer** une sortie ou un
concert par un article ou une diffusion publiés et liés _(proposé)_.

**Déblocages** : alertes sur les sorties à venir par genre et zone ;
accès aux dossiers de presse des artistes.

**Garde-fous** : pas de points pour un simple partage ; une couverture
n'est pas une note.

## 14. Pour chaque rôle, à l'ouverture

Rappel de 06 §5, complété :

1. ses champs de profil et leur référentiel ;
2. ses organisations et leur vérification ;
3. ses événements de domaine, ses règles d'XP et ses rangs dans
   `progression/core`, **calibrés par des personas** ;
4. ses quêtes et ses déblocages (ce document) ;
5. la place de ses épreuves sur la carte commune (§2) ;
6. le retrait de la mention « bientôt » ;
7. l'export et l'anonymisation RGPD de ses nouvelles données.
