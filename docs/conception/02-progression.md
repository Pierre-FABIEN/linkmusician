# 02 — Moteur de progression

C'est le cœur du produit. Ce document fixe les règles. L'implémentation
est décrite dans [03 §2.4](./03-architecture.md#24-moteur-de-progression).

## 1. Quatre systèmes indépendants

| Système                     | Question à laquelle il répond        | Alimenté par                                                                                           | Visible par                                | Sert à                                     |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------ |
| **XP / niveau**             | « Est-ce que j'avance ? »            | Issues confirmées, étapes franchies                                                                    | Soi (détail), les autres (niveau, discret) | Motivation, cosmétique                     |
| **Compétences**             | « Que sait-il faire ? »              | Auto-déclaration sur une échelle observable, démos, endossements de collaborateurs                     | Tous                                       | Recherche, mise en relation                |
| **Réputation**              | « Peut-on compter sur lui ? »        | Ce que **d'autres** confirment : collaborations, étapes vérifiées, endossements de qualité, réactivité | Tous                                       | Découverte par les pros, tri des résultats |
| **Confiance** (trust level) | « Peut-on lui laisser ce pouvoir ? » | Ancienneté, réciprocité, absence de sanctions                                                          | Soi (son palier), modération (détail)      | Quotas et permissions anti-abus            |

Règles d'étanchéité :

- **L'XP n'entre dans aucun calcul** de réputation, de confiance ou de
  rang de recherche. Le farming ne rapporte donc que de l'XP, qui ne
  donne aucun pouvoir.
- La réputation n'est **pas un nombre affiché**. C'est une carte de
  signaux (« 12 collaborations confirmées avec 7 personnes différentes ·
  3 concerts vérifiés · répond généralement sous 48 h · endossé
  "fiable" par 5 collaborateurs »). Un score interne existe pour trier
  les résultats, mais il n'est jamais montré.
- **Carte de réputation** (P2-08, `ReputationSnapshot`) : collaborations
  confirmées et personnes distinctes, groupes, concerts corroborés, sorties
  vérifiées, personnes qui recommandent, appréciations par libellé, et
  réactivité. La réactivité est la **médiane** des délais de première
  réponse aux demandes reçues sur 180 jours (une demande sans réponse
  depuis 7 jours compte comme lente, une demande refusée ne compte pas :
  refuser est une réponse), à partir de 3 demandes. Seules « répond
  généralement sous 24 h » et « sous 48 h » s'affichent : une réactivité
  lente n'est jamais écrite sur le profil, elle pèse seulement sur le tri.
- **Score interne** (`core/reputation.ts`) : somme pondérée de
  `ln(1 + n)` sur chaque fait (personnes distinctes ×3, personnes qui
  recommandent ×2, concerts corroborés et sorties vérifiées ×1,5,
  collaborations ×1, groupes ×0,5), plus la réactivité (+1 sous 24 h,
  +0,5 sous 48 h, −0,5 au-delà). Le logarithme fait que le dixième fait
  vaut moins que le premier ; les personnes distinctes pèsent plus que les
  répétitions. Recalculé après chaque événement qui touche la réputation,
  chaque nuit et à la demande. Il ne sert qu'au tri de la recherche (D33)
  et ne sort jamais du serveur.
- Les compétences restent **déclaratives et assumées comme telles** :
  « Confirmé (déclaré) · 2 démos · endossé par 4 musiciens ». La
  plateforme ne certifie jamais un niveau musical.

## 2. Sources d'XP

### 2.1 Principes

1. **Rien d'unilatéral ne rapporte** : contacter, suivre, liker,
   endosser, publier une annonce, tout cela vaut 0 XP.
2. **La valeur suit l'engagement et la preuve** : une collaboration
   confirmée vaut plus que dix messages, et un concert vérifié par
   l'organisateur vaut plus qu'un concert déclaré.
3. **Les one-shots d'onboarding sont plafonnés** : on récompense la
   première démo, pas la cinquantième.
4. **Tout gain d'XP est réversible** : si la preuve est invalidée, une
   transaction d'annulation est écrite au registre.

### 2.2 Barème (première version, à calibrer)

Le barème est versionné (`ruleVersion`). Une modification ne réécrit
jamais l'historique, elle s'applique aux nouveaux événements.

**Personne (piste musicien)**

| Événement                                                        | XP                         | Limite                                                                                 |
| ---------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| Profil complété (≥1 instrument, ≥1 genre, zone, bio)             | 150                        | une fois                                                                               |
| Première démo publiée (validée par la modération)                | 100                        | une fois                                                                               |
| Démo supplémentaire                                              | 30                         | 3 par semaine                                                                          |
| Conversation réciproque issue d'une annonce (l'autre a répondu)  | 30                         | 5 par jour                                                                             |
| Adhésion à un groupe acceptée                                    | 200                        | rendements décroissants par groupe                                                     |
| Collaboration terminée, confirmée des deux côtés                 | 400 × multiplicateurs (§6) | —                                                                                      |
| Appréciation reçue après une jam ou une collaboration (D27, D32) | 40                         | 1 par paire et par jam ou collaboration ; ×1, ×0,5, ×0,25 puis 0 par paire sur 12 mois |
| Morceau composé à plusieurs, rôle confirmé (D35, phase 3)        | 150 × multiplicateurs (§6) | une fois par morceau et par personne ; seul·e, un morceau composé ne rapporte rien     |
| Participer à une étape de groupe (comme membre présent)          | 25 % de l'XP du groupe     | —                                                                                      |

