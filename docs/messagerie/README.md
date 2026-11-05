# Messagerie

Module LinkMusician (lot P2-04, décisions D5 et D8). Pages `/messages`,
`/messages/[id]` et `/messages/nouveau?a=<handle>` (depuis le bouton
« Écrire à … » du profil public).

## Règles

- **Demande d'abord** : le premier message à quelqu'un est une demande,
  un seul message tant qu'elle n'est pas acceptée. Le destinataire
  l'accepte (il peut alors répondre) ou la refuse (la conversation se
  ferme pour l'expéditeur, sans que le refus lui soit dit).
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
  l'onglet Messages ; ouvrir une conversation la marque comme lue.
- **Temps réel (D8)** : polling toutes les 15 s sur une conversation
  ouverte, seulement onglet visible ; temps réel en phase 4 (P4-12).
- **Signaler** la personne depuis la conversation (P1-12). Le blocage
  arrive avec P2-05.
- **RGPD** : export des messages envoyés (pas des reçus, données de
  l'autre) ; à l'anonymisation, le texte devient « Message supprimé ».

## Code et tests

- Règles pures : `src/lib/messaging/rules.ts` (testées).
- Service : `src/lib/server/messaging/service.ts`.
- E2E : `e2e/linkmusician/messagerie.spec.ts` (mineur, demande, acceptation,
  réponse, réciprocité tracée sans XP, quota TL0).
