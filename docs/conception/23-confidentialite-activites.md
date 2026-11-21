# 23 — Confidentialité des activités et protection contre le pistage

> Rédigé le 20/11/2026 (RV-01, décision [D81](../decisions/D81-activites-privees-par-defaut.md)).
> Les cinq phases sont livrées : audit, architecture, protection immédiate,
> partage volontaire et exclusions (phase 4), découverte sur place sans QR
> code (phase 5, validée par le fondateur le 20/11/2026).

**But.** Melokiva doit permettre de rencontrer des musicien·nes sans créer
d'historique public de ses déplacements. Une personne qui s'inscrit partout
ne doit pas pouvoir savoir où se trouve quelqu'un, ni quand.

## 1. Cartographie : où une participation pouvait se lire (phase 1)

Relevé sur `main` le 20/11/2026, sur tous les lecteurs de `JamAttendance`,
`JamInvite` et `JamEndorsement`, les profils, Découvrir, Contacts,
notifications, exports et API.

| #   | Point d'accès                                       | Ce qui fuyait                                                                                              | État après la phase 3                          |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| F1  | « Qui était là ? » (`afterJam#whoWasThere`)         | Nom et instrument de chaque présent·e, pour toute personne qui voit la jam                                 | Personne d'autre que soi                       |
| F2  | Appréciation (`afterJam#endorse`)                   | Le message d'erreur disait si la cible avait déclaré sa présence                                           | Même réponse « Personne inconnue. » partout    |
| F3  | Carnet (`jam/log#jamLog`)                           | « Croisé·es à… », sans limite de durée                                                                     | Personne                                       |
| F4  | Musicos croisés (`afterJam#crossedJams`)            | Nombre exact d'autres présent·es                                                                           | Zéro                                           |
| F5  | `network#playedTogether`                            | Oracle : « Garder le contact » et l'invitation dans un groupe réussissaient si la cible avait été présente | Collaborations confirmées seulement            |
| F6  | Réseau musical (`network#myNetwork`)                | Nombre de jams communes avec un contact gardé d'un seul côté                                               | Zéro                                           |
| F7  | Contacts (`contacts/service`)                       | « Joué ensemble le… » d'après les jams                                                                     | Plus de fait de jam                            |
| F8  | Fiche d'une jam à venir (`publicJams#getJam`)       | Noms de la formation (invitations acceptées) pour tout le monde                                            | Nommés pour l'hôte, le lead et soi-même        |
| F9  | Compteurs « N viennent » (jam, lieu, agenda, école) | Nombre exact : une arrivée se voyait à l'unité                                                             | Tranches ; nombre exact pour l'hôte et le lead |
| F10 | Profil public (`career/sheet#publicSheetData`)      | Communes des jams où la personne a été appréciée                                                           | Sur sa propre fiche seulement                  |
| F11 | Retrait d'un présent par l'hôte (`removeFromJam`)   | Un tiers agissait sur la présence d'autrui                                                                 | Supprimé, colonne `removedAt` supprimée        |

Vérifiés sans fuite : notifications (seul `JAM_INVITE` touche une jam, et il
va à l'invité·e), digest e-mail, recherche et suggestions (aucune lecture de
présence), administration et modération (aucune vue des participations),
API `/api/*`, export RGPD (ses propres données seulement), SEO (pages `(app)`
non indexées). Les conseils (`guide/service`) comptent ses co-présent·es pour
soi seul : c'est un agrégat sans identité, conservé.

## 2. Architecture (phase 2)

### 2.1 Politique unique

La règle est **pure** (`src/lib/privacy/activities.ts`,
`decideActivityVisibility`) et testée seule. Le service
`src/lib/server/privacy/activities.ts` est le **seul** endroit qui la nourrit :

- `visibleOwnerIds(viewerId, ownerIds, { scope, jamId })` pour une liste :
  six requêtes en parallèle (blocages, exclusions, préférences, autorisations,
  âges, sessions sur place), quelle que soit la taille de la liste, donc pas
  de N+1 ;
