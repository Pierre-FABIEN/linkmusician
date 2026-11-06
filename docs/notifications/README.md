# Notifications

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
  célébrations, P2-11) et les messages (pastille de l'onglet Messages).
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
