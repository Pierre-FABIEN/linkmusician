# Prompt de reprise — état du plan

> À coller au début d'une session dans le dépôt LinkMusician.
> Ce prompt sert d'abord à établir où en est le plan et quelle est la
> prochaine action utile. Il ne lance pas de lot automatiquement.

```markdown
On reprend LinkMusician. Commence par établir l'état réel du plan et
recommande la prochaine tâche. **Ne modifie aucun code, ne stage rien et
ne crée pas de commit pendant cet audit.**

## Sources à croiser

1. `CLAUDE.md` et `CONTRIBUTING.md` pour les règles de travail.
2. `docs/plan/README.md` : cycle de lot (§3), définition de terminé (§4),
   ordre conseillé (§4 bis), tableau des statuts (§5) et points ouverts
   (§5 bis).
3. La fiche de la phase contenant les lots en cours ou à faire, en
   particulier `docs/plan/phase-2-3.md` pour la phase 3.
4. `docs/decisions/README.md` et les décisions référencées par les lots
   candidats.
5. L'état local Git (`git status`, branche, derniers commits) et les
   preuves récentes de réalisation (code, tests, vérifications), sans
   considérer un changement local comme livré tant qu'il n'est pas
   confirmé.

## Méthode

- Sépare clairement les lots **livrés**, **en cours**, **bloqués** et
  **non commencés**. Appuie chaque statut sur une source précise.
- Compare le tableau §5, les fiches de phase et les commits. Signale toute
  contradiction au lieu de choisir silencieusement une version.
- Vérifie les dépendances et décisions du prochain lot candidat. Choisis
  le premier lot non commencé dont les dépendances sont livrées et les
  décisions acceptées, en tenant compte de l'ordre §4 bis.
- Distingue les prototypes, maquettes et changements non commités des
  fonctionnalités produit et de l'avancement officiel du plan. En
  particulier, les pages `src/routes/_lab/metro/` ne font pas avancer un
  lot produit par elles-mêmes.
- N'exécute pas de commande destructive, ne stage pas les changements et
  ne modifie pas les statuts du plan pendant l'audit.

## Vérifications d'attention

Les derniers documents consultés contenaient une divergence à revalider :
P3-14 est indiqué ✅ dans le tableau et réalisé dans sa fiche, tandis que
P3-16c est indiqué 🟡 dans le tableau (E2E `discussions.spec.ts` à lancer)
mais décrit comme réalisé le 08/11 dans `phase-2-3.md`. L'ancien prompt de
reprise affirmait aussi que P3-14 était le prochain lot. Vérifie ces trois
points dans l'état actuel du dépôt et des tests; n'en déduis pas que P3-16c
est terminé sur la seule base de son implémentation.

P3-15a apparaît comme candidat possible après P3-14 : vérifie ses
dépendances (P2-17, P3-04, P3-11) et D42 avant de le recommander. Si
P3-16c reste incomplet selon ses critères, explique s'il faut d'abord
terminer ce lot ou si le plan autorise P3-15a en parallèle.

## Réponse attendue

Présente un bilan bref avec :

- **Où on en est** : phase active et derniers lots livrés, avec les
  éléments vérifiables.
- **À clarifier** : divergences entre documents, tests manquants et état
  des changements locaux.
- **Prochaine action recommandée** : un seul lot ou une tâche précise,
  son motif, ses dépendances et ses décisions à vérifier.
- **Avant de coder** : les documents exacts à relire et le contrôle le
  plus utile pour démarrer.

Ne commence pas l'implémentation avant que je confirme le lot recommandé.
```
