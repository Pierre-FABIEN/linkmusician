# Questions et points à trancher

Ce document rassemble les choix laissés à l'utilisateur pendant les lots
(demande du 10/11/2026 : « laisse les questions dans un doc pour plus
tard, continue d'avancer »). Pour chaque point, le code applique la
**valeur par défaut** indiquée, facile à changer. Une fois tranché, le
point passe en décision dans [docs/decisions](../decisions/README.md) et
sort de cette liste.

## Décisions de produit

| #   | Question                                                                                                                                                                                                                         | Par défaut, en attendant                                                                                                                                           | Où ça se change                                                               | Lot    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------ |
| Q1  | Quand un groupe fait **mixer ou masteriser** son morceau sans y jouer, ses musicien·nes gagnent-ils la collaboration (400 XP) sur leur piste ?                                                                                   | **Non** pour le mixage et le mastering ; **oui** pour l'enregistrement, la sonorisation d'une date et la production, où ils jouent ou co-créent                    | `MUSICIAN_EARNS` dans `progression/core/crafts.ts`                            | P4-06  |
| Q2  | Une collaboration avec un·e pro (session, production) compte-t-elle dans la **réputation** et le palier musicien (« Collaborateur·rice ») des musicien·nes ?                                                                     | **Oui** quand ils y gagnent (Q1), **non** sinon                                                                                                                    | `musicianSummary` (`core/summary.ts`)                                         | P4-06  |
| Q3  | **Vitrine des propositions** : gratuite pour les producteur·rices, ou incluse dans l'offre pro ?                                                                                                                                 | Rien de codé : le lot P4-08 vient après le lancement                                                                                                               | Fiche P4-08                                                                   | P4-08  |
| Q5  | Annonce d'un **concert** ou d'une **session rémunérée** : faut-il un type dédié (et un champ de rémunération) pour déclencher la bonne démarche ?                                                                                | Toute annonce de session affiche la fiche « Être payé·e pour jouer »                                                                                               | `src/lib/server/demarches/`                                                   | P3-15a |
| Q6  | Rangs des métiers du son : garder « Établi·e » pour l'ingé son comme pour le producteur, ou des noms propres à chaque métier ?                                                                                                   | « Établi·e » pour les deux (conception 02 §5)                                                                                                                      | `CRAFT_TIERS` (`core/tiers.ts`)                                               | P4-01  |
| Q7  | **Crédits du son** : confirmer un crédit de mixage ou de production ajouté à la main rapporte-t-il de l'XP ? Et une collaboration terminée qui crédite une personne dont le crédit attend encore sa réponse le confirme-t-elle ? | **Non** dans les deux cas : seule la collaboration rapporte ; un crédit en attente le reste (le consentement à la collaboration ne vaut pas pour les autres rôles) | `creditFromCollaboration`, `afterConfirm` (`src/lib/server/works/service.ts`) | P4-07  |
| Q8  | « **Crédits confirmés** » de la fiche de carrière : un rôle du son compte-t-il sur un morceau seulement _déclaré_ (composé seul·e) ?                                                                                             | **Oui** : il est confirmé des deux côtés ; un rôle d'écriture, lui, ne compte que sur un morceau corroboré                                                         | `publicSheetData` (`src/lib/server/career/sheet.ts`)                          | P4-07  |

## À vérifier hors code

| #   | Point                                                                                                   | En attendant                                                  | Lot    |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------ |
| V1  | Relecture des fiches `/demarches` par un·e professionnel·le (D42), exigée avant l'ouverture publique    | Les fiches affichent « relecture en cours »                   | P3-15a |
| V2  | Montant de l'adhésion à la Sacem et répartition par défaut des parts : non confirmés par les recherches | Les fiches renvoient à sacem.fr au lieu d'écrire des chiffres | P3-15a |

## À faire sur la machine

| #   | Point                                                                                       | Pourquoi                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Monter `memory=` dans `%UserProfile%\.wslconfig` (12 Go par exemple), puis `wsl --shutdown` | Avec 8 Go, le serveur de dev, le serveur e2e, VS Code et `npm run check` ensemble saturent la mémoire : Chromium plante (« Page crashed ») et les e2e échouent dès l'inscription (10/11) |

## Points techniques

| #   | Point                                                                                                                                                                                                                                   | En attendant                                                                                                        | Lot   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| T1  | Tests d'intégration (`PROGRESSION_INTEGRATION=1`) instables quand les 60 fichiers tournent ensemble sur Neon : un test différent échoue à chaque passe (délai de 5 s dépassé, données d'un autre fichier), et chacun passe seul (10/11) | Relancer seul le fichier en échec. À terme : `testTimeout` plus large ou `--no-file-parallelism` pour l'intégration | P0-01 |