- `canViewActivity(viewerId, ownerId, options)` pour une décision unitaire ;
- `participantBand(count)` pour les compteurs.

`scope` vaut `past` (« J'y étais », carnet, contacts) ou `future` (« Je
viens », formation). Tous les points F1 à F8 passent par ce module. Un
composant Svelte ne masque jamais une donnée que le serveur aurait envoyée.

### 2.2 Ordre des contrôles

1. Identité de la session, compte non suspendu (`appWriteHandle`, layout).
2. Blocage dans un sens ou dans l'autre (`Block`, mécanisme existant).
3. Exclusion individuelle (« Masquer mes activités à cette personne »).
4. Mode de partage de la catégorie d'activité (passée ou future).
5. Autorisation explicite (`SELECTED_CONTACTS`) ou public consenti.
6. Mineur·es : jamais visibles d'un·e adulte qui n'est pas autorisé·e
   explicitement ; jamais en `PUBLIC`.
7. Session de découverte sur place valide, si c'est elle qui ouvre l'accès.

Une exclusion ou un blocage l'emporte toujours sur un partage.

### 2.3 Modèle de données (migration `confidentialite_activites`)

| Entité                         | Rôle                                                                                                                                        | Contraintes                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `ActivityVisibilityPreference` | Par personne : mode des activités **passées** et des activités **futures** (`PRIVATE`, `SELECTED_CONTACTS`, `PUBLIC`), `PRIVATE` par défaut | `@id personId` ; absence de ligne = `PRIVATE`                                         |
| `ActivityVisibilityGrant`      | « J'autorise cette personne à voir mes activités » (passées, futures ou les deux)                                                           | `@@unique([ownerId, viewerId])`, index `viewerId`, révocation = suppression           |
| `ActivityVisibilityExclusion`  | « Masquer mes activités à cette personne », privée, sans notification                                                                       | `@@unique([ownerId, excludedId])`, index `excludedId`                                 |
| `JamDiscoverySession`          | Visibilité sur place, pour une jam, jusqu'à une échéance                                                                                    | `@@unique([opportunityId, actorId])`, `expiresAt`, index `(opportunityId, expiresAt)` |

Le carnet volontaire (`SavedContact`, D82, successeur de `MusicalTie`) n'ouvre
aucun accès aux activités. `JamAttendance` reste distinct du carnet de contacts. Les quatre tables sont couvertes par l'export RGPD et effacées à
l'anonymisation.

### 2.4 Besoins réels des organisateurs (moindre privilège)

