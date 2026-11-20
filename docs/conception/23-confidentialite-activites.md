# 23 — Confidentialité des activités et protection contre le pistage

> Rédigé le 20/11/2026 (RV-01, décision [D81](../decisions/D81-activites-privees-par-defaut.md)).
> Phases 1 à 3 livrées. Les phases 4 et 5 sont **proposées** et attendent la
> validation du fondateur avant tout développement.

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

`src/lib/server/privacy/activities.ts` est le **seul** endroit qui décide si
quelqu'un voit l'activité d'une autre personne :

- `canViewActivity({ viewerId, ownerId, context })` pour une décision unitaire ;
- `othersAttendanceVisibleTo(viewerId, context)`, un filtre Prisma, pour les
  listes (pas de N+1) ;
- `participantBand(count)` pour les compteurs.

Tous les points F1 à F7 passent par ce module. Ajouter le partage, c'est
modifier ce module et rien d'autre. Un composant Svelte ne masque jamais une
donnée que le serveur aurait envoyée.

### 2.2 Ordre des contrôles (cible des phases 4 et 5)

1. Identité de la session, compte non suspendu (`appWriteHandle`, layout).
2. Blocage dans un sens ou dans l'autre (`Block`, mécanisme existant).
3. Exclusion individuelle (« Masquer mes activités à cette personne »).
4. Mode de partage de la catégorie d'activité (passée ou future).
5. Autorisation explicite (`SELECTED_CONTACTS`) ou public consenti.
6. Mineur·es : jamais visibles d'un·e adulte qui n'est pas autorisé·e
   explicitement ; jamais en `PUBLIC`.
7. Session de découverte sur place valide, si c'est elle qui ouvre l'accès.

Une exclusion ou un blocage l'emporte toujours sur un partage.

### 2.3 Modèle de données proposé (phase 4, non migré)

| Entité                         | Rôle                                                                                                                                        | Contraintes                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `ActivityVisibilityPreference` | Par personne : mode des activités **passées** et des activités **futures** (`PRIVATE`, `SELECTED_CONTACTS`, `PUBLIC`), `PRIVATE` par défaut | `@id personId` ; absence de ligne = `PRIVATE`                                         |
| `ActivityVisibilityGrant`      | « J'autorise cette personne à voir mes activités » (passées, futures ou les deux)                                                           | `@@unique([ownerId, viewerId])`, index `viewerId`, révocation = suppression           |
| `ActivityVisibilityExclusion`  | « Masquer mes activités à cette personne », privée, sans notification                                                                       | `@@unique([ownerId, excludedId])`, index `excludedId`                                 |
| `JamDiscoverySession`          | Visibilité sur place, pour une jam, jusqu'à une échéance                                                                                    | `@@unique([opportunityId, actorId])`, `expiresAt`, index `(opportunityId, expiresAt)` |

`MusicalTie` et `JamAttendance` restent inchangés : le carnet n'ouvre aucun
accès. Les quatre tables sont couvertes par l'export RGPD et effacées à
l'anonymisation.

### 2.4 Besoins réels des organisateurs (moindre privilège)

| Organisation      | Information nécessaire                                                        | Information refusée                  |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| Scène ouverte     | Tranche de fréquentation ; nombre exact pour préparer la soirée               | Identité des « Je viens », présences |
| Formation limitée | Noms et instruments de la formation qu'elle a invitée, invitations en attente | Présences après la jam, historique   |
| Gestion d'un lieu | Comme l'hôte, pour les jams publiées au nom du lieu                           | Activités des personnes ailleurs     |
| Administration    | Rien par défaut ; un dossier de modération donnera un accès tracé (#91)       | Accès libre aux participations       |

## 3. Livré : protection immédiate (phase 3)

Tous les points F1 à F11 sont traités (§1). Preuves :
`privacy/activities.test.ts` (politique), `jam/presence.integration.test.ts`
(scénario adversarial du pisteur), `jam/crossed.integration.test.ts`,
`jam/afterJamMinors.integration.test.ts` et l'E2E `jams.spec.ts`
(« deux présents ne se voient pas »).

## 4. Découverte sur place : modèle de menace (phase 5, à valider)

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

**Recommandation pour la V1** : livrer la découverte **réciproque, volontaire
et expirante, sans QR code**, puis ajouter le jeton tournant si les essais à
Toulouse montrent qu'il apporte quelque chose. C'est plus restrictif, et
cela ne promet aucune fausse garantie.

## 5. Risques résiduels acceptés

- **Capacité par instrument** : une place qui passe de « ouverte » à
  « complet » laisse deviner qu'un·e batteur·se s'est inscrit·e. C'est
  nécessaire pour organiser, et cela ne désigne personne.
- **Changement de tranche** : de « Personne » à « Quelques ». Cela ne désigne
  personne.
- **Hôte malveillant** : il voit les inscrit·es de sa propre jam. Le
  signalement et la restriction ciblée de #91 y répondent.

## 6. Ce que la phase 3 suspend, en attendant les phases 4 et 5

L'appréciation après une jam, et avec elle le succès « Brise-glace », est
suspendue : elle exige de voir la présence de l'autre. « Garder le contact »
depuis une jam l'est aussi : il exige une collaboration confirmée, en
attendant #99. Le partage volontaire les rétablira entre personnes qui y
consentent.
