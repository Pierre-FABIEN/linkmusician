# Actions prioritaires métier — DASH-03 (#33)

## Audit avant composants (12/11/2026)

Arbre propre sur `cc650e5`. Issue #33 et épopée #30 lues avec leurs
commentaires : aucun commentaire à cette date. DASH-01 est livré localement.

| Donnée existante                      | Service / écran                                                               | Disponibilité et précautions                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidatures reçues                   | `opportunities/service.listMine`, `applications`, `/annonces/[id]`            | Annonces personnelles ou structures gérées (adhésion ACTIVE OWNER/ADMIN, non dissoutes). `listForIssuer` marque les candidatures vues : ne jamais l'appeler depuis un accueil. Le compteur brut de `listMine` ne filtre pas les blocages : ajouter une lecture seule filtrée.                                                                                  |
| Demandes de contact                   | `messaging/service.listConversations`, `/messages`                            | Au plus 100 conversations ; REQUEST n'est pas un message non lu. La liste historique peut contenir des échanges bloqués : filtrer les contreparties visibles et les refus. Aucune sollicitation pour un compte mineur ou sans date de naissance.                                                                                                               |
| Collaborations à accepter / confirmer | `collaborations/service.pendingForMe`, `/messages/[id]`                       | Au plus 20 collaborations ; `step` distingue ce qui attend réellement la personne, selon sa réponse et le jour de réalisation. Ne remonter que les conversations acceptées, sans contrepartie bloquée, masquée, suspendue ou supprimée.                                                                                                                        |
| Dates à venir                         | `career/service.agenda`, `/espace/agenda`                                     | Jams auxquelles le compte participe et collaborations acceptées ; au plus 30 de chaque. Ce sont des dates prévues, pas des délais contractuels. Filtrer les conversations indisponibles ; pour les jams, réutiliser `publicJams.visibleJamIds` et les règles de la fiche (lieu validé et non retiré, audience école, couvre-feu et lieu adapté aux mineur·es). |
| Crédits, invitations de groupe        | `works.pendingCredits`, `bands.bandCounts`, `/espace/a-confirmer`             | Déjà présents dans le menu carrière. Pas d'attribution au métier actif et pas de contrepartie dans ces compteurs : conserver ces parcours, sans les réutiliser comme confirmations professionnelles.                                                                                                                                                           |
| Accompagnements                       | `representation.representationsForMe`, `myRepresentations`, `/accompagnement` | Les propositions reçues concernent l'artiste ou les groupes gérés ; les propositions envoyées par l'agent n'attendent pas sa réponse. Lectures existantes sans filtrage des blocages : pas de nouveau compteur de propositions dans ce lot.                                                                                                                    |
| Studios, organisations, lieux         | Services spécifiques et menus DASH-01                                         | Pas de file de réservations ou de demandes professionnelles commune livrée. Conserver leurs écrans et leurs permissions, sans inventer de réservation.                                                                                                                                                                                                         |

## Configuration des six métiers ouverts

Les demandes de contact, candidatures reçues et dates appartiennent au compte,
pas à un métier : les tuiles le disent. Une même donnée reste partagée après
bascule, sans créer ni réattribuer d'objet. L'ordre varie selon le métier :

| Métier               | Ordre des entrées                             |
| -------------------- | --------------------------------------------- |
| Musicien·ne          | confirmations, candidatures, demandes, agenda |
| Ingé son, production | confirmations, demandes, agenda, candidatures |
| Organisation         | candidatures, agenda, confirmations, demandes |
| Manager              | demandes, confirmations, candidatures, agenda |
| Booker               | agenda, candidatures, demandes, confirmations |

Les entrées avec une réponse à donner passent avant les dates, puis les états
vides ; ordre stable de la configuration à égalité. L'agenda affiche la date
la plus proche (Europe/Paris). Aucun score, XP, rang ou profil public métier
n'intervient dans la sélection. Les métiers bientôt ne reçoivent pas ces tuiles.

## Contrat de présentation et sécurité

Un pivot « priorités » reste un menu Metro partagé : une entrée par catégorie,
un lien vers l'écran dédié, une phrase et un résumé au plus. Aucune mutation
sur l'accueil ; ouvrir les candidatures depuis cet écran ne les marque pas vues.
Les résumés sont des aperçus bornés, jamais annoncés comme un total exhaustif.
L'absence indique précisément ce qui n'a pas été trouvé dans ces aperçus ;
un lien ouvre les échanges, annonces ou agenda existants, sans bouton inactif.

Le serveur obtient le compte et le métier depuis la session validée DASH-01.
Les lectures filtrent les contreparties avant de compter ; aucun nom, message,
date de naissance ou champ de visibilité métier n'est envoyé par ce service.
Les permissions des écrans et actions cibles restent souveraines. Le contexte
ne donne aucun droit de gestion, d'envoi ou de confirmation.

Pas de migration ni donnée personnelle nouvelle. Pas de recommandations
« Pour toi », réservations, échéancier professionnel, notification automatique,
ni réalisation des autres tickets DASH ou des parties ouvertes de #26/#27.

## Vérifications locales

- `priorityActions.test.ts` : quatre tests de sélection, états vides, six
  configurations, métiers bientôt, demandes réservées aux adultes et date
  affichée à Paris, sans progression dans les entrées de la règle.
- `server/space/priorities.integration.test.ts` : deux tests exécutés avec
  `PROGRESSION_INTEGRATION=1`, dans le schéma e2e. Ils vérifient aussi qu'un
  identifiant d'annonce étranger ne donne aucun droit et que la lecture ne
  marque pas les candidatures vues ; dates filtrées selon l'audience école,
  la présence actuelle du membre, le lieu et le couvre-feu des mineur·es.
- `actions-metiers.spec.ts` : six métiers avec et sans données, contexte,
  propriétaire/membre/ancien membre, blocages dans les deux sens, profil
  masqué, compte mineur, demandes non marquées lues, clavier et mobile 390 px.
  Axe et captures sur mobile et bureau ; mouvement réduit sur bureau.
- Non-régressions : `navigation-metiers.spec.ts`, `modes.spec.ts`,
  `aide.spec.ts`. Types sans erreur ni avertissement ; jamais de svelte-check
  en parallèle des E2E. Suite unitaire complète et lint contrôlés ; les
  réserves préexistantes du lint global sont consignées dans le suivi du plan.

La recette locale ne clôture pas l'issue GitHub. Les réservations, dates
bookées hors participation à une collaboration, délais contractuels et
nouvelles files de validations professionnelles restent dans les autres
lots DASH. Le compteur de collaborations n'agrège pas les crédits ni les
invitations : ces derniers restent accessibles sur l'écran À confirmer.
