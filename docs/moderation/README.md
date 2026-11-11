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
- **Cercles fermés à vérifier** (P2-10) : groupes repérés la nuit par
  `/api/jobs/collusion` (cron 3 h 50), des personnes qui ne collaborent et
  ne s'apprécient qu'entre elles, sans lien avec le reste de la scène. Les
  cas avec des adresses IP de session partagées passent en tête. Deux
  décisions : « Rien d'anormal » ou « Collusion confirmée » (note
  obligatoire). **Aucune sanction automatique** : avertir ou suspendre se
  fait à part, membre par membre. Un cas tranché n'est pas rouvert pour le
  même groupe.
- **Étapes contestées** (P3-06, D49) : voir [docs/etapes](../etapes/README.md).
- **Organisations à vérifier** (P3-09) : la gestion d'un groupe envoie un
  SIRET (clé de Luhn) et un lien officiel en https depuis
  `/groupes/[handle]` ; la modération ouvre la fiche de l'établissement
  (annuaire des entreprises) et le lien, puis **Vérifier**
  (`Organization.verifiedAt`, badge « Groupe vérifié » sur la page
  publique, le SIRET n'est jamais affiché) ou **Refuser** avec un motif,
  montré à la gestion. Une demande en attente à la fois, trois par 30
  jours ; un SIRET accordé ne sert qu'à une organisation. Aucune XP,
  aucune confiance : un statut accordé (conception 02 §4). Depuis P5-02,
  les studios demandent aussi ; le SIRET est contrôlé dans la base Sirene
  avant la file (inconnu ou fermé : refusé), et le nom et le code NAF
  trouvés s'affichent. **Organisations vérifiées** : la modération peut
  **retirer** la vérification avec un motif (les étapes déjà vérifiées
  restent, Q22).
- **Lieux à revendiquer** (P5-03a, D31) : le code attendu, le lien où il
  est publié et la fiche Insee si le lieu a un SIRET vérifié.
  **Approuver** crée l'organisation du lieu, gérée par la personne ;
  **Refuser** demande un motif, montré à la personne. Voir
  [docs/jam](../jam/README.md#revendication-dun-lieu-niveau-1-p5-03a-d31).
- Chaque décision est inscrite au journal d'audit du boilerplate
  (`admin_audit_logs`, actions `moderation.*`) et se relit dans
  **`/moderation/journal`** (P3-09) : qui, quoi, sur quelle cible, le
  motif, filtre par type de décision, pages de 50. Libellés dans
  `src/lib/moderation/audit.ts` : un test parcourt le code serveur et exige
  un libellé pour chaque action `moderation.*` écrite.

## Effets

- **Confiance** : une sanction en vigueur (avertissement de moins de 30
  jours, suspension) fait retomber la confiance à 0. Le taux de signalement
  retenu (90 jours, rapporté aux médias publiés, plancher de 10) bloque le
  palier 3 au-delà de 2 %.
- **Suspension** : l'espace `(app)` renvoie vers `/suspendu` ; les médias
  publics du compte disparaissent jusqu'à la fin ou la levée.

## RGPD

Export : signalements faits, sanctions reçues, vérifications d'organisation
demandées, registre d'XP, vérifications
de cercle fermé qui concernent la personne (date et issue, jamais les autres
membres). Anonymisation : le texte libre des signalements faits est effacé ;
signalements et sanctions restent pour l'historique de modération ; les
demandes de vérification restent au groupe, sans leur auteur ; les cas
de cercle fermé qui la citent sont supprimés.

## Code

| Fichier                                | Rôle                                  |
| -------------------------------------- | ------------------------------------- |
| `src/lib/moderation/rules.ts`          | Règles pures (testées)                |
| `src/lib/server/moderation/service.ts` | Signalements, file, décisions         |
| `src/lib/server/moderation/guards.ts`  | `assertModerator`, `requireModerator` |
| `src/routes/moderation/`               | File de modération                    |
| `src/routes/moderation/journal/`       | Journal des décisions (P3-09)         |
| `src/lib/moderation/audit.ts`          | Libellés du journal (testés)          |
| `src/lib/server/moderation/journal.ts` | Lecture du journal                    |
| `src/lib/server/organizations/`        | Vérification des organisations        |
| `src/routes/suspendu/`                 | Page d'un compte suspendu             |

Tests d'intégration : `MODERATION_INTEGRATION=1 npx vitest --run src/lib/server/moderation`.
E2E : `e2e/linkmusician/moderation.spec.ts`.