**Ingé son et producteur·rice** (phase 4, calibré en P4-01). Une
prestation compte quand l'artiste confirme la collaboration. Elle
rapporte sur la piste du métier exercé (D20), avec les mêmes
multiplicateurs qu'une collaboration (§6) : rendement décroissant **par
artiste** sur 12 mois, et confiance de l'artiste. Les musicien·nes de la
même collaboration gagnent, eux, la collaboration sur la piste musicien
quand ils y jouent ou co-créent (enregistrement, date sonorisée,
production, arrangement), **pas sur un mixage ni un mastering** (P4-06,
défaut provisoire : question Q1 de
[a-trancher](../plan/a-trancher.md)). La collaboration ne compte alors pas
non plus pour leur palier (Q2).

| Événement                                            | XP                         | Piste                                        |
| ---------------------------------------------------- | -------------------------- | -------------------------------------------- |
| Session d'enregistrement confirmée                   | 300 × multiplicateurs (§6) | Ingé son                                     |
| Mixage confirmé                                      | 300 × multiplicateurs (§6) | Ingé son                                     |
| Mastering confirmé                                   | 150 × multiplicateurs (§6) | Ingé son                                     |
| Sonorisation d'une date (façade, retours), confirmée | 150 × multiplicateurs (§6) | Ingé son                                     |
| Production confirmée                                 | 400 × multiplicateurs (§6) | Producteur·rice                              |
| Arrangement confirmé                                 | 200 × multiplicateurs (§6) | Producteur·rice                              |
| Crédit sur une sortie vérifiée (ISRC, UPC)           | 300                        | Piste créditée                               |
| Appréciation reçue                                   | 40                         | Musicien au MVP ; piste du métier avec P4-02 |

**Métiers de la scène** (phase 5, calibré en P5-01) : organisateur·rice,
booker et manager. Un concert ne compte qu'une fois **tenu et confirmé**
par au moins une personne qui y jouait (événement `gig.held`). Il
rapporte à qui organise et à qui a booké, **jamais aux musicien·nes** de
l'affiche, qui gagnent déjà par la collaboration et l'étape `FIRST_GIG`.
Le lieu gagne un rang, pas d'XP (Q24) ; il n'y a pas de piste
`VENUE_HOST` (Q18) : la personne qui gère un lieu et le programme gagne
sur la piste organisateur·rice.

| Événement                                                         | XP                          | Piste             | Multiplicateurs (§6)                                               |
| ----------------------------------------------------------------- | --------------------------- | ----------------- | ------------------------------------------------------------------ |
| Événement tenu, confirmé par l'affiche, par personne qui organise | 200 × multiplicateurs       | Organisateur·rice | rendement par artiste sur 12 mois × confiance de qui confirme      |
| Artiste programmé pour sa toute première date                     | 100 par artiste × confiance | Organisateur·rice | confiance de qui confirme (une première date n'arrive qu'une fois) |
| Date bookée et jouée, par personne qui a booké (sans organiser)   | 150 × multiplicateurs       | Booker            | rendement par artiste **et par lieu** sur 12 mois × confiance      |
| Accompagnement confirmé par l'artiste                             | 200 × multiplicateurs       | Manager           | rendement par artiste sur 12 mois × confiance de qui confirme      |

