# Messagerie

Module LinkMusician (lot P2-04, décisions D5 et D8). Pages `/messages`,
`/messages/[id]` et `/messages/nouveau?a=<handle>` (depuis le bouton
« Écrire à … » du profil public).

## Règles

- **Trois messages avant une réponse (D44, P3-16a)** : on écrit à qui on
  veut ; tant que l'autre n'a pas répondu, on envoie **3 messages au plus**
  (`MAX_MESSAGES_BEFORE_REPLY`, `sendPermission`), avec « encore N
  messages » à l'écran. Le destinataire **répond**, ce qui accepte la
  conversation (son état passe à `ACCEPTED` dans la même transaction), ou
  la **refuse** (elle se ferme pour l'expéditeur, sans que le refus lui
  soit dit). Il n'y a plus de bouton « Accepter » à part (`respondToRequest`
  ne sert plus qu'au refus).
- **Une conversation par paire** (`Conversation.pairKey`) ; réécrire à
  quelqu'un rouvre la conversation existante.
- **Quota de premiers messages** par jour selon la confiance (TL0 : 10,
  TL1 : 30, TL2 : 60, TL3 : 100 ; `consumeDailyQuota`). Le 11ᵉ d'un TL0 est
  refusé (statut 429).
- **16-17 ans (D5)** : ne reçoivent pas de **nouvelle** demande ; ils
  peuvent écrire eux-mêmes, et leurs conversations acceptées continuent.
  Le refus ne dit jamais pourquoi (l'âge n'est pas révélé). Une date de
  naissance inconnue vaut mineur·e.
- **Destinataires** : profils publics seulement (ni masqués, ni suspendus,
  ni anonymisés).
- **Texte brut**, 2 000 caractères au plus, caractères de contrôle retirés.
- **Échange réciproque** : la première réponse du destinataire émet
  `conversation.reciprocated` pour chacun des deux ; l'XP n'est versée
  que si la conversation est née d'une annonce (P2-02/P2-03).
- **Non-lus** : messages de l'autre après ma lecture ; pastille sur
  l'icône Messages dans l'en-tête (D48) ; ouvrir une conversation la
  marque comme lue.
- **Temps réel (D8)** : pas de WebSocket (les fonctions Vercel ne gardent
  pas de connexion). Polling **léger** toutes les 15 s, onglet visible
  seulement : `GET /api/conversations/[id]/nouveaux?apres=…` fait une seule
  lecture et aucune écriture ; le fil complet n'est rechargé que s'il y a
  du neuf, et la date de lecture n'est écrite que si elle change. Délai
  jusqu'à 15 s. Vrai temps réel (Ably ou Pusher, < 1 s, polling en secours)
  en phase 4 (P4-12).
- **Signaler** la personne depuis la conversation (P1-12).
- **Discussions de groupe** (P3-16c) : à plusieurs, sur invitation, depuis
  un groupe de contacts ; voir [docs/contacts](../contacts/README.md).

## Blocage (P2-05)

- Bloquer depuis le profil public ou la conversation ; la personne n'est
  pas prévenue. Liste et déblocage dans `/reglages`.
- **Dans les deux sens** : profils introuvables (404), médias aussi,
  absents de la recherche, nouvelle demande impossible ; une conversation
  existante reste lisible mais se ferme (« Cette conversation est
  fermée. »). Un seul filtre : `publicActorWhere(now, viewerId)`, et son
  équivalent SQL dans la recherche.
- **Confiance** (conception 02 §7) : 3 blocages reçus en 90 jours
  ramènent au palier 0 ; trop de demandes refusées bloquent le palier 2.
  Recalculée aussitôt.
- RGPD : les personnes bloquées figurent dans l'export ; tous les
  blocages sont effacés à l'anonymisation.
- E2E : `e2e/linkmusician/blocage.spec.ts` ; recherche :
  `musicians.integration.test.ts`.
- **RGPD** : export des messages envoyés (pas des reçus, données de
  l'autre) ; à l'anonymisation, le texte devient « Message supprimé ».

## Code et tests

- Règles pures : `src/lib/messaging/rules.ts` (testées).
- Service : `src/lib/server/messaging/service.ts`.
- E2E : `e2e/linkmusician/messagerie.spec.ts` (mineur, demande, acceptation,
  réponse, réciprocité tracée sans XP, quota TL0).
