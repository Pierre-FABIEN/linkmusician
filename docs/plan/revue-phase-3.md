# Revue de fin de phase 3 (10/11/2026)

Bilan de la phase 3, fiches de la phase 4 relues et scénario de démo à
rejouer à la main. Aucune décision nouvelle n'a été prise : les choix
qui restent sont listés au §4.

## 1. Critères d'acceptation de la phase

Critères de [conception/05 §3](../conception/05-mvp-roadmap.md#3-roadmap).
Chacun est couvert par un test :

| Critère                                                                      | Où c'est vérifié                                                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Un concert corroboré par un seul membre du groupe reste `DECLARED`           | `milestones/rules.test.ts`, `proofs.integration.test.ts`, `e2e/linkmusician/etapes`                           |
| Une contestation retenue écrit une transaction liée et touche la confiance   | `milestones/disputes.integration.test.ts` (reprise par `reversesId`, avertissement et palier recalculé, D49)  |
| Un membre arrivé après une étape n'en reçoit pas la part                     | `milestones/tiers.integration.test.ts`                                                                        |
| Un compte supprimé laisse les collaborations des autres, « Compte supprimé » | `collaborations/anonymisation.integration.test.ts` (ajouté à cette revue) ; groupes et morceaux : leurs tests |
| E2E d'un groupe, de la formation au premier concert corroboré                | `e2e/linkmusician/etapes` (« une personne extérieure corrobore notre premier concert »)                       |
| E2E d'export RGPD                                                            | `e2e/auth/gdpr-data`, `e2e/admin/exports` ; chaque lot ajoute ses données à `exportPersonData`                |

**Écart** : le critère « rétrograde la confiance de l'attestant » est
appliqué selon D49. Une contestation retenue donne un **avertissement**
de 30 jours à qui a déclaré et à chaque personne qui a confirmé, puis le
palier de confiance est recalculé. Le palier n'est donc pas baissé
directement.

## 2. État des lots

- **Livrés** : P3-01 à P3-09, P3-11 à P3-14, P3-16a à P3-16c.
- **En cours** : P3-15a et P3-15b. Le code et les tests unitaires sont
  faits, mais l'e2e `demarches.spec.ts` n'a pas encore tourné : l'app
  restait bloquée au chargement, faute de mémoire sous WSL. Il reste
  aussi la relecture des fiches par un·e professionnel·le avant
  l'ouverture (D42).
- **Bloqué** : P3-17 attend que D47 soit acceptée.
- **Après les phases 4 et 5** : P3-10a (audit de sécurité) et P3-10
  (ouverture publique), comme prévu dans la feuille de route (§4 ter).

**Vérification à refaire dès que la machine le permet** :
`npm run check` est tué faute de mémoire (7 Go sous WSL). Il n'a pas
tourné depuis P3-16c. Les fichiers TypeScript passent `tsc`, mais les
composants Svelte des lots P3-15a et P3-15b ne sont pas vérifiés. La
solution est de monter `memory=` dans `.wslconfig`.

## 3. Barème

Aucune valeur du barème des musicien·nes n'a changé pendant la phase 3,
et `personas.test.ts` reste au vert. Les règles ajoutées (formation de
groupe, étapes avec 25 % aux membres présents, morceau composé à 150 XP
× rendement de la paire) n'ont pas encore de persona dédié : P4-01 les
ajoutera en calibrant les métiers du son, puisqu'un morceau enregistré
fait gagner musicien·nes et ingé son à la fois.

## 4. Fiches de la phase 4 relues

Les fiches ([phase-4-6.md](./phase-4-6.md)) restent valables. Elles
changent sur ce que la phase 3 a déjà posé :

| Lot   | Ajustement                                                                                                                                                                                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P4-06 | `CollabKind` contient déjà `RECORDING`, `PRODUCTION` et `SESSION_WORK` : il ne reste qu'à ajouter le mixage et le mastering. `WorkState` (`IDEA`, `COMPOSED`) gagne les états enregistré, mixé et produit                                |
| P4-07 | Le crédit confirmé des deux côtés existe déjà (`WorkContributor.confirmedAt`, P3-11). P4-07 l'étend aux rôles du son (`WorkRoleKind` : prise de son, mixage, mastering, production) et l'affiche sur le profil et la carte de réputation |
| P4-09 | « Une réservation honorée vérifie Première répétition » dépend de la réservation (P5-10), qui viendra après le lancement : ce point passe à P5-10. P4-09 garde la vérification de l'enregistrement, déjà annoncée par D53 (acte III)     |
| P4-10 | P3-13 est livré. L'acte III passe de « corroboré par une personne extérieure » à « vérifié par le studio » une fois P4-09 livré                                                                                                          |
| P4-08 | La décision « vitrine gratuite ou incluse dans l'offre pro » reste ouverte. Le lot vient après le lancement, la décision peut attendre                                                                                                   |
| P4-12 | Après le lancement (D8, polling au MVP)                                                                                                                                                                                                  |

Les lots du lancement (§4 ter) sont P4-01 à P4-07, P4-09, P4-10 et P4-13.
P4-08, P4-11 et P4-12 viennent après. Les treize lots entrent dans le
tableau §5.

## 5. Démo du parcours

Comptes : le tien et deux comptes de démo, chacun dans une fenêtre
privée (`npm run seed:demo`). Commence sur mobile (outils de
développement, 390 px).

| #   | Où                                      | Ce qu'on fait                                                             | Ce qu'on doit voir                                                       |
| --- | --------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | `/groupes/nouveau`                      | Créer un groupe, inviter Malik ; il accepte                               | Étape « Formation en ligne », XP aux deux, badge de rang                 |
| 2   | `/annonces/nouvelle`                    | « Publier au nom de » le groupe, cherche une bassiste                     | « Le groupe recrute » sur `/@handle` du groupe                           |
| 3   | `/morceaux/nouveau`                     | Créer un morceau avec Malik, rôle « basse » à pourvoir, « C'est composé » | Corroboré à la 2ᵉ confirmation, carte « démarche » (protéger le morceau) |
| 4   | `/morceaux/[id]/bulletin`               | Ouvrir le bulletin de partage, imprimer                                   | Qui a écrit quoi, parts laissées vides                                   |
| 5   | `/groupes/[handle]`                     | Déclarer le premier concert ; Malik confirme                              | L'étape reste « déclarée » (un membre ne corrobore pas)                  |
| 6   | `/etapes/[id]` (3ᵉ compte, hors groupe) | Attester avec un lien d'événement                                         | Étape corroborée, XP différentielle, notification                        |
| 7   | `/groupes/[handle]/programme`           | Ouvrir le programme des œuvres                                            | Le morceau composé, prêt à remettre à l'organisateur                     |
| 8   | `/@handle` du groupe (3ᵉ compte)        | Signaler l'étape, puis la retenir en modération                           | « En vérification », puis XP reprise et étape retirée                    |
| 9   | `/espace`, `/espace/carte`              | Choisir une ambition, ouvrir la carte                                     | Objectifs réordonnés, actes I à III, épreuve fêtée une fois              |
| 10  | `/espace/fiche`                         | Générer la carte souvenir                                                 | PNG sans XP ni confiance                                                 |
| 11  | `/messages/contacts`                    | Créer « Projet funk », ouvrir une discussion, inviter                     | Invitation « Rejoindre / Non merci », rien de visible avant              |
| 12  | `/demarches` (déconnecté)               | Lire une fiche                                                            | Date de vérification, sources, « relecture en cours »                    |

Chaque friction d'UX notée pendant la démo va dans la revue UX d'avant
le lancement (§4 ter), pas dans un lot de la phase 4.
