# RV-01 — Audit des permissions et transitions Jam (#100)

> Audit réalisé le 20/11/2026 sur `main` (après `28db652`), par lecture du code
> et exécution de tests. Il ouvre le lot RV-01 du
> [chantier Rencontre V1](./rencontre-v1.md). Les failles **démontrées et non
> couvertes** par #91 à #97 sont corrigées dans ce lot (§5). Les autres sont
> **affectées** au ticket qui les traite déjà (§4), sans développement en double.

## 1. Acteurs

| Acteur                       | Définition dans le code                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| Organisateur·rice            | Personne majeure ayant coché « Prêt·e à organiser des jams » (`isJamOrganizer`, D51)                  |
| Hôte                         | `issuerActorId` de la jam, ou OWNER/ADMIN actif de l'organisation émettrice (`hosts.ts#hostIdsOf`)    |
| Gestion d'un lieu            | OWNER/ADMIN actif de l'organisation `VENUE` qui revendique le lieu (`series.ts#managedVenue`)         |
| Animateur·rice (`VenueHost`) | Personne invitée par la gestion, active ; lead par défaut possible d'une série, sans droit de gestion |
| Lead                         | `Opportunity.leadActorId`, sinon l'hôte (`lineup.ts#leadOf`)                                          |
| Participant·e                | « Je viens » (`JamAttendance` sans `attendedAt`) ou invitation acceptée (`JamInvite.ACCEPTED`)        |
| Présent·e                    | `JamAttendance.attendedAt` posé, `removedAt` nul                                                      |
| Élève / école                | Membre actif d'une école ; seul public d'un atelier `audience: SCHOOL` (`audienceWhere`)              |
| Mineur·e                     | Moins de 18 ans : jams finies avant 22 h, jamais dans un lieu `ageRule: ADULTS` (D5)                  |
| Modérateur·rice              | Rôle d'application `MODERATOR` ; `removeOpportunity`, sanctions                                       |

Transverse à toutes les lignes : un compte **suspendu** ne lit ni n'écrit rien
dans `(app)` (garde du layout, et `appWriteHandle` depuis RV-01, §5.1). Les
personnes bloquées entre elles ne se voient pas (`publicActorWhere`).

## 2. Matrice action × acteur × état

« Visible » = `findVisibleJam` : jam `OPEN`, non finie, lieu validé, émetteur
visible et non bloqué, bon public (`audienceWhere`), filtre des mineur·es.
« Après-jam » = `findRecentJam` : jam commencée, finie depuis 7 jours au plus.

