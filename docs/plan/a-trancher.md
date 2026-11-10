# Questions et points à trancher

Ce document rassemble les choix laissés à l'utilisateur pendant les lots
(demande du 10/11/2026 : « laisse les questions dans un doc pour plus
tard, continue d'avancer »). Pour chaque point, le code applique la
**valeur par défaut** indiquée, facile à changer. Une fois tranché, le
point passe en décision dans [docs/decisions](../decisions/README.md) et
sort de cette liste.

## Décisions de produit

| #   | Question                                                                                                                                                     | Par défaut, en attendant                                                                                                                        | Où ça se change                                    | Lot    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------ |
| Q1  | Quand un groupe fait **mixer ou masteriser** son morceau sans y jouer, ses musicien·nes gagnent-ils la collaboration (400 XP) sur leur piste ?               | **Non** pour le mixage et le mastering ; **oui** pour l'enregistrement, la sonorisation d'une date et la production, où ils jouent ou co-créent | `MUSICIAN_EARNS` dans `progression/core/crafts.ts` | P4-06  |
| Q2  | Une collaboration avec un·e pro (session, production) compte-t-elle dans la **réputation** et le palier musicien (« Collaborateur·rice ») des musicien·nes ? | **Oui** quand ils y gagnent (Q1), **non** sinon                                                                                                 | `musicianSummary` (`core/summary.ts`)              | P4-06  |
| Q3  | **Vitrine des propositions** : gratuite pour les producteur·rices, ou incluse dans l'offre pro ?                                                             | Rien de codé : le lot P4-08 vient après le lancement                                                                                            | Fiche P4-08                                        | P4-08  |
| Q4  | **D47** (assistant IA d'inscription) : accepter la proposition ?                                                                                             | P3-17 reste bloqué                                                                                                                              | [docs/decisions](../decisions/README.md)           | P3-17  |
| Q5  | Annonce d'un **concert** ou d'une **session rémunérée** : faut-il un type dédié (et un champ de rémunération) pour déclencher la bonne démarche ?            | Toute annonce de session affiche la fiche « Être payé·e pour jouer »                                                                            | `src/lib/server/demarches/`                        | P3-15a |
| Q6  | Rangs des métiers du son : garder « Établi·e » pour l'ingé son comme pour le producteur, ou des noms propres à chaque métier ?                               | « Établi·e » pour les deux (conception 02 §5)                                                                                                   | `CRAFT_TIERS` (`core/tiers.ts`)                    | P4-01  |

## À vérifier hors code

| #   | Point                                                                                                   | En attendant                                                  | Lot    |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------ |
| V1  | Relecture des fiches `/demarches` par un·e professionnel·le (D42), exigée avant l'ouverture publique    | Les fiches affichent « relecture en cours »                   | P3-15a |
| V2  | Montant de l'adhésion à la Sacem et répartition par défaut des parts : non confirmés par les recherches | Les fiches renvoient à sacem.fr au lieu d'écrire des chiffres | P3-15a |

## À faire sur la machine

| #   | Point                                                                                                                                                           | Pourquoi                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| M1  | Monter `memory=` dans `%UserProfile%\.wslconfig` (12 Go par exemple), puis `wsl --shutdown`                                                                     | `npm run check` est tué faute de mémoire (7 Go), non relancé depuis P3-16c                             |
| M2  | Lancer les e2e écrits mais pas encore passés, `npm run dev` arrêté : `demarches`, `inge-son`, `producteur`, `annonces-metier`, `collaborations-morceau` (P4-06) | Les lots P3-15a, P3-15b, P4-02a, P4-02b, P4-04, P4-05 et P4-06 restent 🟡 tant qu'ils n'ont pas tourné |
