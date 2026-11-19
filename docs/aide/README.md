# Centre d'aide — contenu des pages de l'app

> Le centre d'aide de LinkMusician (`/aide`), mis à jour le 19/11/2026.
> Relecture des parcours disponibles : inscription adaptative, fiches métier,
> recherche et visibilité, jams, projets et besoins, progression non linéaire,
> concerts solo ou en groupe et confidentialité.
> Les pages s'adressent aux **utilisateur·rices** (tutoiement, comme dans l'app).

## Navigation et croissance du centre d’aide

L’accueil `/aide` propose une recherche dans le texte intégral (y compris les
questions fréquentes), des filtres par thème et des liens vers les sujets.
Les recherches ignorent la casse et les accents ; tous les mots saisis doivent
être présents. Un état vide permet de réinitialiser recherche et filtres.

Chaque section `##` d’un guide devient automatiquement une réponse accessible
à `/aide/<page>/<ancre>`. Son titre et son extrait viennent du Markdown ;
`src/lib/server/aide/directory.ts` construit le répertoire côté serveur.
La réponse affiche un retour au guide complet. Les adresses historiques et
leurs ancres restent disponibles. L’introduction et les explications générales
restent consultables dans un panneau repliable sur l’accueil.

Pour enrichir l’aide, ajouter une section avec une ancre stable dans le guide
concerné, ou un fichier et une entrée dans le catalogue pour un nouveau thème.
Préférer un sujet précis par section, formulé à partir d’un besoin utilisateur.
La recherche et les liens vers les réponses sont mis à jour automatiquement.

## Comment c'est fait

- **Contenu** : un fichier Markdown par page dans `src/lib/aide/pages/`,
  seule source du texte. Modifier une page, c'est modifier son fichier.
- **Catalogue** : `src/lib/aide/catalog.ts` (ordre, adresse, titre court,
  résumé, icône). Ajouter une page : un fichier et une entrée.
- **Rendu** : `src/lib/server/aide/render.ts` (`marked`, côté serveur, mis
  en cache) : en-tête, encarts, ancres, liens entre pages réécrits,
  tableaux défilants horizontalement sur mobile. Testé
  (`render.test.ts`) : chaque lien interne mène à une page et une ancre
  qui existent.
- **Pages** : `src/routes/aide` (accueil) et `src/routes/aide/[page]`,
  composant `HelpArticle.svelte`. Publiques et indexées (sitemap) ; une
  personne connectée garde la navigation de son espace.
- **Ancres** : la page défile dans `smooth-scrollbar` (boilerplate), qui
  ignore les ancres du navigateur ; `HelpArticle` fait défiler lui-même et
  place le focus sur le titre visé.
- **E2E** : `e2e/linkmusician/aide.spec.ts`.

## Couverture des fonctionnalités

L’[inventaire des écrans et des fonctions](./couverture.md) relie les
parcours disponibles à leurs explications dans `/aide`, avec les limites
et les fonctions encore à venir. Le mettre à jour si un écran ou une
action est ajouté.

## Les pages

