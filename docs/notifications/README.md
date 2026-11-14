# Notifications

## Journal d’activité (DASH-05a)

L’historique privé des affectations est affiché sur `/delegations/[id]` à
partir de leurs faits conservés. Il ne crée aucune notification et n’utilise
pas la cloche comme journal : préférences, blocages et purge rendent celle-ci
volontairement non exhaustive. Le contrat de lecture et le composant partagés
préparent les autres domaines ; DASH-05 reste partiel.
Voir [audit et périmètre](../conception/16-journal-activite.md).

DASH-05b étend cette lecture aux mandats (`/accompagnement/historique`) et
aux invitations personnelles conservées (`/structure/[id]`). La liste privée
des mandats garde les accompagnements terminés pour leurs parties et la gestion
actuelle du groupe. Ni le journal ni ses consultations n’émettent de notification.

## Dans l'app (P2-09a)

- **Ce qui entre sous la cloche** : ce qui attend une réaction ou fait
  plaisir, venant d'une autre personne. Six types (`NotificationType`) :

  | Type                   | Quand                                 | Lien              |
  | ---------------------- | ------------------------------------- | ----------------- |
  | `CONTACT_REQUEST`      | Une demande de contact arrive         | la conversation   |
  | `APPLICATION_RECEIVED` | Quelqu'un postule à mon annonce       | l'annonce         |
  | `APPLICATION_ACCEPTED` | Ma candidature est acceptée           | la conversation   |
  | `COLLAB_TO_CONFIRM`    | On me propose une collaboration       | la conversation   |
  | `ENDORSEMENT`          | Une appréciation (jam, collaboration) | mon profil public |
  | `JAM_INVITE`           | Le lead m'invite sur une place        | la jam            |

- **Ce qui n'y entre pas** : les gains, niveaux et succès (annoncés par les
  célébrations, P2-11) et les messages (pastille de l'icône Messages dans
  l'en-tête, D48).
  Pas de doublon ; ils serviront au digest email (P2-09b).
- **Émission** : `notify()` (`src/lib/server/notifications/service.ts`),
  dans la transaction du fait quand il y en a une. Jamais pour soi-même,
  jamais entre deux personnes séparées par un blocage, jamais pour un type
  coupé dans `/reglages`. Le texte est composé à l'affichage
  (`src/lib/notifications/types.ts`) avec le nom actuel de l'autre
  personne ; une notification venant d'une personne bloquée après coup
  disparaît.
- **Ton** (conception 07 §7) : une bonne nouvelle ou une chose à faire,
  jamais un reproche (test sur les textes).
- **Pastilles** : cloche dans la bande du haut (ordinateur et mobile),
  « 9+ » au-delà de 9. Relues par `/api/notifications/badge` à chaque
  navigation et toutes les 60 s quand l'onglet est visible.
- **`/notifications`** : les 50 dernières, les nouvelles en évidence ;
  l'ouverture marque comme lu jusqu'à la plus récente affichée.
- **Préférences** : une ligne par exception (`notification_preferences`),
  tout est activé par défaut. La colonne `email` sert à P2-09b.
- **RGPD** : notifications reçues et préférences dans l'export ;
  supprimées à l'anonymisation, comme celles que la personne a causées.

## Digest email (P2-09b)

- **Job** `/api/jobs/digest` (`src/lib/server/jobs/digest.ts`), cron Vercel
  à 17 h UTC (18 h l'hiver, 19 h l'été à Toulouse).
- **Au plus un email par jour** : `persons.digestSentAt` est réservé par une
  mise à jour conditionnelle avant l'envoi (20 h d'écart minimum). Deux
  passages simultanés n'envoient pas deux emails ; un envoi qui échoue
  après la réservation est perdu plutôt que doublé.
- **Seulement s'il y a du neuf** depuis le dernier digest (7 jours au
  plus) : notifications non lues, messages non lus, gains et succès. Ce
  qui a été annoncé n'est jamais rappelé : pas de relance quotidienne.
- **Sujets** (`EMAIL_TOPICS`) : les six types de la cloche, plus
  `MESSAGES` et `PROGRESS` (préférence d'email seulement, jamais une ligne
  de notification). Réglables dans `/reglages` (« Dans l'app », « Par
  email »).
- **Désinscription par sujet** : un lien par sujet présent dans l'email,
  plus « Ne plus recevoir ces emails » (tous les sujets) ; lien signé
  HMAC (`BETTER_AUTH_SECRET`, sans expiration), page
  `/notifications/desinscription` sans connexion. **Ouvrir le lien ne coupe
  rien** (les antivirus de messagerie suivent les liens) : un clic sur
  « Confirmer ». En-tête `List-Unsubscribe` vers cette page.
- **Pas de désinscription en un clic par POST** (`List-Unsubscribe-Post`) :
  la protection CSRF de SvelteKit refuse un POST de formulaire venu des
  serveurs de messagerie. Gmail ne l'exige qu'au-delà de 5 000 emails par
  jour ; à reprendre avant ce volume (route dédiée exemptée).
- Comptes non vérifiés, anonymisés ou suspendus : aucun digest.
- **Purge** : notifications lues depuis plus de 90 jours, au passage du job.
- **Web Push** : reporté (D34).
- Tests : contenu (pur), jetons, job sur le schéma `e2e` avec envoi
  factice, e2e de bout en bout via le puits SMTP.
