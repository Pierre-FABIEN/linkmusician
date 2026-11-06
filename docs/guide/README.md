# Conseils en contexte (P2-17)

Sur chaque écran clé, un conseil court explique comment jouer le jeu
(conception 07 §7.1) : créer du lien, apprécier les gens avec qui l'on a
joué, trouver des musicien·nes pour un projet.

- **Catalogue pur** : `src/lib/guide/tips.ts` (`TIPS`), un conseil = écran,
  condition facultative, texte, lien facultatif. Dans l'ordre de priorité
  de l'écran : les conseils conditionnels d'abord, le conseil général en
  dernier. Testé : chaque écran clé a un conseil sans condition, aucun
  conseil sur un écran guidé, ton d'encouragement, textes courts.
- **Écrans clés** (`KEY_SCREENS`) : Découvrir, Annonces, Messages, une
  conversation, Mon profil, le carnet de jams. **Jamais** sur Mon parcours
  ni sur le mode jam, déjà guidés par « Ta prochaine étape »
  (`GUIDED_SCREENS`).
- **Un seul à la fois** : le premier conseil de l'écran dont la condition
  tient et que la personne n'a pas masqué (`tipFor`).
- **Conditions** (`tipContext`, `src/lib/server/guide/service.ts`) : avec
  combien de personnes elle a joué (jams « J'y étais », collaborations
  confirmées), appréciations laissées, réseau musical, médias publiés,
  annonces publiées. Un écran sans conseil conditionnel (Messages,
  conversation, rechargés par polling) ne lit rien en base.
- **« J'ai compris »** (`TipCard.svelte`, `POST /api/guide/tips`) : le
  conseil disparaît aussitôt, son identifiant rejoint
  `persons.tipsDismissed`, il ne revient pas ; le suivant de l'écran prend
  sa place.
- **Ajouter un conseil** : une entrée dans `TIPS` (identifiant stable : il
  est mémorisé), placée avant le conseil général de l'écran. Pas de
  migration.
- **RGPD** : conseils masqués dans l'export, vidés à l'anonymisation.
