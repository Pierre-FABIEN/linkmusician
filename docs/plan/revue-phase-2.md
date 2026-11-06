# Revue de fin de phase 2 (06/11/2026)

Bilan court de la phase 2 et scénario de démo à rejouer à la main. Les
décisions prises pendant la revue sont **D35** (morceau minimal) et
**D36** (palier « En réseau » ouvert aux jams appréciées).

## 1. Critères d'acceptation de la phase

Critères de [conception/05 §3](../conception/05-mvp-roadmap.md#3-roadmap),
chacun couvert par un test :

| Critère                                                  | Où c'est vérifié                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| « Guitariste à moins de 20 km » : zone floutée, tranches | Intégration PostGIS `src/lib/server/search`, `e2e/linkmusician/recherche` |
| 2ᵉ collaboration à 50 %, 4ᵉ à 0                          | `progression/core/core.test.ts` (400, 200, 100, 0)                        |
| Un TL0 : 10 premiers messages par jour, 429 au 11ᵉ       | `e2e/linkmusician/messagerie` (« quota TL0 »)                             |
| Pas d'appréciation sans collaboration confirmée commune  | `collaborations/endorse.test.ts`, `endorse.integration.test.ts`           |
| Un compte bloqué ne peut ni écrire ni voir le profil     | `e2e/linkmusician/blocage`                                                |
| E2E annonce → candidature → collaboration → XP des deux  | `e2e/linkmusician/candidatures`                                           |
| Test k6 de la recherche                                  | `k6/search.js` (p95 438 ms, P2-01)                                        |

## 2. Calibrage du barème

Détail dans [conception/02 §2.3](../conception/02-progression.md#23-calibrer-le-barème).
Aucune valeur ne change. Ce qu'il faut retenir :

- qui joue atteint le **niveau 5 en 1 à 3 mois** (3 semaines pour un
  lead, 10 pour une élève qui fait une jam par semaine) ;
- « **Collaborateur** » arrive en 7 à 11 semaines dès qu'on collabore
  vraiment, jamais avec des jams seules (voulu : D27) ;
- une habituée des jams restait « Premiers pas » pour toujours : elle
  passe désormais « En réseau » dès sa première jam appréciée (D36) ;
- un même cercle d'habitué·es plafonne au niveau 5 (70 XP par personne et
  par an). La suite vient des rencontres, des collaborations et de la
  carte de carrière (P3-13).

## 3. Démo du parcours

Comptes : le tien, et un compte de démo dans une fenêtre privée
(`npm run seed:demo`, par exemple `malik-batterie@demo.linkmusician.test`,
mot de passe `SEED_DEMO_PASSWORD` ou `DemoPass!2026`). Sur mobile
d'abord (outils de développement, 390 px).

| #   | Où                         | Ce qu'on fait                                                            | Ce qu'on doit voir                                                    |
| --- | -------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 1   | `/jouer`                   | Choisir le mode jam, puis revenir au menu                                | « Reprendre » sur le dernier mode, onglets du mode                    |
| 2   | `/decouvrir`               | Batterie, rock, 25 km                                                    | Distances en tranches, réseau en tête, un conseil en contexte         |
| 3   | `/espace` (Mon parcours)   | Lire « Des musicien·nes pour toi »                                       | Raisons lisibles (« Rock en commun · batterie »), « Pas intéressé·e » |
| 4   | `/annonces/nouvelle`       | Publier une annonce de recrutement                                       | Conditions affichées, l'annonce dans la liste de Malik                |
| 5   | Fenêtre de Malik           | Postuler ; toi, accepter                                                 | Conversation ouverte, +30 XP des deux côtés à la première réponse     |
| 6   | Conversation               | Proposer une collaboration ; Malik confirme                              | Célébration du gain, « À confirmer » vidé, notification               |
| 7   | Conversation               | Laisser une appréciation                                                 | « Apprécié·e par 1 » sur l'instrument du profil de Malik              |
| 8   | `/lieux`, `/jams/nouvelle` | Lancer une jam ce soir dans un lieu vérifié, inviter Malik sur une place | Invitation reçue, matériel du lieu, « Apporte… »                      |
| 9   | `/jams/[id]`               | Après la jam : « J'y étais », « Qui était là ? », appréciation           | XP de l'appréciation, succès fun, « Rejouer ensemble »                |
| 10  | `/jam/carnet`              | « Garder le contact »                                                    | Malik dans le réseau, en tête de la recherche                         |
| 11  | `/reglages`                | Notifications par type, email par sujet, blocage                         | Le blocage masque le profil des deux côtés                            |
| 12  | `/@handle` (déconnecté)    | Ouvrir le profil public                                                  | Réputation sans XP ni confiance, niveau en petite pastille (D1)       |

Ce qu'on note pendant la démo : chaque friction d'UX (un mot flou, un
bouton difficile à trouver, une attente) va dans la revue UX d'avant le
lancement (feuille de route §4 ter), pas dans un lot de la phase 3.
