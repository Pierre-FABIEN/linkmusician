# Centre d'aide — contenu des pages de l'app

> Le centre d'aide de LinkMusician (`/aide`), rédigé et mis en ligne le
> 07/11/2026 (état de l'app après P3-04). Les pages s'adressent aux
> **utilisateur·rices** (tutoiement, comme dans l'app).

## Comment c'est fait

- **Contenu** : un fichier Markdown par page dans `src/lib/aide/pages/`,
  seule source du texte. Modifier une page, c'est modifier son fichier.
- **Catalogue** : `src/lib/aide/catalog.ts` (ordre, adresse, titre court,
  résumé, icône). Ajouter une page : un fichier et une entrée.
- **Rendu** : `src/lib/server/aide/render.ts` (`marked`, côté serveur, mis
  en cache) : en-tête, encarts, ancres, liens entre pages réécrits,
  tableaux défilants sur mobile. Testé (`render.test.ts`) : chaque lien
  interne mène à une page et une ancre qui existent.
- **Pages** : `src/routes/aide` (accueil) et `src/routes/aide/[page]`,
  composant `HelpArticle.svelte`. Publiques et indexées (sitemap) ; une
  personne connectée garde la navigation de son espace.
- **Ancres** : la page défile dans `smooth-scrollbar` (boilerplate), qui
  ignore les ancres du navigateur ; `HelpArticle` fait défiler lui-même et
  place le focus sur le titre visé.
- **E2E** : `e2e/linkmusician/aide.spec.ts`.

## Les pages

| Page de l'app         | Fichier                                                                             | Pour qui, pour quoi                                                                       |
| --------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/aide`               | [00-accueil.md](../../src/lib/aide/pages/00-accueil.md)                             | La porte d'entrée : LinkMusician en 30 secondes, les deux modes, les questions fréquentes |
| `/aide/premiers-pas`  | [01-premiers-pas.md](../../src/lib/aide/pages/01-premiers-pas.md)                   | Créer son compte, remplir son profil, choisir son mode                                    |
| `/aide/mode-jam`      | [02-mode-jam.md](../../src/lib/aide/pages/02-mode-jam.md)                           | Jouer pour le plaisir : se mettre dispo, trouver une jam, l'après-jam, le carnet          |
| `/aide/mode-carriere` | [03-mode-carriere.md](../../src/lib/aide/pages/03-mode-carriere.md)                 | Monter un projet : tableau de bord, quêtes, collaborations, groupes, morceaux, étapes     |
| `/aide/points`        | [04-points-et-progression.md](../../src/lib/aide/pages/04-points-et-progression.md) | Ce qui rapporte (et ce qui ne rapporte rien), niveaux, paliers, succès, confiance         |
| `/aide/rencontrer`    | [05-rencontrer.md](../../src/lib/aide/pages/05-rencontrer.md)                       | Découvrir, annonces, candidatures, messages, réseau musical                               |
| `/aide/securite`      | [06-securite.md](../../src/lib/aide/pages/06-securite.md)                           | Lieux sûrs, mineur·es, bloquer, signaler, tes données                                     |

Les fiches administratives (protéger un morceau, être payé·e pour un
concert…) ont leur propre section `/demarches` (lot P3-15, conception 09) :
les pages d'aide y renvoient.

## Mise en page

Chaque page suit le même gabarit, pensé pour le mobile d'abord :

1. **En-tête** : titre, une phrase d'accroche, icône du thème.
2. **Encart « En bref »** : 3 à 4 puces, ce qu'il faut retenir si on ne
   lit rien d'autre.
3. **Sections numérotées** : une par moment du parcours, avec des étapes
   courtes (1, 2, 3…), le nom exact des boutons en **gras**.
4. **Encarts**, notés ainsi dans les fichiers :
   - `> 💡 Astuce` : un conseil pour mieux jouer le jeu ;
   - `> ⚠️ Important` : une règle de sécurité ou une limite ;
   - `> 🔜 Bientôt` : une fonction prévue mais pas encore là. Une phrase,
     jamais de date promise.
5. **Tableaux** pour les comparaisons et les barèmes (sur mobile : une
   carte par ligne).
6. **Questions fréquentes** en bas, en accordéon (`<details>`).
7. **Pied de page** : « Page suivante », et les liens vers les pages
   liées.

Repères visuels : les mêmes icônes que l'app (Lucide), aucune capture
d'écran (elles vieillissent vite). Sur ordinateur, la liste des pages est
à gauche ; sur mobile, l'accueil de l'aide les présente en cartes.

## Où l'aide apparaît dans l'app

- Un lien **« Aide »** dans le menu du compte et en pied de page.
- **« Comment ça marche ? »** sous le choix du mode (`/jouer`), vers
  `/aide/mode-jam` et `/aide/mode-carriere`.
- À venir : les conseils en contexte (P2-17) pourront pointer vers la
  section exacte (`/aide/mode-jam#apres-la-jam`).
- Pages publiques (lisibles sans compte), indexées : elles expliquent
  aussi l'app aux personnes qui hésitent à s'inscrire.

## Tenir l'aide à jour

- Une page d'aide change **dans le même commit** que la fonction qu'elle
  décrit (comme `docs/conception/`). À ajouter à la « Définition de
  terminé » de chaque lot qui change un parcours. Un encart « Bientôt » disparaît
  quand la fonction arrive.
- Les noms de boutons et d'écrans sont ceux de l'app : si un libellé
  change dans le code, il change ici.
- Les chiffres (points, quotas) viennent du barème (`progression/core`) :
  à revérifier à chaque calibrage.
