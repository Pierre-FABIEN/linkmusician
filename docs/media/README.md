# Médias

Module LinkMusician (lots P1-08a et P1-08b).

## Ce qui existe (P1-08a)

- **Liens externes** YouTube, SoundCloud, Bandcamp (`/profil/medias`).
  `src/lib/media/external.ts` reconnaît le lien et construit le lecteur
  intégré à partir d'un identifiant contrôlé (`youtube-nocookie.com`,
  `w.soundcloud.com`). **Jamais de HTML oEmbed injecté** : oEmbed ne sert
  qu'à récupérer le titre (`src/lib/server/media/oembed.ts`, sans réseau en
  e2e).
- **Statuts** : `UPLOADING` → `PROCESSING` → `PENDING_REVIEW` ou
  `PUBLISHED` (ou `REJECTED`). Publié d'office à partir de la confiance 1
  (Membre) ; en dessous, en attente de modération (P1-12).
- **Public** : `/medias/[id]` ne montre qu'un média `PUBLISHED`, sinon 404.
- **Quota** : nombre de médias (hors refusés) selon le palier de confiance
  (`checkStockQuota`, P1-09).
- **Progression** : publier émet `media.published` dans la même transaction.
  Seule une démo rapporte (première démo 100 XP, puis 30, plafonnées par
  semaine). Case « C'est une démo de moi » à l'ajout.
- **RGPD** : export de la liste ; anonymisation = suppression des médias.

## Envoi de fichiers (P1-08b)

1. `POST /api/media/sign` : type et taille déclarés, quota de confiance,
   création du média `UPLOADING`, paramètres signés (dossier
   `linkmusician/actors/<acteur>`, identifiant fixé, formats autorisés,
   `notification_url` si le site est en https).
2. Le navigateur envoie le fichier **directement** à Cloudinary
   (`MediaUpload.svelte`, barre de progression) : notre serveur ne reçoit
   jamais le fichier.
3. `POST /api/media/confirm` (navigateur) et `POST /api/media/webhook`
   (Cloudinary, signature `X-Cld-Signature` vérifiée) appellent le même
   `finalizeUpload`, idempotent : relecture du fichier chez Cloudinary
   (**avec `media_metadata`**, sans quoi la durée n'est pas renvoyée),
   contrôle taille et durée (durée illisible = refus), puis publication,
   attente de modération, ou refus avec suppression du fichier.

Limites : photo 10 Mo (JPEG, PNG, WebP, AVIF) ; audio 10 min et 100 Mo (MP3,
WAV, M4A, AAC, OGG, FLAC) ; vidéo 3 min et 200 Mo (MP4, MOV, WebM).

Suppression d'un média = suppression du fichier Cloudinary. Anonymisation :
fichiers supprimés après la transaction (`anonymizeUser`, best-effort).

**Production** : le webhook n'est déclaré que si `APP_URL` (ou `VERCEL_URL`)
donne une adresse https. En local, la confirmation du navigateur suffit.

## Code

| Fichier                                             | Rôle                             |
| --------------------------------------------------- | -------------------------------- |
| `src/lib/media/external.ts`, `rules.ts`             | Règles pures (testées)           |
| `src/lib/server/media/service.ts`                   | Seul point d'écriture de `media` |
| `src/lib/components/linkmusician/MediaEmbed.svelte` | Lecteur intégré                  |
| `src/routes/(app)/profil/medias/`                   | « Mes médias »                   |
| `src/routes/medias/[id]/`                           | Page publique                    |

Tests d'intégration : `MEDIA_INTEGRATION=1 npx vitest --run src/lib/server/media`
(quota TL0, publication et XP de la première démo). E2E :
`e2e/linkmusician/medias.spec.ts`.