| Organisation      | Information nécessaire                                                        | Information refusée                  |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| Scène ouverte     | Tranche de fréquentation ; nombre exact pour préparer la soirée               | Identité des « Je viens », présences |
| Formation limitée | Noms et instruments de la formation qu'elle a invitée, invitations en attente | Présences après la jam, historique   |
| Gestion d'un lieu | Comme l'hôte, pour les jams publiées au nom du lieu                           | Activités des personnes ailleurs     |
| Administration    | Rien par défaut ; un dossier de modération donnera un accès tracé (#91)       | Accès libre aux participations       |

## 3. Livré

### 3.1 Protection immédiate (phase 3)

Tous les points F1 à F11 sont traités (§1).

### 3.2 Partage volontaire et exclusions (phase 4)

- **Réglages** `/reglages/confidentialite` : qui voit mes jams passées, qui
  voit mes jams à venir (« Personne », « Les personnes que j'autorise »,
  « Tous les membres ») ; personnes autorisées ; personnes à qui je masque mes
  jams ; lien vers le blocage. « Tous les membres » exige une case cochée,
  contrôlée côté serveur, et n'est pas proposé aux mineur·es.
- **Depuis un profil** : « Autoriser à voir mes jams » et « Masquer mes
  jams », sans passer par les réglages. Rien n'est notifié.
- Autoriser quelqu'un retire son masquage, et inversement. Révoquer a un
  effet immédiat.
- L'**appréciation** revient entre personnes qui se voient, et avec elle
  « Brise-glace » ; « Garder le contact » aussi, pour une présence visible.

### 3.3 Découverte sur place (phase 5)

Sur « Qui était là ? », pendant la jam, après « J'y étais » : **Me rendre
visible ici**. On voit les personnes qui l'ont fait elles aussi, et elles
seules ; **Me masquer** a un effet immédiat. La session expire à la fin de
la jam et le job quotidien l'efface. Trois activations par 12 h au plus. Les
mineur·es n'y ont pas accès. Aucune XP. Pas de QR code (§4).

### 3.4 Preuves

`src/lib/privacy/activities.test.ts` (règle), `privacy/activities.integration.test.ts`
(pisteur, carnet, autorisation, exclusion, blocage, révocation, passé et
avenir, mineur·es, sur place, expiration, limite, RGPD),
`jam/presence.integration.test.ts`, `jam/crossed.integration.test.ts`,
`jam/afterJamMinors.integration.test.ts`, E2E `confidentialite.spec.ts` et
`jams.spec.ts`.

## 4. Découverte sur place : modèle de menace

Parcours visé : « Me rendre visible pour rencontrer des musicien·nes ici ».
La personne l'active elle-même, se masque d'un geste, et la visibilité
expire à la fin de la jam. Elle n'est visible que des personnes qui ont
elles aussi activé la visibilité, à la même jam et au même moment.

**Ce qu'un QR code ne garantit pas.** Un code affiché sur place se photographie
et s'envoie à distance. Il ne prouve donc pas la présence physique. Il ne sera
jamais présenté comme une preuve, et il ne rapporte aucune XP.

| Menace                                   | Parade proposée                                                                                            | Reste possible                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Pisteur qui active la visibilité partout | Visibilité **réciproque** : on n'est vu que de qui est visible ; on voit qui l'a activée, pas qui est venu | Il voit les personnes qui ont choisi d'être visibles à cette jam, à ce moment |
| Code photographié et partagé             | Jeton tournant (60 s), à usage unique, signé côté serveur                                                  | Complicité d'une personne sur place                                           |
| Rejeu ou force brute                     | Jeton imprévisible (128 bits), refus d'un jeton déjà utilisé, limite de tentatives par compte              | —                                                                             |
| Historique de lieux                      | La session s'efface à son expiration, aucune coordonnée n'est stockée                                      | —                                                                             |
| Mineur·es                                | Pas de découverte sur place pour les mineur·es en V1                                                       | —                                                                             |
| Personne exclue ou bloquée               | La politique §2.2 s'applique aussi à la session                                                            | —                                                                             |

**Retenu pour la V1** : la découverte **réciproque, volontaire et expirante,
sans QR code**, limitée à trois activations par 12 h. Le jeton tournant ne
s'ajoutera que si les essais à Toulouse montrent qu'il apporte quelque chose.
C'est plus restrictif, et cela ne promet aucune fausse garantie.

## 5. Risques résiduels acceptés

- **Capacité par instrument** : une place qui passe de « ouverte » à
  « complet » laisse deviner qu'un·e batteur·se s'est inscrit·e. C'est
  nécessaire pour organiser, et cela ne désigne personne.
- **Changement de tranche** : de « Personne » à « Quelques ». Cela ne désigne
  personne.
- **Hôte malveillant** : il voit les inscrit·es de sa propre jam. Le
  signalement et la restriction ciblée de #91 y répondent.

## 6. Effet sur l'appréciation et l'XP

L'appréciation après une jam n'est possible qu'entre personnes qui se
voient (partage consenti ou découverte sur place). Elle est donc plus rare
qu'avant D81 : c'est le prix de la protection, assumé. Le barème et les
garde-fous (TL1, rendements décroissants) ne changent pas. À suivre dans
#93.
