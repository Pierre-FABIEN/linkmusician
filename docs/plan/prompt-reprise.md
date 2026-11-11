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
2. `docs/plan/README.md` : cycle de lot (§3), définition de terminé (§4)
   et tableau des lots restants (§5).
3. `docs/plan/fin-du-projet.md` : étapes A à F, ordre et fiche de chaque
   lot restant, points à surveiller (§8) ; `docs/plan/a-trancher.md`.
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
  décisions acceptées, dans l'ordre des étapes de `fin-du-projet.md`.
- Distingue les prototypes, maquettes et changements non commités des
  fonctionnalités produit et de l'avancement officiel du plan. En
  particulier, les pages `src/routes/_lab/metro/` ne font pas avancer un
  lot produit par elles-mêmes.
- N'exécute pas de commande destructive, ne stage pas les changements et
  ne modifie pas les statuts du plan pendant l'audit.

## Vérifications d'attention

État au 11/11/2026 : 87 lots sur 104 terminés ; étape A (finir la scène)
en cours, P5-01, P5-02, P5-03a et P5-05a faits, P5-05b ensuite. Avant un lot P5,
lire sa section de
[preparation-phase-5.md](./preparation-phase-5.md) : fichiers, modèles à
copier et pièges y sont déjà relevés. Un lot 🟡 dont le seul manque est l'e2e
se ferme en le lançant, avant de commencer un lot suivant.

Avant de lancer des e2e : compare `.env.test` à `.env.test.example` (une
variable ajoutée par un lot peut manquer) et ne lance pas `npm run check`
en même temps (mémoire de WSL ; voir `e2e/README.md`, section
LinkMusician).

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