| Page de l'app         | Fichier                                                                             | Pour qui, pour quoi                                                                       |
| --------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/aide`               | [00-accueil.md](../../src/lib/aide/pages/00-accueil.md)                             | La porte d'entrée : LinkMusician en 30 secondes, les deux modes, les questions fréquentes |
| `/aide/premiers-pas`  | [01-premiers-pas.md](../../src/lib/aide/pages/01-premiers-pas.md)                   | Créer son compte, remplir son profil, choisir son mode                                    |
| `/aide/mode-jam`      | [02-mode-jam.md](../../src/lib/aide/pages/02-mode-jam.md)                           | Jouer pour le plaisir : se mettre dispo, trouver une jam, l'après-jam, le carnet          |
| `/aide/mode-carriere` | [03-mode-carriere.md](../../src/lib/aide/pages/03-mode-carriere.md)                 | Projets, équipe, besoins, contributions, carte par branches et concerts solo/groupe       |
| `/aide/points`        | [04-points-et-progression.md](../../src/lib/aide/pages/04-points-et-progression.md) | Ce qui rapporte (et ce qui ne rapporte rien), niveaux, paliers, succès, confiance         |
| `/aide/rencontrer`    | [05-rencontrer.md](../../src/lib/aide/pages/05-rencontrer.md)                       | Découvrir, annonces, candidatures, messages, réseau musical                               |
| `/aide/securite`      | [06-securite.md](../../src/lib/aide/pages/06-securite.md)                           | Lieux sûrs, mineur·es, bloquer, signaler, tes données                                     |

Les fiches administratives (protéger un morceau, être payé·e pour un
concert…) ont leur propre section `/demarches` (lot P3-15, conception 09) :
les pages d'aide y renvoient.

## Mise en page

Le gabarit recommandé est pensé pour le mobile d'abord ; les pages
existantes ne suivent pas toutes encore chaque convention :

1. **En-tête** : titre, une phrase d'accroche, icône du thème.
2. **Encart « En bref »** : généralement 3 à 4 puces, ce qu'il faut retenir si on ne
   lit rien d'autre.
3. **Sections** : une par moment du parcours, souvent numérotée, avec des étapes
   courtes (1, 2, 3…), le nom exact des boutons en **gras**.
4. **Encarts**, notés ainsi dans les fichiers :
   - `> 💡 Astuce` : un conseil pour mieux jouer le jeu ;
   - `> ⚠️ Important` : une règle de sécurité ou une limite ;
   - `> 🔜 Bientôt` : une fonction prévue mais pas encore là. Une phrase,
     jamais de date promise.
5. **Tableaux** pour les comparaisons et les barèmes (sur mobile :
   défilement horizontal).
6. **Questions fréquentes** en bas, en accordéon (`<details>`).
7. **Navigation de page** : liens précédent/suivant selon l'ordre du
   catalogue ; elle est générée par `HelpArticle`, pas définie dans le
   Markdown.

Repères visuels : les mêmes icônes que l'app (Lucide), aucune capture
d'écran (elles vieillissent vite). Sur ordinateur, la liste des pages est
à gauche ; sur mobile, l'accueil de l'aide les présente en cartes.

## Où l'aide apparaît dans l'app

- Un lien **« Aide »** dans le menu du compte et en pied de page.
- **« Comment ça marche ? »** sous le choix du mode (`/jouer`), vers
  `/aide/mode-jam` et `/aide/mode-carriere`.
- Les conseils en contexte (P2-17) sont actifs sur les écrans clés. Leurs
  liens mènent actuellement aux écrans de l'app ; ils ne pointent pas
  encore vers des sections précises de l'aide.
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

## Repères de relecture

- L'accueil oriente par besoin et explique les mots de l'app. Chaque parcours
  précise où aller, quoi renseigner ou confirmer, et le résultat attendu.
- L'inscription distingue les métiers ouverts et « bientôt », les spécialités,
  offres et besoins, les champs obligatoires et facultatifs, puis la reprise
  et le récapitulatif. Les fiches détaillées complètent les pages métier.
- La complétude par métier (`actors/completeness.ts`) est distincte du profil
  complet qui déclenche les points de musicien·ne.
- Les conditions de présence dans une recherche viennent de
  `server/search/musicians.ts` : offre pour un prestataire, visibilité du bloc
  et sollicitations, en plus du profil public et des blocages.
- Barème et quotas relus dans `server/progression/core/bareme.ts` et
  `trust.ts` : quatre niveaux de confiance, valeurs de base et multiplicateurs
  explicités ; ne pas présenter une valeur maximale comme un gain garanti.
- Les fonctions disponibles (tournée, manager, booker) sont distinguées des
  actes de carte encore à venir. Une fonctionnalité disponible ailleurs
  n'implique pas que son acte soit déjà jouable sur la carte.

Pour les prochaines mises à jour : vérifier les libellés dans les écrans,
les règles dans le code métier, puis lancer au minimum le test de rendu
`src/lib/server/aide/render.test.ts` (fichiers, structure, liens et ancres).

## Mise à jour du 19 novembre 2026

Après la [recette des derniers lots](../plan/recette-2026-11-19.md), l'aide
reprend les parcours réellement disponibles : accueil à quatre volets, carte
à six branches indépendantes, choix des suggestions, création de projet sans
groupe, partage explicite des morceaux, invitations et coordination, besoins,
contributions et concerts joués en son nom ou avec un groupe.

Les sujets projets, besoins, contributions et concerts sont des sections `##`
et deviennent des réponses recherchables séparément. Les ancres existantes
sont conservées. Les limites sont explicites : tâches/livrables, candidature
solo aux plateaux et épreuve personnelle Studio restent à venir.

Validation : **12 tests de rendu et de répertoire réussis**, puis **3 E2E
réussis** sur PostgreSQL local avec `--retries=0` (`aide.spec.ts`) : lecture
publique, sommaire, recherche et réponse sur mobile, navigation connectée et
accessibilité. Prettier sur les fichiers modifiés et ESLint du catalogue conformes.
