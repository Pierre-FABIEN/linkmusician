# Modération

Module LinkMusician (lot P1-12).

## Pour les membres

- **Signaler** : sur la page publique d'un média (`/medias/[id]`), le média
  ou le profil de son auteur. Motifs : spam, contenu inapproprié,
  harcèlement, usurpation, contenu qui ne lui appartient pas, autre ; texte
  libre facultatif (500 caractères, texte brut). Un seul signalement par
  personne et par contenu ; 10 par jour au plus. On ne peut pas se signaler.

## Pour les modérateurs

- **`/moderation`**, ouvert aux rôles `MODERATOR` et `ADMIN` (lien
  « modération » dans la barre latérale admin). Hors de `/admin`, que le
  boilerplate réserve aux administrateurs (écart assumé avec la fiche, qui
  disait `/admin/moderation`).
- **Médias en attente** (comptes de confiance 0) : valider (publication,
  XP de la première démo) ou refuser (fichier supprimé chez Cloudinary).
- **Signalements ouverts** : classer sans suite, retirer le média (ferme
  ses signalements), avertir (30 jours) ou suspendre (7 jours, 30 jours ou
  jusqu'à levée).
- Chaque décision est inscrite au journal d'audit du boilerplate
  (`admin_audit_logs`, actions `moderation.*`).

## Effets

- **Confiance** : une sanction en vigueur (avertissement de moins de 30
  jours, suspension) fait retomber la confiance à 0. Le taux de signalement
  retenu (90 jours, rapporté aux médias publiés, plancher de 10) bloque le
  palier 3 au-delà de 2 %.
- **Suspension** : l'espace `(app)` renvoie vers `/suspendu` ; les médias
  publics du compte disparaissent jusqu'à la fin ou la levée.

## RGPD

Export : signalements faits, sanctions reçues, registre d'XP. Anonymisation :
le texte libre des signalements faits est effacé ; signalements et sanctions
restent pour l'historique de modération.

## Code

| Fichier                                | Rôle                                  |
| -------------------------------------- | ------------------------------------- |
| `src/lib/moderation/rules.ts`          | Règles pures (testées)                |
| `src/lib/server/moderation/service.ts` | Signalements, file, décisions         |
| `src/lib/server/moderation/guards.ts`  | `assertModerator`, `requireModerator` |
| `src/routes/moderation/`               | File de modération                    |
| `src/routes/suspendu/`                 | Page d'un compte suspendu             |

Tests d'intégration : `MODERATION_INTEGRATION=1 npx vitest --run src/lib/server/moderation`.
E2E : `e2e/linkmusician/moderation.spec.ts`.
