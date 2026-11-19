# Melokiva — Cartographie éditable des relations

**Référence de travail : 19 novembre 2026.** Les visuels exposent le fonctionnement des principaux parcours à partir des documents métier du dépôt `Pierre-FABIEN/linkmusician` ; ils ne constituent pas une preuve de déploiement en production.

## Fichiers versionnés dans ce dossier

- `Melokiva_Relations_Modifiable.drawio` : document source entièrement éditable dans [diagrams.net](https://app.diagrams.net/), comprenant **deux pages**.
- `Melokiva_Relations_01.svg` : vue vectorielle du parcours de la personne jusqu'aux faits confirmés.
- `Melokiva_Relations_02.svg` : matrice des onze principales relations et de leurs conditions.
- Les fichiers PNG sont des exports facultatifs : générer depuis le fichier `.drawio` ou les SVG lorsque nécessaire.

Pour modifier : ouvrir diagrams.net, choisir **Ouvrir un diagramme existant**, puis sélectionner le fichier `.drawio`. Tous les blocs, textes et flèches sont des objets indépendants. Exporter ensuite en SVG, PDF ou PNG depuis **Fichier > Exporter**. On peut aussi ouvrir les SVG dans Inkscape.

## Mode de lecture et états

- **Contours continus** : mécanisme métier existant décrit par la documentation du dépôt ; l'expérience utilisateur complète peut encore nécessiter une revue UX.
- **Contours pointillés** : extension prévue non encore livrée lors de cette cartographie.
- **Partiel** : sous-système existant, mais évolution attendue.
- **Une flèche** : dépendance ou transition conditionnelle, **pas** une automatisation systématique ; lire le texte de la carte de destination.

## Dix principes de compréhension

1. Une inscription à une jam ne prouve pas une présence.
2. Une rencontre peut conduire à un contact mais n'oblige pas à créer une collaboration.
3. Un message ne crée pas de relation réciproque tant qu'il n'y a pas de réponse.
4. Une candidature acceptée ouvre une conversation ; elle ne prouve pas une prestation réalisée.
5. Une collaboration future requiert un accord préalable ; les parties confirment le travail après sa réalisation.
6. Une collaboration passée est proposée et confirmée par la seconde partie, avec possibilité de contestation.
7. Un groupe est une organisation avec des adhésions et une gestion ; il ne se confond pas avec un projet.
8. Un projet regroupe des références de morceaux, sans en devenir propriétaire ; création et rangement ne rapportent pas d'XP.
9. Le partage du morceau et la capacité d'une personne invitée dans un projet sont deux droits indépendants.
10. Les contributions, crédits, réputation et progression reposent sur leurs propres règles ; aucune conversion universelle ou automatique n'existe entre ces notions.

## Exemples simples

**Après une jam :** je découvre une session → je m'inscris → je participe effectivement → je retrouve les personnes présentes → je décide de garder le contact → nous pouvons échanger et, plus tard, proposer une collaboration.

**Après une annonce :** je publie un besoin → une personne candidate → j'accepte → une conversation démarre → nous convenons d'un travail → la prestation a lieu → nous confirmons → le système attribue les faits et crédits admissibles.

**Dans un EP :** un porteur crée un projet → la gestion d'un morceau le référence avec un niveau de partage → les projets restent indépendants des morceaux → invitations et coordination seront ajoutées par P4/U3 → tâches/livrables par P13/U5.

## Sources principales du dépôt

- `docs/jam/README.md`
- `docs/contacts/README.md`
- `docs/messagerie/README.md`
- `docs/annonces/README.md`
- `docs/collaborations/README.md`
- `docs/groupes/README.md`
- `docs/morceaux/README.md`
- `docs/projets/README.md`
- `docs/decisions/D72-architecture-projets-collab.md`
- `docs/conception/20-parcours-ux-collab.md`
- GitHub #71 (P4/U3), #36 (P13/U5), #86 (public et événements).

## Limites explicites

La représentation est pédagogique, pas un diagramme UML exhaustif des modèles et des transitions. Les tâches de projet, les invitations à un projet, le profil public/spectateur et l'agenda culturel généraliste sont marqués comme futurs ou partiels. La participation à une jam, les preuves de collaboration et les crédits conservent leurs règles propres ; les événements scéniques ont un circuit de confirmation spécifique. La carte n'implique aucun changement de ces règles.