| Action                                | Service (`src/lib/server/jam/`)                                                         | Qui                                       | État requis                         | Constat                                                                                    | Suite        |
| ------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ | ------------ |
| Publier une jam                       | `publicJams#createJam`                                                                  | Organisateur·rice                         | Lieu validé, créneau ≤ 60 j, quota  | Pas d'accord du lieu (conservé, décision #91). Aucune restriction ciblée `organizeJam`     | #91          |
| Publier une scène ouverte             | `series#createJamSeries`                                                                | Gestion du lieu, majeure                  | Fiche publiée, lieu validé, ≤ 3     | Conforme                                                                                   | —            |
| Générer les dates d'une série         | `series#generateForSeries` (job)                                                        | Système                                   | Série active, lieu et fiche vivants | Copie le lead par défaut sans recontrôler son éligibilité                                  | #94          |
| Arrêter une série                     | `series#stopJamSeries`                                                                  | Gestion du lieu                           | Série active                        | Passe les dates à venir en `CLOSED` **sans prévenir** inscrit·es ni invité·es              | #91          |
| Lead par défaut d'une série           | `series#setSeriesLead`                                                                  | Gestion du lieu                           | Animateur·rice active               | Pas de consentement propre à la série (l'affiliation en tient lieu)                        | #94          |
| Inviter / retirer un·e animateur·rice | `venueHosts#*`                                                                          | Gestion ; la personne pour partir         | —                                   | Conforme : retrait = plus lead des dates à venir de la série                               | —            |
| « Je viens »                          | `publicJams#comeToJam`                                                                  | Toute personne qui voit la jam, sauf hôte | Visible                             | L'instrument choisi ne vérifie pas qu'une place est ouverte : surbooking possible          | #95, #96     |
| « Je ne viens plus »                  | `publicJams#notComingToJam`                                                             | La personne                               | Aucun                               | ✅ N'efface plus un « J'y étais » déclaré (409) — `869be1f`                                | #92 ✅       |
| Inviter sur une place                 | `publicJams#inviteToJam`                                                                | Hôte ou lead                              | Visible, place réservable           | Mineur·es, bloqué·es et atelier d'école contrôlés                                          | #96          |
| Annuler une invitation                | `publicJams#cancelJamInvite`                                                            | Hôte ou lead                              | Visible                             | Supprime la ligne, sans notifier                                                           | #103         |
| Accepter / refuser                    | `publicJams#respondToJamInvite`                                                         | L'invité·e                                | Visible, invitation `INVITED`       | Pas de recontrôle de capacité à l'acceptation                                              | #96          |
| Désigner le lead                      | `publicJams#setJamLead`                                                                 | Hôte                                      | Visible                             | **Sans consentement ni éligibilité** : un·e mineur·e ou un non-organisateur peut être lead | #94          |
| Matériel sur place                    | `publicJams#setJamBackline`                                                             | Hôte ou lead                              | Visible                             | Pas de provenance (lieu ou déclaration)                                                    | #97          |
| Annuler une jam                       | _aucun flux Jam_ ; `opportunities/service#closeOpportunity` via `/annonces/[id]?/close` | Émetteur ou sa gestion                    | `OPEN`                              | Clôture **silencieuse**, à toute heure, sans trace de motif ni notification                | #91          |
| Retrait par la modération             | `moderation/service#removeOpportunity`                                                  | Modérateur·rice                           | —                                   | `REMOVED`, sans notification aux inscrit·es                                                | #91          |
| « J'y étais »                         | `afterJam#iWasThere`                                                                    | Toute personne qui voit l'après-jam       | Après-jam (dès le début)            | Peut déclencher `jam.held` **pendant** la jam                                              | #93          |
| Retirer sa présence                   | `afterJam#notThere`                                                                     | La personne                               | Après-jam                           | Conforme ; appréciations reprises par transaction négative                                 | —            |
| Retirer un faux présent               | ~~`afterJam#removeFromJam`~~                                                            | —                                         | —                                   | ✅ Supprimé avec `removedAt` (D81) — `869be1f`                                             | #92 ✅       |
| Apprécier                             | `afterJam#endorse`                                                                      | Présent·e, confiance ≥ 1                  | Après-jam                           | ✅ Ne sert plus de test de présence ; suspendu tant que les présences sont privées (D81)   | #93, phase 4 |
| Voir « Qui était là ? »               | `afterJam#whoWasThere`                                                                  | Participant·es                            | Après-jam                           | ✅ Q111 tranchée : réservé aux participant·es, ne montre personne d'autre (D81)            | —            |

## 3. Machine d'états actuelle

Une jam est une `Opportunity` `kind: JAM`. Ses statuts sont **partagés** avec les
autres annonces : #91 doit porter l'incident dans une entité propre, pas en
modifiant `OpportunityStatus`.

```
           createJam / generateForSeries
                      │
                      ▼
   ┌──────────────── OPEN ─────────────────┐
   │ closeOpportunity      stopJamSeries   │ removeOpportunity
   ▼ (émetteur)            (dates à venir) ▼ (modération)
 CLOSED                     CLOSED       REMOVED
   │
   └─ startsAt ≤ now ≤ endsAt + 7 j : après-jam (OPEN, FILLED, EXPIRED)
        └─ 3 présent·es hors hôtes, jam d'organisation : heldAt + jam.held (une fois)
```

Manquent, et relèvent de #91 et #93 : `annulée` (avec motif et horodatage),
`contestée`, `non tenue confirmée`, une fin de jam avant laquelle `jam.held` ne
peut pas être posé, et la compensation de `jam.held` si la jam est invalidée.

## 4. Notifications attendues à chaque transition

| Transition                        | Aujourd'hui                            | Attendu                                                | Ticket    |
| --------------------------------- | -------------------------------------- | ------------------------------------------------------ | --------- |
| Invitation sur une place          | `JAM_INVITE` à l'invité·e              | Inchangé                                               | —         |
| Invitation à animer               | `VENUE_HOST_INVITE`                    | Inchangé                                               | —         |
| Appréciation                      | `ENDORSEMENT`                          | Inchangé                                               | —         |
| Désignation du lead               | Aucune                                 | Demande de consentement au lead proposé                | #94       |
| Annulation, date ou lieu modifiés | Aucune (et aucun flux de modification) | Inscrit·es, invité·es et formation                     | #91, #103 |
| Arrêt d'une série                 | Aucune                                 | Inscrit·es et invité·es des dates clôturées            | #91       |
| Signalement d'une jam             | Pas de signalement                     | Organisateur·rice, avertissement neutre aux inscrit·es | #91       |
| Invitation retirée                | Aucune                                 | L'ancien·ne invité·e                                   | #103      |

