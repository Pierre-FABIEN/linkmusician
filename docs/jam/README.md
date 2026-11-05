# Mode jam

Module LinkMusician (lots P2-12 et P2-13, décisions D21, D26 et D5).
Jouer pour le plaisir et rencontrer, sans projet ni engagement.

## Écrans

- **`/jouer`** : première page après la connexion et l'onboarding, le
  « menu du jeu » : Mode carrière (tableau de bord) ou Mode jam, chaque
  carte disant comment on y avance. Le dernier choix est retenu
  (`Person.preferredMode`, « Reprendre »). La première fois, une
  **présentation en 3 étapes** (`/jouer/carriere`, `/jouer/jam`).
- **Navigation par mode** : en jam, quatre onglets (Jam, Découvrir,
  Messages, Profil) ; pastille « changer de mode » en haut de l'écran.
- **« Ta prochaine étape »** (`src/lib/jam/guide.ts`) : ville → se mettre
  dispo (ou repérer une jam, pour les mineur·es) → écrire à quelqu'un →
  confirmer la jam (points) → passer en mode carrière.
- **`/jam`** : « Je suis dispo », les dispos autour de soi, les jams
  ouvertes (annonces de type jam), « Lancer une jam ».

## « Je suis dispo » (P2-13)

- Une disponibilité par personne : **ce soir**, **demain** ou **ce
  week-end**, calculée à l'heure de Paris (heure d'été comprise), avec une
  note facultative (140 caractères, texte brut). Elle **s'éteint seule** à
  la fin du créneau ; la tâche quotidienne (`/api/jobs/opportunities`)
  efface les échues.
- **Dispos autour de toi** : dans ton rayon de déplacement (25 km par
  défaut), les plus tôt dispos d'abord ; commune et tranche de distance,
  instrument, note, et « Lui proposer de jouer » (messagerie).
- 5 activations d'affilée, puis une toutes les ~5 h.
- **Jamais** un profil masqué, suspendu, ou séparé de moi par un blocage.

## Sécurité (D5, D26)

- Une jam a lieu dans un **lieu public ou professionnel** (bar,
  café-concert, salle, scène ouverte, MJC, local de répétition, studio),
  **jamais chez un particulier**.
- **Mineur·es** : leur disponibilité n'est montrée à personne, donc le
  bouton ne leur est pas proposé ; ils rejoignent les jams ouvertes qui
  finissent avant 22 h ; la prise de contact suit la messagerie
  restreinte (D5).

## RGPD

La disponibilité figure dans l'export et est effacée à l'anonymisation.

## Code et tests

- Créneaux, note : `src/lib/jam/availability.ts` (pur, testé).
- Service : `src/lib/server/jam/availability.ts`.
- Modes : `src/lib/linkmusician/modes.ts`.
- E2E : `e2e/linkmusician/modes.spec.ts`, `e2e/linkmusician/dispo.spec.ts`.
