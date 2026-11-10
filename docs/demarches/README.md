# Guide des démarches (P3-15, D42)

Règles produit : [conception/09](../conception/09-demarches.md).

## Où est quoi

| Quoi                                 | Où                                                                    |
| ------------------------------------ | --------------------------------------------------------------------- |
| Catalogue (date, sources, relecture) | `src/lib/demarches/catalog.ts` (pur)                                  |
| Texte des fiches                     | `src/lib/demarches/fiches/*.md` (conventions de l'aide : `docs/aide`) |
| Déclencheurs « au bon moment »       | `src/lib/demarches/nudges.ts` (pur)                                   |
| Faits lus en base pour les écrans    | `src/lib/server/demarches/service.ts`                                 |
| Rendu Markdown                       | `src/lib/server/demarches/render.ts` (moteur de l'aide)               |
| Pages publiques                      | `/demarches`, `/demarches/[fiche]`                                    |
| Carte dans les écrans                | `DemarcheCard.svelte` : morceau, groupe (Parcours), annonce           |

## Règles

- **Une démarche à la fois** par écran, masquable (« J'ai compris »). Le
  masquage partage `persons.tipsDismissed` avec les conseils (P2-17), avec
  des identifiants préfixés `demarche-` : déjà couvert par l'export RGPD
  (`conseils_masques`).
- **Pas d'XP** : lire une fiche ne rapporte rien.
- **Fiabilité** (test `render.test.ts`) : chaque fiche a un « En bref », une
  section « Ce que ça coûte », au moins une source officielle en https et
  une date de vérification de moins d'un an. Le test échoue quand une
  fiche n'a pas été revérifiée depuis un an : c'est voulu.
- **Relecture métier** : `reviewedBy` reste `null` tant qu'une personne du
  métier n'a pas relu la fiche ; la page affiche alors « relecture par un·e
  professionnel·le en cours ». À remplir avant l'ouverture publique (P3-10).
- **Aucun logo**, ni « officiel », ni partenariat suggéré (testé).

## Documents préremplis (P3-15b)

- **Bulletin de partage** (équipe du morceau) : les crédits **confirmés**
  qui ont un rôle d'écriture (paroles, musique, arrangement), une colonne
  de parts par rôle présent, laissée vide ; état civil et signatures à la
  main ; interprètes listés à part, « pour mémoire ». Un crédit en attente
  n'y figure pas (la page le signale).
- **Programme des œuvres** (membres actifs du groupe) : les morceaux
  composés du groupe, avec paroles et musique confirmées, et des lignes
  vides pour les reprises.
- Rien n'est enregistré, rien ne rapporte d'XP. Pas de PDF généré côté
  serveur : « Imprimer ou enregistrer en PDF » passe par le navigateur
  (page sans la navigation de l'espace, styles `print:`).
- Groupe de routes `(document)` : même exigence de compte que `(app)`,
  sans la coquille.

## Ajouter ou revérifier une fiche

1. Écrire ou corriger `fiches/<slug>.md` : `# Titre` (identique au
   catalogue), `_accroche_`, `> **En bref**`, les étapes, `## Ce que ça coûte`.
2. Mettre à jour son entrée dans `catalog.ts` : `verifiedAt`, `sources`.
3. Un montant ou un seuil incertain renvoie au site officiel plutôt que
   d'être écrit de mémoire.

## Écarts avec la conception (P3-15a)

- Les métadonnées (date, sources) sont dans le catalogue TypeScript, pas
  dans l'en-tête Markdown : le test les vérifie sans analyseur.
- Pas de déclencheur « annonce de concert » ni « session rémunérée » : ces
  notions n'existent pas dans les annonces. Toute annonce **session**
  affiche « Être payé·e pour jouer ».
- « Première démo » s'annonce dès l'étape « Premier enregistrement »
  (avant de publier), et reste après « Première démo publique ».
