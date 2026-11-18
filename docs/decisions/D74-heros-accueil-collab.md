# D74 — Héros de l'accueil Collab : le travail d'abord (UX-1)

- **Statut : Acceptée** (18/11/2026). Arbitrage explicite du fondateur sur **UX-1** (G0-03, [#71](https://github.com/Pierre-FABIEN/linkmusician/issues/71)), avec la valeur proposée par la [conception 20](../conception/20-parcours-ux-collab.md#52-choix-du-héros-de-laccueil) (§5.2, §15).
- **Portée : présentation.** Aucun droit, aucune règle de progression, aucune XP ne change. Livré par U0 le 18/11/2026.

## Décision

Le héros de l'accueil Collab (`/espace`, pivot « avancer ») parle du **travail** et des **demandes réelles** avant la **progression ludique** :

1. la première prochaine action du moteur N3 ([conception 21](../conception/21-progression-non-lineaire.md) §9), déjà triée et filtrée par les choix N4 : ce qui bloque quelqu'un, une demande, mon travail en cours, un besoin, une suggestion ;
2. le projet principal, **quand le modèle `Project` existera** (P2/P3, U2) : rien n'est simulé avant ;
3. sinon, pour un compte sans activité (ni morceau, ni groupe, ni épreuve franchie), « **Commence ici** » : trois portes réelles au même rang (noter une idée de morceau, trouver avec qui travailler, rencontrer des musicien·nes dans Rencontre) ;
4. sinon, l'objectif de progression (`NextStep`).

Quand le héros montre une action, l'objectif passe **en tête du pivot « repères »** (« Ta prochaine étape »). Les candidatures et demandes de contact ne prennent jamais le héros : elles gardent leur tuile.

## Conséquences

- Aucun deuxième moteur : la règle (`pickHero`, `src/lib/career/next/hero.ts`) choisit dans la liste N3, sans recalculer de priorité ni lire l'XP (NL5).
- Le héros et la liste « À faire maintenant » se partagent les trois suggestions de l'accueil, sans doublon.
- Valable pour tous les métiers : l'espace d'un métier (`RoleSpace`) reçoit le même héros ; changer de métier affiché ne change ni les demandes ni les droits.

Toute évolution (épinglage du projet principal, UX-3) fera l'objet d'une décision distincte.
