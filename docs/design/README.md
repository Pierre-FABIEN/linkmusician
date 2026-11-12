# Direction visuelle Metro : la généraliser à toute l'app

> Décision **D55** (11/11/2026) : l'interface de LinkMusician adopte le
> style **Metro** des maquettes `/_lab/metro`, sur **toutes** les pages de
> l'espace connecté et des pages publiques de LinkMusician. Ce document dit
> pourquoi, ce qui existe déjà, les règles à respecter, la correspondance
> entre l'ancien et le nouveau, ce qui manque avant de migrer, la méthode
> page par page et l'ordre des lots.
>
> À lire avant de toucher l'apparence d'un écran. Les maquettes restent la
> référence visuelle ; ce document est la référence des **règles**.

## Sommaire

1. [En bref](#1-en-bref)
2. [Pourquoi Metro](#2-pourquoi-metro)
3. [Ce qui existe déjà](#3-ce-qui-existe-déjà)
4. [Les règles du style](#4-les-règles-du-style)
5. [Metro et les pages-menus (D50)](#5-metro-et-les-pages-menus-d50)
6. [Correspondance : de l'ancien au Metro](#6-correspondance--de-lancien-au-metro)
7. [Ce qui manque avant de migrer (le socle)](#7-ce-qui-manque-avant-de-migrer-le-socle)
8. [Migrer une page : la méthode](#8-migrer-une-page--la-méthode)
9. [L'ordre de la migration (lots MET)](#9-lordre-de-la-migration-lots-met)
10. [Pièges connus](#10-pièges-connus)
11. [Points à trancher](#11-points-à-trancher)
12. [Références](#12-références)

---

## 1. En bref

- **Où on va** : une seule langue visuelle partout. Des titres
  monumentaux et légers (Raleway), des **tuiles** franches, une couleur
  par **sens** (pas par page), des accueils en **panorama** de pivots, un
  mouvement qui signifie quelque chose et se coupe sur demande.
- **Où on en est** (MET-01 fait, 11/11/2026) : la coquille (`AppShell`)
  pose `.lm-metro` sur toute l'app ; en-tête, fil d'Ariane, en-têtes
  d'écran, menus, rangs, célébrations et toasts sont en Metro ; les
  composants du §7.2 existent. Une migration mécanique a converti les
  motifs répétés de toutes les pages de l'espace (titres en `lm-title`,
  cartes en tuiles de page `lm-tile--flow`, boutons en `lm-btn`, champs
  en `lm-field`, plus de grand cadre ni de couleur en dur hors des
  accueils). Les **accueils** `/jouer`, `/jam` et `/espace` sont en
  panorama de tuiles sur l'Aurora (MET-02, fait). Les pages hors coquille
  (visiteur de l'aide, d'un profil ou d'une démarche, premiers pas,
  modération, erreurs, compte) passent par `MetroPage` (MET-07, fait).
  Une passe commune (MET-03 à MET-06, en cours) a aussi converti les
  encarts, petits boutons bordés, alertes (`lm-alert`) et pastilles.
  Restent, écran par écran, les migrations fines de ces lots : vraies
  `Tile` d'un seul geste, `EventTile` et `ProfileTile` pour les cartes de
  résultat, `MetroSheet` à la place des dialogues, `MetroChoice` pour les
  choix courts, tons des pastilles d'état.
- **Comment on migre** : d'abord un **socle** (la coquille passe en
  Metro, les composants manquants sont écrits, le CSS est rangé), puis les
  écrans **par parcours**, un lot à la fois, avec la même liste de
  contrôle pour chaque page (§8).
- **Ce qu'on ne change pas** : le parcours, les textes, les données, les
  décisions de navigation (D50 menus, D52 fil d'Ariane), l'accessibilité
  (elle doit s'améliorer, jamais régresser). Metro change **la forme**,
  pas le fond.
- **Ce qui reste hors champ** : les modules du boilerplate en veille
  (boutique, blog, administration, D6). Les pages d'authentification sont
  traitées à part (§11, Q40).

## 2. Pourquoi Metro

- **Lisible au premier regard, surtout sur téléphone** : un titre énorme
  dit où l'on est, une tuile dit une chose, sa couleur dit de quoi il
  s'agit. C'est la promesse « des écrans à l'essentiel » et « une app
  agréable et simple » qui joue le lancement.
- **Cohérent avec nos menus** : D50 a choisi des pages-menus « façon
  Paramètres de Windows ». Metro est la langue visuelle d'origine de ces
  menus : une page d'entrée devient un **menu de tuiles** (§5).
- **De l'énergie, pour une app de musique** : couleurs vives, verre,
  mouvement au survol, petites animations (la croche qui groove, le
  trophée qui saute). Sans tomber dans le gadget : chaque mouvement
  confirme une action ou attire vers la prochaine étape.
- **Un système, pas des pages faites main** : aujourd'hui, 118 fichiers
  de l'espace répètent à la main des cartes (`rounded-2xl border bg-card`
  dans 43 fichiers, `rounded-3xl` dans 23), des titres (`text-3xl
font-black` dans 52) et des boutons (`rounded-full bg-primary` dans
  25), avec des couleurs en dur (`fuchsia-*` dans 24 fichiers, `violet-*`
  dans 19). Metro remplace cela par quelques classes et composants.

## 3. Ce qui existe déjà

### 3.1 Les maquettes (la référence visuelle)

| Maquette               | Ce qu'elle montre                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/_lab/metro`          | Le panorama (pivots « jouer », « jam », « actualité », « progrès ») et les **fondations** : typographie, tons, boutons, champ, panneau  |
| `/_lab/metro/jam`      | Le tableau du mode Jam : héros « prochaine jam », dispos, profil, appel à l'action, appréciations, événement, calendrier, carnet        |
| `/_lab/metro/carriere` | Le tableau du mode Carrière : héros, carte des actes, prochaine étape, campagne, équipe, agenda, journal                                |
| `/_lab/metro/texte`    | Le catalogue des **tuiles par usage** : annonce, recherche, progression, statistique, notification, témoignage, état vide, confirmation |

Données fictives (`src/routes/_lab/data.ts`). Le laboratoire est hors
plan : il ne fait avancer aucun lot par lui-même.

### 3.2 Le CSS : `src/lib/linkmusician/metro.css` et `metro/`

`metro.css` n'est plus qu'un index (MET-01) qui importe, **dans l'ordre de
la cascade**, `metro/base.css` (jetons, typographie), `metro/boards.css`
(tableaux des maquettes, tuiles composées), `metro/tiles.css` (tuile, tons,
cadre, verre, mosaïque, raccourcis), `metro/motion.css` (icônes animées),
`metro/controls.css` (pastille, barre, rail, boutons, champs, panneau,
mouvement, contraste forcé) et `metro/app.css` (coquille et composants de
l'app). Ne pas changer cet ordre sans relire les règles de même
spécificité. Importé par `theme.css`, lui-même importé par la coquille
(`AppShell`). **Opt-in** : rien ne s'applique hors d'un ancêtre
`.lm-metro`, que la coquille pose désormais partout.

| Section (dans l'ordre de la cascade) | Contenu                                                                                                                                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jetons                               | Polices, encre et papier, ombres, verre, et **réécriture des jetons shadcn** (`--background`, `--card`, `--muted`…) : les composants shadcn posés dans une page Metro prennent la même matière |
| Typographie                          | `lm-display`, `lm-title`, `lm-figure` (`--md`), `lm-kicker`                                                                                                                                    |
| Tableaux des maquettes               | `lm-pattern-*`, `lm-jam-*`, `lm-career-*` : **propres aux maquettes** (voir §7.3)                                                                                                              |
| Tuile                                | `lm-tile`, ses neuf tons (`data-tone`), reflet, liseré animé                                                                                                                                   |
| Tuile encadrée                       | `lm-tile-frame` : le cadre porte l'ombre et le mouvement (règle de performance, §4.8)                                                                                                          |
| Verre clair                          | La tuile encadrée en mode clair                                                                                                                                                                |
| Mosaïque et tailles                  | `lm-mosaic` (4 colonnes, `--lm-unit`), `data-size` : `sm`, `md`, `wide`, `band`, `tall`, `big`                                                                                                 |
| Icône animée                         | `Tile fx` : `notes`, `trophy`, `shout`, `target`, `rocket`, `cheers`                                                                                                                           |
| Pastille, barre                      | `lm-pill`, `lm-bar`                                                                                                                                                                            |
| Rail panoramique                     | `lm-panorama`, `lm-rail`, `lm-pivot`                                                                                                                                                           |
| Boutons et champs                    | `lm-btn` (plein, `data-variant="ghost"`), `lm-field`                                                                                                                                           |
| Raccourcis                           | `lm-actions`, `lm-action`, `lm-action__count`                                                                                                                                                  |
| Panneau contextuel                   | `lm-sheet` : `<dialog>` natif, feuille en bas sur mobile, centré sur grand écran                                                                                                               |
| Survol, mouvement                    | Survol des tuiles ; tout se coupe sous `prefers-reduced-motion` ; mode `forced-colors`                                                                                                         |

Contrastes mesurés et notés en tête du fichier (texte sur chaque ton ≥
5,1:1).

`metro/app.css` ajoute pour l'app :

| Classe                          | Rôle                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--tone-*`                      | Une couleur par ton, en variable (pastilles, pastille du mode, Aurora)                                                             |
| `lm-tile lm-tile--flow`         | **Tuile de page** : la matière d'une tuile, mais la mise en page des utilitaires (`p-4`, `space-y-3`, `grid`) ; rien n'est découpé |
| `data-tone` hors tuile          | Pose `--p`, que lisent `lm-pill`, `lm-chip` (puce d'icône), `lm-note` (encart teinté), `lm-fill` (aplat) et `lm-tone-icon`         |
| `lm-mode-pill`, `lm-crumb`      | Pastille du mode, fil d'Ariane                                                                                                     |
| `lm-list`, `lm-list__row`       | Liste en tuile (`MenuList`, `MetroList`)                                                                                           |
| `lm-menu`                       | Menu de tuiles (`MetroMenu`)                                                                                                       |
| `lm-choice`, `lm-sheet__*`      | Boutons bascules (`MetroChoice`), en-tête du panneau (`MetroSheet`)                                                                |
| `lm-title--sm`, `lm-pill--lg`   | Titre d'écran réduit, pastille plus grande (rangs)                                                                                 |
| `lm-btn[data-variant='danger']` | Action destructrice                                                                                                                |

Deux règles générales : une tuile qui n'est ni un lien ni un bouton ne
bouge plus au survol dans l'app (§4.3), et un `lm-field` garde la largeur
que la page lui donne (`w-full`, `w-40`).

### 3.3 Les composants : `src/lib/components/linkmusician/metro/`

| Composant                                                                                            | Rôle                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tile`                                                                                               | **La** carte : lien (`href`), bouton (`onclick`) ou bloc. Props `tone`, `size`, `icon` (filigrane), `fx` (icône animée), `framed`, `index` (rang d'apparition) |
| `TileFrame`                                                                                          | Cadre d'une tuile encadrée (ombre, survol sans repeinte)                                                                                                       |
| `Panorama`                                                                                           | Rail horizontal à accroche, onglets, volet actif ; sans script, tout reste lisible                                                                             |
| `Pivot`                                                                                              | Un volet du panorama : un grand mot en titre                                                                                                                   |
| `MetroActions`                                                                                       | Raccourcis en haut à droite (découvrir, messages, notifications, aide), pastilles, cibles de 44 px                                                             |
| `Aurora`                                                                                             | Fond animé en voiles de couleur                                                                                                                                |
| `ActionTile`                                                                                         | Tuile d'appel à l'action (sur-titre, titre, détail, bouton)                                                                                                    |
| `EventTile`                                                                                          | Tuile d'événement (date en bloc, lieu, présents, « Je viens »)                                                                                                 |
| `ProfileTile`                                                                                        | Tuile de profil (initiales, instrument, genres, distance)                                                                                                      |
| `tones.ts`                                                                                           | Types `Tone`, `Size` partagés ; `TONE_OF` (la table du §4.2 en code) ; `toneOfMode`                                                                            |
| `MetroMenu`, `MetroPageHeader`, `MetroField`, `MetroChoice`, `MetroSheet`, `MetroEmpty`, `MetroList` | Écrits dans MET-01 (§7.2)                                                                                                                                      |
| `MetroHome`                                                                                          | Accueil de mode : Aurora, en-tête, panorama de `MetroMenu` (MET-02)                                                                                            |
| `MetroPage`                                                                                          | Page Metro **hors** de la coquille : visiteur, premiers pas, modération, erreurs, compte (MET-07)                                                              |

Polices déjà chargées pour toute l'app (`routes/+layout.svelte`) :
`@fontsource-variable/raleway` et `@fontsource-variable/open-sans`.

## 4. Les règles du style

Chaque règle est vérifiable. Une page Metro les respecte toutes.

### 4.1 Typographie

- **Titres** en Raleway, légers : `lm-display` (200) pour le titre d'un
  accueil ou d'un pivot, `lm-title` (300) pour le titre d'un écran. Plus
  jamais `text-3xl font-black`.
- **Texte** en Open Sans, taille normale ; l'information secondaire reste
  **petite** (`lm-tile__text`, `text-sm`). La hiérarchie vient du
  contraste de taille, pas du gras.
- **Sur-titres** (`lm-kicker`, `lm-tile__kicker`) : majuscules espacées,
  courts, pour situer (« Agenda Jam », « Ta prochaine étape »).
- **Chiffres** : `lm-figure` (gros, chiffres alignés) pour un nombre qui
  compte (niveau, date du jour dans une tuile d'événement).
- **Minuscules** pour les titres de pivot et d'accueil (« jouer »,
  « jam », « progrès »), comme les maquettes ; les titres d'écran gardent
  leur majuscule (§11, Q41).
- Pas de marge sur les classes de titre : l'espacement appartient au
  conteneur (`space-y-*`, `gap-*`).

### 4.2 Une couleur par sens

La couleur dit **de quoi il s'agit**, pas sur quelle page on est. Le même
sujet a la même couleur partout.

| Ton      | Sens                                                | Exemples                                               |
| -------- | --------------------------------------------------- | ------------------------------------------------------ |
| `violet` | Le mode **Carrière** et la progression              | Héros du mode Carrière, carte des actes, niveau, rangs |
| `orange` | Le mode **Jam** : jouer bientôt                     | Héros du mode Jam, prochaine jam, « Lancer une jam »   |
| `amber`  | **Ta prochaine étape** et ce qui se gagne           | Objectif en cours, succès débloqués, quêtes            |
| `cyan`   | **Le temps** : dates, agenda, disponibilités        | Calendrier, dispos, plateaux à venir, échéances        |
| `rose`   | **Les gens** : réseau, appréciations, rencontres    | Appréciations à donner, carnet, contacts, suggestions  |
| `blue`   | **Le travail** : sessions, studio, morceaux, son    | Campagne d'un morceau, collaborations, studio          |
| `lime`   | **C'est confirmé** : réussite, présence, accord     | « Tu viens », collaboration confirmée, étape vérifiée  |
| `ink`    | **Repères neutres** : chiffres, journal, témoignage | Statistiques, journal de bord, citations               |
| `paper`  | **Le reste** : secondaire, formulaires, listes      | Notifications, réglages, formulaires, états vides      |

Règles d'usage :

- **Trois tons vifs au plus par écran**, en plus de `paper` et `ink`. Au-delà, plus rien ne ressort.
- **La tuile héros** prend la couleur du **mode** (orange en Jam, violet
  en Carrière). Les maquettes mettent le héros Carrière en orange : à
  corriger au passage.
- Écarts actuels des maquettes à corriger en migrant : calendrier Jam en
  violet (→ `cyan`), agenda Carrière en rose (→ `cyan`), carnet Jam en
  bleu (→ `rose`), campagne d'un morceau en cyan (→ `blue`), annonce de
  recrutement en ambre (→ `rose` : on cherche quelqu'un).
- **Jamais de couleur en dur** dans une page (`text-fuchsia-600`,
  `border-violet-400`, `#42c7b5`) : un ton, un jeton, ou rien.
- **La couleur n'est jamais seule** à porter une information : un mot ou
  une icône l'accompagne toujours (état d'une candidature, rang).

La table est une proposition à valider (§11, Q39) ; une fois validée, elle
vit aussi dans le code (`metro/tones.ts`, §7.2).

### 4.3 La tuile est la seule carte

- **Toute carte devient une `Tile`** : section de page, élément de liste
  riche, appel à l'action, carte de résultat. Plus de
  `rounded-2xl border bg-card p-4` écrit à la main.
- **Lien, bouton ou bloc** : `href` en fait un lien, `onclick` un bouton,
  sinon un `div`. Une tuile entièrement cliquable ne contient **pas**
  d'autre lien ni bouton (un seul geste par tuile) ; sinon, c'est un bloc
  avec ses boutons à l'intérieur.
- **Contenu** : `lm-tile__kicker` (sur-titre), `lm-tile__title`,
  `lm-tile__text`, puis l'action. Une tuile dit **une** chose.
- **Hors mosaïque**, une tuile sans `size` s'adapte à son conteneur
  (formulaires, listes, colonnes).
- **Encadrée** (`framed`) quand elle bouge au survol dans une mosaïque :
  c'est le cadre qui bouge (§4.8). Les tuiles d'un formulaire ou d'une
  liste ne sont pas encadrées.

### 4.4 La grille et les tailles

- **Mosaïque** (`lm-mosaic`) : 4 colonnes, rangées de `--lm-unit`
  (4,75 rem par défaut), écart `--lm-gap`.
- **Tailles** : `sm` (2 × 1), `md` (2 × 2), `wide` (4 × 2), `band`
  (4 × 1), `tall` (2 × 3), `big` (4 × 3). Le héros est `big` ; une
  information simple est `sm` ou `md` ; un contenu riche est `wide`.
- **Mobile d'abord** : la mosaïque garde ses 4 colonnes sur téléphone
  (les `md` vont par deux). Vérifier chaque écran à **360 px** de large :
  aucun texte coupé, aucune tuile vide.
- **Écrans de détail** (une jam, une annonce, un formulaire) : pas de
  mosaïque, une colonne de tuiles (`space-y-4`), large de `max-w-3xl` à
  `max-w-5xl` selon le contenu.

### 4.5 La navigation

- **Accueils de mode** (`/jam`, `/espace`, et `/jouer`) : un
  **panorama** de pivots (`Panorama` + `Pivot`), chaque pivot un menu de
  tuiles (§5).
- **En-tête** : le nom de l'app, la pastille du mode, puis les
  raccourcis `MetroActions` (découvrir, messages, notifications, aide) et
  le menu du compte. Le fil d'Ariane (D52) reste dessous, restylé en
  pastilles Metro.
- **Écrans** : un retour vers le menu (D50), un sur-titre qui situe, un
  `lm-title`.
- Le panorama défile **dans son rail** (natif, `scroll-snap`) et ne gêne
  jamais `smooth-scrollbar`, qui ne retient que les gestes verticaux.

### 4.6 Boutons, champs, pastilles, panneaux

- **Action principale** : `lm-btn` (une seule par écran ou par tuile).
  **Secondaire** : `lm-btn` `data-variant="ghost"`. Un lien reste un lien
  souligné.
- **Champs** : `lm-field` pour `input`, `textarea` et `select`, avec un
  `label` visible au-dessus, l'aide en `text-sm` dessous, l'erreur en
  `role="alert"`.
- **Choix courts** (créneau, type, quelques options) : des boutons
  bascules `aria-pressed` comme `lm-jam-slots`, plutôt qu'un `select`.
- **Pastilles** : `lm-pill` (compteur, genre, état). Remplace le `Badge`
  de shadcn.
- **Progression** : `lm-bar` avec `role="progressbar"` et ses valeurs.
- **Panneau contextuel** : `lm-sheet` sur un `<dialog>` natif (Échap
  ferme, le focus y reste). Remplace les dialogues shadcn pour une action
  courte (proposer, confirmer, signaler).
- **Notifications éphémères** : `svelte-sonner`, aux couleurs Metro
  (§7.1).

### 4.7 Le fond Aurora

- Voiles de couleur animés, derrière le contenu.
- **Seulement** sur les accueils de mode et le profil public (§11, Q38).
  Pas sous un formulaire ni un long texte : il distrait et coûte en
  batterie.
- Toujours `fade` et une intensité `subtle` ou `medium`.

### 4.8 Le mouvement et la performance

Règles issues des mesures notées dans `metro.css` (« Tuile encadrée ») :

- **Le mouvement porte sur le cadre, jamais sur la tuile.** Une tuile est
  en `overflow: hidden` ; l'animer la fait repeindre à chaque image.
- **Au survol, seuls `transform` et `opacity` changent**, sur des calques
  déjà promus (`will-change`). Ne pas retirer ces `will-change`.
- **Pas de `backdrop-filter` sur une tuile encadrée** : l'Aurora animée
  forcerait à recalculer le flou à chaque image.
- **Entrée des tuiles** décalée (`index` × 50 ms), une fois.
- **Icônes animées** (`fx`) : réservées aux tuiles importantes d'un
  accueil (héros, prochaine étape), **deux par écran au plus**.
- **Tout se coupe** sous `prefers-reduced-motion` (déjà écrit ; chaque
  nouvelle animation s'y ajoute).

### 4.9 L'accessibilité

Metro ne doit **rien** faire régresser ; les specs e2e passent par
`expectNoA11yViolations` (axe), contrastes compris.

- **Contrastes** : texte ≥ 4,5:1 (≥ 3:1 pour le grand texte), dans les
  **deux** thèmes. Les tons ont été mesurés ; un nouveau ton ou un texte
  posé sur le verre se mesure avant d'être utilisé.
- **Focus visible** : contour de 3 px (`lm-tile`, `lm-btn`, `lm-action`) ;
  ne jamais le retirer.
- **Cibles** de 44 px au moins (`min-h-11`, `lm-action`).
- **Structure** : un seul `h1` par page ; les titres de tuiles sont des
  `h2` ou `h3` dans l'ordre ; une icône décorative a `aria-hidden`.
- **Contraste forcé** (`forced-colors`) et **mouvement réduit** : déjà
  pris en charge par `metro.css`, à garder.
- **Panorama** : utilisable au clavier (onglets, flèches dans le rail) et
  sans script.

### 4.10 Clair et sombre

- Les deux thèmes sont livrés ensemble ; le thème suit l'appareil
  (`mode-watcher`).
- Tout passe par les jetons (`--lm-ink`, `--lm-paper`, `--card`,
  `--foreground`…) et les tons : une page bien migrée n'a **aucune**
  classe `dark:`.
- Chaque écran migré est vérifié dans les deux thèmes (§8).

## 5. Metro et les pages-menus (D50)

D50 reste en vigueur : une page d'entrée est un **menu** ; chaque entrée
ouvre **un écran** qui fait une seule chose. Les maquettes Jam et Carrière
vont plus loin (un calendrier complet, des créneaux, une carte dans le
tableau) : on ne les recopie pas telles quelles. La règle :

- **Un accueil est un menu de tuiles.** Chaque tuile est une entrée du
  menu : une icône ou un sur-titre, un titre, une phrase, et au plus **un
  résumé vivant** (« 3 dispos », « jeudi 20 h », « 2 à apprécier »).
  Toucher la tuile ouvre l'écran dédié.
- **Le héros « prochaine étape »** reste en tête (comme dans D50). Lui
  seul peut porter **une action en un geste** (« Je viens », « Je suis
  dispo ce soir ») : pas de formulaire, pas de saisie.
- **Pas de contenu empilé** : un calendrier, une liste longue, un
  formulaire vivent dans leur écran, pas dans l'accueil. La tuile
  « Agenda » montre la prochaine date et un compteur, et mène à
  `/jam/agenda`.
- **Panorama** : les pivots regroupent les entrées par thème (dans
  `/jam` par exemple : « jouer », « mon réseau », « mes jams ») ; le
  premier pivot porte le héros.
- `MenuList` (liste façon Paramètres) reste disponible pour les menus
  **secondaires** et denses (réglages, profil), restylé en Metro ; les
  accueils de mode passent en tuiles (`MetroMenu`, §7.2).

Cette règle est consignée dans D55 ; si l'on veut un jour de vrais
tableaux de bord, il faudra d'abord réviser D50 (§11, Q37).

**Ce qui est fait (MET-02)** : `MetroHome` (Aurora, en-tête, panorama dont
chaque pivot est un `MetroMenu`) porte `/jam` (pivots « jouer », « mes
jams », « réseau ») et `/espace` (« avancer », « parcours », « réseau »,
« repères ») ; le héros `NextStep` ouvre le premier pivot, au ton du mode.
Toute la navigation garde un seul nom (« Mode jam », « Mode carrière ») :
le rail ne reprend pas ce nom, pour qu'aucun second landmark ne le
contienne. Dans une tuile de menu, le résumé suit le titre et la phrase
dans le nom du lien, et s'affiche en haut à droite. `/jouer` montre deux
grandes tuiles (bouton d'envoi, `Tile type="submit"`), une icône animée
chacune ; la présentation d'un mode est une tuile au ton du mode.

## 6. Correspondance : de l'ancien au Metro

| Aujourd'hui                                                             | En Metro                                                                          |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `<div class="rounded-2xl border bg-card p-4">` (section)                | `<Tile tone="paper">` (ou le ton de son sens, §4.2)                               |
| `<div class="rounded-3xl border bg-card p-5 sm:p-8">` (cadre de page)   | Plus de grand cadre : le papier de la page **est** le fond ; le contenu en tuiles |
| `Card.Root` / `Card.Header` / `Card.Content` (shadcn)                   | `Tile` : kicker, titre, contenu                                                   |
| `<h1 class="text-3xl font-black tracking-tight sm:text-4xl">`           | `<h1 class="lm-title">` (écran) ou `lm-display` (accueil)                         |
| Petit texte gris d'introduction                                         | `lm-kicker` au-dessus du titre, phrase en `text-sm` dessous                       |
| `Button` shadcn, `rounded-full bg-primary …`, `rounded-xl bg-primary …` | `lm-btn`                                                                          |
| Bouton bordé (`border … hover:bg-muted`)                                | `lm-btn` `data-variant="ghost"`                                                   |
| `input`, `textarea`, `select` (`rounded-md border bg-background p-2`)   | `lm-field`                                                                        |
| Cases à cocher en liste de choix courts                                 | Boutons bascules `aria-pressed` (modèle `lm-jam-slots`)                           |
| `Badge` (shadcn), compteurs en `rounded-full bg-muted`                  | `lm-pill`                                                                         |
| Barres de progression maison                                            | `lm-bar`                                                                          |
| `Dialog`, `AlertDialog` (shadcn) pour une action courte                 | `lm-sheet` (`<dialog>` natif)                                                     |
| `MenuList` sur un accueil de mode                                       | `MetroMenu` (tuiles, §5) ; `MenuList` restylé pour les menus secondaires          |
| `SubPageHeader`                                                         | `MetroPageHeader` : retour, sur-titre, `lm-title`                                 |
| Icônes de l'en-tête (`Compass`, `MessageCircle`, `Bell`)                | `MetroActions`                                                                    |
| `TierBadge`                                                             | `TierBadge` restylé en `lm-pill` au ton du rang (§7.1)                            |
| État vide (texte gris centré)                                           | `Tile tone="paper"` avec une icône en filigrane et une action                     |
| Carte de résultat de recherche                                          | `ProfileTile`                                                                     |
| Carte d'annonce, de jam, de plateau                                     | `EventTile` (date en bloc) ou `ActionTile`                                        |
| Couleurs en dur (`fuchsia-600`, `violet-400`, `orange-700`)             | Un ton (`data-tone`) ou un jeton (`--lm-solid`, `--foreground`)                   |
| Dégradé de marque (`--lm-gradient`)                                     | Gardé pour le nom de l'app seulement                                              |

Exemple, une section de formulaire :

```svelte
<!-- Avant -->
<section class="space-y-3 rounded-2xl border bg-card p-4">
	<h2 class="text-lg font-semibold">Ce que j’organise</h2>
	<select class="w-full rounded-md border bg-background p-2">…</select>
	<button class="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground">
		Enregistrer
	</button>
</section>

<!-- Après -->
<Tile tone="paper" class="space-y-3">
	<h2 class="lm-tile__title">Ce que j’organise</h2>
	<select class="lm-field">…</select>
	<button class="lm-btn">Enregistrer</button>
</Tile>
```

## 7. Le socle (MET-01, fait)

Sans ces pièces, chaque page réinventerait sa version : c'était le premier
lot (MET-01), avant tout écran. **Tout ce qui suit est fait** (11/11/2026),
sauf mention contraire.

### 7.1 La coquille et les thèmes

- **`AppShell` passe en Metro** : sa racine devient `.lm-app.lm-metro`.
  Conséquence voulue : toutes les pages de l'espace prennent le papier,
  l'encre et la matière Metro d'un coup, y compris les composants shadcn
  (jetons réécrits). À vérifier écran par écran (contrastes,
  formulaires), d'où une passe de contrôle rapide de **toutes** les pages
  dans ce lot, avant les migrations fines.
- **En-tête** : `MetroActions` à la place des icônes actuelles, pastille
  du mode restylée, fil d'Ariane (`Breadcrumbs`) en pastilles Metro.
- **Toasts** (`svelte-sonner`) et **célébrations** (`Celebrations`,
  `lm-pop`) aux couleurs Metro.
- **`TierBadge`** et les pastilles d'état (candidature, collaboration,
  preuve d'une étape) sur `lm-pill`, avec un ton par famille d'état
  (`TierBadge` fait : un ton par grande étape ; les pastilles d'état se
  reprennent avec leur écran, MET-03 à MET-06).
- **Profil public** `/@handle` (personne, groupe, studio, organisation) :
  il vit hors de l'espace mais dans la coquille pour un membre ; même
  traitement.

### 7.2 Les composants à écrire

| Composant         | Pour quoi                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `MetroMenu`       | Accueil en menu de tuiles (§5) : héros, puis entrées (`href`, ton, titre, phrase, résumé)                                |
| `MetroPageHeader` | Retour vers le menu, sur-titre, `lm-title`, phrase d'introduction (remplace `SubPageHeader`)                             |
| `MetroField`      | `label` + `lm-field` + aide + erreur (`aria-describedby`, `role="alert"`), pour superforms et les formulaires classiques |
| `MetroChoice`     | Groupe de boutons bascules (`aria-pressed`) pour les choix courts                                                        |
| `MetroSheet`      | `<dialog class="lm-sheet">` avec ouverture, fermeture, focus et titre                                                    |
| `MetroEmpty`      | État vide : icône, phrase, action                                                                                        |
| `MetroList`       | Liste de lignes cliquables en tuile `paper` (conversations, notifications, candidatures)                                 |
| `tones.ts`        | La table du §4.2 en code (`TONE_OF.agenda = 'cyan'`…) et les types `Tone`, `Size` partagés                               |

Les types `Tone` et `Size` sont aujourd'hui recopiés dans `Tile`,
`ActionTile`, `EventTile` et `ProfileTile` : ils passent dans `tones.ts`.

### 7.3 Ranger le CSS

`metro.css` mêle le système et les tableaux des maquettes. Avant de
l'étendre :

- `metro/base.css` : jetons, typographie, tuile, tons, mosaïque, tailles,
  pastille, barre, boutons, champs, panneau, mouvement, contraste forcé.
- `metro/motion.css` : icônes animées (`fx`), héros, survols.
- `metro/boards.css` : les tableaux Jam et Carrière (`lm-jam-*`,
  `lm-career-*`), utilisés par les accueils.
- Les classes `lm-pattern-*` des maquettes deviennent des classes du
  système quand une vraie page s'en sert (`lm-pattern-title` →
  `lm-tile__title` en variante), sinon elles restent dans le laboratoire.
- Le CSS Metro n'est pas dans une couche Tailwind : il **prime** sur les
  utilitaires. Pour ajuster une tuile, une classe Metro plutôt qu'un
  utilitaire qui ne s'appliquerait pas.
- Petites remises en ordre : commentaires en français dans `Aurora`, ses
  tons par défaut (`var(--tone-violet)`…) qui ne sont définis nulle part.

## 8. Migrer une page : la méthode

Une page à la fois, sur `main`, avec l'identifiant du lot dans le commit
(`style(jam): agenda en Metro (MET-03)`).

**Avant**

1. Ouvrir la maquette la plus proche et ce document (§4 à §6).
2. Faire la capture de la page actuelle, clair et sombre, à 360 px et à
   1 280 px (pour comparer).
3. Lister ses blocs : quel est le titre, le héros, les sections, les
   actions, les états (vide, erreur, chargement) ?

**Pendant**

4. Remplacer chaque bloc selon le §6 ; choisir les tons par le §4.2.
5. Garder **à l'identique** : textes, ordre, données, actions, `name` des
   champs, `aria-*`, rôles. Metro ne change que la forme.
6. Supprimer les couleurs en dur et les `dark:`.
7. Aucun style propre à la page si une classe ou un composant du système
   convient ; sinon, l'ajouter **au système** (§7), pas à la page.

**Vérifier (liste de contrôle Metro, en plus de la définition de terminé)**

- [ ] Clair et sombre, 360 px et 1 280 px : rien de coupé, de caché ni
      d'illisible.
- [ ] Contraste et structure : la spec e2e de la page passe
      `expectNoA11yViolations` ; un seul `h1`.
- [ ] Clavier : tout se fait au clavier, le focus se voit partout.
- [ ] Mouvement réduit : rien ne bouge (émulation `prefers-reduced-motion`).
- [ ] Trois tons vifs au plus ; aucune couleur en dur ; aucune `dark:`.
- [ ] Performance : pas de `backdrop-filter` sur une tuile encadrée, pas
      d'Aurora hors accueils ; survol sans saccade (Chrome, onglet
      Performance, une passe).
- [ ] Les specs e2e de la page passent **sans changer leurs sélecteurs**
      (elles cherchent par rôle et par texte ; si un sélecteur de classe
      casse, le corriger vers un rôle).
- [ ] Captures après, jointes au commit ou au lot ; aide et guide de démo
      à jour si l'écran a visiblement changé.

## 9. L'ordre de la migration (lots MET)

Les lots suivent les **parcours**, pour qu'un utilisateur ne passe jamais
d'un écran Metro à un écran ancien au milieu d'une même action. Ils
s'insèrent dans l'étape B du plan (revue UX), avant l'audit de sécurité.

| Lot    | Contenu                                                                                                                                                | Dépend de |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| MET-01 | **Socle** : coquille en Metro, en-tête, fil d'Ariane, toasts, `TierBadge`, composants du §7.2, CSS rangé (§7.3), passe de contrôle de toutes les pages | —         |
| MET-02 | **Accueils** : `/jouer`, `/jam` et `/espace` en panorama de tuiles (§5), héros « prochaine étape », Aurora                                             | MET-01    |
| MET-03 | **Mode jam** : agenda, dispos, fiche d'une jam, présents, lancer une jam, carnet, apprécier, lieux et fiche d'un lieu                                  | MET-02    |
| MET-04 | **Carrière** : objectifs, carte, carrière, groupes (fiche, gestion, programme), morceaux, étapes, à confirmer                                          | MET-02    |
| MET-05 | **Se trouver et se parler** : découvrir, annonces, plateaux, messages, contacts, discussions, notifications                                            | MET-01    |
| MET-06 | **Profils et pros** : `/@handle` (personne, groupe, studio, organisation), `/profil/*`, studios, organisations, gestion d'un lieu, réglages            | MET-01    |
| MET-07 | **Premiers pas et pages publiques** : `qui-es-tu`, `demarrer/*`, `bienvenue`, accueil, aide, démarches, médias, états d'erreur                         | MET-01    |

Ordre conseillé : MET-01, MET-02, puis MET-07 (la première impression),
MET-03, MET-04, MET-05, MET-06. Un lot qui déborde se coupe (MET-03a,
MET-03b), comme les autres.

**Fin de la migration** : plus aucune page de LinkMusician sans
`.lm-metro` ; plus aucune classe `fuchsia-*` ou `violet-*` dans
`src/routes/(app)` et `src/lib/components/linkmusician` (une recherche
`grep` le vérifie) ; les maquettes `/_lab/metro` ne servent plus que de
banc d'essai.

## 10. Pièges connus

- **Les jetons shadcn sont réécrits** sous `.lm-metro` : un composant
  shadcn y change d'aspect sans qu'on le touche. Passer la coquille en
  Metro (MET-01) change donc **toutes** les pages : prévoir la passe de
  contrôle.
- **`overflow: hidden` + `transform`** sur une tuile = repeinte à chaque
  image. Le mouvement va sur `TileFrame` (§4.8).
- **Le verre et l'Aurora** coûtent cher sur un téléphone d'entrée de
  gamme : jamais de `backdrop-filter` empilés, Aurora sur les accueils
  seulement.
- **Le texte sur un ton** : les tons clairs (orange, ambre, citron, cyan)
  portent de l'**encre**, les tons foncés du blanc ; en tuile encadrée,
  le texte prend la couleur du ton sur verre sombre. Ne pas forcer une
  couleur de texte à la main.
- **Les specs e2e** cherchent par rôle et par texte : garder les
  `label`, les noms de boutons et l'ordre des titres. Le bandeau de
  cookies masque le bas de l'écran : le fermer avant un bouton collé en
  bas (« Compris »).
- **Le calendrier des jams** (bits-ui) imposait ses libellés anglais
  (T3) : réglé dans MET-01 (`calendar-prev-button`, `calendar-next-button`
  reposent notre `aria-label`).
- **Migration mécanique** (MET-01) : elle a converti les motifs, pas les
  intentions. En reprenant un écran, vérifier qu'une `lm-tile--flow` ne
  devrait pas être une vraie `Tile` (lien d'un seul geste), qu'un bouton
  secondaire n'est pas une ligne de liste, et que les tons suivent le §4.2.
- **Mineur·es, données sensibles** : un restylage ne doit jamais rendre
  visible ce que la page cachait (date de naissance, distance précise,
  XP dans la recherche). Garder les mêmes données, ou moins.
- **`smooth-scrollbar`** : tout défilement horizontal reste dans son
  rail ; ne jamais faire défiler la page à l'horizontale.

## 11. Points à trancher

Consignés dans [a-trancher.md](../plan/a-trancher.md) avec leur défaut ;
on code avec le défaut sans attendre.

| #   | Question                                                                                      | Par défaut                                                                                             |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Q37 | Les accueils deviennent-ils de vrais tableaux de bord (calendrier, formulaires dedans) ?      | **Non** : menus de tuiles (§5), D50 inchangée                                                          |
| Q38 | Le fond Aurora partout, ou sur les accueils seulement ?                                       | **Accueils de mode et profil public** seulement                                                        |
| Q39 | La table « un ton par sens » (§4.2)                                                           | La table proposée, avec les corrections des maquettes                                                  |
| Q40 | Les pages d'authentification du boilerplate (connexion, inscription) passent-elles en Metro ? | **Oui, en dernier** (avec MET-07), restylage minimal marqué `LINKMUSICIAN:`, sans toucher leur logique |
| Q41 | Minuscules pour les titres d'accueil et de pivot, majuscule pour les titres d'écran ?         | **Oui**, comme les maquettes                                                                           |

## 12. Références

- Maquettes : `src/routes/_lab/metro/` (`/_lab/metro`, `/jam`,
  `/carriere`, `/texte`).
- Système : `src/lib/linkmusician/metro.css`, `theme.css` ;
  `src/lib/components/linkmusician/metro/`.
- Coquille : `src/lib/components/linkmusician/AppShell.svelte`,
  `MenuList.svelte`, `Breadcrumbs.svelte`, `SubPageHeader.svelte`.
- Décisions : D50 (pages-menus), D52 (fil d'Ariane), D55 (ce document),
  dans [docs/decisions](../decisions/README.md).
- Plan : étape B de [fin-du-projet.md](../plan/fin-du-projet.md#3-étape-b--revue-de-fin-de-phase-5-et-revue-ux).
- Démo pour vérifier chaque écran avec des données riches :
  [docs/demo](../demo/README.md).
