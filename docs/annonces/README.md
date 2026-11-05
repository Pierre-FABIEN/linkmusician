# Annonces

Module LinkMusician (lot P2-02, conception 02 §8 « quêtes émises »). Pages
`/annonces`, `/annonces/nouvelle` et `/annonces/[id]`, réservées aux
membres.

## Règles

- **Types** : jam, recrutement, session ou remplacement.
- **Aucune XP à la publication** : la quête rapporte quand elle est
  remplie (candidature acceptée, P2-03 ; collaboration confirmée, P2-06).
- **Zone** : la commune de l'auteur (`actor_locations`), lue à la volée ;
  rayon de diffusion de 10 à 100 km. Une annonce est visible des
  personnes situées dans ce rayon. Ville obligatoire pour publier.
- **Conditions** (facultatives) : instrument et niveau déclaré minimal,
  genre, palier musicien. **Jamais l'XP.** Affichées sur l'annonce,
  vérifiées à la candidature (`unmetConditions`, P2-03).
- **Quota d'annonces actives** selon la confiance (TL0 : 1, TL1 : 3,
  TL2 : 5, TL3 : 10).
- **Durée** : 7, 14 ou 30 jours, et au plus le lendemain de la date de
  l'événement. Expiration par la tâche quotidienne
  `/api/jobs/opportunities` (Vercel Cron, 3 h 45) ; les listes filtrent
  aussi les annonces échues à la volée.
- **Visibilité** : jamais l'annonce d'un auteur masqué, suspendu, ou
  séparé de moi par un blocage.
- **Clôture** par l'auteur ; **retrait** par la modération (signalement
  `OPPORTUNITY`, action « Retirer l'annonce » dans `/moderation`).
- **RGPD** : annonces dans l'export, supprimées à l'anonymisation.

## Code et tests

- Règles pures (formulaire, cycle de vie, éligibilité) :
  `src/lib/opportunities/rules.ts`.
- Service : `src/lib/server/opportunities/service.ts`.
- E2E : `e2e/linkmusician/annonces.spec.ts`.
