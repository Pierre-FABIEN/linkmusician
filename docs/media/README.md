# Médias

Module LinkMusician (lot P1-08, découpé en P1-08a et P1-08b).

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

## À venir (P1-08b)

Envoi de fichiers (audio ≤ 10 min, vidéo ≤ 3 min et ≤ 200 Mo, photo
≤ 10 Mo) en upload direct signé vers Cloudinary (dossier de l'acteur),
webhook de traitement (signature vérifiée), lecteurs audio et vidéo,
suppression des fichiers Cloudinary à l'anonymisation. En local, Cloudinary
ne joint pas `localhost` : finaliser l'envoi par une vérification côté
serveur, et tester le webhook par des requêtes signées simulées.

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