La confiance retenue pour un concert est la meilleure parmi les
personnes qui ont confirmé pour l'affiche, hors organisation et booking :
une date confirmée seulement par qui l'organise ne rapporte rien. Le
booker décroît par artiste et par lieu, parce que faire jouer le même
artiste dans une autre salle est son métier. L'accompagnement d'un
booker compte pour son rang mais ne rapporte pas d'XP : ses points
viennent des dates. Reportés : la jam publique tenue (50, P5-04), la
tournée bookée (400, P5-07) et la part de 10 % sur un rang franchi par
un artiste accompagné (Q21).

Un devis, une prise de contact ou une réservation annulée ne rapportent
rien. Pour le studio, la réservation honorée (100, 08 §6) viendra avec
la réservation en ligne (P5-10).

**Groupe**, avec les étapes du brief et leur niveau de preuve (§4) :

| #   | Étape                  | Déclarée | Corroborée | Vérifiée | Preuve attendue                                                                                                                           |
| --- | ---------------------- | -------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Formation              | —        | —          | 100      | Automatique : ≥2 adhésions acceptées                                                                                                      |
| 2   | Première répétition    | 30       | 50         | 80       | Corroborée : un membre la confirme. Vérifiée : réservation d'un studio présent sur la plateforme                                          |
| 3   | Première composition   | 50       | 150        | —        | Audio original publié, attestation d'originalité                                                                                          |
| 4   | Premier enregistrement | 50       | 200        | 400      | Vérifiée : le producteur ou le studio de la plateforme confirme                                                                           |
| 5   | Première démo publique | 50       | 300        | 500      | Lien Bandcamp, SoundCloud ou Spotify dont le nom d'artiste correspond                                                                     |
| 6   | Premier concert        | 50       | 400        | 1 000    | Corroborée : affiche ou lien d'événement **et** confirmation d'un tiers hors groupe. Vérifiée : l'organisateur confirme sur la plateforme |
| 7   | Première tournée       | —        | 1 000      | 1 500    | ≥3 concerts corroborés dans ≥3 villes en ≤30 jours                                                                                        |
| 8   | Premier EP             | —        | —          | 1 500    | Sortie identifiée par UPC ou ISRC (API Spotify ou MusicBrainz)                                                                            |
| 9   | Premier album          | —        | —          | 3 000    | Idem                                                                                                                                      |
| 10  | Signature              | 0        | —          | 3 000    | Seul le label, en organisation vérifiée sur la plateforme, peut valider                                                                   |