## 5. Failles corrigées dans RV-01 (non couvertes par #91–#97)

### 5.1 Un compte suspendu pouvait encore écrire

La garde du layout `(app)` redirige un compte suspendu vers `/suspendu`, mais
**une action de formulaire s'exécute avant les `load`** dans SvelteKit. 62 des
64 fichiers d'actions de `(app)` ne relisaient pas la suspension : publier une
jam, inviter, apprécier, écrire un message restaient possibles par un POST.

Correctif : `src/lib/server/actors/appWriteGuard.ts` (`appWriteHandle`), placé
après `authHandle`. Toute requête autre que GET, HEAD ou OPTIONS vers une route
`/(app)/…` relit le compte, l'e-mail vérifié, la personne et la suspension,
dans le même ordre que le layout. Un refus renvoie un résultat d'action
`redirect` à `use:enhance`, et une 303 sinon. Preuves : test unitaire
`appWriteGuard.test.ts` et E2E `e2e/linkmusician/suspension-ecritures.spec.ts`
(bouton puis POST direct, aucune écriture en base).

Effet de bord sur le lead, l'hôte ou la gestion qui sont suspendus : ils perdent
immédiatement toute action, ce qui répond pour la suspension au critère
« révocation immédiate » de #100. La perte d'éligibilité hors suspension (case
décochée, affiliation retirée) reste à #94.

### 5.2 Après-jam d'un·e mineur·e dans un lieu réservé aux adultes

Avant la jam, `forViewer` écarte les lieux `ageRule: ADULTS` pour les
mineur·es. `findRecentJam`, utilisé pour « Qui était là ? », « J'y étais » et
les appréciations, ne contrôlait que le couvre-feu. Un·e mineur·e pouvait donc
déclarer sa présence et apprécier dans un bar réservé aux adultes.

Correctif : même règle dans `afterJam.ts#findRecentJam`. Preuve :
`afterJamMinors.integration.test.ts` (échoue sans le correctif, vérifié).

## 6. Hors du périmètre de cet audit, constaté au passage

- ✅ Corrigé (`ecc227f`) : sur `/jam/agenda`, les boutons du calendrier
  s'annonçaient « Previous » et « Next ».
- ❌ **Défaut antérieur, cause inconnue** : à l'étape 3 de
  `jams.spec.ts` (« Je publie ma jam au Préau »), le lieu créé par le test
  est trouvé sur `/lieux/<id>`, puis absent de `/jams/nouvelle` à la requête
  suivante. Reproduit sur le code d'avant la phase 3, donc sans lien avec
  D81. Les autres scénarios de la spec passent.
- ❌ **Test d'intégration fragile** : `schools/history.integration.test.ts`
  compte **toutes** les notifications de la base. Il échoue dès qu'un autre
  fichier en crée une en même temps ; il passe seul.

## 7. Critères d'acceptation de #100 : état

| Critère                                                   | État                                                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Matrice complète, chemins de code et responsables         | ✅ §2                                                                                                 |
| Chaque action réservée aux acteurs habilités, hors UI     | ✅ suspension (§5.1), interdiction d'organiser (#91b) ; consentement du lead → #94 (RV-03)            |
| Révocation immédiate du lead, de l'hôte, de la gestion    | ✅ suspension et interdiction ; perte d'éligibilité du lead → #94                                     |
| Arrêt, annulation et incidents n'effacent rien en silence | ✅ #91a (annulation notifiée, arrêt de série, clôture d'annonce refusée), #92 (« Je ne viens plus »)  |
| Atelier, mineur·es, lieu non inscrit, scène ouverte…      | ✅ mineur·es (§5.2, D81), atelier ; formation limitée → #95                                           |
| Tests négatifs, concurrence, idempotence                  | ✅ suspension, mineur·es, confidentialité, annulation, signalement, invalidation ; réservations → #96 |
| Documentation et `/diagram` synchronisés                  | ✅                                                                                                    |
| Découvrir indépendant des preuves Jam                     | ✅ `playedTogether` ne compte plus les jams (D81) ; refonte du carnet → #99 (RV-02)                   |

Les critères qui restent ouverts dépendent de tickets d'autres lots (#94, #95,
#96, #99) : #100 peut se fermer une fois `main` poussé, en y renvoyant.
