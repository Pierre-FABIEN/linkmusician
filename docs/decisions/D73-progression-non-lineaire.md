# D73 — Progression non linéaire et prochaines actions

- **Statut : Acceptée** (18/11/2026). Arbitrages explicites du fondateur **Q-NL-1 à Q-NL-8** dans G0-04, [#72](https://github.com/Pierre-FABIEN/linkmusician/issues/72).
- **Portée : décision de conception, non implémentée.** Les lots N1 à N7 restent à développer et à tester.
- Référence détaillée : [conception 21](../conception/21-progression-non-lineaire.md). Architecture préservée : [D72](./D72-architecture-projets-collab.md), acceptée.

## Contexte

L'audit G0-04 établit que l'ordre perçu comme imposé provient surtout du pointeur « acte en cours », des épreuves Studio/Scène réservées aux groupes et de suggestions trop séquentielles. Les moteurs de preuves et de points ne doivent pas être remplacés. D73 fixe les choix produit sans les confondre avec leur implémentation.

## Décisions du fondateur

| Question | Décision acceptée | Conséquences et lot |
| --- | --- | --- |
| **Q-NL-1 — Oui** | Carte de carrière en mosaïque de branches, jusqu'à **trois épreuves à portée** ; aucun « acte en cours » unique ni numérotation romaine mise en avant. | N2 ; conserver les conditions actuelles hors révision explicite. |
| **Q-NL-2 — Oui** | Après le lot solo **P8**, une personne franchit **Studio** et **Scène** par ses faits personnels admissibles, sans doublon avec les faits collectifs. | N6 ; **révision ciblée de D53** pour ces deux épreuves, sans réécrire son reste. |
| **Q-NL-3 — Oui** | L'épreuve Rencontre conserve les appréciations de jam comme preuves ; les liens orientent vers **Rencontre**, pas vers l'agenda jam dans Collab. | N2 ; lien d'interface, pas nouvelle source de preuve. |
| **Q-NL-4 — Oui** | Suggestions « **Plus tard** » pendant **30 jours** et « **Pas pour moi** » jusqu'à réactivation. | N4 ; persistance, réversibilité, export/anonymisation RGPD. |
| **Q-NL-5 — Non** | **Pas d'orientation de groupe autonome au lancement** : les types de projets et le répertoire existant suffisent. | Aucun nouveau champ ; réévaluer au pilote. |
| **Q-NL-6 — Oui** | Déclaration d'expérience passée pour améliorer les suggestions **sans XP, épreuve, badge ni preuve**. | N7 ; donnée personnelle soumise aux règles RGPD, distincte de la preuve de collaboration et de la limite actuelle des 60 jours. |
| **Q-NL-7 — Oui** | **Palier de groupe inchangé**, affiché avec les « premières fois » du groupe comme ensemble. | Aucun changement de calcul du rang. |
| **Q-NL-8 — Oui** | Adoption des cinq invariants **NL1 à NL5** ci-dessous. | Première prise en compte N1 ; tous les lots N concernés. |

## Invariants acceptés

- **NL1 — Aucun ordre musical n'est un prérequis.** Un prérequis serveur porte sur un droit, un consentement, l'existence de l'objet visé, une règle de preuve, l'âge ou le calendrier (un fait se déclare une fois passé). Jamais sur l'existence d'une autre réalisation musicale.
- **NL2 — L'absence de fait n'est pas un défaut.** Ne pas avoir de maquette, de groupe ou de concert sur Melokiva n'est jamais présenté comme un manque, un retard ou une étape « à faire ».
- **NL3 — Une réalisation compte une fois.** Où qu'elle soit rangée, affichée ou agrégée, une réalisation est identifiée par son fait source et n'est comptée qu'une fois par lecteur.
- **NL4 — Une suggestion est exécutable.** Elle n'apparaît que si le lecteur a, au moment de l'affichage, le droit et la possibilité de faire le geste proposé (ou de demander à qui l'a).
- **NL5 — La priorité ne lit pas l'XP.** Aucun rang, aucun tri de suggestion ou de prochaine action ne dépend d'un gain potentiel.

## Compatibilité et limites

- **D53 partiellement révisée uniquement pour Studio/Scène d'une personne interprète après P8** : la carte cesse d'afficher un acte unique, mais les autres preuves, épreuves et barèmes restent inchangés.
- **D72 I3 préservé :** créer ou terminer un projet ne prouve rien et n'apporte pas d'XP. Plusieurs projets qui référencent une même réalisation ne créent aucune nouvelle preuve.
- Les droits d'accès et de lecture sont vérifiés côté serveur. Les suggestions, compteurs et résumés ne révèlent pas d'éléments privés ou de projets sans permission.
- Aucune proposition de `Q-NL-6` ou de `Q-NL-4` n'est une autorisation d'enregistrer des données personnelles sans les intégrer aux flux d'export/anonymisation.
- **UX-1 et UX-5**, issus de G0-03 (#71), n'ont pas été arbitrés par cette validation Q-NL ; ils restent à confirmer avant U0 et U1.
- **Hors périmètre :** pas de changement du barème XP, pas de nouveau type de preuve, pas d'implémentation ou de migration dans cette décision.

## Ordre de mise en œuvre recommandé

N1 (projection unifiée des réalisations) → N2 (carte parallèle), N3 (prochaines actions v1, en coordination avec U0 et UX-1). Puis N4 (report/masquage), N5 (progression du projet, après socle P2/P3), N6 (épreuves solo après P8), N7 (antériorité déclarée). Les dépendances exactes et les critères de tests sont documentés dans la conception 21.

Toute évolution future de ces principes doit être documentée par une nouvelle décision, sans altérer rétroactivement D73.