**Au lancement (D41, P3-04)** : les étapes 1 à 6 sont ouvertes. La
formation est automatique, la première composition suit les morceaux du
groupe (déclarée au premier morceau composé, corroborée dès qu'un morceau
l'est), les quatre autres se déclarent par la gestion d'un groupe formé.
Les membres crédités (25 %) sont ceux présents à la date de l'étape, ou à
la formation pour une étape plus ancienne que le groupe sur la plateforme.
Les étapes 7 à 10 attendent des preuves externes. Détail :
[docs/etapes](../etapes/README.md).

La corroboration par **un membre du même groupe** ne suffit pas pour
les étapes 6 et plus : les membres ont un intérêt commun. Il faut un
tiers indépendant.

Ces étapes sont des « premières fois ». Les occurrences suivantes
(chaque concert, chaque sortie) rapportent une XP récurrente plus
faible et alimentent surtout la **réputation**.

### 2.3 Calibrer le barème

Les valeurs ci-dessus sont des points de départ. Elles se calibrent avec
des **personas simulés**, un test unitaire qui rejoue un trimestre
d'activité typique sur `progression/core` :

| Persona           | Activité sur 3 mois                                                                                         | Cible                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Curieux           | Profil, 1 démo, 2 conversations                                                                             | Niveau 3-4, palier « En réseau » non atteint                                        |
| Musicien actif    | Rejoint un groupe, 3 collaborations avec 2 personnes, 2 démos                                               | Niveau 6-8, palier « Collaborateur »                                                |
| Groupe qui tourne | Étapes 1 à 6, 4 concerts corroborés                                                                         | Palier « Live »                                                                     |
| Farmeur           | 40 collaborations fictives avec 2 comptes TL0                                                               | **≤ Curieux** grâce aux multiplicateurs                                             |
| Élève en mode jam | 1 jam par semaine, 2 appréciations à chaque fois (cercle de 12 habitué·es), 1 échange toutes les 3 semaines | Niveau 4-5, palier « En réseau » (D36) ; ≤ 5 après 6 mois sans nouvelles rencontres |

Si une modification du barème fait sortir un persona de sa cible, le
test échoue. C'est le garde-fou contre l'inflation de points.

**Calibrage du 04/11/2026 (barème version 1).** La première version du
barème ne tenait pas ses propres cibles : le Curieux restait niveau 1
(90 XP) et le Musicien actif niveau 4. Les valeurs personne ont été
relevées (tableau ci-dessus) et le poids d'une contrepartie TL0 abaissé à
0,1, pour que le Farmeur reste sous le Curieux. Résultats :

| Persona        | XP sur 3 mois | Niveau | Cible     |
| -------------- | ------------- | ------ | --------- |
| Curieux        | 310           | 3      | 3-4       |
| Musicien actif | 1 565         | 6      | 6-8       |
| Farmeur        | 290           | 2      | ≤ Curieux |

**Revue de fin de phase 2 (06/11/2026).** Le persona « Élève en mode
jam » (la cible n° 1, D29) est ajouté. Simulation sur 6 mois, avec des
contreparties TL1 le premier mois du pilote, puis TL2 :

| Persona                                                | Niveau 5      | « Collaborateur » | Niveau à 1 / 3 / 6 mois |
| ------------------------------------------------------ | ------------- | ----------------- | ----------------------- |
| Élève en mode jam (1 jam par semaine)                  | 10 semaines   | jamais            | 4 / 5 / 5               |
| Élève timide (1 jam toutes les 2 semaines)             | pas en 6 mois | jamais            | 3 / 3 / 4               |
| Élève en mode jam + 1 collaboration par mois           | 7 semaines    | 11 semaines       | 4 / 6 / 8               |
| Musicien·ne d'annonces (1 collaboration en 3 semaines) | 6 semaines    | 9 semaines        | 3 / 6 / 7               |
| Lead (2 jams par semaine, 2 collaborations par mois)   | 3 semaines    | 7 semaines        | 6 / 9 / 11              |

Le barème tient : le niveau 5 arrive en 1 à 3 mois pour qui joue, et
« Collaborateur » demande de vraies collaborations. Deux constats :
une habituée des jams restait « Premiers pas » pour toujours, puisqu'une
jam n'est plus une collaboration (D27), d'où D36 ; et un même cercle
d'habitué·es ne peut pas donner plus de 70 XP par personne et par an
(rendements décroissants), ce qui plafonne au niveau 5 : c'est voulu,
la suite vient des rencontres, des collaborations et de la carte de
carrière (P3-13). Aucune valeur du barème ne change.

Les valeurs des étapes de groupe sont inchangées. Le barème vit dans
`src/lib/server/progression/core/bareme.ts`, et les personas dans
`personas.test.ts`.

**Métiers du son (P4-01, 10/11/2026).** Les gains proposés en 08 §5 et
§7 sont repris tels quels. Simulation sur 6 mois (`personas-son.test.ts`),
avec des artistes TL1 le premier mois puis TL2 :

| Persona                                                               | Niveau à 1 / 3 / 6 mois            | Portfolio  | Établi·e                    |
| --------------------------------------------------------------------- | ---------------------------------- | ---------- | --------------------------- |
| Ingé son de studio (un client toutes les 2 semaines, prise et mixage) | 3 / 7 / 11                         | 4 semaines | 21 semaines, avec la sortie |
| Productrice urbaine (2 productions par mois, 6 artistes)              | 3 / 7 / 8                          | 7 semaines | pas sans sortie vérifiée    |
| Ingé son live (2 dates en façade par mois)                            | 2 / 4 / 6                          | 9 semaines | —                           |
| Home studio (un mixage par mois pour deux ami·es)                     | 2 / 4 / 4                          | jamais     | —                           |
| Farmeur du son (40 sessions avec 2 comptes TL0)                       | 106 XP, niveau 2                   | —          | —                           |
| Studio associatif (2 sessions par semaine, 14 clients)                | Actif en 3 semaines, Reconnu en 10 | —          | —                           |

Le barème tient. Un·e pro actif·ve suit la courbe des musicien·nes
(niveau 5 en 1 à 3 mois, le lead est à 6 / 9 / 11), et le farmeur reste
sous le Curieux. Deux ami·es ne suffisent pas pour un portfolio : il
faut trois artistes. « Établi·e » demande une sortie vérifiée, même avec
trente projets. Les rendements par artiste plafonnent le travail répété
avec un même client : un EP en quatre sessions rapporte 300, 150, 75,
puis 0. La progression vient des nouveaux clients, comme pour qui joue.

Le niveau de compte additionne toutes les pistes de la personne :
c'était déjà le cas en base (`projector.ts`), et le registre en mémoire
des tests est maintenant aligné. Sur un mixage ou un mastering, les
musicien·nes ne gagnent rien (P4-06, défaut provisoire, Q1 de
[a-trancher](../plan/a-trancher.md)).

**Métiers de la scène (P5-01, 11/11/2026).** Les gains proposés en 08
§8 à §10 sont repris, avec une correction : le rendement décroissant du
booker se compte **par artiste et par lieu**. Par artiste seul, un booker
de quatre artistes plafonnait au niveau 3 en six mois, alors que rebooker
ses artistes dans d'autres salles est son métier. Simulation
(`personas-scene.test.ts`), artistes TL1 le premier mois puis TL2 :

| Persona                                                           | Niveau à 1 / 3 / 6 mois | Rangs (semaine d'atteinte)                                                 |
| ----------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| Bar à scène ouverte (une jam par semaine, un concert par mois)    | 2 / 3 / 5               | lieu : Scène ouverte 3 ; Programmation régulière 19 ; pas de scène locale  |
| Café-concert (deux soirées par semaine, 40 groupes en rotation)   | 4 / 9 / 12              | Programmation régulière 3 ; lieu de la scène locale 10 ; Scène locale 11   |
| MJC (un tremplin par mois, trois groupes dont deux débutent)      | 2 / 5 / 7               | Premier événement 2 ; lieu : Scène ouverte 10 ; Programmation régulière 18 |
| Association (une soirée par mois, festival vérifié de 12 groupes) | 2 / 4 / 5               | Programmation régulière 17 ; Festival 31 ; pas de scène locale en un an    |
| Booker indépendant (4 artistes, 3 dates par mois, 9 salles)       | 2 / 5 / 7               | Premier artiste 1 ; Développement d'artistes 21 (un artiste passe 2 rangs) |
| Manager débutant (un artiste au 2ᵉ mois, un au 4ᵉ)                | 1 / 2 / 3 (400 XP)      | Premier artiste 7 ; Développement d'artistes 41                            |
| Farmeur de dates (40 concerts « confirmés » par 2 comptes TL0)    | 90 XP, niveau 1         | —                                                                          |

Le barème tient. Un café-concert très actif monte un peu plus vite que
l'ingé son de studio (3 / 7 / 11), une MJC et un booker suivent l'ingé
son live (2 / 4 / 6). Lancer des groupes rapporte à la MJC autant qu'un
concert de plus. Un manager gagne peu en propre : sa carrière monte avec
celle de ses artistes, et la part de 10 % qui la récompense attend un
événement `tier.crossed` (Q21). Les jams publiques comptent déjà pour le
rang du lieu ; leur XP viendra avec P5-04.

## 3. Niveau de compte

Un niveau global, volontairement sobre, calculé à partir de la somme
d'XP de toutes les pistes de la personne :

```
XP cumulée requise pour le niveau n = 50 × n × (n − 1)
niv. 2 = 100 · niv. 5 = 1 000 · niv. 10 = 4 500 · niv. 20 = 19 000 · niv. 30 = 43 500
```

Une courbe quadratique donne une progression rapide au début (les
premiers niveaux arrivent dans la première semaine) et lente ensuite.
Pas de niveau maximum.

Le niveau de compte ne débloque **que du cosmétique** (cadres de profil,
thèmes de carte) et sert de jauge de motivation. Les vrais paliers sont
ceux des pistes de métier (§5).

## 4. Preuves et vérification

Trois statuts pour toute étape ou réalisation :

| Statut         | Signification                                                     | Qui peut l'établir                                                                                   |
| -------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `DECLARED`     | L'acteur l'affirme                                                | L'acteur lui-même                                                                                    |
| `CORROBORATED` | Un tiers indépendant confirme, ou une preuve recevable est jointe | Une personne de confiance ≥ 2 sans lien d'adhésion, ou une preuve validée (lien vérifiable, affiche) |
| `VERIFIED`     | Une partie prenante officielle confirme                           | Une organisation vérifiée partie à l'événement (organisateur, studio, label), ou une API externe     |

Le passage d'un statut à l'autre rapporte la **différence** d'XP, ce
qui évite de compter deux fois. Une contestation (signalement « faux
concert ») gèle l'étape quand elle vient d'une personne de confiance
≥ 1 (un compte neuf signale sans geler, D49). Si la contestation est
retenue, l'XP est annulée (transactions négatives liées), l'étape est
retirée, l'acteur reçoit un avertissement de confiance, et le
corroborateur aussi. La gestion d'un groupe peut aussi retirer elle-même
une étape déclarée par erreur, avec la même reprise.

**Organisation vérifiée** : un studio, un organisateur ou un label
fournit un SIRET (ou équivalent) et une adresse web ou un réseau social
officiel, et l'équipe le contrôle à la main. C'est un statut accordé, pas
un niveau gagné. Au MVP (P3-09), les groupes le demandent depuis leur
gestion et la modération l'accorde (badge public, sans le SIRET) ; les
autres organisations suivront en phase 5.

## 5. Paliers par métier

Chaque piste de métier a des **paliers nommés** définis par des
**conditions** (pas seulement un seuil d'XP), ce qui leur donne un sens
réel. Les noms décrivent un **parcours**, jamais une compétence (« Pilier
local » plutôt que « Expert »).

**Musicien**

| Palier            | Conditions                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Premiers pas      | Profil complété                                                                                                 |
| En réseau         | ≥1 conversation réciproque **et** (≥1 groupe, ≥1 collaboration **ou** ≥1 appréciation reçue après une jam, D36) |
| Collaborateur     | ≥3 collaborations confirmées avec ≥2 contreparties distinctes                                                   |
| Musicien de scène | ≥3 concerts corroborés                                                                                          |
| Pilier local      | ≥10 collaborations avec ≥5 contreparties distinctes, ≥10 concerts corroborés                                    |
| Référence         | ≥1 sortie vérifiée **et** ≥10 endosseurs distincts (appréciations non reprises)                                 |

**Groupe** : le palier est la dernière étape franchie au niveau
corroboré ou au-delà (Projet → Répète → Compose → Enregistre → Démo →
Live → Tournée → EP → Album → Signé).

**Producteur·rice / ingé son** (phase 4, `craftTier`, P4-01), comptés
sur les prestations confirmées de la piste

| Palier           | Conditions                                             |
| ---------------- | ------------------------------------------------------ |
| Home studio      | Profil avec ≥1 production en écoute                    |
| Premiers projets | ≥1 collaboration de production confirmée               |
| Portfolio        | ≥5 projets confirmés, ≥3 artistes distincts            |
| Établi·e         | ≥15 projets, ≥1 sortie vérifiée créditée               |
| Référence        | ≥5 sorties vérifiées créditées, ≥10 artistes distincts |

**Studio** (phase 4) : Ouvert → Actif (≥5 sessions confirmées) → Reconnu
(≥20 sessions, ≥10 clients distincts) → Incontournable (≥5 sorties
vérifiées enregistrées sur place).

**Organisateur·rice** (phase 5, `promoterTier`, P5-01), comptés sur les
événements tenus et confirmés

| Palier                  | Conditions                                                    |
| ----------------------- | ------------------------------------------------------------- |
| Premier événement       | ≥1 événement                                                  |
| Programmation régulière | ≥5 événements                                                 |
| Scène locale            | ≥20 événements, ≥30 artistes distincts                        |
| Festival                | ≥1 événement de ≥10 artistes, vérifié (organisation vérifiée) |

**Manager / booker** (phase 5, `agentTier`, P5-01), mêmes rangs, comptés
sur les accompagnements confirmés par les artistes

| Palier                   | Conditions                                                |
| ------------------------ | --------------------------------------------------------- |
| Premier artiste          | ≥1 accompagnement confirmé                                |
| Développement d'artistes | ≥1 artiste ayant franchi ≥2 rangs sous son accompagnement |
| Agence                   | ≥5 artistes accompagnés, dont ≥3 développés (défaut Q25)  |

**Lieu** (phase 5, `venueTier`, P5-01, 08 §14) : Lieu ouvert (fiche
complète) → Scène ouverte (≥3 jams publiques ou concerts tenus et
confirmés) → Lieu de la scène locale (≥20 dates, ≥15 artistes distincts)
→ Lieu culte (≥50 dates, ≥5 groupes passés ensuite au rang Tournée). Le
rang va au lieu, l'XP aux personnes.

**Label** (phase 6) : Première sortie → Catalogue (≥5 sorties) →
Développeur d'artistes (≥3 artistes ayant franchi un palier après
signature).

### Ce que les paliers débloquent

| Débloque                                                           | Repose sur                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Quotas (messages à des inconnus, annonces actives, stockage média) | **Confiance**                                                                                     |
| Corroborer les étapes d'autres acteurs                             | **Confiance** ≥ 1 au lancement (D43, prévu ≥ 2)                                                   |
| Apparaître dans le flux « projets qui montent » des pros           | **Réputation**, avec une vitesse de franchissement des paliers                                    |
| Répondre aux appels à projets sélectifs                            | Conditions fixées par l'émetteur (palier, genre, zone), c'est-à-dire des **paliers**, pas de l'XP |
| Cadres, thèmes, titres affichés                                    | **Niveau de compte** / succès                                                                     |

## 6. Anti-abus

| Abus                               | Contre-mesure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spam de demandes de contact        | 0 XP pour un contact. Quota de premiers messages à des inconnus selon la confiance (TL0 : 10 par jour). Les refus et blocages reçus font baisser la confiance                                                                                                                                                                                                                                                                                                                                                                                                   |
| Collaborations fictives entre amis | Multiplicateurs : **rendements décroissants par contrepartie** (1 / 0,5 / 0,25 / 0 pour la k-ième collaboration avec la même personne sur 12 mois) × **poids de confiance de la contrepartie** (TL0 : 0,1 · TL1 : 0,5 · TL2+ : 1)                                                                                                                                                                                                                                                                                                                               |
| Cliques de comptes                 | Job nocturne (P2-10) : composantes connexes du graphe des collaborations confirmées et des appréciations sur 180 jours ; une composante de 2 à 8 personnes, dense (au moins 60 % des liens possibles) et active (au moins 4 échanges) n'a, par construction, aucun lien extérieur : elle part en revue manuelle. Les adresses IP de session partagées entre membres font remonter le cas. Aucune sanction automatique                                                                                                                                           |
| Faux concerts ou fausses sorties   | Corroboration par un tiers hors groupe, vérification par l'organisation ou une API, contestation possible et reprise d'XP                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Faux endossements                  | Apprécier exige d'avoir dit « J'y étais » à la même jam que la personne, dans les 7 jours, et le palier TL1. Une appréciation par paire et par jam ; rendements décroissants par paire. L'hôte retire un faux présent : ses appréciations sont reprises par transaction négative liée. Après une collaboration (P2-07) : seulement entre participants d'une collaboration confirmée par tous, une par paire et par collaboration, TL1 requise ; reprise possible par son auteur (XP repris, `endorsement.revoked` la retire des endosseurs distincts du palier) |
| Farm de démos                      | Plafond hebdomadaire, médias validés par la modération avant de rapporter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Achat de points                    | Inexistant. Aucun produit payant n'écrit dans le registre XP                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Valeurs envoyées par le client     | Le client n'envoie jamais de points, seulement des **intentions** (« je déclare un concert »). Le serveur calcule tout                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## 7. Confiance (trust levels)

Paliers inspirés de Discourse, recalculés à chaque événement significatif
et chaque nuit, **rétrogradables**.

| TL  | Nom      | Conditions                                                                                                                                                  | Droits ajoutés                                            |
| --- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 0   | Nouveau  | Email vérifié                                                                                                                                               | 10 premiers messages par jour, 1 annonce active, 3 médias |
| 1   | Membre   | ≥7 jours, profil complet, ≥1 conversation réciproque, 0 sanction, moins de 3 personnes qui l'ont bloqué (90 jours)                                          | 30 messages par jour, 3 annonces, endosser                |
| 2   | Confirmé | ≥30 jours, ≥1 collaboration confirmée avec une contrepartie TL1+, au plus la moitié de ses demandes de contact refusées (plancher de 10 demandes, 90 jours) | Corroborer, quotas étendus, 10 médias                     |
| 3   | Pilier   | ≥90 jours, ≥5 contreparties distinctes, taux de signalement faible                                                                                          | Signalements prioritaires, inviter des organisations      |

Les **refus et blocages reçus** (P2-05) pèsent ainsi sur la confiance :
3 blocages venant de personnes distinctes en 90 jours ramènent au palier
0, comme une sanction ; une personne dont la plupart des demandes sont
refusées ne dépasse pas le palier 1. Le plancher de 10 demandes évite de
juger un nouveau venu sur 3 refus. Confiance recalculée aussitôt après un
blocage ou un refus.

## 8. Quêtes

Deux familles, un seul modèle de données :

- **Quêtes système** : onboarding (« ajoute ta première démo ») et
  prochaines étapes de groupe. Le tableau de bord affiche toujours **les
  trois prochains objectifs atteignables**, calculés à partir de l'état
  courant. C'est le « prochain objectif à débloquer » demandé par le
  brief.
- **Quêtes émises (= annonces / opportunités)** : un acteur cherche
  quelqu'un. Un groupe cherche un batteur, un producteur cherche une
  voix de soprano, un organisateur cherche trois groupes pour un plateau.
  Une quête émise est **remplie** quand l'émetteur et le candidat retenu
  confirment tous deux. Les deux gagnent alors de l'XP, et une
  collaboration est créée.

Exemple du brief, revu : « Trouver un batteur, +150 XP ». L'XP n'est pas
versée à la publication de l'annonce. Elle est versée quand un batteur a
rejoint le groupe et que les deux parties l'ont confirmé.

## 9. Succès (achievements)

**Principe (D54)** : l'XP confirme l'**activité** ; les succès montrent
la **direction**. Un profil se lit à ses badges : ce que la personne fait
concrètement (elle mixe, elle produit, elle compose seule), pas un
chiffre. Un geste qui ne doit pas rapporter d'XP (déclaratif, unilatéral,
ou déjà payé par une collaboration) peut débloquer un succès.

Badges ponctuels, déclenchés par les mêmes événements que l'XP, et
distincts des paliers. Une rareté est calculée (« 4 % des musiciens »).
Exemples : _Premier contact abouti_, _Multi-instrumentiste_ (3
instruments avec démo), _Passeur_ (a présenté deux personnes qui ont
ensuite collaboré), _Fidèle au poste_ (5 répétitions corroborées dans un
mois). Aucun succès n'est lié à un volume de messages ou de connexions.

Succès fun des jams (P2-15b, D27), **sans XP**, déclenchés par « J'y
étais » (événement `jam.attended`, qui ne rapporte rien) ou par une
appréciation : _Noctambule_ (jam finie après minuit), _Touche-à-tout_
(trois instruments différents joués en jam), _Brise-glace_ (première
appréciation laissée), _Chef d'orchestre_ (lead d'une jam dont toute la
formation invitée, deux personnes au moins, a accepté).

Succès des morceaux et du son (P4-07b, D54), **sans XP** :
_Première prise de son_, _Premier mixage_, _Premier mastering_,
_Première production_ (premier crédit confirmé de ce rôle sur le morceau
de quelqu'un d'autre, par une collaboration terminée ou par confirmation ;
se créditer soi-même ne compte pas) ; _Fait maison_ (un morceau composé
seul·e, maquette jointe : déclaré, sans XP, D35) ; _Orchestre à soi
seul·e_ (composé seul·e, et un rôle du son tenu sur ce morceau).
Événements `work.sound_credited` et `work.composed_solo`.
